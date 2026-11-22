import { useState } from 'react';
import { Modal } from '@shared/components/Modal';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { buildYoutubeWatchUrl, parseYoutubeId } from '../utils/youtube';

interface AddVideoDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the title and the canonical YouTube link of a valid video. */
  onSubmit: (video: { title: string; url: string }) => void;
}

/** Asks the lecturer for a YouTube link (and an optional title) to add a video to a section. */
export const AddVideoDialog = ({
  open,
  onClose,
  onSubmit,
}: AddVideoDialogProps) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const videoId = parseYoutubeId(url);
  const hasInvalidUrl = url.trim() !== '' && videoId === null;

  const reset = () => {
    setTitle('');
    setUrl('');
  };
  const handleClose = () => {
    reset();
    onClose();
  };
  const handleSubmit = () => {
    if (videoId === null) return;
    onSubmit({
      title: title.trim() || 'YouTube video',
      url: buildYoutubeWatchUrl(videoId),
    });
    reset();
  };

  return (
    <Modal open={open} title="Add YouTube video" onClose={handleClose}>
      <div className="space-y-4">
        <Input
          aria-label="YouTube link"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        {hasInvalidUrl && (
          <p role="alert" className="m-0 text-sm text-destructive">
            This is not a valid YouTube video link.
          </p>
        )}
        <Input
          aria-label="Video title"
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button disabled={videoId === null} onClick={handleSubmit}>
            Add video
          </Button>
        </div>
      </div>
    </Modal>
  );
};