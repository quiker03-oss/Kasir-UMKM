import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { getDb } from './db.ts';
import { seedDatabase } from './seed.ts';

// Routes
import authRoutes from './routes/auth.ts';
import superadminRoutes from './routes/superadmin.ts';
import publicStoreRoutes from './routes/publicStore.ts';
import storeRoutes from './routes/store.ts';
import productsRoutes from './routes/products.ts';
import tablesRoutes from './routes/tables.ts';
import posRoutes from './routes/pos.ts';
import ordersRoutes from './routes/orders.ts';
import employeesRoutes from './routes/employees.ts';
import attendanceRoutes from './routes/attendance.ts';
import payrollRoutes from './routes/payroll.ts';
import expensesRoutes from './routes/expenses.ts';
import reportsRoutes from './routes/reports.ts';
import dashboardRoutes from './routes/dashboard.ts';
import uploadRoutes from './routes/upload.ts';

let appInstance: express.Express | null = null;
let initPromise: Promise<express.Express> | null = null;

export async function initApp(): Promise<express.Express> {
  if (appInstance) {
    return appInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const isVercel = Boolean(process.env.VERCEL);
    const app = express();

    // Body Parsers
    app.use(express.json({ limit: '15mb' }));
    app.use(express.urlencoded({ extended: true, limit: '15mb' }));

    // Global CORS & Security Headers
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-store-id');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      next();
    });

    // Static Uploads Directory (fallback to /tmp on Vercel)
    const uploadsDir = isVercel
      ? path.join('/tmp', 'kasir_uploads')
      : path.join(process.cwd(), 'data', 'uploads');
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      app.use('/uploads', express.static(uploadsDir));
    } catch (e) {
      console.warn('Could not initialize uploads directory:', e);
    }

    // Initialize Database & Seed
    await getDb();
    await seedDatabase();

    // Mount API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/upload', uploadRoutes);
    app.use('/api/superadmin', superadminRoutes);
    app.use('/api/public', publicStoreRoutes);
    app.use('/api/store', storeRoutes);
    app.use('/api/products', productsRoutes);
    app.use('/api/tables', tablesRoutes);
    app.use('/api/pos', posRoutes);
    app.use('/api/orders', ordersRoutes);
    app.use('/api/employees', employeesRoutes);
    app.use('/api/attendance', attendanceRoutes);
    app.use('/api/payroll', payrollRoutes);
    app.use('/api/expenses', expensesRoutes);
    app.use('/api/reports', reportsRoutes);
    app.use('/api/dashboard', dashboardRoutes);

    // Health check endpoint
    app.get('/api/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        environment: isVercel ? 'vercel-serverless' : (process.env.NODE_ENV || 'development'),
        time: new Date().toISOString(),
      });
    });

    // Global JSON error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Unhandled server error:', err);
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Terjadi masalah pada server. Silakan coba lagi.',
      });
    });

    appInstance = app;
    return app;
  })();

  return initPromise;
}
