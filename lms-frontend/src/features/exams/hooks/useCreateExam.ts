import { useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { examService } from '../api/exam.service';
import type { NewExamInput } from '../types/exams.types';

interface CreateExamVariables {
  classId: string;
  input: NewExamInput;
}

/**
 * UC-31: creates an exam; the caller places it in a section of the draft.
 * A question file is uploaded once per picked `File`: when creating the exam fails afterwards and the lecturer
 * tries again with the same file, the file that is already on S3 is reused instead of uploading it a second time.
 */
export const useCreateExam = () => {
  const uploadedFileIds = useRef(new WeakMap<File, string>());
  return useMutation({
    mutationFn: async ({ classId, input }: CreateExamVariables) => {
      let fileId: string | null = null;
      if (input.format === 'FILE' && input.file) {
        fileId =
          uploadedFileIds.current.get(input.file) ??
          (await examService.uploadQuestionFile(input.file));
        uploadedFileIds.current.set(input.file, fileId);
      }
      return examService.create(classId, input, fileId);
    },
  });
};
