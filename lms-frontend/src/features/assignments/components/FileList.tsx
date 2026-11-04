import { Paperclip } from 'lucide-react';
import { cn } from '@shared/utils/cn';
import type { AssignmentFileLink } from '../types/assignments.types';

/** Files with their download links (the links expire after a few minutes). */
export const FileList = ({
  files,
  className,
}: {
  files: AssignmentFileLink[];
  className?: string;
}) => (
  <ul className={cn('m-0 list-none space-y-1 p-0', className)}>
    {files.map((file) => (
      <li key={file.fileId} className="flex items-center gap-2 text-sm">
        <Paperclip className="h-4 w-4 shrink-0" />
        <a
          href={file.downloadUrl}
          download={file.fileName}
          className="text-brand hover:underline"
        >
          {file.fileName}
        </a>
      </li>
    ))}
  </ul>
);