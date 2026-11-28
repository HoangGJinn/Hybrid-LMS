import { useMutation } from '@tanstack/react-query';
import { downloadBlob } from '@/shared/utils/download';
import { userService } from '../api/user.service';
import type { ManagedRole } from '../types/users.types';

interface ExportVariables {
  userId: string;
  /** Lecturer / student code, used in the file name. */
  code: string | null;
}

/** Downloads the classes a lecturer teaches (or a student is enrolled in) as an Excel file. */
export const useExportUserClasses = (role: ManagedRole) =>
  useMutation({
    mutationFn: async ({ userId, code }: ExportVariables) => {
      const blob = await userService.exportClasses(role, userId);
      const prefix = role === 'LECTURER' ? 'Classes-taught' : 'Classes-enrolled';
      downloadBlob(blob, `${prefix}-${code ?? userId}.xlsx`);
    },
  });