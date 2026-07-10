/**
 * PlaylistCover — renders a 2×2 mosaic grid of the first 4 song covers,
 * or a single cover image, or a fallback icon.
 */
export default function PlaylistCover({ songs = [], coverImageUrl, name = "Playlist", className = "", iconSize = 48, isAi = false }) {
  const covers = songs
    .slice(0, 4)
    .map((s) => s.thumbnail || s.thumbnail_medium || s.coverArtUrl)
    .filter(Boolean);

  const wrapperClass = `w-full h-full overflow-hidden ${className}`;

  // If 4 unique covers → 2×2 grid
  if (covers.length >= 4) {
    return (
      <div className={`${wrapperClass} grid grid-cols-2 grid-rows-2`}>
        {covers.slice(0, 4).map((url, i) => (
          <img key={i} src={url} alt={`${name} cover ${i + 1}`} className="w-full h-full object-cover" />
        ))}
      </div>
    );
  }

  // If 2-3 covers → show what we have + fill rest with gradient
  if (covers.length >= 2) {
    const grid = [...covers];
    while (grid.length < 4) grid.push(null);
    return (
      <div className={`${wrapperClass} grid grid-cols-2 grid-rows-2`}>
        {grid.map((url, i) =>
          url ? (
            <img key={i} src={url} alt={`${name} cover ${i + 1}`} className="w-full h-full object-cover" />
          ) : (
            <div key={i} className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/20" />
          )
        )}
      </div>
    );
  }

  // If 1 cover → single image
  if (covers.length === 1 || coverImageUrl) {
    return (
      <div className={wrapperClass}>
        <img src={covers[0] || coverImageUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  // Fallback icon
  return (
    <div className={`${wrapperClass} flex items-center justify-center bg-surface-container-highest`}>
      <span
        className="material-symbols-outlined text-primary"
        style={{ fontSize: iconSize, fontVariationSettings: "'FILL' 1" }}
      >
        {isAi ? "auto_awesome" : "playlist_play"}
      </span>
    </div>
  );
}
