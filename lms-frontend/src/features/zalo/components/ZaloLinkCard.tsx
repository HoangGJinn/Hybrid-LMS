import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { ZALO_BOT_LINK, ZALO_BOT_NAME } from '@core/config/env';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';
import { cn } from '@shared/utils/cn';
import { zaloApi } from '../api/zaloApi';

const StepNumber = ({ n }: { n: number }) => (
  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
    {n}
  </span>
);

export default function ZaloLinkCard() {
  const [linked, setLinked] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const fetchStatus = async () => {
    const s = await zaloApi.status();
    setLinked(s.linked);
    if (s.linked) {
      setCode(null);
      stopPolling();
    }
  };

  // Lấy trạng thái ban đầu; setState chỉ gọi trong callback, không gọi đồng bộ trong effect
  useEffect(() => {
    let active = true;
    zaloApi
      .status()
      .then((s) => {
        if (active) setLinked(s.linked);
      })
      .catch(() => {});
    return () => {
      active = false;
      stopPolling();
    };
  }, []);

  const createCode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await zaloApi.createCode();
      setCode(res.code);
      stopPolling();
      // chờ sinh viên nhắn mã cho bot, tự cập nhật trạng thái
      timer.current = setInterval(() => fetchStatus().catch(() => {}), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tạo được mã, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* trình duyệt chặn clipboard thì bỏ qua */
    }
  };

  const unlink = async () => {
    setError('');
    try {
      await zaloApi.unlink();
      setLinked(false);
      setCode(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không hủy được liên kết.');
    }
  };

  const statusLabel = (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        linked ? 'bg-primary/30 text-brand' : 'bg-muted text-muted-foreground',
      )}
    >
      {linked ? 'Đã liên kết' : 'Chưa liên kết'}
    </span>
  );

  return (
    <Card title="Thông báo qua Zalo" actions={statusLabel}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Nhận thông báo bài tập mới, điểm số và các sự kiện khác ngay trên Zalo.
        </p>

        {linked ? (
          <Button variant="outline" onClick={unlink}>
            Hủy liên kết
          </Button>
        ) : (
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <StepNumber n={1} />
              <div className="space-y-2">
                <p>Tạo mã liên kết (hiệu lực 10 phút).</p>
                <Button onClick={createCode} disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />}
                  {code ? 'Tạo mã mới' : 'Liên kết Zalo'}
                </Button>
              </div>
            </li>

            <li className={cn('flex gap-3', !code && 'opacity-50')}>
              <StepNumber n={2} />
              <div className="space-y-2">
                <p>
                  Mở Zalo, tìm bot <b>{ZALO_BOT_NAME}</b> và gửi đúng mã bên dưới.
                </p>
                {code && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xl font-bold tracking-widest">{code}</span>
                      <Button size="sm" variant="ghost" onClick={copyCode}>
                        {copied ? <Check /> : <Copy />}
                        {copied ? 'Đã chép' : 'Sao chép'}
                      </Button>
                    </div>
                    {ZALO_BOT_LINK && (
                      <Button asChild size="sm" variant="outline">
                        <a href={ZALO_BOT_LINK} target="_blank" rel="noopener noreferrer">
                          Mở bot trên Zalo <ExternalLink />
                        </a>
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Trang sẽ tự cập nhật khi liên kết xong.
                    </p>
                  </>
                )}
              </div>
            </li>
          </ol>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </div>
    </Card>
  );
}