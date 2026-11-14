import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Search } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Skeleton } from '@shared/components/ui/skeleton';
import { cn } from '@shared/utils/cn';

interface SpreadsheetViewerProps {
  url: string;
  title: string;
}

const toExcelColName = (index: number): string => {
  let n = index;
  let col = '';
  while (n >= 0) {
    col = String.fromCharCode((n % 26) + 65) + col;
    n = Math.floor(n / 26) - 1;
  }
  return col;
};

const SpreadsheetViewer = ({ url, title }: SpreadsheetViewerProps) => (
  <SpreadsheetViewerInner key={url} url={url} title={title} />
);

const SpreadsheetViewerInner = ({ url, title }: SpreadsheetViewerProps) => {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    const loadWorkbook = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const buffer = await res.arrayBuffer();
        if (!isActive) return;
        const wb = XLSX.read(buffer, { type: 'array' });
        setWorkbook(wb);
        setActiveSheet(wb.SheetNames[0] ?? '');
      } catch (err) {
        if (!isActive || controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : 'Unable to preview spreadsheet.',
        );
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void loadWorkbook();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [url]);

  const sheetNames = workbook?.SheetNames ?? [];

  const { rows, maxCols } = useMemo(() => {
    if (!workbook || !activeSheet || !workbook.Sheets[activeSheet]) {
      return { rows: [] as string[][], maxCols: 0 };
    }
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(
      workbook.Sheets[activeSheet],
      { header: 1, defval: '' },
    );
    let cols = 0;
    const normalized = rawRows.map((row) => {
      const arr = Array.isArray(row) ? row : [];
      if (arr.length > cols) cols = arr.length;
      return arr.map((cell) =>
        cell === null || cell === undefined ? '' : String(cell),
      );
    });
    return { rows: normalized, maxCols: Math.max(cols, 1) };
  }, [workbook, activeSheet]);

  const filteredRowEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows
      .map((cells, idx) => ({ rowIndex: idx + 1, cells }))
      .filter((entry) => {
        if (!q) return true;
        return entry.cells.some((c) => c.toLowerCase().includes(q));
      });
  }, [rows, searchQuery]);

  if (error) {
    return (
      <div
        role="alert"
        className="flex h-full min-h-48 flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <p className="m-0 text-sm text-destructive">
          Could not parse spreadsheet ({error}). Please download the file to
          open it in Excel.
        </p>
        <Button asChild variant="outline" size="sm">
          <a href={url} download={title} target="_blank" rel="noreferrer">
            <Download className="mr-1.5 h-4 w-4" />
            Download {title}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 max-w-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5">
          {sheetNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveSheet(name)}
              className={cn(
                'shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                activeSheet === name
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-accent',
              )}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {rows.length} rows · {maxCols} cols
          </span>
          <div className="relative w-44">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter rows…"
              className="h-7 pl-8 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="relative min-h-0 w-full min-w-0 max-w-full flex-1 overflow-x-auto overflow-y-auto bg-background">
        {loading ? (
          <Skeleton className="m-4 h-[60vh] w-[calc(100%-2rem)]" />
        ) : rows.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
            This sheet is empty.
          </div>
        ) : (
          <table className="w-max min-w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-muted">
              <tr>
                <th className="sticky left-0 z-20 w-12 border bg-muted px-2 py-1.5 text-center font-mono text-[11px] font-semibold text-muted-foreground">
                  #
                </th>
                {Array.from({ length: maxCols }, (_, colIdx) => (
                  <th
                    key={colIdx}
                    className="min-w-[100px] border px-2.5 py-1.5 text-center font-mono text-[11px] font-semibold text-muted-foreground"
                  >
                    {toExcelColName(colIdx)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRowEntries.map(({ rowIndex, cells }) => (
                <tr key={rowIndex} className="hover:bg-muted/30">
                  <td className="sticky left-0 z-10 border bg-muted/60 px-2 py-1 text-center font-mono text-[11px] text-muted-foreground">
                    {rowIndex}
                  </td>
                  {Array.from({ length: maxCols }, (_, colIdx) => (
                    <td
                      key={colIdx}
                      className={cn(
                        'max-w-[320px] truncate border px-2.5 py-1.5 align-top',
                        rowIndex === 1 && 'bg-muted/20 font-semibold',
                      )}
                      title={cells[colIdx] ?? ''}
                    >
                      {cells[colIdx] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SpreadsheetViewer;

