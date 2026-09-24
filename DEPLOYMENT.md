# Deployment Guide for Yazkap Properties

This document explains how to deploy your Yazkap Properties application to production.

## Prerequisites

- Git installed locally
- GitHub account
- Access to your Supabase project
- Node.js 18+ installed locally

## Environment Variables

Before deployment, ensure you have the correct environment variables set:

### Production Supabase Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
```

⚠️ **Security Warning**: Never hardcode these values in your source code or commit them to version control.

## Deploying to Vercel (Recommended)

Vercel is the recommended platform for deploying Next.js applications.

### Step 1: Prepare for GitHub Upload
1. Ensure your `.gitignore` file properly excludes sensitive files:
   - `.env.local`, `.env.*`, etc.
   - `node_modules/`
   - `.next/` (Next.js build files)
   - `supabase/.temp/`

2. Move any sensitive environment variables to `.env.local` (which should be in `.gitignore`)
   and create a `.env.example` file with placeholder values.

3. Initialize your Git repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Yazkap Properties application"
   ```

4. Remove any potentially sensitive files before pushing:
   ```bash
   # If you accidentally committed sensitive files before, remove them:
   git rm --cached .env.local  # If it was previously committed
   git commit --amend -m "Initial commit without sensitive files"
   ```

5. Create a new repository on GitHub and push:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click "New Project" and select your repository
3. Vercel will automatically detect it's a Next.js project
4. Add your environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Click "Deploy"

### Step 3: Configure Custom Domain (Optional)
1. In Vercel dashboard, go to your project
2. Go to "Settings" → "Domains"
3. Add your custom domain

## Deploying to Other Platforms

### Netlify
1. Connect your GitHub repository to Netlify
2. Set build command to: `npm run build`
3. Set publish directory to: `.next` (or `out` depending on your configuration)
4. Add environment variables in Netlify dashboard

### AWS Amplify
1. Connect your GitHub repository to AWS Amplify
2. Set build command to: `npm run build`
3. Set start command to: `npm start`
4. Add environment variables in Amplify console

## Supabase Production Setup

### 1. Update Supabase Project Settings
- Go to your Supabase Dashboard
- Navigate to Settings → API
- Copy your production URL and keys

### 2. Configure Authentication
- Go to Authentication → Settings
- Update your site URL to your production domain
- Update redirect URLs if needed

### 3. Configure Email Templates
- Go to Authentication → Email Templates
- Customize your email templates for production

### 4. Backup Your Data
- Go to Project Settings → Database
- Create a backup of your current data if needed

## Production Checklist

- [ ] Environment variables are correctly set for production
- [ ] Supabase project is configured for production use
- [ ] Authentication settings are updated for production domain
- [ ] SSL certificate is configured (for custom domains)
- [ ] Custom domain is properly configured
- [ ] Database backups are scheduled
- [ ] Monitoring is set up
- [ ] Error tracking is configured

## Running Locally for Testing

To test your production configuration locally:

```bash
# Create a .env.production file with your production variables
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# Run the application
npm run build
npm start
```

## Troubleshooting

### Common Issues:
1. **Environment variables not loaded**: Ensure all environment variables are prefixed with `NEXT_PUBLIC_` if needed on the client side
2. **Supabase connection fails**: Check that your Supabase URL and keys are correct
3. **Authentication issues**: Verify redirect URLs are correctly set in your Supabase dashboard
4. **Build fails**: Make sure all dependencies are properly installed and committed

### Debugging Steps:
1. Check browser console for errors
2. Check server logs in your hosting platform dashboard
3. Verify all environment variables are correctly set
4. Test your Supabase connection independently

## Security Notes

⚠️ **Critical**: Ensure your `.gitignore` file properly excludes:
- `node_modules` (dependencies)
- `.next` (Next.js build files)
- `.env.local` and other `.env.*` files (sensitive environment variables)
- Any files containing personal or sensitive data

Never commit sensitive information to the repository. They are securely stored in your hosting platform's environment variable settings.

⚠️ **If you have accidentally committed sensitive information**, follow these steps immediately:
1. Rotate your API keys and credentials
2. Remove the sensitive files from your git history using `git filter-repo` or similar tools
3. Update your environment variables in deployment platforms
4. Consider the compromised credentials as permanently leaked and regenerate them

# Deployment

Deploy Yazkap Properties to production.

## Environment Variables

Required for production:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Deploy to Vercel

1. Push code to GitHub
2. Connect Vercel to your repository
3. Add environment variables in Vercel dashboard
4. Deploy

## Supabase Setup

1. Create project at supabase.com
2. Get API credentials from Settings → API
3. Apply schema from `supabase/schema.sql`
