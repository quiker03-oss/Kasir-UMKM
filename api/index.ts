import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initApp } from '../src/server/app.ts';

let cachedApp: any = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!cachedApp) {
    cachedApp = await initApp();
  }
  return cachedApp(req, res);
}
