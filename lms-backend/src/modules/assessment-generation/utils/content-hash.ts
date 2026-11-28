import { createHash } from 'node:crypto';

/** Lower-cases, collapses whitespace and hashes, so trivially different copies of a question collide. */
export function computeContentHash(questionText: string): string {
  const normalised = questionText
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return createHash('sha256').update(normalised).digest('hex');
}