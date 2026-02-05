import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

// Get all users with kid counts for admin dashboard
export const getAllUsersWithKids = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    const usersWithKids = await Promise.all(
      users.map(async (user) => {
        const kidProfiles = await ctx.db
          .query("kidProfiles")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        const approvedChannels = await ctx.db
          .query("approvedChannels")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        const approvedVideos = await ctx.db
          .query("approvedVideos")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        return {
          _id: user._id,
          email: user.email,
          name: user.name,
          familyCode: user.familyCode,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionEndsAt: user.subscriptionEndsAt,
          trialEndsAt: user.trialEndsAt,
          createdAt: user.createdAt,
          kidCount: kidProfiles.length,
          channelCount: approvedChannels.length,
          videoCount: approvedVideos.length,
        };
      })
    );

    // Sort by createdAt descending (newest first)
    return usersWithKids.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },
});

// Admin function to reset a user's password
// This directly updates the password hash in Better Auth's account table
export const resetUserPassword = internalMutation({
  args: {
    email: v.string(),
    newPasswordHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the user in Better Auth
    // @ts-ignore - accessing Better Auth component table
    const user = await ctx.db
      .query("betterAuth_user")
      .filter((q: any) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

    // Find their account (email/password account)
    // @ts-ignore - accessing Better Auth component table
    const account = await ctx.db
      .query("betterAuth_account")
      .filter((q: any) =>
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
    // @ts-ignore - accessing Better Auth component table
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

// Apply a promo code to unlock lifetime access (user-facing)
export const applyPromoCode = mutation({
  args: { userId: v.id("users"), promoCode: v.string() },
  handler: async (ctx, args) => {
    const lifetimeCodes = ["DAWSFRIEND", "DEWITT"];
    const codeUpper = args.promoCode.trim().toUpperCase();

    if (!lifetimeCodes.includes(codeUpper)) {
      return { success: false, error: "Invalid promo code" };
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Set to lifetime subscription
    await ctx.db.patch(args.userId, {
      subscriptionStatus: "lifetime",
      couponCode: codeUpper,
    });

    return { success: true };
  },
});

// Grant lifetime subscription to a user by email (admin use via CLI)
export const grantLifetimeByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

    await ctx.db.patch(user._id, {
      subscriptionStatus: "lifetime",
      couponCode: "DAWSFRIEND",
    });

    return { success: true, email: args.email, previousStatus: user.subscriptionStatus };
  },
});

// Remove watch history entries with "Unknown Channel" (cleanup bad data)
export const cleanupUnknownChannelHistory = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
  },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("watchHistory")
      .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) => q.eq(q.field("channelTitle"), "Unknown Channel"))
      .collect();

    for (const h of history) {
      await ctx.db.delete(h._id);
    }

    return { deleted: history.length };
  },
});

// Delete a user and all their associated data by email (admin use)
export const deleteUserByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

    // Delete kid profiles
    const kidProfiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const kid of kidProfiles) {
      // Delete watch history for this kid
      const watchHistory = await ctx.db
        .query("watchHistory")
        .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", kid._id))
        .collect();
      for (const h of watchHistory) {
        await ctx.db.delete(h._id);
      }
      await ctx.db.delete(kid._id);
    }

    // Delete approved channels
    const channels = await ctx.db
      .query("approvedChannels")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const c of channels) {
      await ctx.db.delete(c._id);
    }

    // Delete approved videos
    const videos = await ctx.db
      .query("approvedVideos")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const v of videos) {
      await ctx.db.delete(v._id);
    }

    // Delete the user
    await ctx.db.delete(user._id);

    return {
      deletedUser: args.email,
      deletedKids: kidProfiles.length,
      deletedChannels: channels.length,
      deletedVideos: videos.length,
    };
  },
});
