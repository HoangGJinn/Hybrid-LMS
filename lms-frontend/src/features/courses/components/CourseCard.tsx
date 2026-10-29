import { Link } from 'react-router';
import { MoreVertical, Users } from 'lucide-react';
import { CourseCover } from './CourseCover';
import type { ClassRoom } from '../types/courses.types';

interface CourseCardProps {
  course: ClassRoom;
  basePath: string; // e.g. '/student/courses' or '/lecturer/classes'
}

export const CourseCard = ({ course, basePath }: CourseCardProps) => {
  return (
    <div className="group flex flex-col justify-between overflow-hidden rounded-lg border bg-card text-foreground shadow-xs transition hover:border-primary/60 hover:shadow-md">
      <Link
        to={`${basePath}/${course.id}`}
        className="block no-underline text-inherit"
      >
        <CourseCover
          course={course}
          className="h-32 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
        />
        <div className="p-3.5 pb-2">
          <p className="m-0 text-[11px] font-medium uppercase tracking-wider text-muted-foreground line-clamp-1">
            {course.semesterName || course.classCode}
          </p>
          <h3 className="mb-1 mt-1 text-sm font-semibold leading-snug group-hover:text-primary line-clamp-2">
            {course.name}
          </h3>
          <p className="m-0 text-xs text-muted-foreground line-clamp-1">
            {course.lecturerName}
          </p>

          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-primary transition-all duration-300"
                style={{ width: `${course.progress ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      </Link>

      {/* Bottom footer row: progress, member count on left, 3-dots action on right */}
      <div className="flex items-center justify-between px-3.5 pb-3 pt-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{course.progress ?? 0}% hoàn thành</span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {course.studentCount}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Tùy chọn khóa học"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
