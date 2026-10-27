export function apiHeaders(apiKey: string, bearerToken?: string) {
  const headers = new Headers({
    apikey: apiKey,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  });
  const bearer = bearerToken ?? (apiKey.startsWith('sb_') ? undefined : apiKey);
  if (bearer && !bearer.startsWith('sb_')) headers.set('Authorization', `Bearer ${bearer}`);
  return headers;
}
