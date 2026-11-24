const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const DIVIDER = '━━━━━━━━━━━━━━━';

export interface ZaloMessageField {
  readonly icon: string;
  readonly label: string;
  /** Rỗng hoặc null thì dòng này bị bỏ qua. Giá trị nhiều dòng sẽ xuống dòng sau nhãn. */
  readonly value: string | null | undefined;
}

export interface ZaloMessageOptions {
  readonly header: string;
  readonly fields: readonly ZaloMessageField[];
  readonly footer?: string;
}

/** Ghép tin theo một khuôn chung: tiêu đề, các dòng thông tin, phần chân. */
export const composeZaloMessage = ({ header, fields, footer }: ZaloMessageOptions): string => {
  const lines = [header, DIVIDER];
  for (const { icon, label, value } of fields) {
    const text = value?.trim();
    if (!text) continue;
    lines.push(text.includes('\n') ? `${icon} ${label}:\n${text}` : `${icon} ${label}: ${text}`);
  }
  if (footer) lines.push(DIVIDER, footer);
  return lines.join('\n');
};

/** Định dạng `HH:mm dd/MM/yyyy` theo giờ Việt Nam. */
export const formatVnDateTime = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('hour')}:${get('minute')} ${get('day')}/${get('month')}/${get('year')}`;
};

/** Khoảng thời gian dễ đọc: "45 phút", "3 giờ", "2 ngày 3 giờ". */
export const formatDuration = (ms: number): string => {
  const totalMinutes = Math.max(1, Math.round(ms / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} ngày`);
  if (hours) parts.push(`${hours} giờ`);
  if (minutes && !days) parts.push(`${minutes} phút`);
  return parts.join(' ');
};

const stripTrailingSlashes = (value: string): string => {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) {
    end -= 1;
  }
  return value.slice(0, end);
};

/** Ghép địa chỉ frontend (biến FRONTEND_URL) với đường dẫn; trả null nếu chưa cấu hình. */
export const buildFrontendLink = (path: string): string | null => {
  const raw = process.env.FRONTEND_URL;
  const base = raw ? stripTrailingSlashes(raw) : undefined;
  return base ? `${base}${path}` : null;
};