import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { SCHEMA_SQL } from './schema.ts';

type SqlJsDatabase = any;

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.join('/tmp', 'kasir_data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'kasir_umkm.sqlite');
const BACKUP_DIR = isVercel ? path.join('/tmp', 'kasir_backups') : path.join(DATA_DIR, 'backups');

let dbInstance: SqlJsDatabase | null = null;
let saveDebounceTimer: NodeJS.Timeout | null = null;
let backupIntervalTimer: NodeJS.Timeout | null = null;
let inTransaction = false;

// Create periodic backup helper
export function createBackup(): string | null {
  if (!dbInstance) return null;
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `kasir_umkm_backup_${dateStr}.sqlite`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);
    fs.writeFileSync(backupFilePath, buffer);

    // Keep max 7 latest backups, rotate older ones
    try {
      const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('kasir_umkm_backup_'));
      if (files.length > 7) {
        files.sort().slice(0, files.length - 7).forEach((oldFile) => {
          try {
            fs.unlinkSync(path.join(BACKUP_DIR, oldFile));
          } catch {}
        });
      }
    } catch {}

    return backupFilePath;
  } catch (err) {
    console.error('Error creating database backup:', err);
    return null;
  }
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('Could not create DATA_DIR:', e);
  }

  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('Could not create BACKUP_DIR:', e);
  }

  // In Vercel serverless, copy pre-seeded SQLite file from repository if /tmp is fresh
  if (isVercel && !fs.existsSync(DB_FILE)) {
    const bundledPath = path.join(process.cwd(), 'data', 'kasir_umkm.sqlite');
    if (fs.existsSync(bundledPath)) {
      try {
        fs.copyFileSync(bundledPath, DB_FILE);
      } catch (err) {
        console.warn('Could not copy bundled SQLite file to /tmp:', err);
      }
    }
  }

  const SQL = await initSqlJs({
    locateFile: (file) => {
      const candidates = [
        path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
        path.join(process.cwd(), file),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) return c;
      }
      return file;
    },
  });

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('Failed reading existing SQLite file, checking for backup recovery:', err);
      // Attempt recovery from latest backup
      let recovered = false;
      try {
        const backups = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.sqlite')).sort().reverse();
        if (backups.length > 0) {
          const latestBackupPath = path.join(BACKUP_DIR, backups[0]);
          console.log(`Recovering database from backup: ${backups[0]}`);
          const backupBuffer = fs.readFileSync(latestBackupPath);
          dbInstance = new SQL.Database(backupBuffer);
          recovered = true;
        }
      } catch (recErr) {
        console.error('Backup recovery failed:', recErr);
      }

      if (!recovered) {
        dbInstance = new SQL.Database();
      }
    }
  } else {
    dbInstance = new SQL.Database();
  }

  if (!dbInstance) {
    dbInstance = new SQL.Database();
  }
  const db = dbInstance;

  // Start periodic backup interval (every 1 hour for long-running servers)
  if (!isVercel && !backupIntervalTimer) {
    backupIntervalTimer = setInterval(() => {
      createBackup();
    }, 60 * 60 * 1000);
  }

  // Enable foreign keys and performance pragmas
  db.run('PRAGMA foreign_keys = ON;');
  try {
    db.run('PRAGMA cache_size = -64000;'); // 64MB cache for snappy multi-store queries
    db.run('PRAGMA temp_store = MEMORY;');
    db.run('PRAGMA synchronous = NORMAL;');
  } catch {}
  
  // Run schema migration
  db.exec(SCHEMA_SQL);

  // Safe migration for additional columns and indexes
  try {
    db.run('ALTER TABLE users ADD COLUMN email TEXT;');
  } catch {}
  try {
    db.run("ALTER TABLE stores ADD COLUMN status TEXT DEFAULT 'ACTIVE';");
  } catch {}
  try {
    db.run("ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'COMPLETED';");
  } catch {}
  try {
    db.run("UPDATE transactions SET status = 'COMPLETED' WHERE status IS NULL OR status = '';");
  } catch {}
  try {
    db.run('ALTER TABLE stores ADD COLUMN subdomain TEXT;');
  } catch {}
  try {
    db.run('ALTER TABLE stores ADD COLUMN custom_domain TEXT;');
  } catch {}
  try {
    db.run("UPDATE stores SET status = 'ACTIVE' WHERE status IS NULL OR status = '';");
  } catch {}
  try {
    // Core high-performance indexes for multi-store scale
    db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_products_store_barcode ON products(store_id, barcode);');
    db.run('CREATE INDEX IF NOT EXISTS idx_products_store_active ON products(store_id, is_active);');
    db.run('CREATE INDEX IF NOT EXISTS idx_transactions_store_created ON transactions(store_id, created_at);');
    db.run('CREATE INDEX IF NOT EXISTS idx_orders_store_status ON orders(store_id, status);');
    db.run('CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);');
    db.run('CREATE INDEX IF NOT EXISTS idx_attendance_store_date ON attendance(store_id, date);');
    db.run('CREATE INDEX IF NOT EXISTS idx_employees_store_active ON employees(store_id, is_active);');
    db.run('CREATE INDEX IF NOT EXISTS idx_employees_barcode ON employees(barcode_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_payroll_store_period ON payroll(store_id, period_year, period_month);');
    db.run('CREATE INDEX IF NOT EXISTS idx_payroll_items_pid ON payroll_items(payroll_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_payroll_items_eid ON payroll_items(employee_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_expenses_store_date ON expenses(store_id, date);');
    db.run('CREATE INDEX IF NOT EXISTS idx_order_items_oid ON order_items(order_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_transaction_items_tid ON transaction_items(transaction_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_users_store ON users(store_id);');
  } catch {}

  // Safe migration: Link any legacy data to DEFAULT STORE if store_id was missing
  try {
    const storeRes = db.exec("SELECT id FROM stores ORDER BY created_at ASC LIMIT 1;");
    if (storeRes.length > 0 && storeRes[0].values.length > 0) {
      const defaultStoreId = storeRes[0].values[0][0];
      db.run("UPDATE products SET store_id = ? WHERE store_id IS NULL OR store_id = ''", [defaultStoreId]);
      db.run("UPDATE users SET store_id = ? WHERE (store_id IS NULL OR store_id = '') AND role != 'SUPER_ADMIN'", [defaultStoreId]);
      db.run("UPDATE categories SET store_id = ? WHERE store_id IS NULL OR store_id = ''", [defaultStoreId]);
      db.run("UPDATE orders SET store_id = ? WHERE store_id IS NULL OR store_id = ''", [defaultStoreId]);
      db.run("UPDATE transactions SET store_id = ? WHERE store_id IS NULL OR store_id = ''", [defaultStoreId]);
      db.run("UPDATE employees SET store_id = ? WHERE store_id IS NULL OR store_id = ''", [defaultStoreId]);
      db.run("UPDATE attendance SET store_id = ? WHERE store_id IS NULL OR store_id = ''", [defaultStoreId]);
      db.run("UPDATE payroll SET store_id = ? WHERE store_id IS NULL OR store_id = ''", [defaultStoreId]);
      db.run("UPDATE expenses SET store_id = ? WHERE store_id IS NULL OR store_id = ''", [defaultStoreId]);
      db.run("UPDATE tables SET store_id = ? WHERE store_id IS NULL OR store_id = ''", [defaultStoreId]);
      db.run("UPDATE settings SET store_id = ? WHERE store_id IS NULL OR store_id = ''", [defaultStoreId]);
    }
  } catch {}
  persistDb();

  return db;
}

export function persistDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, buffer);
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('Error saving SQLite DB to disk:', err);
  }
}

export function schedulePersistDb(): void {
  if (inTransaction) return;
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    persistDb();
  }, 800);
}

export function query<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const list = query<T>(sql, params);
  return list.length > 0 ? list[0] : null;
}

export function run(sql: string, params: any[] = []): { changes: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  const changes = dbInstance.getRowsModified();
  schedulePersistDb();
  return { changes };
}

export function transaction<T>(fn: () => T): T {
  if (!dbInstance) throw new Error('Database not initialized');
  inTransaction = true;
  dbInstance.run('BEGIN TRANSACTION;');
  try {
    const result = fn();
    dbInstance.run('COMMIT;');
    inTransaction = false;
    persistDb();
    return result;
  } catch (err) {
    try {
      dbInstance.run('ROLLBACK;');
    } catch {}
    inTransaction = false;
    throw err;
  }
}
