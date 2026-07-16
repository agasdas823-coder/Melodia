<!-- README.md - Melodia -->
# 🎵 Melodia — AI-Powered Music Streaming

![Vercel](https://img.shields.io/badge/Vercel-Deploy-000?style=for-the-badge&logo=vercel&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-Deploy-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18-339933?style=for-the-badge&logo=node.js&logoColor=white)

<p align="center">
  <a href="https://melodia-wheat.vercel.app"><img src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&h=420&fit=crop" alt="Melodia Banner" width="100%"/></a>
</p>

> Melodia is an AI-powered, full-stack music streaming application that combines YouTube search with Spotify Web Playback SDK to deliver high-fidelity streaming, synchronized lyrics, and intelligent playlist generation.

Live Frontend: https://melodia-wheat.vercel.app

---

## 🚀 Key Features

| Feature | What it does |
|---|---|
| 🎵 YouTube Search | Search songs, artists, and playlists via YouTube search integration |
| 🎧 Spotify Playback | Play full tracks via Spotify Web Playback SDK (Spotify Premium required) |
| 🤖 AI Playlist Generation | Use Groq API to generate playlists from prompts and moods |
| 📋 Playlist Management | Create, edit, delete playlists with custom covers |
| ❤️ Liked Songs | Save and access your favorite tracks quickly |
| 🔐 Authentication | JWT-based auth with MongoDB user store |
| 📝 Synced Lyrics | LRC-style timed lyrics with karaoke modal and mini-bar |
| 📱 Responsive UI | Glassmorphic, modern UI built with TailwindCSS and Framer Motion |

---

## 🧰 Tech Stack

- Frontend: React 18, Vite, TailwindCSS, Framer Motion, Howler.js
- Backend: Node.js, Express, MongoDB, JWT
- APIs: YouTube Data API, Spotify Web Playback SDK, Groq API

Badges:

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat&logo=tailwind-css)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb)

---

## 🔗 Live Demo

- Frontend: https://melodia-wheat.vercel.app
- Backend API: https://melody-production-ela0.up.railway.app

---

## 📸 Reference Screenshots

Use these images as presentation references:

| Library | Now Playing |
|---:|:---|
| <img src="https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&h=250&fit=crop" alt="Library" width="320"/> | <img src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&h=250&fit=crop" alt="Player" width="320"/> |

---

## ✅ Installation

### Prerequisites

- Node.js 18+ and npm/yarn
- MongoDB (Atlas or local)
- Spotify Premium account (for full-track playback)
- YouTube Data API key
- Groq API key (if using AI playlist generation)

### Clone

```bash
git clone https://github.com/agasdas823-coder/Melodia.git
cd Melodia
```

### Backend Setup

```bash
cd server
npm install
# create server/.env using the template below
npm run dev
```

### Frontend Setup

Open a new terminal and run:

```bash
npm install
# create .env (Vite) using the template below
npm run dev
```

---

## 🔐 Environment Variables

Add these to `server/.env` (backend):

```env
# Server
PORT=8080
NODE_ENV=development

# CORS origins (comma separated)
CORS_ORIGINS=https://melodia-wheat.vercel.app,http://localhost:5173

# Database
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/melodia

# Auth
JWT_SECRET=your_jwt_secret

# YouTube
YOUTUBE_API_KEY=your_youtube_api_key

# Spotify (for auth + refresh token flow)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REFRESH_TOKEN=your_spotify_refresh_token

# Groq (AI)
GROQ_API_KEY=your_groq_api_key
```

Add these to frontend `.env` (root):

```env
VITE_API_URL=https://melody-production-ela0.up.railway.app
VITE_SPOTIFY_REDIRECT_URI=https://melodia-wheat.vercel.app
```

---

## 🧾 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/search?q=...&limit=...&type=...` | Search (YouTube primary) |
| GET | `/api/track/:id` | Get normalized track metadata |
| GET | `/api/stream/:videoId` | Stream audio for a YouTube video |
| GET | `/api/playlist/:id` | Get playlist (normalized) |
| POST | `/api/ai/generate` | Generate playlist using Groq (AI) |
| POST | `/api/auth/register` | Register user (returns JWT) |
| POST | `/api/auth/login` | Login user (returns JWT) |
| GET | `/api/spotify/search?q=...` | Spotify search proxy |
| GET | `/api/lyrics?title=...&artist=...` | Fetch lyrics (if available) |

> Note: Some endpoints require authentication. Use `Authorization: Bearer <token>` header.

---

## 🗂 Project Structure

```
Melodia/
├── src/                    # Frontend (React + Vite)
│   ├── pages/              # Page components
│   ├── components/         # UI components
│   ├── context/            # Player/Auth contexts
│   ├── hooks/              # Reusable hooks
│   ├── services/           # API clients (musicService, playlistService)
│   └── main.jsx
├── server/                 # Backend (Express)
│   ├── controllers/        # Route handlers
│   ├── routes/             # Express routes
│   ├── services/           # YouTube/Spotify helpers
│   ├── models/             # Mongoose models
│   └── server.js
├── public/
├── package.json
└── README.md
```

---

## 📦 Deployment

### Frontend (Vercel)

1. Push the repository to GitHub.
2. Create a Vercel project and connect your repo.
3. Set `VITE_API_URL` in Vercel Environment Variables.
4. Deploy and visit `https://melodia-wheat.vercel.app`.

### Backend (Railway / Heroku / other)

1. Push to GitHub and connect to Railway.
2. Add all `server/.env` variables in Railway settings.
3. Set the start command to `node server/server.js` or use the provided `package.json` scripts.
4. Deploy and verify the health endpoint.

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repo and create a branch: `git checkout -b feature/your-feature`
2. Make changes and add tests where appropriate.
3. Commit with clear messages: `git commit -m "feat: add ..."`
4. Push and open a Pull Request.

Please abide by the code of conduct and write clear PR descriptions.

---

## 📝 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- YouTube Data API — for search and video metadata
- Spotify Web Playback SDK — for playback integration
- Groq — for AI playlist generation
- Unsplash — reference imagery

---
Made with ❤️ — Melodia
