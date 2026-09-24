# Supabase Config for Yazkap Properties

Configure Supabase for the Yazkap Properties application.

## Environment Variables

Your `.env.local` file should contain:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon_key
SUPABASE_SERVICE_ROLE_KEY=service_role_key
```

## Key Types

- **Anon Key**: Client-side operations (authentication, database queries, storage)
- **Service Role Key**: Server-side operations (higher permissions, never expose)

# GitHub OAuth (if configured)
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

## Key Usage in the Application

### Client-Side Operations
- All user-facing interactions (login, signup, data queries)
- File uploads to storage
- OAuth flows
- Uses the anon key for security

### Server-Side Operations
- Data seeding and administrative tasks
- Operations requiring elevated permissions
- Uses the service role key for broader access

## Security Best Practices

1. **Never commit API keys** to version control
2. **Always use environment variables** for sensitive data
3. **Use the principle of least privilege** - anon key for client, service role for server
4. **Implement proper RLS (Row Level Security)** on your database tables
5. **Rotate keys regularly** if you suspect a compromise

## Testing the Connection

To verify your Supabase connection is working:

1. Start your development server: `npm run dev`
2. Visit your application
3. Try signing in with existing credentials or GitHub OAuth
4. Check browser console for any API errors
5. Verify data loads from your Supabase database

## Troubleshooting

### Common Issues:
- Invalid API keys: Double-check your keys match exactly what's in your Supabase dashboard
- CORS errors: Make sure your Supabase project allows requests from your domain
- RLS errors: Check your Row Level Security policies in the Supabase dashboard
- OAuth not working: Verify your redirect URLs are configured correctly

### Where to Find Your Keys:
1. Go to your Supabase Dashboard
2. Select your project
3. Navigate to Settings → API
4. Find your Project URL, Public Anonymous Key, and Secret Key