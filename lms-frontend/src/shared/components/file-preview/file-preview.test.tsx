import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilePreviewModal } from './FilePreviewModal';
import { FilePreviewPanel } from './FilePreviewPanel';
import { ResizableSplitPane } from './ResizableSplitPane';
import { detectPreviewKind } from './types';

describe('detectPreviewKind', () => {
  it('identifies supported document, spreadsheet, presentation, image, and text extensions', () => {
    expect(detectPreviewKind('assignment.pdf')).toBe('pdf');
    expect(detectPreviewKind('report.DOCX?X-Amz-Signature=abc')).toBe('docx');
    expect(detectPreviewKind('grades.xlsx')).toBe('spreadsheet');
    expect(detectPreviewKind('scores.xls')).toBe('spreadsheet');
    expect(detectPreviewKind('export.csv')).toBe('spreadsheet');
    expect(detectPreviewKind('slides.pptx#page=1')).toBe('presentation');
    expect(detectPreviewKind('deck.ppt')).toBe('presentation');
    expect(detectPreviewKind('diagram.png')).toBe('image');
    expect(detectPreviewKind('solution.ts')).toBe('text');
    expect(detectPreviewKind('README.md')).toBe('text');
    expect(detectPreviewKind('archive.zip')).toBe('unsupported');
    expect(detectPreviewKind('no-extension')).toBe('unsupported');
  });
});

describe('ResizableSplitPane', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders both panes side by side on desktop and supports keyboard resize and double-click reset', async () => {
    const user = userEvent.setup();
    render(
      <ResizableSplitPane
        left={<div>Left Pane</div>}
        right={<div>Right Pane</div>}
        initialLeftPercent={62}
        minLeftPercent={35}
        maxLeftPercent={78}
        storageKey="test-split-key"
      />,
    );

    expect(screen.getByText('Left Pane')).toBeInTheDocument();
    expect(screen.getByText('Right Pane')).toBeInTheDocument();

    const separator = screen.getByRole('separator', {
      name: /resize preview and grading panes/i,
    });
    expect(separator).toHaveAttribute('aria-valuenow', '62');

    separator.focus();
    await user.keyboard('{ArrowRight}');
    expect(separator).toHaveAttribute('aria-valuenow', '64');
    expect(window.localStorage.getItem('test-split-key')).toBe('64');

    await user.keyboard('{Home}');
    expect(separator).toHaveAttribute('aria-valuenow', '35');

    await user.keyboard('{End}');
    expect(separator).toHaveAttribute('aria-valuenow', '78');

    fireEvent.doubleClick(separator);
    expect(separator).toHaveAttribute('aria-valuenow', '62');
  });

  it('switches to responsive stacked and single-pane modes when viewport is below 1024px', async () => {
    const user = userEvent.setup();
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '(min-width: 1024px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    try {
      render(
        <ResizableSplitPane
          left={<div>Preview Content</div>}
          right={<div>Grading Form</div>}
          leftLabel="Submission"
          rightLabel="Rubric"
        />,
      );

      expect(screen.getByText('Preview Content')).toBeInTheDocument();
      expect(screen.getByText('Grading Form')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Submission Only' }));
      expect(screen.getByText('Preview Content')).toBeInTheDocument();
      expect(screen.queryByText('Grading Form')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Rubric Only' }));
      expect(screen.queryByText('Preview Content')).not.toBeInTheDocument();
      expect(screen.getByText('Grading Form')).toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});

describe('FilePreviewPanel', () => {
  it('shows the empty message when no files are provided', () => {
    render(<FilePreviewPanel files={[]} emptyMessage="No files submitted." />);
    expect(screen.getByText('No files submitted.')).toBeInTheDocument();
  });

  it('always keeps a Download original fallback link and handles unsupported formats gracefully', () => {
    render(
      <FilePreviewPanel
        files={[
          {
            fileId: 'f1',
            fileName: 'bundle.zip',
            fileUrl: 'https://example.com/bundle.zip',
          },
        ]}
      />,
    );

    const downloadOriginal = screen.getByRole('link', {
      name: /download original/i,
    });
    expect(downloadOriginal).toHaveAttribute(
      'href',
      'https://example.com/bundle.zip',
    );
    expect(
      screen.getByText('Preview is not supported for this file format'),
    ).toBeInTheDocument();
  });

  it('switches between multiple files and updates the active Download original link', async () => {
    const user = userEvent.setup();
    render(
      <FilePreviewPanel
        files={[
          {
            fileId: 'f1',
            fileName: 'first.zip',
            fileUrl: 'https://example.com/first.zip',
          },
          {
            fileId: 'f2',
            fileName: 'second.bin',
            fileUrl: 'https://example.com/second.bin',
          },
        ]}
      />,
    );

    expect(
      screen.getByRole('link', { name: /download original/i }),
    ).toHaveAttribute('href', 'https://example.com/first.zip');

    await user.click(screen.getByRole('button', { name: /second\.bin/i }));
    expect(
      screen.getByRole('link', { name: /download original/i }),
    ).toHaveAttribute('href', 'https://example.com/second.bin');
  });

  it('requests native browser fullscreen (F11) when supported and falls back to dialog when unavailable', async () => {
    const user = userEvent.setup();

    let fullscreenEl: Element | null = null;
    const originalFullscreenDescriptor = Object.getOwnPropertyDescriptor(
      Document.prototype,
      'fullscreenElement',
    );
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenEl,
    });

    const originalRequestFullscreen = HTMLElement.prototype.requestFullscreen;
    const originalExitFullscreen = document.exitFullscreen;
    const requestFullscreenSpy = vi.fn(async () => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    const exitFullscreenSpy = vi.fn(async () => {
      fullscreenEl = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    HTMLElement.prototype.requestFullscreen = requestFullscreenSpy;
    document.exitFullscreen = exitFullscreenSpy;

    try {
      const { container, unmount } = render(
        <FilePreviewPanel
          files={[
            {
              fileId: 'f1',
              fileName: 'slides.zip',
              fileUrl: 'https://example.com/slides.zip',
            },
          ]}
        />,
      );
      requestFullscreenSpy.mockImplementation(async () => {
        fullscreenEl = container.firstElementChild;
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      await user.click(
        screen.getByRole('button', { name: /open full screen preview/i }),
      );

      expect(requestFullscreenSpy).toHaveBeenCalledTimes(1);
      const exitBtn = await screen.findByRole('button', {
        name: /exit full screen preview/i,
      });
      await user.click(exitBtn);
      expect(exitFullscreenSpy).toHaveBeenCalledTimes(1);

      unmount();

      // Fallback path when requestFullscreen is unavailable
      HTMLElement.prototype.requestFullscreen = undefined as unknown as () => Promise<void>;
      const showModalSpy = vi.fn(function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      });
      const originalShowModal = HTMLDialogElement.prototype.showModal;
      HTMLDialogElement.prototype.showModal = showModalSpy;

      try {
        render(
          <FilePreviewPanel
            files={[
              {
                fileId: 'f1',
                fileName: 'slides.zip',
                fileUrl: 'https://example.com/slides.zip',
              },
            ]}
          />,
        );

        await user.click(
          screen.getByRole('button', { name: /open full screen preview/i }),
        );

        expect(showModalSpy).toHaveBeenCalledTimes(1);
        expect(
          screen.getByRole('dialog', { name: /full screen file preview/i }),
        ).toBeInTheDocument();
      } finally {
        HTMLDialogElement.prototype.showModal = originalShowModal;
      }
    } finally {
      HTMLElement.prototype.requestFullscreen = originalRequestFullscreen;
      document.exitFullscreen = originalExitFullscreen;
      if (originalFullscreenDescriptor) {
        Object.defineProperty(
          Document.prototype,
          'fullscreenElement',
          originalFullscreenDescriptor,
        );
      } else {
        delete (document as unknown as { fullscreenElement?: Element | null })
          .fullscreenElement;
      }
    }
  });
});

describe('FilePreviewModal', () => {
  it('targets the inner content container (never the <dialog> element) for native F11 fullscreen and prevents Esc cancel while fullscreened', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    let fullscreenEl: Element | null = null;
    const originalFullscreenDescriptor = Object.getOwnPropertyDescriptor(
      Document.prototype,
      'fullscreenElement',
    );
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenEl,
    });

    const originalDivRequestFullscreen =
      HTMLDivElement.prototype.requestFullscreen;
    const originalDialogRequestFullscreen =
      HTMLDialogElement.prototype.requestFullscreen;
    const originalExitFullscreen = document.exitFullscreen;
    const originalShowModal = HTMLDialogElement.prototype.showModal;
    const originalClose = HTMLDialogElement.prototype.close;

    const dialogRequestFullscreenSpy = vi.fn(async () => {
      throw new TypeError('Dialog elements cannot enter fullscreen');
    });
    const divRequestFullscreenSpy = vi.fn(async () => {
      const dialog = screen.getByRole('dialog', { name: /exam preview/i });
      fullscreenEl = dialog.firstElementChild;
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    HTMLDialogElement.prototype.requestFullscreen = dialogRequestFullscreenSpy;
    HTMLDivElement.prototype.requestFullscreen = divRequestFullscreenSpy;
    document.exitFullscreen = vi.fn(async () => {
      fullscreenEl = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    HTMLDialogElement.prototype.showModal = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.removeAttribute('open');
    });

    try {
      render(
        <FilePreviewModal
          open
          title="Exam preview"
          files={[
            {
              fileId: 'f1',
              fileName: 'slides.zip',
              fileUrl: 'https://example.com/slides.zip',
            },
          ]}
          onClose={onClose}
        />,
      );

      await user.click(
        screen.getByRole('button', { name: /expand modal to full screen/i }),
      );

      const dialog = screen.getByRole('dialog', { name: /exam preview/i });
      expect(dialogRequestFullscreenSpy).not.toHaveBeenCalled();
      expect(divRequestFullscreenSpy).toHaveBeenCalledTimes(1);
      expect(divRequestFullscreenSpy.mock.instances[0]).toBe(
        dialog.firstElementChild,
      );

      // Cancel while native fullscreen is active must be prevented so Esc only exits F11
      const cancelEvent = new Event('cancel', { cancelable: true });
      fireEvent(dialog, cancelEvent);
      expect(cancelEvent.defaultPrevented).toBe(true);
      expect(onClose).not.toHaveBeenCalled();

      await user.click(
        screen.getByRole('button', { name: /exit full screen/i }),
      );
      expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
    } finally {
      HTMLDivElement.prototype.requestFullscreen = originalDivRequestFullscreen;
      HTMLDialogElement.prototype.requestFullscreen =
        originalDialogRequestFullscreen;
      document.exitFullscreen = originalExitFullscreen;
      HTMLDialogElement.prototype.showModal = originalShowModal;
      HTMLDialogElement.prototype.close = originalClose;
      if (originalFullscreenDescriptor) {
        Object.defineProperty(
          Document.prototype,
          'fullscreenElement',
          originalFullscreenDescriptor,
        );
      } else {
        delete (document as unknown as { fullscreenElement?: Element | null })
          .fullscreenElement;
      }
    }
  });
});

