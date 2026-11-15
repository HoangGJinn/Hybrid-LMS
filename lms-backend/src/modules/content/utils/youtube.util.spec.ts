import { describe, expect, it } from 'vitest';
import { extractYoutubeVideoId } from './youtube.util.js';

describe('extractYoutubeVideoId', () => {
  it('extracts 11-char IDs from standard watch, short, embed, shorts, live, and nocookie URLs', () => {
    expect(extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    );
    expect(
      extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s'),
    ).toBe('dQw4w9WgXcQ');
    expect(
      extractYoutubeVideoId('http://m.youtube.com/shorts/abc_def-123'),
    ).toBe('abc_def-123');
    expect(
      extractYoutubeVideoId('https://youtube-nocookie.com/embed/dQw4w9WgXcQ'),
    ).toBe('dQw4w9WgXcQ');
    expect(
      extractYoutubeVideoId('https://youtube.com/live/dQw4w9WgXcQ'),
    ).toBe('dQw4w9WgXcQ');
  });

  it('returns null for invalid URLs, non-http protocols, other hosts, or invalid IDs', () => {
    expect(extractYoutubeVideoId('not a url')).toBeNull();
    expect(extractYoutubeVideoId('ftp://youtu.be/dQw4w9WgXcQ')).toBeNull();
    expect(extractYoutubeVideoId('https://vimeo.com/12345678901')).toBeNull();
    expect(extractYoutubeVideoId('https://youtube.com/watch?v=short')).toBeNull();
    expect(extractYoutubeVideoId('https://youtube.com/channel/abc')).toBeNull();
  });
});

