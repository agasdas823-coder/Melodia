import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('');
  const [duration, setDuration] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUpload = (e) => {
    e.preventDefault();
    if (title && artist && genre && duration) {
      setSuccess(true);
      setTitle('');
      setArtist('');
      setGenre('');
      setDuration('');
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="pt-24 px-margin-mobile md:px-margin-desktop min-h-screen max-w-7xl mx-auto flex flex-col justify-center items-center text-center">
        <span className="material-symbols-outlined text-error text-[64px] mb-4">gpp_bad</span>
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-background mb-4">
          Access Denied
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md">
          You do not have the required permissions to access this page. Admin privileges are required.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-24 px-margin-mobile md:px-margin-desktop min-h-screen max-w-7xl mx-auto flex flex-col gap-lg pb-24">
      <div>
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-background mb-2">
          Admin Panel
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Upload and manage the global Melodia music catalog.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Upload Form */}
        <div className="lg:col-span-6 bg-surface-container border border-outline-variant/20 rounded-2xl p-8 shadow-xl">
          <h3 className="font-headline-md text-headline-md text-on-background mb-6">Upload New Song</h3>
          
          {success && (
            <div className="mb-6 p-4 bg-primary-container/20 text-primary border border-primary/20 rounded-lg font-label-md text-label-md">
              Song metadata successfully uploaded to catalog!
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-6">
            <div>
              <label className="block text-on-background font-label-md text-label-md mb-2">Song Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Autumn Leaves"
                className="w-full bg-background border border-outline-variant/30 rounded-lg px-4 py-3 text-on-background placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-on-background font-label-md text-label-md mb-2">Artist Name</label>
              <input
                type="text"
                required
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="e.g. Cannonball Adderley"
                className="w-full bg-background border border-outline-variant/30 rounded-lg px-4 py-3 text-on-background placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-sm">
              <div>
                <label className="block text-on-background font-label-md text-label-md mb-2">Genre</label>
                <input
                  type="text"
                  required
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="e.g. Jazz"
                  className="w-full bg-background border border-outline-variant/30 rounded-lg px-4 py-3 text-on-background placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-on-background font-label-md text-label-md mb-2">Duration (Seconds)</label>
                <input
                  type="number"
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 340"
                  className="w-full bg-background border border-outline-variant/30 rounded-lg px-4 py-3 text-on-background placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center bg-inverse-primary text-surface-container-lowest font-label-md text-label-md rounded-lg py-3.5 hover:opacity-90 transition-opacity font-semibold shadow-lg shadow-inverse-primary/20 cursor-pointer"
            >
              Upload Song
            </button>
          </form>
        </div>

        {/* Catalog Table */}
        <div className="lg:col-span-6 bg-surface-container border border-outline-variant/20 rounded-2xl p-8 shadow-xl">
          <h3 className="font-headline-md text-headline-md text-on-background mb-6">Catalog Overview</h3>
          <div className="border border-outline-variant/10 rounded-xl overflow-hidden">
            <table className="w-full text-left font-body-md text-body-md">
              <thead>
                <tr className="bg-surface-container-high border-b border-outline-variant/20 text-on-surface-variant">
                  <th className="p-4 font-semibold">Title</th>
                  <th className="p-4 font-semibold">Artist</th>
                  <th className="p-4 font-semibold">Genre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                <tr>
                  <td className="p-4 text-on-background font-semibold">Kind of Blue</td>
                  <td className="p-4 text-on-surface-variant">Miles Davis</td>
                  <td className="p-4"><span className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">Jazz</span></td>
                </tr>
                <tr>
                  <td className="p-4 text-on-background font-semibold">Blue Train</td>
                  <td className="p-4 text-on-surface-variant">John Coltrane</td>
                  <td className="p-4"><span className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">Jazz</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
