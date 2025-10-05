# Backend Deployment Guide

## Pre-Deployment Checklist

### 1. File Size Optimization ✅
- Created `.vercelignore` to exclude `venv/` and unnecessary files
- Model files are under 1MB each (within Vercel limits)
- Total deployment size reduced from 599MB to ~5MB

### 2. Environment Variables Setup

#### Required Environment Variables in Vercel:

1. **GITHUB_TOKEN** (Recommended for higher rate limits)
   - Go to: https://github.com/settings/tokens
   - Generate new token with "repo" scope
   - Add to Vercel: Settings → Environment Variables
   - Name: `GITHUB_TOKEN`
   - Value: `your_token_here`

#### Optional Environment Variables:
- `FLASK_ENV=production`

### 3. Vercel Configuration ✅
- `vercel.json` configured for Flask app
- `requirements.txt` with correct dependencies
- Health check endpoint at `/`

## Deployment Steps

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Optimize backend for Vercel deployment"
   git push
   ```

2. **Deploy to Vercel:**
   - Go to vercel.com
   - Import your repository
   - Set Root Directory to `backend`
   - Add environment variables
   - Deploy

3. **Test deployment:**
   - Health check: `https://your-app.vercel.app/`
   - API test: `https://your-app.vercel.app/predict?repo=facebook/react`

## Rate Limit Information

### Without GitHub Token:
- 60 requests per hour per IP
- Good for testing, limited for production

### With GitHub Token:
- 5,000 requests per hour
- Recommended for production use

## Troubleshooting

### If deployment fails:
1. Check Vercel function logs
2. Verify environment variables are set
3. Ensure all required files are present

### If API calls fail:
1. Check GitHub token is valid
2. Verify repository exists and is public
3. Check rate limit status

## Frontend Integration

After successful backend deployment:
1. Set `NEXT_PUBLIC_API_URL` in frontend Vercel project
2. Value: `https://your-backend-app.vercel.app`
3. Redeploy frontend
