import { useState } from 'react';
import { Eye, Paperclip } from 'lucide-react';
import { FilePreviewModal } from '@shared/components/file-preview';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/utils/cn';
import type { AssignmentFileLink } from '../types/assignments.types';

/** Files with inline preview trigger and download links (links expire after a few minutes). */
export const FileList = ({
  files,
  className,
}: {
  files: AssignmentFileLink[];
  className?: string;
}) => {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const previewFiles = files.map((file) => ({
    fileId: file.fileId,
    fileName: file.fileName,
    fileUrl: file.downloadUrl,
  }));

  return (
    <>
      <ul className={cn('m-0 list-none space-y-1.5 p-0', className)}>
        {files.map((file, index) => (
          <li key={file.fileId} className="flex flex-wrap items-center gap-2 text-sm">
            <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
            <a
              href={file.downloadUrl}
              download={file.fileName}
              className="text-brand hover:underline"
            >
              {file.fileName}
            </a>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={() => setPreviewIndex(index)}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Button>
          </li>
        ))}
      </ul>

      <FilePreviewModal
        open={previewIndex !== null}
        files={previewFiles}
        initialIndex={previewIndex ?? 0}
        title="Assignment files"
        onClose={() => setPreviewIndex(null)}
      />
    </>
  );
};