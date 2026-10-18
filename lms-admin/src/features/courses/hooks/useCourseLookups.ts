import { useQuery } from '@tanstack/react-query';
import { lecturerService } from '../api/lecturer.service';
import { courseKeys } from '../api/queryKeys';
import { semesterService } from '../api/semester.service';
import { subjectService } from '../api/subject.service';

const LOOKUP_STALE_TIME_MS = 5 * 60 * 1000;

/** Reference data for dropdowns: changes rarely, so it is cached longer than the class list. */
export const useSubjects = () =>
  useQuery({
    queryKey: courseKeys.subjects(),
    queryFn: subjectService.getSubjects,
    staleTime: LOOKUP_STALE_TIME_MS,
  });

export const useSemesters = () =>
  useQuery({
    queryKey: courseKeys.semesters(),
    queryFn: semesterService.getSemesters,
    staleTime: LOOKUP_STALE_TIME_MS,
  });

export const useLecturers = () =>
  useQuery({
    queryKey: courseKeys.lecturers(),
    queryFn: lecturerService.getLecturers,
    staleTime: LOOKUP_STALE_TIME_MS,
  });
