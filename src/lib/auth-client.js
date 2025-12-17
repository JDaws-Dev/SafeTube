import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

// Use Vite proxy for development, same-origin for production
// In dev: requests go to http://localhost:5173/api/auth/* → proxied to Convex
// In prod: requests go to same origin /api/auth/* → Vercel rewrites to Convex
// Using window.location.origin ensures it works on any domain
const isDev = import.meta.env.DEV;
const baseURL = isDev
  ? 'http://localhost:5173'  // Use Vite proxy in development
  : (typeof window !== 'undefined' ? window.location.origin : 'https://getsafetube.com');  // Use same origin in production

export const authClient = createAuthClient({
  baseURL,
  plugins: [convexClient()],
});

// Export auth hooks for use in components
export const {
  useSession,
  signIn,
  signOut,
  signUp,
  getSession,
} = authClient;
