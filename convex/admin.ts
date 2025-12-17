import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { authComponent } from "./auth";

// Admin function to reset a user's password
// This directly updates the password hash in Better Auth's account table
export const resetUserPassword = internalMutation({
  args: {
    email: v.string(),
    newPasswordHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the user in Better Auth
    const user = await ctx.db
      .query("betterAuth_user")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

    // Find their account (email/password account)
    const account = await ctx.db
      .query("betterAuth_account")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("providerId"), "credential")
        )
      )
      .first();

    if (!account) {
      throw new Error(`No password account found for: ${args.email}`);
    }

    // Update the password hash
    await ctx.db.patch(account._id, {
      password: args.newPasswordHash,
    });

    return { success: true, userId: user._id };
  },
});

// List all Better Auth users (for debugging)
export const listAuthUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Try different possible table names
    try {
      // @ts-ignore - accessing component table
      const users = await ctx.db.query("betterAuth:user").collect();
      return users.map((u: any) => ({
        id: u._id,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt,
      }));
    } catch (e) {
      return { error: String(e) };
    }
  },
});
