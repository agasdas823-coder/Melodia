import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import PlaylistCover from '../components/playlist/PlaylistCover';
import AddToPlaylistDropdown from '../components/playlist/AddToPlaylistDropdown';
import { API_URL } from '../utils/config';

export default function YTPlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, togglePlay, toggleShuffle, isShuffled } = usePlayer();
  
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/youtube-playlist/${id}`);
        if (!res.ok) throw new Error('Failed to fetch playlist');
        const data = await res.json();
        if (data.success) {
          setPlaylist(data.playlist);
        } else {
          throw new Error(data.error?.message || 'Failed to fetch playlist');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylist();
  }, [id]);
  
  const playlistSongs = playlist?.songs || [];

  const handleRowClick = (song) => {
    const isCurrent = currentTrack && (currentTrack.id === song.id || currentTrack._id === song._id);
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(song, playlistSongs);
    }
  };

  const handlePlayPlaylist = () => {
    if (playlistSongs.length > 0) {
      if (isShuffled) toggleShuffle(); // ensure not shuffled if normal play
      playTrack(playlistSongs[0], playlistSongs);
    }
  };

  const handleShufflePlay = () => {
    if (playlistSongs.length > 0) {
      if (!isShuffled) toggleShuffle();
      const randomIndex = Math.floor(Math.random() * playlistSongs.length);
      playTrack(playlistSongs[randomIndex], playlistSongs);
    }
  };

  const handleRename = () => {
    if (editName.trim()) {
      renamePlaylist(playlist.id, editName.trim());
      setIsEditingName(false);
    }
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-xl font-bold text-white mb-2">Oops!</h2>
        <p className="text-muted-foreground">{error || "Playlist not found."}</p>
        <button onClick={() => navigate('/search')} className="mt-4 text-primary font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pt-margin-desktop px-6 md:px-10 w-full max-w-6xl mx-auto pb-32">
      {/* Back navigation */}
      <button 
        onClick={() => navigate('/search')}
        className="flex items-center gap-xs text-on-surface-variant hover:text-primary transition-colors cursor-pointer w-fit select-none font-label-md text-label-md"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back to Library
      </button>

      {/* Playlist Hero Header */}
      <header className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 mb-2">
        <div className="w-52 h-52 rounded-2xl shadow-2xl overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/20">
          <img
            src={playlist.thumbnail || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=60"}
            alt={playlist.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-grow text-center md:text-left flex flex-col gap-1.5 min-w-0">
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
            YouTube Playlist
          </span>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface leading-tight font-extrabold truncate">
            {playlist.title}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 max-w-2xl mt-1">
            {playlist.artist}
          </p>
          <div className="flex items-center justify-center md:justify-start gap-sm mt-4 font-label-md text-label-md text-on-surface-variant">
            <span className="font-semibold text-on-surface">{playlistSongs.length} songs</span>
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
          {playlistSongs.length > 0 && (
            <>
              <button
                onClick={handleShufflePlay}
                className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-surface-container hover:bg-surface-container-highest flex items-center justify-center text-primary transition-all duration-300 hover:scale-105 active:scale-95 flex-shrink-0 cursor-pointer border border-primary/20"
                title="Shuffle Play"
              >
                <span className="material-symbols-outlined text-2xl md:text-3xl">shuffle</span>
              </button>
              <button
                onClick={handlePlayPlaylist}
                className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-[0_0_35px_rgba(192,193,255,0.3)] transition-all duration-300 hover:scale-110 active:scale-95 flex-shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-3xl md:text-4xl ml-1" style={{ fontVariationSettings: "'FILL' 1" }}>
                  play_arrow
                </span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Playlist Content Table */}
      <section className="flex flex-col w-full">
        {playlistSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-xl bg-surface-container/10 border border-outline-variant/10 rounded-xl text-center p-md">
            <span className="material-symbols-outlined text-[64px] text-on-surface-variant/30 mb-4">music_note</span>
            <h3 className="font-headline-md text-headline-md text-on-background mb-2">This playlist is empty</h3>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
              Discover and add songs to this playlist from the Explore page or Search bar.
            </p>
            <button
              onClick={() => navigate('/explore')}
              className="mt-md bg-surface-container hover:bg-white/5 border border-outline-variant/30 text-primary font-label-md text-label-md px-md py-sm rounded-lg transition-all"
            >
              Explore Catalog
            </button>
          </div>
        ) : (
          <div className="w-full">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-outline-variant/20 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest hidden md:grid select-none">
              <div className="col-span-1">#</div>
              <div className="col-span-6">Title</div>
              <div className="col-span-3">Genre</div>
              <div className="col-span-2 text-right">Time</div>
            </div>

            {/* List Items */}
            <div className="flex flex-col gap-1 mt-2">
              {playlistSongs.map((song, index) => {
                const isCurrent = currentTrack && (currentTrack.id === song.id || currentTrack._id === song._id);
                const showPlaying = isCurrent && isPlaying;
                return (
                  <div 
                    key={song.id || song._id}
                    onClick={() => handleRowClick(song)}
                    className={`grid grid-cols-12 gap-4 px-5 py-3 items-center rounded-xl transition-all duration-150 group cursor-pointer ${
                      isCurrent ? 'bg-primary/8 border border-primary/20' : 'hover:bg-surface-container-highest border border-transparent'
                    }`}
                  >
                    <div className="col-span-2 md:col-span-1 font-label-md text-label-md text-on-surface-variant relative flex items-center justify-center md:justify-start">
                      {showPlaying ? (
                        <span className="material-symbols-outlined text-primary animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>
                          graphic_eq
                        </span>
                      ) : (
                        <>
                          <span className="group-hover:hidden">{index + 1}</span>
                          <span className="material-symbols-outlined hidden group-hover:block text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                            play_arrow
                          </span>
                        </>
                      )}
                    </div>
                    
                    <div className="col-span-8 md:col-span-6 flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-lg shadow-md overflow-hidden bg-surface-container flex-shrink-0">
                        {(song.thumbnail || song.thumbnail_medium || song.coverArtUrl) ? (
                          <img className="w-full h-full object-cover" alt={song.title} src={song.thumbnail || song.thumbnail_medium || song.coverArtUrl} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-surface-container-highest">
                            <span className="material-symbols-outlined text-on-surface-variant">music_note</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col overflow-hidden gap-0.5">
                        <span className={`font-label-md text-label-md truncate font-semibold ${isCurrent ? 'text-primary' : 'text-on-surface'}`}>
                          {song.title}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                          {song.artist}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-3 hidden md:flex items-center font-body-md text-body-md text-on-surface-variant truncate">
                      {song.genre}
                    </div>

                    <div className="col-span-2 md:col-span-2 flex items-center justify-end gap-4 font-label-md text-label-md text-on-surface-variant relative">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <AddToPlaylistDropdown song={song} />
                      </div>
                      <span>{formatDuration(song.duration)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
