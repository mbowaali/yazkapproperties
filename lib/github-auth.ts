import { supabase } from './supabase';

interface GitHubAuthOptions {
  redirectTo?: string;
  scopes?: string[];
}

/**
 * Initiates GitHub OAuth flow
 */
export const signInWithGitHub = async (options: GitHubAuthOptions = {}) => {
  const { redirectTo = `${window.location.origin}/auth/callback`, scopes = [] } = options;

  try {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo,
        scopes,
      },
    });
    // Note: The user will be redirected to GitHub, so this line typically won't execute
  } catch (error: any) {
    throw new Error(`GitHub authentication failed: ${error.message}`);
  }
};

/**
 * Signs out the current user
 */
export const signOutFromGitHubAuth = async () => {
  await supabase.auth.signOut();
};

/**
 * Gets the current session
 */
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Failed to get session: ${error.message}`);
  }

  return session;
};
