// client/src/pages/playlistdetail.jsx
import { useState, useRef, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import PlaylistCover from '../components/playlist/PlaylistCover';
import { getPlaylist } from '../services/playlistService';
import { API_URL } from '../utils/config';
import { Share2 } from 'lucide-react';

export default function PlaylistDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    playlists, 
    removeSongFromPlaylist, 
    currentTrack, 
    isPlaying, 
    playTrack, 
    togglePlay, 
    renamePlaylist, 
    deletePlaylist, 
    toggleShuffle, 
    isShuffled, 
    setNowPlayingOpen, 
    setPreviewTrack,
    createPlaylist 
  } = usePlayer();
  const { user } = useAuth();
  
  const [playlist, setPlaylist] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Fetch playlist when ID changes ──
  useEffect(() => {
    const fetchPlaylist = async () => {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching playlist with ID:', id);

      try {
        console.log('🔍 Fetching playlist:', id);
        const result = await getPlaylist(id, playlists);

        console.log('📊 Fetch result:', { success: result.success, source: result.source, hasPlaylist: !!result.playlist });

        if (result.success && result.playlist) {
          const data = result.playlist;
          const formattedPlaylist = {
            id: data.id || data._id || id,
            _id: data.id || data._id || id,
            name: data.title || data.name || 'Playlist',
            title: data.title || data.name || 'Playlist',
            description: data.description || '',
            artist: data.artist || data.createdBy || 'YouTube',
            coverImageUrl: data.coverImageUrl || data.thumbnail || data.coverImage || '',
            thumbnail: data.thumbnail || '',
            songs: (data.songs || []).map(song => ({
              id: song.id || song.videoId,
              _id: song.id || song.videoId,
              videoId: song.id || song.videoId,
              title: song.title || song.name || 'Untitled',
              name: song.title || song.name || 'Untitled',
              artist: song.artist || song.channelTitle || 'Unknown',
              thumbnail: song.thumbnail || '',
              duration: song.duration || 0,
              duration_string: song.duration_string || '0:00',
              url: song.url || `https://www.youtube.com/watch?v=${song.id || song.videoId}`,
              type: 'song',
              source: data.source || 'local'
            })),
            videoCount: data.videoCount || data.songs?.length || 0,
            source: result.source,
            isAiGenerated: data.isAiGenerated || false,
            createdBy: data.createdBy || data.artist || 'You',
            isYouTube: result.source === 'api' || result.source === 'youtube',
            isPrivate: data.isPrivate === true,
          };

          console.log('✅ Set formatted playlist:', formattedPlaylist.name);
          setPlaylist(formattedPlaylist);
          setPlaylistSongs(formattedPlaylist.songs || []);
          setError(null);
        } else {
          console.log('⚠️ Using fallback playlist');
          setPlaylist(result.playlist);
          setPlaylistSongs(result.playlist?.songs || []);
          setError(null);
        }
      } catch (err) {
        console.error('❌ Catch error in fetch:', err);
        setError('Failed to fetch playlist');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPlaylist();
    }
  }, [id, playlists]);

  const handleRowClick = (song) => {
    const isCurrent = currentTrack && (currentTrack.id === song.id || currentTrack._id === song._id || currentTrack.videoId === song.videoId);
    if (isCurrent) {
      if (!isPlaying) togglePlay();
    } else {
      playTrack(song, playlistSongs);
    }
  };

  const handlePlayPlaylist = () => {
    if (playlistSongs.length > 0) {
      if (isShuffled) toggleShuffle();
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
    if (editName.trim() && !playlist?.isYouTube) {
      renamePlaylist(playlist.id, editName.trim());
      setIsEditingName(false);
    }
  };

  const handleDelete = () => {
    if (playlist?.isYouTube) {
      alert('This is a YouTube playlist and cannot be deleted.');
      setIsMenuOpen(false);
      return;
    }
    deletePlaylist(playlist.id);
    navigate('/library');
  };

  const formatDuration = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleShare = async () => {
    if (!playlist) return;

    if (playlist.isPrivate) {
      setShareMessage('This playlist is private and cannot be shared.');
      setIsMenuOpen(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/playlists/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: playlist.id,
          name: playlist.name,
          description: playlist.description || '',
          coverImage: playlist.coverImageUrl || '',
          songs: playlistSongs.map((song) => ({
            id: song.id || song._id || song.videoId,
            title: song.title || song.name || 'Untitled',
            artist: song.artist || song.channelTitle || 'Unknown',
            thumbnail: song.thumbnail || song.thumbnail_medium || song.coverArtUrl || '',
            duration: song.duration || 0,
            duration_string: song.duration_string || '0:00',
            url: song.url || `https://www.youtube.com/watch?v=${song.id || song.videoId}`,
            type: 'song',
          })),
          createdBy: playlist.createdBy || playlist.artist || user?.username || 'You',
          isPrivate: false,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Server error response:', text);
        throw new Error(`Server error (${response.status})`);
      }

      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Empty response from server');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'text:', responseText);
        throw new Error('Invalid response from server');
      }

      if (!data.success) {
        throw new Error(data.error?.message || 'Unable to share playlist');
      }

      const shareUrl = data.playlist.shareUrl || `${window.location.origin}/shared-playlist/${playlist.id}`;
      const updatedPlaylist = { ...playlist, shareUrl, isPrivate: false, createdBy: data.playlist.createdBy || playlist.createdBy };
      setPlaylist(updatedPlaylist);

      if (navigator.share) {
        try {
          await navigator.share({ title: updatedPlaylist.name, url: shareUrl });
          setShareMessage('Shared successfully');
        } catch (error) {
          await navigator.clipboard.writeText(shareUrl);
          setShareMessage('Link copied to clipboard');
        }
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareMessage('Link copied to clipboard');
      }
    } catch (error) {
      console.error('Failed to share playlist', error);
      setShareMessage(error.message || 'Sharing is unavailable in this browser');
    } finally {
      setIsMenuOpen(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
        <p className="text-muted-foreground">Loading playlist...</p>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-xl font-semibold mb-2">Oops!</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <button
          onClick={() => navigate('/library')}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="text-6xl mb-4">📭</div>
        <h2 className="text-xl font-bold text-white mb-2">Oops!</h2>
        <p className="text-muted-foreground mb-4">{error || 'Playlist not found'}</p>
        <button 
          onClick={() => navigate('/library')} 
          className="px-6 py-2 bg-primary rounded-xl text-white font-bold hover:bg-primary/80"
        >
          Go Back
        </button>
      </div>
    );
  }

  // ── Render playlist ──
  return (
    <div className="flex flex-col gap-8 pt-margin-desktop px-6 md:px-10 w-full max-w-6xl mx-auto pb-32">
      {/* Back navigation */}
      <button 
        onClick={() => navigate('/library')}
        className="flex items-center gap-xs text-on-surface-variant hover:text-primary transition-colors cursor-pointer w-fit select-none font-label-md text-label-md"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back to Library
      </button>

      {/* Playlist Hero Header */}
      <header className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 mb-2">
        <div className="w-52 h-52 rounded-2xl shadow-2xl overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/20">
          <PlaylistCover
            songs={playlistSongs}
            coverImageUrl={playlist.coverImageUrl}
            name={playlist.name}
            isAi={playlist.isAiGenerated}
            iconSize={64}
          />
        </div>

        <div className="flex-grow text-center md:text-left flex flex-col gap-1.5 min-w-0">
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
            {playlist.isAiGenerated ? '🤖 AI Generated Playlist' : playlist.isYouTube ? '📺 YouTube Playlist' : 'Playlist'}
          </span>
          {isEditingName && !playlist.isYouTube ? (
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="text" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                className="bg-surface-container-highest border border-primary/40 rounded-lg px-3 py-1.5 text-on-surface font-display-sm text-display-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <button onClick={handleRename} className="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-sm font-bold">Save</button>
              <button onClick={() => setIsEditingName(false)} className="bg-surface-container text-on-surface px-3 py-1.5 rounded-lg text-sm">Cancel</button>
            </div>
          ) : (
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface leading-tight font-extrabold truncate">
              {playlist.name || playlist.title}
            </h1>
          )}
          <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 max-w-2xl mt-1">
            {playlist.description || `By ${playlist.artist || playlist.createdBy || 'YouTube'}`}
          </p>
          <div className="flex items-center justify-center md:justify-start gap-sm mt-4 font-label-md text-label-md text-on-surface-variant flex-wrap">
            <span className="font-semibold text-on-surface">{playlistSongs.length} songs</span>
            <span>•</span>
            <span>Created by {playlist.createdBy || playlist.artist || user?.username || 'YouTube'}</span>
            {playlist.isYouTube && (
              <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">YouTube</span>
            )}
            {!playlist.isYouTube && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${playlist.isPrivate ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {playlist.isPrivate ? 'Private' : 'Public'}
              </span>
            )}
          </div>
          {shareMessage && (
            <p className="text-sm text-emerald-400">{shareMessage}</p>
          )}
        </div>

        <div className="flex items-center gap-3 relative" ref={menuRef}>
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
          
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all duration-200 cursor-pointer ml-2"
          >
            <span className="material-symbols-outlined">more_vert</span>
          </button>
          
          {isMenuOpen && (
            <div className="absolute top-14 right-0 w-48 bg-surface-container-high border border-outline-variant/20 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
              {!playlist.isYouTube && (
                <>
                  <button
                    onClick={() => {
                      setEditName(playlist.name);
                      setIsEditingName(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-on-surface hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Rename Playlist
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={playlist.isPrivate}
                    className={`w-full text-left px-4 py-3 text-sm font-medium ${playlist.isPrivate ? 'text-muted-foreground cursor-not-allowed' : 'text-on-surface hover:bg-white/5 cursor-pointer'} transition-colors flex items-center gap-2 ${playlist.isPrivate ? 'bg-white/5' : ''}`}
                  >
                    <Share2 className="h-4 w-4" />
                    {playlist.isPrivate ? 'Private playlists cannot be shared' : 'Share Playlist'}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2 cursor-pointer border-t border-outline-variant/10"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Delete Playlist
                  </button>
                </>
              )}
              {playlist.isYouTube && (
                <button
                  className="w-full text-left px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-white/5 transition-colors flex items-center gap-2 cursor-not-allowed"
                  disabled
                >
                  <span className="material-symbols-outlined text-[18px]">info</span>
                  YouTube Playlist (Read Only)
                </button>
              )}
            </div>
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
              {playlist.isYouTube ? 'This YouTube playlist has no songs available.' : 'Discover and add songs to this playlist from the Explore page or Search bar.'}
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
              <div className="col-span-3">Artist</div>
              <div className="col-span-2 text-right">Time</div>
            </div>

            {/* List Items */}
            <div className="flex flex-col gap-1 mt-2">
              {playlistSongs.map((song, index) => {
                const isCurrent = currentTrack && (currentTrack.id === song.id || currentTrack._id === song._id || currentTrack.videoId === song.videoId);
                const showPlaying = isCurrent && isPlaying;
                return (
                  <div 
                    key={song.id || song._id || song.videoId || index}
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
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          const isCurrent = currentTrack && (currentTrack.id === song.id || currentTrack._id === song._id || currentTrack.videoId === song.videoId);
                          if (!isCurrent) setPreviewTrack(song);
                          setNowPlayingOpen(true);
                        }}
                        className="w-12 h-12 rounded-lg shadow-md overflow-hidden bg-surface-container flex-shrink-0 cursor-pointer hover:opacity-85 transition-opacity"
                      >
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
                          {song.title || song.name}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                          {song.artist || song.channelTitle}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-3 hidden md:flex items-center font-body-md text-body-md text-on-surface-variant truncate">
                      {song.artist || song.channelTitle}
                    </div>

                    <div className="col-span-2 md:col-span-2 flex items-center justify-end gap-4 font-label-md text-label-md text-on-surface-variant">
                      {!playlist.isYouTube && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSongFromPlaylist(playlist.id, song.id || song._id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 cursor-pointer"
                          title="Remove from playlist"
                        >
                          <span className="material-symbols-outlined text-[18px] block">
                            delete
                          </span>
                        </button>
                      )}
                      <span>{song.duration_string || formatDuration(song.duration)}</span>
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