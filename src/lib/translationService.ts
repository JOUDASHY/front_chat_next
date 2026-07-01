export async function translateText(text: string, targetLang: string): Promise<string | null> {
  if (!text || !text.trim()) return null;

  return translateViaGoogle(text, targetLang);
}

async function translateViaGoogle(text: string, targetLang: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    const translated = data?.[0]?.[0]?.[0];
    return translated || null;
  } catch {
    return null;
  }
}
