import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { ZALO_BOT_LINK, ZALO_BOT_NAME } from '@core/config/env';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/utils/cn';
import { zaloApi } from '../api/zaloApi';
import type { ZaloStatus } from '../types/zalo.types';

const ZALO_STATUS_KEY = ['zalo', 'status'] as const;

export default function ZaloLinkCard() {
  const queryClient = useQueryClient();
  const statusQuery = useQuery<ZaloStatus>({
    queryKey: ZALO_STATUS_KEY,
    queryFn: () => zaloApi.status(),
    staleTime: 60_000,
    retry: false,
  });

  const linked = statusQuery.data?.linked ?? false;
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
    queryClient.setQueryData<ZaloStatus>(ZALO_STATUS_KEY, s);
    if (s.linked) {
      setCode(null);
      stopPolling();
    }
  };

  useEffect(() => () => stopPolling(), []);

  const createCode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await zaloApi.createCode();
      setCode(res.code);
      stopPolling();
      timer.current = setInterval(() => fetchStatus().catch(() => { }), 3000);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not generate a link code. Please try again.',
      );
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
      /* ignore when clipboard permission is denied */
    }
  };

  const unlink = async () => {
    setError('');
    try {
      await zaloApi.unlink();
      queryClient.setQueryData<ZaloStatus>(ZALO_STATUS_KEY, {
        linked: false,
        linkedAt: null,
      });
      setCode(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not unlink Zalo account.',
      );
    }
  };

  return (
    <section className="border-t pt-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              'h-2 w-2 rounded-full',
              linked ? 'bg-success' : 'bg-muted-foreground/50',
            )}
          />
          <h2 className="m-0 text-sm font-semibold">Zalo notifications</h2>
          <span className="text-xs text-muted-foreground">
            {linked ? 'Connected' : 'Not connected'}
          </span>
        </div>
        {linked ? (
          <Button
            variant="outline"
            size="sm"
            className="rounded-[5px] shadow-none"
            onClick={unlink}
          >
            Unlink account
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="rounded-[5px] shadow-none"
            onClick={createCode}
            disabled={loading}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {code ? 'Regenerate code' : 'Connect Zalo'}
          </Button>
        )}
      </header>

      <p className="m-0 mt-1 text-xs text-muted-foreground">
        Receive assignment deadlines, score updates, and class announcements via
        Zalo.
      </p>

      {!linked && code && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-[5px] border bg-card px-3 py-2.5 text-xs">
          <span className="text-muted-foreground">
            Send this 10-minute code to <b>{ZALO_BOT_NAME}</b>:
          </span>
          <span className="font-mono text-sm font-semibold tracking-wider tabular-nums">
            {code}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-[5px] px-2 text-xs"
            onClick={copyCode}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          {ZALO_BOT_LINK && (
            <a
              href={ZALO_BOT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-brand no-underline hover:underline"
            >
              Open bot <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="m-0 mt-2 rounded-[5px] border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </section>
  );
}
