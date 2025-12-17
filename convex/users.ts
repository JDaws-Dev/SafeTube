import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Generate a random 6-character family code
function generateFamilyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get user by email (for authenticated users)
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) return null;

    // Check if trial has expired
    const isTrialExpired = user.subscriptionStatus === "trial" &&
      user.trialEndsAt &&
      Date.now() > user.trialEndsAt;

    return {
      ...user,
      isTrialExpired,
    };
  },
});

// Create or sync user from auth
export const syncUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      return existing._id;
    }

    // Generate unique family code
    let familyCode = generateFamilyCode();
    let attempts = 0;
    while (attempts < 10) {
      const codeExists = await ctx.db
        .query("users")
        .withIndex("by_familyCode", (q) => q.eq("familyCode", familyCode))
        .first();
      if (!codeExists) break;
      familyCode = generateFamilyCode();
      attempts++;
    }

    // Create new user with 7-day trial
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      familyCode,
      subscriptionStatus: "trial",
      trialEndsAt: now + sevenDaysMs,
      onboardingCompleted: false,
      createdAt: now,
    });

    return userId;
  },
});

// Get user by family code (for kid access)
export const getUserByFamilyCode = query({
  args: { familyCode: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_familyCode", (q) => q.eq("familyCode", args.familyCode.toUpperCase()))
      .first();

    if (!user) return null;

    return {
      _id: user._id,
      familyCode: user.familyCode,
    };
  },
});

// Set parent PIN
export const setParentPin = mutation({
  args: {
    userId: v.id("users"),
    pinHash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      parentPin: args.pinHash,
    });
  },
});

// Verify parent PIN
export const verifyParentPin = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.parentPin || null;
  },
});

// Complete onboarding
export const completeOnboarding = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      onboardingCompleted: true,
    });
  },
});

// Check if user needs onboarding
export const checkOnboardingStatus = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) return { needsOnboarding: false, user: null };

    return {
      needsOnboarding: !user.onboardingCompleted,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        familyCode: user.familyCode,
        onboardingCompleted: user.onboardingCompleted,
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt,
      },
    };
  },
});
