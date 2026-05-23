import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { uploadToR2, getSignedReadUrl } from '../lib/r2';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', upload.single('photo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const ext = req.file.originalname.split('.').pop() ?? 'jpg';
    const key = `items/${uuidv4()}.${ext}`;

    await uploadToR2(key, req.file.buffer, req.file.mimetype);
    const url = await getSignedReadUrl(key);

    res.json({ key, url });
  } catch (err) {
    next(err);
  }
});

export default router;
