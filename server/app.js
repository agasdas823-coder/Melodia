import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import musicRoutes from './routes/musicRoutes.js';

const app = express();

// Middlewares
app.use(cors({
  origin: ['http://localhost:5174', 'http://127.0.0.1:5174'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);   // JWT register/login (no Spotify)
app.use('/api', musicRoutes);        // /api/search, /api/stream/:id, /api/video/:id

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Melodia API service' });
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
