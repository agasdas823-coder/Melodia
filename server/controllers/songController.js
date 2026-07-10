const MOCK_TRACKS = [
  {
    _id: "track-1",
    id: "track-1",
    title: "Lofi Study",
    name: "Lofi Study",
    artist: "FASSounds",
    artists: [{ name: "FASSounds" }],
    album: "Study Beats",
    duration: 362,
    coverArtUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    preview_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    popularity: 95
  },
  {
    _id: "track-2",
    id: "track-2",
    title: "Ambient Gold",
    name: "Ambient Gold",
    artist: "SergeQuadrado",
    artists: [{ name: "SergeQuadrado" }],
    album: "Golden Ambient",
    duration: 373,
    coverArtUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    preview_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    popularity: 88
  },
  {
    _id: "track-3",
    id: "track-3",
    title: "Summer Breeze",
    name: "Summer Breeze",
    artist: "Alex-Productions",
    artists: [{ name: "Alex-Productions" }],
    album: "Summer Vibes",
    duration: 302,
    coverArtUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    preview_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    popularity: 92
  },
  {
    _id: "track-4",
    id: "track-4",
    title: "Chill Lofi Beat",
    name: "Chill Lofi Beat",
    artist: "LofiDreamer",
    artists: [{ name: "LofiDreamer" }],
    album: "Lo-Fi Nights",
    duration: 302,
    coverArtUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    preview_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    popularity: 81
  },
  {
    _id: "track-5",
    id: "track-5",
    title: "Upbeat Synthwave",
    name: "Upbeat Synthwave",
    artist: "RetroFuture",
    artists: [{ name: "RetroFuture" }],
    album: "Outrun",
    duration: 273,
    coverArtUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    preview_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    popularity: 97
  }
];

export const getSongs = async (req, res, next) => {
  try {
    const { sort, artist, q } = req.query;
    let songs = [...MOCK_TRACKS];

    if (q) {
      const query = q.toLowerCase();
      songs = songs.filter(s => 
        s.title.toLowerCase().includes(query) || 
        s.artist.toLowerCase().includes(query) || 
        s.album.toLowerCase().includes(query)
      );
    } else if (artist) {
      const art = artist.toLowerCase();
      songs = songs.filter(s => s.artist.toLowerCase().includes(art));
    }

    if (sort === 'trending') {
      songs.sort((a, b) => b.popularity - a.popularity);
    }

    return res.status(200).json({ success: true, count: songs.length, songs });
  } catch (error) {
    next(error);
  }
};

export const getSongById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const song = MOCK_TRACKS.find(s => s.id === id);
    if (!song) {
      return res.status(404).json({
        success: false,
        error: { code: 'SONG_NOT_FOUND', message: `No track found for id: ${id}` }
      });
    }
    return res.status(200).json({ success: true, song });
  } catch (error) {
    next(error);
  }
};

export const getSongLyrics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const song = MOCK_TRACKS.find(s => s.id === id);
    if (!song) {
      return res.status(404).json({ success: false, error: { message: 'Track not found' } });
    }
    const lyrics = `[00:00.00] Enjoy the beautiful melody of ${song.title} by ${song.artist}\n[00:15.00] This is a mock lyric visualization\n[00:30.00] Showing full synchronization\n[00:45.00] Restoring lyrics successfully!`;
    return res.status(200).json({ success: true, artist: song.artist, title: song.title, lyrics });
  } catch (error) {
    next(error);
  }
};

export const getSongPreview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const song = MOCK_TRACKS.find(s => s.id === id);
    if (!song) {
      return res.status(404).json({ success: false, previewUrl: null });
    }
    return res.status(200).json({ success: true, previewUrl: song.audioUrl });
  } catch (error) {
    next(error);
  }
};
