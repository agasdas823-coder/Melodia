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

const allowedOrigins = [
  'https://melodia-wheat.vercel.app',
  'https://melody-production-ela0.up.railway.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    console.log('❌ CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Kuma-Revision'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Authorization, Accept');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} from ${req.headers.origin || 'no origin'}`);
  next();
});

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    env: {
      node: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5002,
    },
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', musicRoutes);
app.use('/api', playlistRoutes);

app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'API_ROUTE_NOT_FOUND',
      message: `API route not found: ${req.originalUrl}`,
    },
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route not found: ${req.originalUrl}`,
    },
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Internal Server Error',
    },
  });
});

export default app;