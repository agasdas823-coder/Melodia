import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePlayer } from "../../context/PlayerContext";
import { Plus, Check, FolderPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AddToPlaylistDropdown({ song }) {
  const { playlists, addSongToPlaylist, createPlaylist, addToQueue } = usePlayer();
  const [isOpen, setIsOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [addedPlaylistId, setAddedPlaylistId] = useState(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  // Compute position when opening
  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const panelW = 260;
    const panelH = 280;
    let top = rect.bottom + 6;
    let left = rect.left;

    // If panel overflows right, align to right edge of button
    if (left + panelW > window.innerWidth - 12) {
      left = rect.right - panelW;
    }
    // If panel overflows bottom, show above button
    if (top + panelH > window.innerHeight - 12) {
      top = rect.top - panelH - 6;
    }
    // Clamp
    left = Math.max(8, left);
    top = Math.max(8, top);

    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const onScroll = () => updatePosition();
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", onScroll);
      return () => {
        window.removeEventListener("scroll", onScroll, true);
        window.removeEventListener("resize", onScroll);
      };
    }
  }, [isOpen, updatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event) {
      if (
        btnRef.current && !btnRef.current.contains(event.target) &&
        panelRef.current && !panelRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setShowCreateInput(false);
        setNewPlaylistName("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  const handleAddToPlaylist = (playlistId, e) => {
    e.stopPropagation();
    addSongToPlaylist(playlistId, song);
    setAddedPlaylistId(playlistId);
    setTimeout(() => {
      setAddedPlaylistId(null);
      setIsOpen(false);
    }, 1000);
  };

  const handleAddToQueue = (e) => {
    e.stopPropagation();
    addToQueue(song);
    setIsOpen(false);
  };

  const handleCreateAndAdd = (e) => {
    e.stopPropagation();
    if (!newPlaylistName.trim()) return;
    const newPl = createPlaylist(newPlaylistName.trim());
    addSongToPlaylist(newPl.id, song);
    setAddedPlaylistId(newPl.id);
    setNewPlaylistName("");
    setShowCreateInput(false);
    setTimeout(() => {
      setAddedPlaylistId(null);
      setIsOpen(false);
    }, 1000);
  };

  const dropdownPanel = isOpen
    ? createPortal(
        <AnimatePresence>
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed w-[260px] rounded-2xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.7)] border border-white/10 z-[9999] p-2 text-left"
            style={{
              top: pos.top,
              left: pos.left,
              background: "linear-gradient(135deg, rgba(20,20,35,0.97) 0%, rgba(10,10,20,0.99) 100%)",
              backdropFilter: "blur(24px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Scrollable list */}
            <div className="max-h-48 overflow-y-auto scrollbar-none space-y-1 mb-2">
              <button
                onClick={handleAddToQueue}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-primary font-bold bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer text-left mb-2"
              >
                <span>Add to Queue</span>
                <Plus className="w-3.5 h-3.5 shrink-0" />
              </button>

              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2.5 py-1.5 select-none">
                Add to Playlist
              </p>
              {playlists.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2.5 py-2 select-none">No playlists created yet.</p>
              ) : (
                playlists.map((pl) => {
                  const isAdded = addedPlaylistId === pl.id;
                  return (
                    <button
                      key={pl.id}
                      onClick={(e) => handleAddToPlaylist(pl.id, e)}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-foreground font-semibold hover:bg-white/5 transition-colors cursor-pointer text-left"
                    >
                      <span className="truncate pr-4">{pl.name}</span>
                      {isAdded ? (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0 animate-pulse" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground shrink-0">{pl.songs?.length || 0} tracks</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Create playlist input */}
            <div className="border-t border-white/5 pt-2 mt-1">
              {!showCreateInput ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowCreateInput(true); }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-primary font-bold hover:bg-primary/10 transition-colors cursor-pointer text-left"
                >
                  <FolderPlus className="w-4 h-4" />
                  Create New Playlist
                </button>
              ) : (
                <div className="px-2 pb-1 space-y-2">
                  <input
                    type="text"
                    placeholder="Playlist name..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateAndAdd(e); }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all font-semibold"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowCreateInput(false); setNewPlaylistName(""); }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-muted-foreground hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateAndAdd}
                      disabled={!newPlaylistName.trim()}
                      className="px-3 py-1 rounded-lg text-[10px] font-bold bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95 transition-opacity cursor-pointer"
                    >
                      Create & Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )
    : null;

  return (
    <>
      {/* Glossy Plus Button */}
      <button
        ref={btnRef}
        onClick={handleToggle}
        className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-all duration-200 cursor-pointer shadow-lg hover:scale-105 active:scale-95 ${
          isOpen
            ? "bg-primary text-white scale-105 border-primary/20"
            : "bg-black/40 text-white/80 hover:text-white hover:bg-black/60"
        }`}
        title="Add to Playlist"
      >
        <Plus className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`} />
      </button>
      {dropdownPanel}
    </>
  );
}
