const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);
const PATH_KINDS_WITH_ID = new Set(['embed', 'shorts', 'live', 'v']);

/** Returns the 11-character video id of a YouTube link, or null when the text is not a YouTube video link. */
export const extractYoutubeVideoId = (input: string): string | null => {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/');
  let candidate: string | null = null;
  if (host === 'youtu.be') {
    candidate = segments[1] ?? null;
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (url.pathname === '/watch') {
      candidate = url.searchParams.get('v');
    } else if (PATH_KINDS_WITH_ID.has(segments[1] ?? '')) {
      candidate = segments[2] ?? null;
    }
  }
  return candidate !== null && VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
};