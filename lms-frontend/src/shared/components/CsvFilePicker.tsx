import { useRef, type ChangeEvent } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { downloadCsv } from '@shared/utils/download';

interface CsvFilePickerProps {
  /** Accessible label of the hidden `<input type="file">`. */
  ariaLabel: string;
  /** Label on the button that opens the file chooser. */
  pickLabel?: string;
  /** CSV text downloaded when the user clicks "Download template". */
  templateCsv: string;
  /** File name for the downloaded template, e.g. `participants-template.csv`. */
  templateFileName: string;
  disabled?: boolean;
  onPickFile: (file: File) => void;
}

/**
 * Shared CSV chooser + "Download template" button. Resets the `<input>` after every pick so that
 * choosing the same file again after fixing it still triggers `onPickFile`.
 */
export const CsvFilePicker = ({
  ariaLabel,
  pickLabel = 'Import from CSV',
  templateCsv,
  templateFileName,
  disabled = false,
  onPickFile,
}: CsvFilePickerProps) => {
  const fileInput = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    // Lets the same file be picked again after it has been corrected.
    input.value = '';
    if (file) onPickFile(file);
  };

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        hidden
        aria-label={ariaLabel}
        accept=".csv,text/csv"
        disabled={disabled}
        onChange={handleChange}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => fileInput.current?.click()}
        >
          <FileSpreadsheet className="mr-1 h-3 w-3" />
          {pickLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => downloadCsv(templateCsv, templateFileName)}
        >
          <Download className="mr-1 h-3 w-3" />
          Download template
        </Button>
      </div>
    </>
  );
};

