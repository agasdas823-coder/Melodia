import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { usePlayer } from '../context/PlayerContext';

export default function TrackRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTrack } = usePlayer();
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAndPlay = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || "http://localhost:5002"}`}/api/track/${id}`);
        if (res.data.success && res.data.song) {
          playTrack(res.data.song);
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
  }, [id, playTrack, navigate]);

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
