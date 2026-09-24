# GitHub OAuth

Setup GitHub authentication.

## Create GitHub App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create new app with:
   - Homepage URL: your domain
   - Callback URL: your domain/auth/callback

## Configure Supabase

1. In Supabase Dashboard → Authentication → Settings
2. Enable GitHub provider
3. Add Client ID and Secret

## Environment Variables

```bash
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```