// server/app.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Load .env early ──
dotenv.config({ path: path.resolve(__dirname, '.env') });

import authRoutes from './routes/authRoutes.js';
import musicRoutes from './routes/musicRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import spotifyRoutes from './routes/spotify.js';
import playlistRoutes from './routes/playlists.js';

const app = express();

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'https://melody-production-e1a0.up.railway.app',
      'https://melody-production-0d59.up.railway.app',
      'https://melodia-wheat.vercel.app',
    ];

    // Allow any Vercel preview deployment or localhost port
    if (
      allowedOrigins.includes(origin) || 
      /\.vercel\.app$/.test(origin) ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }

    callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Handle preflight OPTIONS requests FIRST, with the SAME config
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api', musicRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', playlistRoutes);

import fs from 'fs';

// Health check endpoint for Railway/Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date(),
    env: {
      groq: !!process.env.GROQ_API_KEY,
      youtube: !!process.env.YOUTUBE_API_KEY,
      port: process.env.PORT
    }
  });
});

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback all other routes to index.html (SPA routing)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(200).send('Melodia API is running');
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Internal Server Error',
    }
  });
});

export default app;