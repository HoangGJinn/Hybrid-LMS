import { useCallback, useEffect, useState, type RefObject } from 'react';

/**
 * Tracks and controls native Browser Fullscreen API (F11-style) for a target element,
 * syncing cleanly when the user exits via Esc or browser UI.
 */
export const useElementFullscreen = <T extends HTMLElement>(
  ref: RefObject<T | null>,
) => {
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsNativeFullscreen(
        Boolean(ref.current && document.fullscreenElement === ref.current),
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [ref]);

  const enterFullscreen = useCallback(async (): Promise<boolean> => {
    const target = ref.current;
    if (!target || typeof target.requestFullscreen !== 'function') {
      return false;
    }
    try {
      await target.requestFullscreen();
      setIsNativeFullscreen(
        document.fullscreenElement === target ||
          document.fullscreenElement !== null,
      );
      return true;
    } catch {
      return false;
    }
  }, [ref]);

  const exitFullscreen = useCallback(async () => {
    if (
      typeof document.exitFullscreen === 'function' &&
      document.fullscreenElement
    ) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore exit errors if document left fullscreen already
      }
    }
    setIsNativeFullscreen(false);
  }, []);

  return { isNativeFullscreen, enterFullscreen, exitFullscreen };
};

