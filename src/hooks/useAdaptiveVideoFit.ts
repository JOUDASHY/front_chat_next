import { type RefObject, useEffect, useState } from 'react';
import { getAdaptiveVideoFit, type VideoFitMode } from '@/lib/videoFit';

export function useAdaptiveVideoFit(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean
): VideoFitMode {
  const [fit, setFit] = useState<VideoFitMode>('cover');

  useEffect(() => {
    if (!enabled) {
      setFit('cover');
      return;
    }

    let rafId = 0;

    const updateFit = () => {
      const video = videoRef.current;
      if (!video) return;

      if (!video.videoWidth || !video.videoHeight) {
        setFit('cover');
        rafId = window.requestAnimationFrame(updateFit);
        return;
      }

      setFit(
        getAdaptiveVideoFit(
          video.videoWidth,
          video.videoHeight,
          window.innerWidth,
          window.innerHeight
        )
      );
    };

    updateFit();

    const video = videoRef.current;
    video?.addEventListener('loadedmetadata', updateFit);
    video?.addEventListener('resize', updateFit);
    window.addEventListener('resize', updateFit);

    return () => {
      window.cancelAnimationFrame(rafId);
      video?.removeEventListener('loadedmetadata', updateFit);
      video?.removeEventListener('resize', updateFit);
      window.removeEventListener('resize', updateFit);
    };
  }, [enabled, videoRef]);

  return fit;
}
