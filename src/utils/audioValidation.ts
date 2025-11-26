export function isValidCustomSoundUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return false;
  }

  try {
    new URL(trimmedUrl);
    return true;
  } catch {
    return false;
  }
}

export function getCustomSoundUrl(
  useCustom: boolean,
  customUrl: string | null | undefined
): { url: string; isCustom: boolean } {
  const isValid = isValidCustomSoundUrl(customUrl);

  return {
    url: isValid ? customUrl : '',
    isCustom: useCustom && isValid
  };
}
