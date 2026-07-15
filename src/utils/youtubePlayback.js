export function isYouTubeTrack(track) {
  // YouTube playback disabled — never treat a track as a YouTube playback candidate
  return false;
}

export function getYouTubeVideoId(track) {
  if (!track) return null;
  return track.videoId || track.id || track._id || null;
}
