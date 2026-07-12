import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../utils/config';

export default function TrackRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTrack, setNowPlayingOpen } = usePlayer();
  const { user } = useAuth();
  const [error, setError] = useState(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchAndPlay = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/track/${id}`);
        if (res.data.success && res.data.song) {
          const song = res.data.song;

          // If the shared track is old (no previewUrl), resolve via iTunes search
          if (!song.previewUrl && !song.preview_url) {
            try {
              const q = `${song.title} ${song.artist || ''}`;
              const searchRes = await axios.get(`${API_URL}/api/search?q=${encodeURIComponent(q)}&limit=1`);
              if (searchRes.data.songs?.length > 0) {
                const found = searchRes.data.songs[0];
                song.previewUrl = found.previewUrl;
                song.thumbnail = song.thumbnail || found.thumbnail;
                song.coverArtUrl = song.coverArtUrl || found.coverArtUrl;
              }
            } catch (_) {}
          }

          // Play immediately and open the Now Playing panel
          playTrack(song);
          setNowPlayingOpen(true);
          navigate('/explore', { replace: true });
        } else {
          setError('Track not found or unavailable.');
        }
      } catch (err) {
        console.error('Error fetching track:', err);
        setError('Failed to load track.');
      }
    };

    fetchAndPlay();
  }, [id, playTrack, setNowPlayingOpen, navigate, user]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white">
        <h2 className="text-2xl font-bold mb-4">Oops!</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <button onClick={() => navigate('/explore')} className="px-4 py-2 bg-primary rounded-full font-semibold">
          Go back Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <span className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></span>
        <p className="text-white font-medium">Loading track...</p>
      </div>
    </div>
  );
}
