export function getTrackTitle(track) {
  if (!track) return '';
  return (
    track.title ||
    track.name ||
    track.trackName ||
    track.songName ||
    ''
  ).trim();
}

export function getTrackArtist(track) {
  if (!track) return '';

  if (typeof track.artist === 'string' && track.artist.trim()) {
    return track.artist.trim();
  }

  const artistNames = [];
  const candidateArtists = track.artists || track.artists?.items || null;

  if (Array.isArray(candidateArtists) && candidateArtists.length) {
    candidateArtists.forEach((artist) => {
      if (!artist) return;
      if (typeof artist === 'string') {
        if (artist.trim()) artistNames.push(artist.trim());
      } else if (artist.name) {
        artistNames.push(artist.name.trim());
      }
    });
  }

  if (artistNames.length) {
    return artistNames.join(', ');
  }

  if (track.album?.artists) {
    const albumNames = track.album.artists
      .map((artist) => (artist?.name ? artist.name.trim() : ''))
      .filter(Boolean);
    if (albumNames.length) return albumNames.join(', ');
  }

  return '';
}
