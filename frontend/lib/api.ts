// In frontend/lib/api.ts

export async function predictRepo(repoPath: string) {
  // Use a relative path to call the Next.js API route
  const response = await fetch(`/api/predict?repo=${repoPath}`);
  
  const data = await response.json();

  if (!response.ok) {
    // If the server returns an error, throw it to be caught by the UI
    throw new Error(data.error || 'Failed to fetch prediction data');
  }

  return data;
}