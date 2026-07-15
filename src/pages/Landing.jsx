import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SongCard from '../components/song/SongCard';
import { musicService } from '../services/apiService';

export default function Landing() {
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch trending songs from backend API
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await musicService.search('trending popular music', { limit: 4 });
        setTrendingSongs(response.data.songs || []);
      } catch (err) {
        console.error('Failed to fetch trending songs from server, falling back to mock data:', err);
        // Fallback mock data
        setTrendingSongs([
          { id: 't1', title: 'Kind of Blue', artist: 'Miles Davis', genre: 'Jazz', duration: 320, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
          { id: 't2', title: 'So What', artist: 'Miles Davis', genre: 'Jazz', duration: 560, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
          { id: 't3', title: 'Blue Train', artist: 'John Coltrane', genre: 'Jazz', duration: 620, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
          { id: 't4', title: 'Take Five', artist: 'Dave Brubeck', genre: 'Jazz', duration: 324, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  return (
    <main className="w-full">
      {/* Hero Section */}
      <section className="relative min-h-[921px] flex items-center pt-24 px-margin-mobile md:px-margin-desktop overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <div
            className="w-full h-full bg-cover bg-center bg-no-repeat scale-105 transform opacity-60 mix-blend-luminosity"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuApFnyO0fnegWULmi3_uQaax_zYG93p9aiAwSabd_9SFCVAfHNBWV6GbnCqvV4hVm8Ox2jRlw2cqQnGXWAYOcC3B61rx3pyRb6rNhVlhHCMMeBBFJmEfMdXd3KuTQXcaKdnl_zReQplkcLB65Wfq8e52DPzegtBm7eTHvlzOx-dwiQ-83-JJZI1inFeLwDQMl4ly7IXVQhAtrAkVMBmCDLAKtAXuEKsMSa6GhegNRYMlIqqMSz1aEi2m8n2zZk9gg4TAIB5obCGz9c')",
            }}
          ></div>
          <div className="absolute inset-0 hero-gradient"></div>
          {/* Subtle Radial Glow */}
          <div className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] bg-primary-container/20 rounded-full blur-[120px] pointer-events-none"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
          <div className="lg:col-span-8 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-outline-variant/30 mb-md backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
                Now Available in High-Res Audio
              </span>
            </div>
            <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-on-background mb-6 leading-tight md:whitespace-nowrap">
              Your Music,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-container">
                Elevated.
              </span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-lg">
              Experience your library in unparalleled fidelity. Melodia combines intelligent cloud streaming with a
              pure, distraction-free interface designed for the discerning listener.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-sm w-full sm:w-auto">
              <Link
                to="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-inverse-primary text-surface-container-lowest font-label-md text-label-md rounded-lg px-8 py-4 hover:scale-105 transition-transform duration-300 shadow-xl shadow-inverse-primary/25"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  play_arrow
                </span>
                Start Listening Free
              </Link>
              <a
                href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-transparent border border-outline-variant text-on-background font-label-md text-label-md rounded-lg px-8 py-4 hover:bg-white/5 transition-colors duration-300"
              >
                Explore Features
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Songs Showcase Section */}
      <section className="py-24 px-margin-mobile md:px-margin-desktop bg-background relative z-10 w-full">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">Trending Now</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Top streams on Melodia this week. Click any song to preview instantly.
              </p>
            </div>
            <Link to="/signup" className="text-primary hover:underline font-label-md text-label-md mt-4 md:mt-0 flex items-center gap-1">
              Listen to the full catalog <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-gutter">
              {trendingSongs.slice(0, 4).map((song) => (
                <SongCard key={song.id || song._id} song={song} queue={trendingSongs} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Bento Grid Section */}
      <section id="features" className="py-24 px-margin-mobile md:px-margin-desktop bg-surface-container-lowest relative z-10 w-full">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-headline-lg text-headline-lg text-on-background mb-4">Precision Engineered for Sound</h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xl mx-auto">
              Everything you need to manage, discover, and experience your audio library seamlessly across all your devices.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter auto-rows-[minmax(280px,auto)]">
            {/* Feature 1: Cloud Streaming (Large Span) */}
            <div className="md:col-span-8 bg-surface-container rounded-xl p-8 border border-outline-variant/20 hover:scale-[1.01] hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-300 group relative overflow-hidden flex flex-col justify-between">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-container/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center mb-6 border border-outline-variant/30">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>
                    cloud_sync
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-background mb-3">Lossless Cloud Streaming</h3>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                  Your entire library, available anywhere in stunning FLAC quality. Our proprietary delivery network ensures
                  zero buffering, even on cellular connections.
                </p>
              </div>
              {/* Abstract Visual representation */}
              <div className="relative h-24 w-full mt-8 overflow-hidden rounded-lg bg-surface-container-highest/50 border border-outline-variant/10 flex items-center justify-center gap-1">
                <div className="w-2 h-12 bg-primary/40 rounded-full animate-pulse"></div>
                <div className="w-2 h-16 bg-primary/60 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-20 bg-primary rounded-full animate-pulse delay-150"></div>
                <div className="w-2 h-14 bg-primary/60 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-10 bg-primary/40 rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Feature 2: Smart Playlists */}
            <div className="md:col-span-4 bg-surface-container rounded-xl p-8 border border-outline-variant/20 hover:scale-[1.02] hover:shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-all duration-300 group relative flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center mb-6 border border-outline-variant/30">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>
                    auto_awesome
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-background mb-3">Smart Playlists</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Context-aware curation that adapts to your mood, the time of day, and your listening history. Let the
                  algorithm craft the perfect sonic journey.
                </p>
              </div>
            </div>

            {/* Feature 3: Live Search */}
            <div className="md:col-span-12 bg-surface-container rounded-xl p-8 border border-outline-variant/20 hover:scale-[1.01] hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-300 group relative flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 text-left">
                <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center mb-6 border border-outline-variant/30">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>
                    manage_search
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-background mb-3">Lightning Fast Live Search</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Find tracks, artists, and deep-cut albums instantly. Our indexed search engine brings results to your
                  fingertips before you finish typing.
                </p>
              </div>
              {/* Search UI Mockup */}
              <div className="w-full md:w-[400px] bg-background border border-outline-variant/30 rounded-lg p-4 shadow-2xl">
                <div className="flex items-center gap-3 bg-surface-container-highest rounded-md px-3 py-2 mb-4">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
                  <span className="font-body-md text-body-md text-on-background">Miles Davis</span>
                  <span className="w-px h-4 bg-primary animate-pulse ml-auto"></span>
                </div>
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-3 p-2 rounded hover:bg-surface-container-high transition-colors cursor-pointer">
                    <div className="w-10 h-10 bg-surface-container-highest rounded flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px]">album</span>
                    </div>
                    <div>
                      <div className="font-label-md text-label-md text-on-background">Kind of Blue</div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant">Album • 1959</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded hover:bg-surface-container-high transition-colors cursor-pointer">
                    <div className="w-10 h-10 bg-surface-container-highest rounded flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px]">person</span>
                    </div>
                    <div>
                      <div className="font-label-md text-label-md text-on-background">Miles Davis Quintet</div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant">Artist</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
