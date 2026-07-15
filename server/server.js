// server/server.js
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import http from 'http';
import mongoose from 'mongoose';
import app from './app.js';

console.log('🚀 Server starting...');
console.log('📁 Current directory:', process.cwd());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Debug: Check if .env file exists ──
const envPath = path.resolve(__dirname, '.env');
console.log('🔍 Looking for .env at:', envPath);
console.log('🔍 .env file exists?', fs.existsSync(envPath));

// ── Debug: Read .env file content (without exposing secrets) ──
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  console.log('🔍 .env file contains', lines.length, 'configurations');
  lines.forEach(line => {
    const [key] = line.split('=');
    console.log(`   - ${key}: ${key.includes('KEY') ? '✅ Set' : 'Present'}`);
  });
}

// ── Load .env from the server directory ──
dotenv.config({
  path: path.resolve(__dirname, '.env'),
});

// ── Also try loading from parent directory (fallback) ──
dotenv.config({
  path: path.resolve(__dirname, '..', '.env'),
});

// ── Verify environment variables are loaded ──
console.log('\n✅ Environment variables loaded:');
console.log('  GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✅ Set' : '❌ Missing');
console.log('  YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY ? '✅ Set' : '❌ Missing');
console.log('  MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
console.log('  PORT:', process.env.PORT || 5002);

// ── Debug: Show first few characters of keys (for verification) ──
if (process.env.YOUTUBE_API_KEY) {
  console.log('  YOUTUBE_API_KEY starts with:', process.env.YOUTUBE_API_KEY.substring(0, 10) + '...');
}
if (process.env.GROQ_API_KEY) {
  console.log('  GROQ_API_KEY starts with:', process.env.GROQ_API_KEY.substring(0, 10) + '...');
}
if (process.env.MONGODB_URI) {
  console.log('  MONGODB_URI starts with:', process.env.MONGODB_URI.substring(0, 10) + '...');
}

const PORT = process.env.PORT || 8080;

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️ No MONGODB_URI configured. Skipping MongoDB connection.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

await connectDatabase();

const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Health server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🩺 Health check: http://localhost:${PORT}/health`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Stop the other process or choose a different PORT.`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error(`❌ Error: ${err?.message || err}`);
  server.close(() => process.exit(1));
});