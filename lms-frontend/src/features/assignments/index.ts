// Public API of the "assignments" feature. Import from "@features/assignments" outside this folder.
export { useAssignment } from './hooks/useAssignment';
export { useMyAssignments, useMySubmissions } from './hooks/useAssignmentLists';
export { useAssignmentDetail } from './hooks/useAssignmentDetail';
export { useCreateAssignment } from './hooks/useCreateAssignment';
export { useRemoveAssignment } from './hooks/useRemoveAssignment';
export { CreateAssignmentDialog } from './components/CreateAssignmentDialog';

export { assignmentKeys } from './api/queryKeys';
export type {
  Assignment,
  AssignmentFileLink,
  AssignmentStatus,
  AssignmentSubmission,
  AssignmentDetail,
  NewAssignmentInput,
  SubmissionType,
} from './types/assignments.types';