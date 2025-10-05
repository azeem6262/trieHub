export async function predictRepo(repoPath: string) {
  const qs = encodeURIComponent(repoPath.trim());
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001';
  const url = `${baseUrl}/predict?repo=${qs}`;
  const response = await fetch(url);
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON error from backend
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return payload;
  }
  if (!response.ok) {
    throw new Error((payload as { error?: string })?.error || `Request failed with status ${response.status}`);
  }
  return payload;
}