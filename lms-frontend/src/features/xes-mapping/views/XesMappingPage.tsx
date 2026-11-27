import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
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
  useSaveXesRoutes,
  useSearchXesRoutes,
  useXesMappings,
  type BackfillResult,
  type KcMapping,
  type XesRoute,
} from '../api/xes-mapping.api';

const MAX_ROUTES = 5;

const backfillMessage = (r: BackfillResult): string => {
  const base = `Đã gán ${r.mapped} câu, bỏ qua ${r.skipped} câu`;
  return r.unmappedKcs.length > 0
    ? `${base}. KC chưa có route XES: ${r.unmappedKcs.join(', ')}`
    : base;
};

const sameRoutes = (a: XesRoute[], b: XesRoute[]): boolean =>
  a.length === b.length &&
  [...a.map((r) => r.xesRoute)].sort().join('|') ===
    [...b.map((r) => r.xesRoute)].sort().join('|');

interface KcCardProps {
  kc: KcMapping;
  saving: boolean;
  onSave: (kcId: string, routes: string[]) => void;
}

/** One KC: the lecturer searches the XES KC list and picks the matching routes. */
const KcCard = ({ kc, saving, onSave }: KcCardProps) => {
  const [selected, setSelected] = useState<XesRoute[]>(kc.routes);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');

  // Follow the server after a save/refetch.
  useEffect(() => setSelected(kc.routes), [kc.routes]);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);

  const search = useSearchXesRoutes(query);
  const chosen = new Set(selected.map((r) => r.xesRoute));
  const dirty = !sameRoutes(selected, kc.routes);
  const full = selected.length >= MAX_ROUTES;

  return (
    <Card
      title={kc.kcName}
      actions={
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs',
              kc.routes.length > 0
                ? 'bg-success/15 text-success'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {kc.routes.length > 0 ? 'Đã ánh xạ' : 'Chưa ánh xạ'} ·{' '}
            {kc.bankQuestionCount} câu
          </span>
          <Button
            size="sm"
            disabled={!dirty || saving}
            onClick={() =>
              onSave(
                kc.kcId,
                selected.map((r) => r.xesRoute),
              )
            }
          >
            Lưu
          </Button>
        </div>
      }
    >
      {selected.length > 0 ? (
        <ul className="m-0 mb-3 flex list-none flex-wrap gap-2 p-0">
          {selected.map((r) => (
            <li
              key={r.xesRoute}
              className="flex items-center gap-1 rounded-full bg-primary/15 py-1 pl-3 pr-1 text-sm"
              title={r.path}
            >
              {r.xesKc}
              <button
                type="button"
                aria-label={`Bỏ ${r.xesKc}`}
                className="rounded-full border-0 bg-transparent p-1"
                onClick={() =>
                  setSelected(selected.filter((x) => x.xesRoute !== r.xesRoute))
                }
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 mb-3 text-sm text-muted-foreground">
          Chưa chọn KC XES nào. Tìm và thêm bên dưới.
        </p>
      )}

      <Input
        placeholder="Tìm KC XES (ví dụ: sorting, tree, graph…)"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {full && (
        <p className="m-0 mt-2 text-xs text-muted-foreground">
          Tối đa {MAX_ROUTES} KC XES cho mỗi KC.
        </p>
      )}

      <ul className="m-0 mt-3 max-h-64 list-none space-y-2 overflow-y-auto p-0">
        {search.isFetching && !search.data && (
          <li className="text-sm text-muted-foreground">Đang tìm…</li>
        )}
        {search.data?.length === 0 && (
          <li className="text-sm text-muted-foreground">
            Không có KC XES nào khớp.
          </li>
        )}
        {search.data?.map((r) => (
          <li
            key={r.xesRoute}
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{r.xesKc}</span>
              <span className="block break-all text-xs text-muted-foreground">
                {r.path}
              </span>
            </span>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {r.questionCount} câu
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={chosen.has(r.xesRoute) || full}
              onClick={() => setSelected([...selected, r])}
            >
              <Plus className="mr-1 h-4 w-4" />
              {chosen.has(r.xesRoute) ? 'Đã chọn' : 'Thêm'}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
};

const XesMappingPage = () => {
  const [subjectId, setSubjectId] = useState('');
  const id = subjectId.trim();

  const list = useXesMappings(id);
  const save = useSaveXesRoutes(id);
  const backfill = useBackfillXes(id);

  const handleSave = (kcId: string, routes: string[]) =>
    save.mutate(
      { kcId, routes },
      {
        onSuccess: (res) =>
          toast.success(
            res.backfill && res.backfill.mapped > 0
              ? `Đã lưu, gán ${res.backfill.mapped} câu hỏi cũ`
              : 'Đã lưu ánh xạ',
          ),
        onError: (e) => toast.error(e.message),
      },
    );

  const handleBackfill = () =>
    backfill.mutate(undefined, {
      onSuccess: (r) => toast.success(backfillMessage(r)),
      onError: (e) => toast.error(e.message),
    });

  return (
    <div>
      <PageHeader
        title="Ánh xạ KC sang XES3G5M"
        subtitle="Giảng viên chọn KC XES tương ứng cho từng KC, câu hỏi sẽ được gán xes_question_id theo đó"
      />

      <Card title="Môn học">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <Label htmlFor="subject">Subject ID</Label>
            <Input
              id="subject"
              placeholder="53816856-b1d6-4fcd-aec4-55528e6b8344"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={handleBackfill}
            disabled={id.length !== 36 || backfill.isPending}
          >
            {backfill.isPending ? 'Đang gán…' : 'Gán cho câu hỏi cũ'}
          </Button>
        </div>
      </Card>

      <div className="mt-4 space-y-4">
        {list.error && (
          <ErrorState
            message={list.error.message}
            onRetry={() => list.refetch()}
          />
        )}
        {list.isFetching && !list.data && (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        )}
        {list.data?.length === 0 && (
          <EmptyState
            title="Môn học chưa có KC"
            description="Kiểm tra lại Subject ID."
          />
        )}
        {list.data?.map((kc) => (
          <KcCard
            key={kc.kcId}
            kc={kc}
            saving={save.isPending}
            onSave={handleSave}
          />
        ))}
      </div>
    </div>
  );
};

export default XesMappingPage;