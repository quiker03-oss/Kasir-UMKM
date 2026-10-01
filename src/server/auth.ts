import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../types/index.ts';
import { queryOne } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'kasir-umkm-super-secure-jwt-key-2026';

export interface AuthUser {
  id: string;
  store_id: string | null;
  username: string;
  role: UserRole;
  full_name: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      store_id: user.store_id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch (err) {
    return null;
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Autentikasi diperlukan. Silakan login terlebih dahulu.' });
    return;
  }

  const token = authHeader.substring(7);
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ success: false, message: 'Sesi Anda telah kedaluwarsa atau tidak valid. Silakan login kembali.' });
    return;
  }

  req.user = user;
  next();
}

export function requireRole(allowedRoles: (UserRole | string)[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
      return;
    }

    const currentRole = (req.user.role || '').toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

    const isAllowed =
      normalizedAllowed.includes(currentRole) ||
      (normalizedAllowed.includes('ADMIN_TOKO') && (currentRole === 'OWNER' || currentRole === 'ADMIN')) ||
      currentRole === 'SUPER_ADMIN';

    if (!isAllowed) {
      res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.',
      });
      return;
    }

    next();
  };
}

export function requireStore(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
    return;
  }

  // Normal users (ADMIN_TOKO, KASIR) MUST only use their session store_id (IDOR protection)
  let effectiveStoreId = req.user.store_id;

  // Super Admin can optionally specify x-store-id header or query for diagnostics
  if (req.user.role === 'SUPER_ADMIN') {
    effectiveStoreId = (req.headers['x-store-id'] as string) || (req.query.store_id as string) || req.user.store_id || null;
  }

  if (!effectiveStoreId && req.user.role !== 'SUPER_ADMIN') {
    res.status(400).json({ success: false, message: 'Toko tidak ditemukan untuk akun ini.' });
    return;
  }

  // Verify store exists and is ACTIVE
  if (effectiveStoreId) {
    const store = queryOne('SELECT id, status, name FROM stores WHERE id = ?', [effectiveStoreId]);
    if (!store) {
      res.status(404).json({ success: false, message: 'Toko tidak ditemukan.' });
      return;
    }

    if (store.status === 'INACTIVE' && req.user.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        success: false,
        message: `Toko "${store.name}" sedang dinonaktifkan. Silakan hubungi Super Admin.`,
        store_inactive: true,
      });
      return;
    }
  }

  // Attach effective store id
  (req as any).storeId = effectiveStoreId;
  next();
}
