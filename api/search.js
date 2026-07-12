import ytSearch from 'yt-search';
import axios from 'axios';

// Helper: convert milliseconds -> "m:ss"
function fmtDurationMs(ms) {
  if (!ms || isNaN(ms)) return '0:00';
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const q = (req.query.q || req.query.query || '').trim();
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const type = req.query.type || 'all';

  if (!q) {
    return res.status(400).json({ success: false, error: { message: 'Query parameter "q" is required.' } });
  }

  try {
    if (type === 'playlist' || type === 'album') {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAw%3D%3D`;
      const ytResp = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      const htmlMatch = ytResp.data.match(/var ytInitialData = (.+?);<\/script>/s);
      if (!htmlMatch) {
        return res.json({ success: true, count: 0, songs: [] });
      }

      const ytData = JSON.parse(htmlMatch[1]);
      const items = ytData?.contents?.twoColumnSearchResultsRenderer
        ?.primaryContents?.sectionListRenderer?.contents?.[0]
        ?.itemSectionRenderer?.contents || [];

      const playlists = items
        .filter(item => item.lockupViewModel)
        .slice(0, limit)
        .map(item => {
          const vm = item.lockupViewModel;
          const title = vm?.metadata?.lockupMetadataViewModel?.title?.content || 'Untitled';
          const thumbSrc = vm?.contentImage?.collectionThumbnailViewModel
            ?.primaryThumbnail?.thumbnailViewModel?.image?.sources;
          const thumbnail = thumbSrc?.[thumbSrc.length - 1]?.url || '';
          const badgeText = vm?.contentImage?.collectionThumbnailViewModel
            ?.primaryThumbnail?.thumbnailViewModel?.overlays?.[0]
            ?.thumbnailOverlayBadgeViewModel?.thumbnailBadges?.[0]
            ?.thumbnailBadgeViewModel?.text || '';
          const videoCount = parseInt(badgeText) || 0;
          const metaRows = vm?.metadata?.lockupMetadataViewModel?.metadata
            ?.contentMetadataViewModel?.metadataRows || [];
          const channelName = metaRows?.[0]?.metadataParts?.[0]?.text?.content || 'YouTube';

          return {
            id: vm.contentId,
            _id: vm.contentId,
            title,
            name: title,
            artist: channelName,
            type: 'playlist',
            thumbnail,
            thumbnail_medium: thumbnail,
            coverArtUrl: thumbnail,
            videoCount,
          };
        });

      return res.json({ success: true, count: playlists.length, songs: playlists });
    } else {
      let songs = [];

      const searchAndFilter = async (searchStr) => {
        let result = null;
        try {
          result = await ytSearch(searchStr);
        } catch (err) {
          console.error('ytSearch error:', err);
        }
        
        if (!result || !result.videos) return [];
        return result.videos
          .filter(v => {
            const seconds = v.duration?.seconds || 0;
            if (seconds < 90) return false;
            if (seconds > 1200) return false;
            const title = (v.title || '').toLowerCase();
            if (title.includes('podcast') || title.includes('tutorial')) return false;
            if (title.includes('gaming') || title.includes('montage')) return false;
            if (title.includes('jukebox') || title.includes('non stop') || title.includes('non-stop')) return false;
            return true;
          })
          .slice(0, limit)
          .map((v) => {
            const seconds = v.duration?.seconds || 0;
            const thumbnail = v.thumbnail || '';
            return {
              id: v.videoId, _id: v.videoId, title: v.title, name: v.title,
              artist: v.author?.name || 'YouTube', artists: [{ name: v.author?.name || 'YouTube' }],
              album: 'YouTube Single',
              thumbnail: thumbnail, thumbnail_medium: thumbnail, coverArtUrl: thumbnail,
              duration: seconds, duration_ms: seconds * 1000,
              duration_string: v.duration?.timestamp || fmtDurationMs(seconds * 1000),
              views: v.views || '', url: v.url || `https://www.youtube.com/watch?v=${v.videoId}`,
              audioUrl: null, audio_url: null, previewUrl: null, preview_url: null, type: 'song'
            };
          });
      };

      songs = await searchAndFilter(`${q} audio`);
      if (songs.length === 0) {
        songs = await searchAndFilter(q);
      }

      return res.json({ success: true, count: songs.length, songs });
    }
  } catch (error) {
    console.error('Serverless Search Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
