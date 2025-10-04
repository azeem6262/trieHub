export async function predictRepo(repoPath: string) {
  const qs = encodeURIComponent(repoPath.trim());
  const url = `http://127.0.0.1:5001/predict?repo=${qs}`;
  const response = await fetch(url);
  let payload: any = null;
  try {
    payload = await response.json();
  } catch (e: any) {
    // Non-JSON error from backend
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return payload;
  }
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with status ${response.status}`);
  }
  return payload;
}