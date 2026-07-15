// server/routes/aiRoutes.js
import express from 'express';
import { generatePlaylist, getAutoplayRecommendations, getLyrics } from '../controllers/aiController.js';

const router = express.Router();

router.post('/generate', generatePlaylist);
router.post('/autoplay', getAutoplayRecommendations);

const safeLyricsHandler = async (req, res, next) => {
  try {
    await getLyrics(req, res, next);
  } catch (error) {
    console.error('❌ Lyrics route wrapper error:', error);
    if (!res.headersSent) {
      return res.status(200).json({
        success: true,
        lyrics: 'Lyrics not available for this track.',
        source: 'fallback',
        message: 'An error occurred while fetching lyrics.'
      });
    }
  }
};

router.get('/lyrics', safeLyricsHandler);
router.post('/lyrics', safeLyricsHandler);

export default router;