export function isValidCustomSoundUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== 'string') {
    console.log('[URL Validation] URL is null, undefined, or not a string');
    return false;
  }

  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    console.log('[URL Validation] URL is empty after trimming');
    return false;
  }

  try {
    const urlObj = new URL(trimmedUrl);
    console.log(`[URL Validation] Valid URL structure: protocol=${urlObj.protocol}, host=${urlObj.host}`);

    // Validar que sea HTTPS o protocolo de almacenamiento válido
    const validProtocols = ['https:', 'http:'];
    if (!validProtocols.includes(urlObj.protocol)) {
      console.warn(`[URL Validation] Invalid protocol: ${urlObj.protocol}`);
      return false;
    }

    // Validar que no sea una URL local o vacía
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      console.warn(`[URL Validation] Local URL detected: ${urlObj.hostname}`);
      return false;
    }

    console.log(`[URL Validation] URL validation successful: ${trimmedUrl}`);
    return true;
  } catch (error) {
    console.error(`[URL Validation] Invalid URL format: ${url}`, error);
    return false;
  }
}

export function getCustomSoundUrl(
  useCustom: boolean,
  customUrl: string | null | undefined
): { url: string; isCustom: boolean } {
  const isValid = isValidCustomSoundUrl(customUrl);

  console.log(`[URL Validation] Getting custom sound URL: useCustom=${useCustom}, isValid=${isValid}`);

  return {
    url: isValid ? customUrl : '',
    isCustom: useCustom && isValid
  };
}

export function isSupabaseStorageUrl(url: string): boolean {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    const isSupabase = urlObj.hostname.includes('supabase.co');
    const isStorage = urlObj.pathname.includes('storage');
    console.log(`[URL Validation] Supabase storage check: hostname=${urlObj.hostname}, isSupabase=${isSupabase}, isStorage=${isStorage}`);
    return isSupabase && isStorage;
  } catch {
    return false;
  }
}
