import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";

// SITE_URL should be the Convex site URL for auth endpoint operations
const siteUrl = process.env.SITE_URL || "https://rightful-rabbit-333.convex.site";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    // Set cookies for the frontend domain when proxied through Vercel
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
        domain: "getsafetube.com", // Explicitly set cookie domain
      },
    },
    trustedOrigins: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://getsafetube.com",
      "https://www.getsafetube.com",
      "https://safetube-family-planner.vercel.app",
    ],
    plugins: [
      convex(),
    ],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});
