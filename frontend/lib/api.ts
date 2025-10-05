export async function predictRepo(repoPath: string) {
  // Call your Python backend hosted on Render
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/predict?repo=${encodeURIComponent(repoPath)}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch prediction data');
  }

  return data;
}
