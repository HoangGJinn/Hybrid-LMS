import type { ReactNode } from 'react';

export interface PreviewableFile {
  fileId?: string;
  fileName: string;
  fileUrl: string;
  size?: number;
}

export type FilePreviewKind =
  | 'pdf'
  | 'docx'
  | 'spreadsheet'
  | 'presentation'
  | 'image'
  | 'text'
  | 'unsupported';

export interface PdfPageOverlaySlotProps {
  pageNumber: number;
  width: number;
  height: number;
  scale: number;
}

export type PdfPageOverlayRenderer = (
  props: PdfPageOverlaySlotProps,
) => ReactNode;

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'json',
  'js',
  'jsx',
  'ts',
  'tsx',
  'py',
  'java',
  'c',
  'cpp',
  'cs',
  'go',
  'rs',
  'html',
  'css',
  'sql',
  'xml',
  'yaml',
  'yml',
  'sh',
]);

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'bmp',
]);

const SPREADSHEET_EXTENSIONS = new Set(['xlsx', 'xls', 'csv']);
const PRESENTATION_EXTENSIONS = new Set(['pptx', 'ppt']);

const getFileExtension = (fileName: string): string => {
  const cleanName = fileName.split('?')[0].split('#')[0];
  const lastDot = cleanName.lastIndexOf('.');
  if (lastDot < 0 || lastDot === cleanName.length - 1) return '';
  return cleanName.slice(lastDot + 1).toLowerCase();
};

export const detectPreviewKind = (fileName: string): FilePreviewKind => {
  const ext = getFileExtension(fileName);
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (SPREADSHEET_EXTENSIONS.has(ext)) return 'spreadsheet';
  if (PRESENTATION_EXTENSIONS.has(ext)) return 'presentation';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (TEXT_EXTENSIONS.has(ext)) return 'text';
  return 'unsupported';
};

