/**
 * Service to translate text using MyMemory Translation API.
 * Free up to 50,000 words/day.
 * Rate limit: 5 requests/second.
 */
export async function translateText(text: string, targetLang: string, sourceLang: string = 'Autodetect'): Promise<string | null> {
  if (!text || !text.trim()) return null;
  
  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
    );
    
    if (!response.ok) {
      console.error('Translation API error:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    if (data && data.responseData && data.responseData.translatedText) {
      // MyMemory sometimes returns the original text or a match error string if it fails
      if (data.responseStatus !== 200 && data.responseData.translatedText.includes('MYMEMORY WARNING')) {
        return null;
      }
      return data.responseData.translatedText;
    }
    return null;
  } catch (error) {
    console.error('Translation failed:', error);
    return null;
  }
}
