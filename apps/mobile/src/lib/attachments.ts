export const MAX_POST_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

// Mirrors the web whitelist (apps/web/src/lib/validations.ts).
export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.csv', '.txt',
];

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/** A file staged for upload during compose (normalized from either picker). */
export interface PickedAsset {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

export function isAllowedFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return ALLOWED_ATTACHMENT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** True if a stored/picked attachment should render as an image. */
export function isImageAttachment(att: { file_type?: string; file_name: string }): boolean {
  if (att.file_type && IMAGE_MIME_TYPES.includes(att.file_type)) return true;
  return /\.(jpe?g|png|gif|webp)$/i.test(att.file_name);
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
