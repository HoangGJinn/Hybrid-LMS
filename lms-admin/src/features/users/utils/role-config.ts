import type { ManagedRole } from '../types/users.types';

/** Wording of the shared management page, per role. */
export interface RoleConfig {
  title: string;
  subtitle: string;
  singular: string;
  plural: string;
  codeLabel: string;
  /** Every code of this role starts with it. */
  codePrefix: 'SV' | 'GV';
  /** Shown as the placeholder of the code field. */
  codeExample: string;
  addLabel: string;
  /** Tooltip of the row action that downloads the person's classes. */
  exportClassesLabel: string;
  /** Title shown in the classes inspection modal. */
  classesModalTitle: string;
  /** Tooltip on the clickable name cell. */
  viewClassesLabel: string;
  /** Empty state heading inside the classes modal. */
  emptyClassesTitle: string;
  /** Empty state description inside the classes modal. */
  emptyClassesDescription: string;
  /** Help text under the email field of the "add" dialog. */
  createHint: string;
}

export const ROLE_CONFIG: Record<ManagedRole, RoleConfig> = {
  LECTURER: {
    title: 'Lecturers',
    subtitle: 'Create lecturer accounts in advance and manage who can teach.',
    singular: 'lecturer',
    plural: 'lecturers',
    codeLabel: 'Lecturer code',
    codePrefix: 'GV',
    codeExample: 'GV26000001',
    addLabel: 'Add lecturer',
    exportClassesLabel: 'Export classes taught',
    classesModalTitle: 'Classes taught',
    viewClassesLabel: 'View classes taught',
    emptyClassesTitle: 'No classes assigned yet',
    emptyClassesDescription: 'This lecturer is not teaching any classes yet.',
    createHint:
      'The lecturer signs in with Google using this email; the account is linked automatically and keeps the lecturer role. If this email already has an account (for example it signed in first and became a student), edit that account in the Students list and change its role.',
  },
  STUDENT: {
    title: 'Students',
    subtitle:
      'Students create their own account at first sign-in. Add one here only to set the account up in advance.',
    singular: 'student',
    plural: 'students',
    codeLabel: 'Student code',
    codePrefix: 'SV',
    codeExample: 'SV26000001',
    addLabel: 'Add student',
    exportClassesLabel: 'Export classes enrolled',
    classesModalTitle: 'Classes enrolled',
    viewClassesLabel: 'View classes enrolled',
    emptyClassesTitle: 'No classes enrolled yet',
    emptyClassesDescription: 'This student has not been enrolled in any classes yet.',
    createHint:
      'The student signs in with Google using this email; the account is linked automatically.',
  },
};