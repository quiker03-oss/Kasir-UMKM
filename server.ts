import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getDb } from './src/server/db.ts';
import { seedDatabase } from './src/server/seed.ts';

// Routes
import authRoutes from './src/server/routes/auth.ts';
import superadminRoutes from './src/server/routes/superadmin.ts';
import publicStoreRoutes from './src/server/routes/publicStore.ts';
import storeRoutes from './src/server/routes/store.ts';
import productsRoutes from './src/server/routes/products.ts';
import tablesRoutes from './src/server/routes/tables.ts';
import posRoutes from './src/server/routes/pos.ts';
import ordersRoutes from './src/server/routes/orders.ts';
import employeesRoutes from './src/server/routes/employees.ts';
import attendanceRoutes from './src/server/routes/attendance.ts';
import payrollRoutes from './src/server/routes/payroll.ts';
import expensesRoutes from './src/server/routes/expenses.ts';
import reportsRoutes from './src/server/routes/reports.ts';
import dashboardRoutes from './src/server/routes/dashboard.ts';
import uploadRoutes from './src/server/routes/upload.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Static uploads directory for user gallery photos
  const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Initialize SQLite Database and Seed Data
  await getDb();
  await seedDatabase();

  // API Routes
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

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  if (!isProduction) {
    // Development mode with Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built client assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, () => {
    console.log(`Server KASIR UMKM berjalan di port ${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting KASIR UMKM server:', err);
  process.exit(1);
});
