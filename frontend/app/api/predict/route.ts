// In frontend/app/api/predict/route.ts

import { NextResponse } from 'next/server';
import { Octokit } from "@octokit/rest";

// Initialize Octokit with your GitHub token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repoPath = searchParams.get('repo');

  if (!repoPath) {
    return NextResponse.json({ error: "Repository path is required" }, { status: 400 });
  }

  try {
    const [owner, repo] = repoPath.split('/');
    
    const { data: languages } = await octokit.repos.listLanguages({
      owner,
      repo,
    });

    return NextResponse.json({
      repository: repoPath,
      language_counts: languages,
    });

  } catch (error: unknown) { // <-- FIX: Use 'unknown' for better type safety
    let errorMessage = "An unknown error occurred";
    // Check if the error is an actual Error object before using its properties
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}