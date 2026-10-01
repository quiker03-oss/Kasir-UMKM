import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authMiddleware } from '../auth.ts';

const router = Router();
const uploadsDir = path.join(process.cwd(), 'data', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Upload image handler (supports base64 image payload from gallery / camera / file picker)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { image, filename } = req.body;
    if (!image) {
      res.status(400).json({ success: false, message: 'Tidak ada data gambar yang dikirim.' });
      return;
    }

    // Extract base64 and extension
    let base64Data = image;
    let ext = 'jpg';

    const matches = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (matches) {
      const format = matches[1].toLowerCase();
      ext = format === 'jpeg' ? 'jpg' : format === 'png' ? 'png' : format === 'webp' ? 'webp' : 'jpg';
      base64Data = matches[2];
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // Limit to 8MB
    if (buffer.length > 8 * 1024 * 1024) {
      res.status(400).json({ success: false, message: 'Ukuran foto maksimal 8 MB.' });
      return;
    }

    const cleanName = (filename || 'foto')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 25);
    const uniqueFile = `${Date.now()}-${cleanName || 'img'}.${ext}`;
    const targetPath = path.join(uploadsDir, uniqueFile);

    fs.writeFileSync(targetPath, buffer);

    const publicUrl = `/uploads/${uniqueFile}`;

    res.json({
      success: true,
      url: publicUrl,
      filename: uniqueFile,
      message: 'Foto berhasil disimpan dari galeri.',
    });
  } catch (err: any) {
    console.error('Error uploading image:', err);
    res.status(500).json({ success: false, message: 'Gagal mengunggah foto ke server.' });
  }
});

export default router;
