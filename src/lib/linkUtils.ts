const URL_REGEX = /https?:\/\/[^\s<]+[^\s<.,;:!?)\]}'"]/gi;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  return [...new Set(matches)];
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function messageIsOnlyUrl(text: string): boolean {
  const trimmed = text.trim();
  const urls = extractUrls(trimmed);
  if (urls.length !== 1) return false;
  return trimmed === urls[0] || trimmed.replace(/\s/g, '') === urls[0];
}
