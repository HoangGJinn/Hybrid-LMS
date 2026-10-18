import { useState } from 'react';
import { cn } from '@shared/utils/cn';
import type { ClassRoom } from '../types/courses.types';

const DEFAULT_COVER = '/covers/default.svg';
/** Placeholder per subject. Add new subjects here (files live in /public/covers). */
const coverBySubject: Record<string, string> = {
  'sub-1': 'software',
  'sub-2': 'os',
  'sub-3': 'algorithms',
  CS101: 'software',
  CS102: 'os',
  CS103: 'database',
  CS104: 'ai',
  CS105: 'web',
  MATH101: 'algorithms',
  PHYS101: 'ai',
  ENG101: 'web',
};

type CoverSource = Pick<ClassRoom, 'subjectId' | 'coverImage'> & {
  subjectCode?: string;
};

const getCoverUrl = (c: CoverSource) =>
  c.coverImage ??
  (c.subjectCode && coverBySubject[c.subjectCode]
    ? `/covers/${coverBySubject[c.subjectCode]}.svg`
    : coverBySubject[c.subjectId]
      ? `/covers/${coverBySubject[c.subjectId]}.svg`
      : DEFAULT_COVER);

/** Decorative course cover image. Falls back to the default placeholder if the image fails to load. */
export const CourseCover = ({
  course,
  className,
}: {
  course: CoverSource;
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);
  return (
    <img
      src={failed ? DEFAULT_COVER : getCoverUrl(course)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('block bg-primary/30 object-cover', className)}
    />
  );
};
