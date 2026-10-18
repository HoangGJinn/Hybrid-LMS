import { useState, type SyntheticEvent } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { getErrorMessage } from '@/core/api/errors';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import {
  SearchableSelect,
  type SearchableOption,
} from '@/shared/components/ui/SearchableSelect';
import { Select } from '@/shared/components/ui/Select';
import { useCreateClass } from '../hooks/useCreateClass';
import {
  useLecturers,
  useSemesters,
  useSubjects,
} from '../hooks/useCourseLookups';
import { useUpdateClass } from '../hooks/useUpdateClass';
import type { ClassView, CreateClassPayload } from '../types/courses.types';

type FormValues = CreateClassPayload;
type FormErrors = Partial<Record<keyof FormValues, string>>;

const CLASS_CODE_PATTERN = /^[A-Z0-9_-]+$/;
const CLASS_CODE_MAX = 50;
const NAME_MAX = 255;
const HTTP_CONFLICT = 409;

const validate = (values: FormValues, editing: ClassView | null): FormErrors => {
  const errors: FormErrors = {};
  const code = values.classCode.trim();
  if (!code) {
    errors.classCode = 'Class code is required.';
  } else if (code.length > CLASS_CODE_MAX) {
    errors.classCode = `At most ${CLASS_CODE_MAX} characters.`;
  } else if (editing?.classCode !== code && !CLASS_CODE_PATTERN.test(code)) {
    // An unchanged legacy code is left alone so the rest of the class stays editable.
    errors.classCode = 'Only uppercase letters, numbers, "-" and "_".';
  }
  const name = values.name.trim();
  if (!name) errors.name = 'Class name is required.';
  else if (name.length > NAME_MAX) errors.name = `At most ${NAME_MAX} characters.`;
  if (!values.subjectId) errors.subjectId = 'Select a subject.';
  if (!values.semesterId) errors.semesterId = 'Select a semester.';
  if (!values.lecturerId) errors.lecturerId = 'Select a lecturer.';
  return errors;
};

const CourseForm = ({
  course,
  onClose,
}: {
  course: ClassView | null;
  onClose: () => void;
}) => {
  const [values, setValues] = useState<FormValues>(() => ({
    classCode: course?.classCode ?? '',
    name: course?.name ?? '',
    subjectId: course?.subjectId ?? '',
    semesterId: course?.semesterId ?? '',
    lecturerId: course?.lecturerId ?? '',
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const subjects = useSubjects();
  const semesters = useSemesters();
  const lecturers = useLecturers();
  const createMutation = useCreateClass();
  const updateMutation = useUpdateClass();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setServerError(null);
  };

  const subjectOptions = (subjects.data ?? []).map((subject) => ({
    value: subject.id,
    label: `${subject.subjectCode} — ${subject.name}`,
  }));
  const semesterOptions = (semesters.data ?? []).map((semester) => ({
    value: semester.id,
    label: `${semester.semesterCode} — ${semester.name}`,
  }));
  const lecturerOptions: SearchableOption[] = (lecturers.data ?? []).map(
    (lecturer) => ({
      value: lecturer.id,
      label: lecturer.fullName,
      description: lecturer.email,
    }),
  );
  // The current lecturer may be missing from the list (e.g. deactivated): keep them selectable.
  if (
    course &&
    course.lecturerName &&
    !lecturerOptions.some((option) => option.value === course.lecturerId)
  ) {
    lecturerOptions.unshift({
      value: course.lecturerId,
      label: course.lecturerName,
      description: 'Current lecturer',
    });
  }

  const handleError = (error: unknown) => {
    const message = getErrorMessage(error);
    if (isAxiosError(error) && error.response?.status === HTTP_CONFLICT) {
      setErrors((prev) => ({ ...prev, classCode: message }));
    } else {
      setServerError(message);
    }
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values, course);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: CreateClassPayload = {
      ...values,
      classCode: values.classCode.trim(),
      name: values.name.trim(),
    };
    const handlers = {
      onSuccess: () => {
        toast.success(course ? 'Course updated.' : 'Course created.');
        onClose();
      },
      onError: handleError,
    };
    if (course) {
      updateMutation.mutate({ id: course.id, payload }, handlers);
    } else {
      createMutation.mutate(payload, handlers);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {serverError && (
        <p
          role="alert"
          className="m-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {serverError}
        </p>
      )}

      <Input
        label="Class code *"
        value={values.classCode}
        onChange={(event) => setField('classCode', event.target.value.toUpperCase())}
        error={errors.classCode}
        hint="Only uppercase letters, numbers, - and _"
        placeholder="CS101A"
        maxLength={CLASS_CODE_MAX}
        autoFocus
      />
      <Input
        label="Class name *"
        value={values.name}
        onChange={(event) => setField('name', event.target.value)}
        error={errors.name}
        placeholder="Introduction to Programming - Group A"
        maxLength={NAME_MAX}
      />
      <Select
        label="Subject *"
        value={values.subjectId}
        onChange={(event) => setField('subjectId', event.target.value)}
        options={subjectOptions}
        placeholder={subjects.isLoading ? 'Loading…' : 'Select a subject'}
        disabled={subjects.isLoading}
        error={
          errors.subjectId ??
          (subjects.isError ? 'Could not load subjects.' : undefined)
        }
      />
      <Select
        label="Semester *"
        value={values.semesterId}
        onChange={(event) => setField('semesterId', event.target.value)}
        options={semesterOptions}
        placeholder={semesters.isLoading ? 'Loading…' : 'Select a semester'}
        disabled={semesters.isLoading}
        error={
          errors.semesterId ??
          (semesters.isError ? 'Could not load semesters.' : undefined)
        }
      />
      <SearchableSelect
        label="Lecturer *"
        value={values.lecturerId}
        onChange={(value) => setField('lecturerId', value)}
        options={lecturerOptions}
        placeholder="Search lecturer by name or email"
        loading={lecturers.isLoading}
        disabled={lecturers.isLoading}
        error={
          errors.lecturerId ??
          (lecturers.isError ? 'Could not load lecturers.' : undefined)
        }
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSaving}>
          Save course
        </Button>
      </div>
    </form>
  );
};

interface CourseFormModalProps {
  open: boolean;
  /** The class being edited, or `null` to create a new one. */
  course: ClassView | null;
  onClose: () => void;
}

/** Create / edit dialog. The form is mounted only while open, so each opening starts from fresh state. */
export const CourseFormModal = ({
  open,
  course,
  onClose,
}: CourseFormModalProps) => (
  <Modal
    open={open}
    title={course ? 'Edit course' : 'Add course'}
    onClose={onClose}
    size="lg"
  >
    {open && (
      <CourseForm key={course?.id ?? 'new'} course={course} onClose={onClose} />
    )}
  </Modal>
);
