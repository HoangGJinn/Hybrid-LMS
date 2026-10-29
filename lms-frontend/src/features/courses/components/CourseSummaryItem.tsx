import { Link } from 'react-router';
import { MoreVertical, Users } from 'lucide-react';
import { CourseCover } from './CourseCover';
import type { ClassRoom } from '../types/courses.types';

interface CourseSummaryItemProps {
  course: ClassRoom;
  basePath: string;
}

export const CourseSummaryItem = ({
  course,
  basePath,
}: CourseSummaryItemProps) => {
  return (
    <div className="group relative flex flex-col gap-3 rounded-lg border bg-card p-3.5 shadow-xs transition hover:border-primary/60 hover:shadow-xs sm:flex-row sm:items-center sm:gap-4">
      <Link
        to={`${basePath}/${course.id}`}
        className="flex flex-1 flex-col gap-3 no-underline text-inherit sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="h-24 w-full shrink-0 overflow-hidden rounded sm:h-20 sm:w-44">
          <CourseCover
            course={course}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-sm font-semibold text-foreground group-hover:text-primary line-clamp-1">
            {course.name}
          </h3>
          <p className="mb-0 mt-1 text-xs text-muted-foreground line-clamp-1">
            {course.semesterName || course.classCode}
            {course.lecturerName ? ` • ${course.lecturerName}` : ''}
          </p>
          <p className="mb-0 mt-1.5 text-xs text-muted-foreground/90 line-clamp-2">
            Mã lớp: {course.classCode} • Số lượng sinh viên: {course.studentCount} • Tiến độ: {course.progress ?? 0}%
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
          <Users className="h-3.5 w-3.5" />
          <span>{course.studentCount}</span>
        </div>
      </Link>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="self-end rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground sm:self-center"
        aria-label="Tùy chọn khóa học"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
    </div>
  );
};

