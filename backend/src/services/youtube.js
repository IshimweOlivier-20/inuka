// YouTube search for the lesson editor (admins): find free videos to add to a lesson.
// Uses the free YouTube Data API v3. Set YOUTUBE_API_KEY in backend/.env (Google Cloud → APIs → YouTube Data API v3 → Credentials).
// Free quota: 10,000 units a day; one search costs about 101 units, so roughly 95 searches a day. Results are cached for 6 hours.
import { HttpError } from '../middleware/errorHandler.js';

const base = () => (process.env.YOUTUBE_API_BASE || 'https://www.googleapis.com/youtube/v3').replace(/\/$/, '');
export const youtubeEnabled = () => !!process.env.YOUTUBE_API_KEY;

const cache = new Map(); // query -> { at, videos }
const SIX_HOURS = 6 * 60 * 60 * 1000;

// "PT1H2M10S" -> "1:02:10"
const duration = (iso) => {
  const m = String(iso || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const [h, mi, s] = [m[1], m[2], m[3]].map((x) => Number(x || 0));
  return h ? `${h}:${String(mi).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${mi}:${String(s).padStart(2, '0')}`;
};

const unescape = (s) => String(s || '').replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

async function get(path, params) {
  const url = `${base()}/${path}?${new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) }).catch(() => { throw new HttpError(502, 'YouTube could not be reached. Try again in a moment.'); });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data?.error?.errors?.[0]?.reason;
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') throw new HttpError(429, 'The free YouTube search limit for today is used up. Paste a YouTube link instead, or try again tomorrow.');
    throw new HttpError(502, `YouTube refused the search (${reason || res.status}). Check YOUTUBE_API_KEY.`);
  }
  return data;
}

export async function searchVideos(q, { language = 'en' } = {}) {
  if (!youtubeEnabled()) throw new HttpError(400, 'YouTube search is not set up. Add YOUTUBE_API_KEY in backend/.env, or paste a YouTube link.');
  const key = `${language}:${q.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < SIX_HOURS) return hit.videos;
  const found = await get('search', {
    part: 'snippet', q, type: 'video', maxResults: '12', safeSearch: 'strict', videoEmbeddable: 'true', relevanceLanguage: language,
  });
  const ids = (found.items || []).map((i) => i.id?.videoId).filter(Boolean);
  const details = ids.length ? await get('videos', { part: 'contentDetails,statistics', id: ids.join(',') }) : { items: [] };
  const extra = Object.fromEntries((details.items || []).map((v) => [v.id, v]));
  const videos = (found.items || []).filter((i) => i.id?.videoId).map((i) => ({
    id: i.id.videoId,
    title: unescape(i.snippet.title),
    channel: unescape(i.snippet.channelTitle),
    publishedAt: i.snippet.publishedAt,
    thumbnail: i.snippet.thumbnails?.medium?.url || i.snippet.thumbnails?.default?.url || `https://i.ytimg.com/vi/${i.id.videoId}/mqdefault.jpg`,
    duration: duration(extra[i.id.videoId]?.contentDetails?.duration),
    views: Number(extra[i.id.videoId]?.statistics?.viewCount || 0),
    url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
  }));
  cache.set(key, { at: Date.now(), videos });
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  return videos;
}
