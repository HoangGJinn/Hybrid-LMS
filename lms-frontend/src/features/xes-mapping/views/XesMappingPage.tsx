import { toast } from 'sonner';
import { useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { PageHeader } from '@shared/components/PageHeader';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { cn } from '@shared/utils/cn';
import {
  useBackfillXes,
  useConfirmXes,
  useSuggestXes,
  useXesMappings,
  type KcSuggestion,
} from '../api/xes-mapping.api';

const XesMappingPage = () => {
  const [subjectId, setSubjectId] = useState('');
  // kcId -> routes the lecturer ticked (defaults: confirmed rows, else the best suggestion)
  const [picked, setPicked] = useState<Record<string, string[]>>({});

  const list = useXesMappings(subjectId.trim());
  const suggest = useSuggestXes(subjectId.trim());
  const confirm = useConfirmXes(subjectId.trim());
  const backfill = useBackfillXes(subjectId.trim());

  const groups = useMemo(() => {
    const map = new Map<string, KcSuggestion[]>();
    for (const r of list.data ?? []) map.set(r.kcId, [...(map.get(r.kcId) ?? []), r]);
    return [...map.values()];
  }, [list.data]);

  const selected = (rows: KcSuggestion[]): string[] => {
    const kcId = rows[0].kcId;
    if (picked[kcId]) return picked[kcId];
    const confirmed = rows.filter((r) => r.status === 'CONFIRMED');
    return (confirmed.length ? confirmed : rows.slice(0, 1)).map((r) => r.xesRoute);
  };

  const toggle = (rows: KcSuggestion[], route: string) => {
    const cur = selected(rows);
    setPicked((p) => ({
      ...p,
      [rows[0].kcId]: cur.includes(route) ? cur.filter((x) => x !== route) : [...cur, route],
    }));
  };

  const handleSuggest = () =>
    suggest.mutate(undefined, {
      onSuccess: () => {
        setPicked({});
        toast.success('Đã sinh gợi ý ánh xạ KC');
      },
      onError: (e) => toast.error(e.message),
    });

  const handleConfirm = (rows: KcSuggestion[]) =>
    confirm.mutate(
      { kcId: rows[0].kcId, routes: selected(rows) },
      {
        onSuccess: () => toast.success(`Đã xác nhận: ${rows[0].kcName}`),
        onError: (e) => toast.error(e.message),
      },
    );

  const handleBackfill = () =>
    backfill.mutate(undefined, {
      onSuccess: (r) => toast.success(`Đã gán ${r.mapped} câu, bỏ qua ${r.skipped} câu`),
      onError: (e) => toast.error(e.message),
    });

  return (
    <div>
      <PageHeader
        title="Ánh xạ KC sang XES3G5M"
        subtitle="Sinh gợi ý, xác nhận KC tương ứng, rồi gán xes_question_id cho câu hỏi"
      />

      <Card title="1. Môn học">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div>
            <Label htmlFor="subject">Subject ID</Label>
            <Input
              id="subject"
              placeholder="53816856-b1d6-4fcd-aec4-55528e6b8344"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            />
          </div>
          <Button onClick={handleSuggest} disabled={subjectId.trim().length !== 36 || suggest.isPending}>
            {suggest.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang sinh…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Sinh gợi ý
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleBackfill}
            disabled={subjectId.trim().length !== 36 || backfill.isPending}
          >
            {backfill.isPending ? 'Đang gán…' : 'Gán cho câu hỏi cũ'}
          </Button>
        </div>
        <p className="m-0 mt-3 text-xs text-muted-foreground">
          Lần sinh gợi ý đầu tiên chậm vì phải embed tên KC của XES3G5M (file cache được tạo ở backend).
        </p>
      </Card>

      <div className="mt-4 space-y-4">
        {list.error && <ErrorState message={list.error.message} onRetry={() => list.refetch()} />}
        {list.isFetching && !list.data && <p className="text-sm text-muted-foreground">Đang tải…</p>}
        {list.data && groups.length === 0 && (
          <EmptyState title="Chưa có gợi ý" description="Bấm “Sinh gợi ý” để bắt đầu." />
        )}

        {groups.map((rows) => {
          const sel = selected(rows);
          const confirmed = rows.some((r) => r.status === 'CONFIRMED');
          return (
            <Card
              key={rows[0].kcId}
              title={rows[0].kcName}
              actions={
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs',
                      confirmed ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {confirmed ? 'Đã xác nhận' : 'Chờ xác nhận'}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleConfirm(rows)}
                    disabled={sel.length === 0 || confirm.isPending}
                  >
                    Xác nhận
                  </Button>
                </div>
              }
            >
              <ul className="m-0 list-none space-y-2 p-0">
                {rows.map((r) => (
                  <li key={r.xesRoute}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border p-3',
                        sel.includes(r.xesRoute) && 'border-primary bg-primary/15',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={sel.includes(r.xesRoute)}
                        onChange={() => toggle(rows, r.xesRoute)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{r.xesKc}</span>
                        <span className="block break-all text-xs text-muted-foreground">
                          {r.xesRoute.split('----').join(' › ')}
                        </span>
                      </span>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        giống {(r.score * 100).toFixed(0)}% · {r.questionCount} câu
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default XesMappingPage;