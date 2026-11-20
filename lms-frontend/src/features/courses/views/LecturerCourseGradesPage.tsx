import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { toAsyncState } from '@shared/utils/async-state';
import { classService } from '../api/class.service';
import { GradePagination } from '../components/GradePagination';
import { GradeStatCards } from '../components/GradeStatCards';
import { GradeTable } from '../components/GradeTable';
import { PAGE_SIZE, useGradebook } from '../hooks/useGradebook';

const courseCodeOf = (classCode: string) => classCode.split('.')[0];

const LecturerCourseGradesPage = () => {
  const { courseId = '' } = useParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const classId = selectedId ?? courseId;

  const { data: myClasses = [] } = useQuery({
    queryKey: ['lecturer-classes'],
    queryFn: classService.getLecturerClasses,
  });

  const siblings = useMemo(() => {
    const current = myClasses.find((c) => c.id === courseId);
    if (!current) return [];
    return myClasses.filter((c) => courseCodeOf(c.classCode) === courseCodeOf(current.classCode));
  }, [myClasses, courseId]);

  const gradebookQuery = useGradebook(classId, search, page);
  const state = toAsyncState(gradebookQuery);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-2xl border border-border p-4 md:grid-cols-[minmax(0,320px)_1fr] md:justify-between">
        <label className="block text-xs text-muted-foreground">
          Lớp học phần
          <select
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            value={classId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setPage(1);
            }}
          >
            {(siblings.length > 0 ? siblings : myClasses.filter((c) => c.id === classId)).map((c) => (
              <option key={c.id} value={c.id}>
                {c.classCode}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-muted-foreground md:ml-auto md:w-72">
          Tìm sinh viên
          <input
            type="search"
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Nhập tên hoặc MSSV"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>

      <AsyncView
        state={state}
        empty={<EmptyState title="Chưa có dữ liệu điểm" />}
      >
        {(book) => (
          <>
            <GradeStatCards summary={book.summary} />
            <section className="rounded-2xl border border-border">
              <header className="flex items-center justify-between px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Bảng điểm lớp {book.classCode}</h2>
                <p className="text-xs text-muted-foreground">Thang điểm 10 · "--" là chưa có điểm</p>
              </header>
              {book.rows.length === 0 ? (
                <EmptyState title="Không tìm thấy sinh viên phù hợp" />
              ) : (
                <GradeTable columns={book.columns} rows={book.rows} />
              )}
              <GradePagination
                page={book.page}
                limit={PAGE_SIZE}
                total={book.total}
                shown={book.rows.length}
                onChange={setPage}
              />
            </section>
          </>
        )}
      </AsyncView>
    </div>
  );
};

export default LecturerCourseGradesPage;