import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import musicRoutes from './routes/musicRoutes.js';

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? true // Allow any origin in production, or set to specific railway domain
    : ['http://localhost:5174', 'http://127.0.0.1:5174', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);   // JWT register/login (no Spotify)
app.use('/api', musicRoutes);        // /api/search, /api/stream/:id, /api/video/:id

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback all other routes to index.html (SPA routing)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
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
