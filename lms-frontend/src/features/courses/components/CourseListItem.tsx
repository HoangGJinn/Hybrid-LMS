import { Link } from 'react-router';
import { MoreVertical, Users } from 'lucide-react';
import { CourseCover } from './CourseCover';
import type { ClassRoom } from '../types/courses.types';

interface CourseListItemProps {
  course: ClassRoom;
  basePath: string;
}

export const CourseListItem = ({ course, basePath }: CourseListItemProps) => {
  return (
    <div className="group relative flex items-center gap-4 rounded-lg border bg-card p-3 shadow-xs transition hover:border-primary/60 hover:shadow-xs">
      <Link
        to={`${basePath}/${course.id}`}
        className="flex flex-1 items-center gap-4 no-underline text-inherit"
      >
        <div className="h-20 w-36 shrink-0 overflow-hidden rounded sm:w-48">
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

          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary"
                  style={{ width: `${course.progress ?? 0}%` }}
                />
              </div>
              <span className="text-[11px]">{course.progress ?? 0}%</span>
            </div>
            <span className="flex items-center gap-1 text-[11px]">
              <Users className="h-3 w-3" />
              {course.studentCount} sinh viên
            </span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Tùy chọn khóa học"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
    </div>
  );
};

