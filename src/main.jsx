// src/main.jsx
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { PlayerProvider } from './context/PlayerContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

console.log('🚀 Melodia starting...');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <PlayerProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </PlayerProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// Register service worker for ultra-fast caching and offline playback
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('✅ ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((err) => {
        console.log('❌ ServiceWorker registration failed: ', err);
      });
  });
}