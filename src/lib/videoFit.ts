export type VideoFitMode = 'cover' | 'contain';

/** Plein écran si ratios proches ; letterbox si mobile portrait sur PC (évite le zoom flou). */
export function getAdaptiveVideoFit(
  videoWidth: number,
  videoHeight: number,
  screenWidth: number,
  screenHeight: number
): VideoFitMode {
  if (!videoWidth || !videoHeight || !screenWidth || !screenHeight) {
    return 'cover';
  }

  const videoAspect = videoWidth / videoHeight;
  const screenAspect = screenWidth / screenHeight;

  const videoPortrait = videoAspect < 0.95;
  const screenPortrait = screenAspect < 0.95;

  if (videoPortrait !== screenPortrait) {
    return 'contain';
  }

  const ratioDiff =
    Math.max(videoAspect, screenAspect) / Math.min(videoAspect, screenAspect);

  return ratioDiff <= 1.4 ? 'cover' : 'contain';
}
