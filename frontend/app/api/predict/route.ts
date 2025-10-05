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
    
    // Note: Fetching full file content is very slow and expensive.
    // For a serverless function, it's better to get the language breakdown directly.
    const { data: languages } = await octokit.repos.listLanguages({
      owner,
      repo,
    });

    return NextResponse.json({
      repository: repoPath,
      language_counts: languages,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}