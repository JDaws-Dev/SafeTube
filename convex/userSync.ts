import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper function to generate a unique 6-character family code
function generateFamilyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars: 0, O, I, 1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get the current authenticated user from Convex Auth
 * Use this in queries/mutations to get the logged-in user's SafeTube data
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

/**
 * Apply a coupon code to the current user's account
 * Called after signup if user enters a coupon code
 */
export const applyCouponCode = mutation({
  args: {
    couponCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if coupon code is valid (lifetime free codes)
    const lifetimeCodes = ["DAWSFRIEND", "DEWITT"];
    const couponUpper = args.couponCode.trim().toUpperCase();
    const hasValidCoupon = lifetimeCodes.includes(couponUpper);

    if (!hasValidCoupon) {
      throw new Error("Invalid coupon code");
    }

    // Apply lifetime status
    await ctx.db.patch(userId, {
      subscriptionStatus: "lifetime",
      couponCode: couponUpper,
    });

    return { success: true, status: "lifetime" };
  },
});

/**
 * LEGACY: Sync Better Auth user to SafeTube users table
 * @deprecated Use Convex Auth's afterUserCreatedOrUpdated callback instead
 * Kept for backward compatibility during migration
 */
export const syncBetterAuthUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if SafeTube user already exists for this email
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      // User already exists, just return the existing user ID
      return existing._id;
    }

    // Generate a unique family code
    let familyCode = generateFamilyCode();
    let codeExists = true;

    // Keep generating until we get a unique code
    while (codeExists) {
      const existingCode = await ctx.db
        .query("users")
        .withIndex("by_familyCode", (q) => q.eq("familyCode", familyCode))
        .first();

      if (!existingCode) {
        codeExists = false;
      } else {
        familyCode = generateFamilyCode();
      }
    }

    // Check if coupon code is valid (lifetime free codes)
    const lifetimeCodes = ["DAWSFRIEND", "DEWITT"];
    const couponUpper = args.couponCode?.trim().toUpperCase();
    const hasValidCoupon = couponUpper && lifetimeCodes.includes(couponUpper);
    const subscriptionStatus = hasValidCoupon ? "lifetime" : "trial";

    // Create SafeTube user record
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      familyCode: familyCode,
      createdAt: Date.now(),
      subscriptionStatus: subscriptionStatus,
      couponCode: args.couponCode?.trim().toUpperCase(),
    });

    return userId;
  },
});

/**
 * Get SafeTube user data by email (linked to auth user)
 */
export const getSafeTubeUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

/**
 * Ensure SafeTube user exists - called on EVERY login as a safety net
 * This catches any users who authenticated but didn't sync
 */
export const ensureSafeTubeUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if SafeTube user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      // User already exists, all good
      return { userId: existing._id, wasCreated: false };
    }

    // User is missing - create them now to prevent the app from breaking
    console.warn(`[ensureSafeTubeUser] Creating missing user: ${args.email}`);

    // Generate a unique family code
    let familyCode = "";
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let codeExists = true;

    while (codeExists) {
      familyCode = "";
      for (let i = 0; i < 6; i++) {
        familyCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existingCode = await ctx.db
        .query("users")
        .withIndex("by_familyCode", (q) => q.eq("familyCode", familyCode))
        .first();
      codeExists = !!existingCode;
    }

    // Create the missing user with trial status
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      familyCode: familyCode,
      createdAt: Date.now(),
      subscriptionStatus: "trial",
    });

    console.log(
      `[ensureSafeTubeUser] Created missing user: ${args.email} -> ${userId}`
    );

    return { userId, wasCreated: true };
  },
});

/**
 * Update SafeTube user subscription from Stripe
 * (This maintains compatibility with existing Stripe integration)
 */
export const updateSafeTubeUserSubscription = mutation({
  args: {
    email: v.string(),
    subscriptionStatus: v.string(),
    subscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("SafeTube user not found for email: " + args.email);
    }

    await ctx.db.patch(user._id, {
      subscriptionStatus: args.subscriptionStatus,
      subscriptionId: args.subscriptionId,
      stripeCustomerId: args.stripeCustomerId,
    });

    return user._id;
  },
});
