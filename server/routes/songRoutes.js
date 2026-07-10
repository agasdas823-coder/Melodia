import express from 'express';
import { getSongs, getSongById, getSongLyrics, getSongPreview } from '../controllers/songController.js';

const router = express.Router();

router.route('/')
  .get(getSongs);

router.route('/:id')
  .get(getSongById);

router.route('/:id/lyrics')
  .get(getSongLyrics);

router.route('/:id/preview')
  .get(getSongPreview);

export default router;
