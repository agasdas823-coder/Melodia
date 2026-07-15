import { useState } from "react";
import { X, Globe2, Lock, Sparkles } from "lucide-react";

const initialForm = {
  name: "",
  description: "",
  genre: "",
  isPrivate: false,
  tags: "",
};

export default function CreatePlaylistModal({ isOpen, onClose, onCreate, submitting = false }) {
  const [formData, setFormData] = useState(initialForm);

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name.trim()) return;

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      genre: formData.genre.trim(),
      isPrivate: formData.isPrivate,
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    await onCreate(payload);
    setFormData(initialForm);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#111120] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h3 className="text-lg font-black text-white">Create Playlist</h3>
            <p className="text-sm text-muted-foreground">Add a new manual playlist for your library.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">Playlist Name</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="My chill mix"
              required
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Optional description"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">Genre</label>
            <select
              name="genre"
              value={formData.genre}
              onChange={handleChange}
              className="w-full appearance-none rounded-2xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-primary/50"
            >
              <option value="" className="bg-[#1a1a2e] text-white">Select genre</option>
              <option value="Pop" className="bg-[#1a1a2e] text-white">Pop</option>
              <option value="Rock" className="bg-[#1a1a2e] text-white">Rock</option>
              <option value="Hip Hop" className="bg-[#1a1a2e] text-white">Hip Hop</option>
              <option value="Electronic" className="bg-[#1a1a2e] text-white">Electronic</option>
              <option value="Jazz" className="bg-[#1a1a2e] text-white">Jazz</option>
              <option value="Classical" className="bg-[#1a1a2e] text-white">Classical</option>
              <option value="R&B" className="bg-[#1a1a2e] text-white">R&B</option>
              <option value="Country" className="bg-[#1a1a2e] text-white">Country</option>
              <option value="Reggae" className="bg-[#1a1a2e] text-white">Reggae</option>
              <option value="Metal" className="bg-[#1a1a2e] text-white">Metal</option>
              <option value="Folk" className="bg-[#1a1a2e] text-white">Folk</option>
              <option value="Blues" className="bg-[#1a1a2e] text-white">Blues</option>
            </select>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Privacy</p>
              <p className="text-xs text-muted-foreground">Choose whether this playlist is public or private.</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, isPrivate: !prev.isPrivate }))}
              className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-all ${
                formData.isPrivate ? "bg-primary/20 text-primary" : "bg-white/10 text-white"
              }`}
            >
              {formData.isPrivate ? <Lock className="h-4 w-4" /> : <Globe2 className="h-4 w-4" />}
              {formData.isPrivate ? "Private" : "Public"}
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">Tags</label>
            <input
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="chill, study, lo-fi"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.name.trim()}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-black text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              {submitting ? "Creating..." : "Create Playlist"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
