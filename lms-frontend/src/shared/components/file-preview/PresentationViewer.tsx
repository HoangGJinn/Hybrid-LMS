import { useState } from 'react';
import { Download, ExternalLink, Presentation } from 'lucide-react';
import { Button } from '@shared/components/ui/button';

interface PresentationViewerProps {
  url: string;
  title: string;
}

const isPublicHttpUrl = (rawUrl: string): boolean => {
  try {
    const parsed = new URL(rawUrl, window.location.origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return (
      host !== 'localhost' &&
      host !== '127.0.0.1' &&
      host !== '0.0.0.0' &&
      !host.endsWith('.local')
    );
  } catch {
    return false;
  }
};

type EmbedEngine = 'office' | 'google';

const PresentationViewer = ({ url, title }: PresentationViewerProps) => {
  const [engine, setEngine] = useState<EmbedEngine>('office');
  const canEmbed = isPublicHttpUrl(url);

  if (!canEmbed) {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
        <Presentation className="h-12 w-12 text-muted-foreground" />
        <div className="max-w-md space-y-1">
          <p className="m-0 text-sm font-semibold">
            Inline PowerPoint preview requires a public URL
          </p>
          <p className="m-0 text-xs text-muted-foreground">
            Online Office viewers cannot reach local or private URLs directly.
            Please download the original presentation file to view all slides
            and animations.
          </p>
        </div>
        <Button asChild size="sm">
          <a href={url} download={title} target="_blank" rel="noreferrer">
            <Download className="mr-1.5 h-4 w-4" />
            Download {title}
          </a>
        </Button>
      </div>
    );
  }

  const embedUrl =
    engine === 'office'
      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
      : `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-muted-foreground">
            Presentation Viewer:
          </span>
          <Button
            type="button"
            size="sm"
            variant={engine === 'office' ? 'default' : 'outline'}
            onClick={() => setEngine('office')}
            className="h-7 px-2.5 text-xs"
          >
            Microsoft Office
          </Button>
          <Button
            type="button"
            size="sm"
            variant={engine === 'google' ? 'default' : 'outline'}
            onClick={() => setEngine('google')}
            className="h-7 px-2.5 text-xs"
          >
            Google Docs
          </Button>
        </div>
        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
          <a href={url} download={title} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1 h-3.5 w-3.5" />
            Download fallback
          </a>
        </Button>
      </div>
      <iframe
        key={embedUrl}
        src={embedUrl}
        title={title}
        className="min-h-0 w-full flex-1 border-0 bg-muted"
      />
    </div>
  );
};

export default PresentationViewer;

