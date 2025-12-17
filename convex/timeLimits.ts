import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get time limit settings for a kid
export const getTimeLimit = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const limit = await ctx.db
      .query("timeLimits")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .first();

    return limit || null;
  },
});

// Set/update time limit for a kid
export const setTimeLimit = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    dailyLimitMinutes: v.number(), // 0 = unlimited
    weekendLimitMinutes: v.optional(v.number()),
    allowedStartHour: v.optional(v.number()),
    allowedEndHour: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("timeLimits")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        dailyLimitMinutes: args.dailyLimitMinutes,
        weekendLimitMinutes: args.weekendLimitMinutes,
        allowedStartHour: args.allowedStartHour,
        allowedEndHour: args.allowedEndHour,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    const limitId = await ctx.db.insert("timeLimits", {
      kidProfileId: args.kidProfileId,
      dailyLimitMinutes: args.dailyLimitMinutes,
      weekendLimitMinutes: args.weekendLimitMinutes,
      allowedStartHour: args.allowedStartHour,
      allowedEndHour: args.allowedEndHour,
      updatedAt: Date.now(),
    });

    return limitId;
  },
});

// Delete time limit for a kid (removes all restrictions)
export const deleteTimeLimit = mutation({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("timeLimits")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Check if a kid can watch (based on time limits and current watch time)
export const canWatch = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const limit = await ctx.db
      .query("timeLimits")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .first();

    // No limit set = can watch
    if (!limit || limit.dailyLimitMinutes === 0) {
      return { canWatch: true, reason: null, remainingMinutes: null };
    }

    // Check time window if set
    const now = new Date();
    const currentHour = now.getHours();

    if (limit.allowedStartHour !== undefined && limit.allowedEndHour !== undefined) {
      const start = limit.allowedStartHour;
      const end = limit.allowedEndHour;

      // Handle overnight windows (e.g., 6-22 means 6am to 10pm)
      if (start <= end) {
        // Normal window (e.g., 8am to 8pm)
        if (currentHour < start || currentHour >= end) {
          return {
            canWatch: false,
            reason: "outside_hours",
            allowedStart: start,
            allowedEnd: end,
            remainingMinutes: null,
          };
        }
      } else {
        // Overnight window (e.g., 10pm to 6am would be blocked)
        if (currentHour >= end && currentHour < start) {
          return {
            canWatch: false,
            reason: "outside_hours",
            allowedStart: start,
            allowedEnd: end,
            remainingMinutes: null,
          };
        }
      }
    }

    // Check daily limit
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const dailyLimit = isWeekend && limit.weekendLimitMinutes !== undefined
      ? limit.weekendLimitMinutes
      : limit.dailyLimitMinutes;

    if (dailyLimit === 0) {
      return { canWatch: true, reason: null, remainingMinutes: null };
    }

    // Get today's watch time
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const history = await ctx.db
      .query("watchHistory")
      .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) => q.gte(q.field("watchedAt"), startOfToday))
      .collect();

    const watchedMinutes = Math.round(
      history.reduce((sum, h) => sum + (h.watchDurationSeconds || 0), 0) / 60
    );

    const remainingMinutes = Math.max(0, dailyLimit - watchedMinutes);

    if (remainingMinutes <= 0) {
      return {
        canWatch: false,
        reason: "limit_reached",
        dailyLimit,
        watchedMinutes,
        remainingMinutes: 0,
      };
    }

    return {
      canWatch: true,
      reason: null,
      dailyLimit,
      watchedMinutes,
      remainingMinutes,
    };
  },
});

// Get all time limits for a user's kids (simple version)
export const getAllTimeLimits = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all kid profiles
    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get time limits for each
    const limits = [];
    for (const profile of profiles) {
      const limit = await ctx.db
        .query("timeLimits")
        .withIndex("by_kid", (q) => q.eq("kidProfileId", profile._id))
        .first();

      if (limit) {
        limits.push(limit);
      }
    }

    return limits;
  },
});

// Get time limits for all kids of a user (for parent dashboard)
export const getTimeLimitsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all kid profiles
    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get time limits for each
    const limitsWithKids = await Promise.all(
      profiles.map(async (profile) => {
        const limit = await ctx.db
          .query("timeLimits")
          .withIndex("by_kid", (q) => q.eq("kidProfileId", profile._id))
          .first();

        // Get today's watch time
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const history = await ctx.db
          .query("watchHistory")
          .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", profile._id))
          .filter((q) => q.gte(q.field("watchedAt"), startOfToday))
          .collect();

        const watchedMinutesToday = Math.round(
          history.reduce((sum, h) => sum + (h.watchDurationSeconds || 0), 0) / 60
        );

        return {
          kidProfileId: profile._id,
          kidName: profile.name,
          kidIcon: profile.icon,
          kidColor: profile.color,
          limit: limit || null,
          watchedMinutesToday,
        };
      })
    );

    return limitsWithKids;
  },
});
