import { Howl } from 'howler';
import { API_URL } from './config';

export class AudioBridge {
  constructor({ volume = 0.7, onPlay, onPause, onEnd, onProgress, onLoad, onError }) {
    this.volume = volume;
    this.onPlayCallback = onPlay;
    this.onPauseCallback = onPause;
    this.onEndCallback = onEnd;
    this.onProgressCallback = onProgress;
    this.onLoadCallback = onLoad;
    this.onErrorCallback = onError;

    this.howl = null;
    this.progressInterval = null;
    this.currentTrackId = null;
    this.prefetchCache = {};
  }

  prefetch(track) {
    if (!track || !track.id) return;
    if (this.prefetchCache[track.id]) return; // Already cached
    
    // Do not prefetch if it's already the current playing track
    if (this.currentTrackId === track.id) return;

    const previewUrl = track.previewUrl || track.preview_url;
    if (!previewUrl) {
      console.warn('[AudioBridge] Cannot prefetch: no preview URL available.');
      return;
    }

    try {
      const howl = new Howl({
        src: [previewUrl],
        html5: true,
        preload: 'metadata',
        volume: this.volume,
        format: ['m4a', 'mp3', 'aac']
      });

      this.prefetchCache[track.id] = howl;
    } catch (err) {
      console.error('AudioBridge prefetch error:', err);
    }
  }

  load(track) {
    if (!track) return;
    this.unload();
    this.currentTrackId = track.id;

    const previewUrl = track.previewUrl || track.preview_url;
    if (!previewUrl) {
      console.warn('[AudioBridge] Cannot load: no preview URL available.');
      return;
    }

    try {
      this.howl = new Howl({
        src: [previewUrl],
        html5: true,
        volume: this.volume,
        format: ['m4a', 'mp3', 'aac'],
        onplay: () => {
          if (this.onPlayCallback) this.onPlayCallback();
          this.startProgress();
        },
        onpause: () => {
          if (this.onPauseCallback) this.onPauseCallback();
          this.stopProgress();
        },
        onend: () => {
          if (this.onEndCallback) this.onEndCallback();
          this.stopProgress();
        },
        onload: () => {
          if (this.onLoadCallback) {
            this.onLoadCallback(this.howl.duration());
          }
        },
        onloaderror: (id, err) => {
          console.error("Howler load error", err);
          if (this.onErrorCallback) this.onErrorCallback('load', err);
        },
        onplayerror: (id, err) => {
          console.error("Howler play error", err);
          this.howl.once('unlock', () => {
            this.howl.play();
          });
        }
      });
    } catch (err) {
      console.error('AudioBridge load error:', err);
    }
  }

  /**
   * Play a track from a pre-resolved direct URL (e.g. JioSaavn media_url).
   * Bypasses the /api/stream/ server route entirely.
   * @param {string} url   - Direct audio URL (mp3, m4a, webm, etc.)
   * @param {object} track - Track metadata (used for currentTrackId)
   */
  playUrl(url, track) {
    if (!url || !track) return;

    // If this is already the active track and howl is loaded, just resume
    if (this.currentTrackId === track.id && this.howl) {
      if (!this.howl.playing()) {
        this.howl.play();
      }
      return;
    }

    this.unload();
    this.currentTrackId = track.id;

    try {
      this.howl = new Howl({
        src: [url],
        html5: true,
        preload: 'metadata',
        volume: this.volume,
        format: ['mp3', 'm4a', 'mp4', 'webm', 'aac'],
        onplay: () => {
          if (this.onPlayCallback) this.onPlayCallback();
          this.startProgress();
        },
        onpause: () => {
          if (this.onPauseCallback) this.onPauseCallback();
          this.stopProgress();
        },
        onend: () => {
          if (this.onEndCallback) this.onEndCallback();
          this.stopProgress();
        },
        onload: () => {
          if (this.onLoadCallback) {
            this.onLoadCallback(this.howl.duration());
          }
        },
        onloaderror: (id, err) => {
          console.error('[AudioBridge] playUrl load error:', err);
          if (this.onErrorCallback) this.onErrorCallback('load', err);
        },
        onplayerror: (id, err) => {
          console.error('[AudioBridge] playUrl play error:', err);
          this.howl.once('unlock', () => {
            this.howl.play();
          });
        },
      });

      this.howl.play();
    } catch (err) {
      console.error('[AudioBridge] playUrl error:', err);
      if (this.onErrorCallback) this.onErrorCallback('exception', err);
    }
  }

  async play(track) {
    if (!track) return;

    if (this.currentTrackId === track.id && this.howl) {
      if (!this.howl.playing()) {
        this.howl.play();
      }
      return;
    }

    this.unload();
    this.currentTrackId = track.id;

    try {
      let preloadedHowl = this.prefetchCache[track.id];
      
      // Cleanup any other unused prefetches to free memory
      Object.keys(this.prefetchCache).forEach(key => {
        if (key !== track.id) {
          this.prefetchCache[key].unload();
        }
      });
      this.prefetchCache = {};

      if (preloadedHowl) {
        // Swap to preloaded instance and attach callbacks
        this.howl = preloadedHowl;
        this.howl.on('play', () => {
          if (this.onPlayCallback) this.onPlayCallback();
          this.startProgress();
        });
        this.howl.on('pause', () => {
          if (this.onPauseCallback) this.onPauseCallback();
          this.stopProgress();
        });
        this.howl.on('end', () => {
          if (this.onEndCallback) this.onEndCallback();
          this.stopProgress();
        });
        this.howl.on('load', () => {
          if (this.onLoadCallback) {
            this.onLoadCallback(this.howl.duration());
          }
        });
        this.howl.on('loaderror', (id, err) => {
          console.error("Howler preloaded load error", err);
        });
        this.howl.on('playerror', (id, err) => {
          console.error("Howler preloaded play error", err);
          this.howl.once('unlock', () => {
            this.howl.play();
          });
        });
        
        // Ensure volume is correct
        this.howl.volume(this.volume);
        
        // If it was already loaded during prefetch, trigger onLoadCallback manually
        if (this.howl.state() === 'loaded' && this.onLoadCallback) {
          this.onLoadCallback(this.howl.duration());
        }
      } else {
        const previewUrl = track.previewUrl || track.preview_url;
        if (!previewUrl) {
          console.warn('[AudioBridge] Cannot play: no preview URL available.');
          if (this.onErrorCallback) this.onErrorCallback('load', 'No preview URL available');
          return;
        }

        this.howl = new Howl({
          src: [previewUrl],
          html5: true, // Force HTML5 Audio to stream the file instead of downloading entirely
          preload: 'metadata',
          volume: this.volume,
          format: ['m4a', 'mp3', 'aac'],
          onplay: () => {
            if (this.onPlayCallback) this.onPlayCallback();
            this.startProgress();
          },
          onpause: () => {
            if (this.onPauseCallback) this.onPauseCallback();
            this.stopProgress();
          },
          onend: () => {
            if (this.onEndCallback) this.onEndCallback();
            this.stopProgress();
          },
          onload: () => {
            if (this.onLoadCallback) {
              this.onLoadCallback(this.howl.duration());
            }
          },
          onloaderror: (id, err) => {
            console.error("Howler load error", err);
            if (this.onErrorCallback) this.onErrorCallback('load', err);
          },
          onplayerror: (id, err) => {
            console.error("Howler play error", err);
            this.howl.once('unlock', () => {
              this.howl.play();
            });
          }
        });
      }

      this.howl.play();
    } catch (err) {
      console.error('AudioBridge play error:', err);
    }
  }

  /**
   * Play a track using a pre-resolved direct URL (e.g. from JioSaavn).
   * This bypasses the /api/stream/ URL construction used by play().
   *
   * @param {string} url   - Direct audio stream URL
   * @param {object} track - Track metadata (used for currentTrackId tracking)
   */
  async playUrl(url, track) {
    if (!url || !track) return;

    // If same track is already loaded with this url and howl exists, just play
    if (this.currentTrackId === track.id && this.howl) {
      if (!this.howl.playing()) {
        this.howl.play();
      }
      return;
    }

    this.unload();
    this.currentTrackId = track.id;

    // Clear any prefetch cache since we have a direct URL
    Object.values(this.prefetchCache).forEach(h => h.unload());
    this.prefetchCache = {};

    try {
      this.howl = new Howl({
        src: [url],
        html5: true,
        preload: 'metadata',
        volume: this.volume,
        format: ['mp4', 'm4a', 'webm', 'mp3'],
        onplay: () => {
          if (this.onPlayCallback) this.onPlayCallback();
          this.startProgress();
        },
        onpause: () => {
          if (this.onPauseCallback) this.onPauseCallback();
          this.stopProgress();
        },
        onend: () => {
          if (this.onEndCallback) this.onEndCallback();
          this.stopProgress();
        },
        onload: () => {
          if (this.onLoadCallback) {
            this.onLoadCallback(this.howl.duration());
          }
        },
        onloaderror: (id, err) => {
          console.error('AudioBridge playUrl load error:', err);
        },
        onplayerror: (id, err) => {
          console.error('AudioBridge playUrl play error:', err);
          this.howl.once('unlock', () => {
            this.howl.play();
          });
        },
      });

      this.howl.play();
    } catch (err) {
      console.error('AudioBridge playUrl error:', err);
    }
  }

  pause() {
    if (this.howl && this.howl.playing()) {
      this.howl.pause();
    }
  }

  seek(time) {
    if (this.howl) {
      this.howl.seek(time);
    }
  }

  setVolume(volume) {
    this.volume = volume;
    if (this.howl) {
      this.howl.volume(volume);
    }
  }

  startProgress() {
    this.stopProgress();
    this.progressInterval = setInterval(() => {
      if (this.howl && this.howl.playing() && this.onProgressCallback) {
        this.onProgressCallback(this.howl.seek());
      }
    }, 1000);
  }

  stopProgress() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  unload() {
    this.stopProgress();
    if (this.howl) {
      this.howl.unload();
      this.howl = null;
    }
    this.currentTrackId = null;
  }
}
