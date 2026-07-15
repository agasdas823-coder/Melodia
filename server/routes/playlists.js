import express from 'express';
import { createPlaylist, getPublicPlaylist, sharePlaylist } from '../controllers/playlistController.js';

const router = express.Router();

router.post('/playlists', async (req, res, next) => {
  try {
    await createPlaylist(req, res);
  } catch (error) {
    console.error('Error in POST /playlists:', error);
    next(error);
  }
});

router.post('/playlists/share', async (req, res, next) => {
  try {
    console.log('📝 [playlists.js] POST /playlists/share - Received request');
    await sharePlaylist(req, res);
  } catch (error) {
    console.error('Error in POST /playlists/share:', error);
    next(error);
  }
});

router.get('/playlists/public/:id', async (req, res, next) => {
  try {
    await getPublicPlaylist(req, res);
  } catch (error) {
    console.error('Error in GET /playlists/public/:id:', error);
    next(error);
  }
});

export default router;
