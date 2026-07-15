import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PlaylistCover from '../components/playlist/PlaylistCover';
import { usePlayer } from '../context/PlayerContext';
import { Play, PlusCircle } from 'lucide-react';

export default function PublicPlaylistView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTrack, addToQueue } = usePlayer();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const url = `/api/playlists/public/${id}`;
        console.log('Fetching public playlist from:', url);
        
        const response = await fetch(url);
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
          const text = await response.text();
          console.error('Response text:', text);
          throw new Error(`HTTP ${response.status}: ${text || 'No response body'}`);
        }

        const text = await response.text();
        console.log('Response text:', text);
        
        if (!text) {
          throw new Error('Empty response from server');
        }
        
        const data = JSON.parse(text);
        console.log('Parsed data:', data);
        
        if (!data.success) {
          throw new Error(data.error?.message || 'Unable to load playlist');
        }
        
        setPlaylist(data.playlist);
      } catch (err) {
        console.error('Error loading playlist:', err);
        setError(err.message || 'Unable to load playlist');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading public playlist...</div>;
  }

  if (error || !playlist) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-white px-6">
        <h1 className="text-2xl font-bold">Unable to view this playlist</h1>
        <p className="text-muted-foreground">{error || 'This playlist could not be found.'}</p>
        <button onClick={() => navigate('/')} className="rounded-full bg-primary px-4 py-2">Go home</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 rounded-3xl border border-white/10 bg-[#111120] p-8 shadow-2xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end">
          <div className="h-40 w-40 overflow-hidden rounded-2xl border border-white/10">
            <PlaylistCover songs={playlist.songs || []} coverImageUrl={playlist.coverImage || playlist.coverImageUrl} name={playlist.name} iconSize={48} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Shared Playlist</p>
            <h1 className="mt-2 text-3xl font-black">{playlist.name}</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{playlist.description || 'This playlist has been shared publicly.'}</p>
            <p className="mt-3 text-sm text-muted-foreground">Created by {playlist.createdBy || 'Unknown'}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
          This playlist is public and can be opened by anyone with the link.
        </div>

        <div className="flex flex-col gap-3">
          {(playlist.songs || []).map((song, index) => (
            <div key={`${song.id || song._id || song.videoId || index}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{song.title || song.name || 'Untitled track'}</p>
                <p className="truncate text-sm text-muted-foreground">{song.artist || 'Unknown artist'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => playTrack(song, playlist.songs || [])}
                  className="rounded-full bg-primary/20 p-2 text-primary transition hover:bg-primary/30"
                  title="Play"
                >
                  <Play className="h-4 w-4" />
                </button>
                <button
                  onClick={() => addToQueue(song)}
                  className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
                  title="Add to queue"
                >
                  <PlusCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
