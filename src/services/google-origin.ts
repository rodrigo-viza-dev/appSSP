// La app aún debe tener su origen registrado en el cliente OAuth de Google.
export function canUseGoogleOnWeb(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' || url.protocol === 'http:' && url.hostname === 'localhost';
  } catch { return false; }
}
