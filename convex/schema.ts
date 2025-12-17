import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table (parents)
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    familyCode: v.string(), // Unique code for kids to access
    parentPin: v.optional(v.string()), // PIN to protect parent mode (hashed)
    passwordHash: v.optional(v.string()), // Hashed password for Better Auth
    couponCode: v.optional(v.string()), // Promo code used at signup
    appleMusicAuthorized: v.optional(v.boolean()), // Apple Music authorization status
    appleMusicAuthDate: v.optional(v.number()), // When Apple Music was authorized
    globalHideArtwork: v.optional(v.boolean()), // Global toggle to hide all album artwork
    expoPushToken: v.optional(v.string()), // Expo push notification token
    onboardingCompleted: v.optional(v.boolean()), // Track if user finished onboarding
    subscriptionStatus: v.optional(v.string()), // "trial", "active", "cancelled", "expired"
    stripeCustomerId: v.optional(v.string()), // Stripe customer ID
    subscriptionId: v.optional(v.string()), // Stripe subscription ID
    subscriptionEndsAt: v.optional(v.number()), // When subscription ends
    trialEndsAt: v.optional(v.number()), // When trial expires
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_familyCode", ["familyCode"]),

  // Kid profiles - each kid has their own whitelist
  kidProfiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    icon: v.optional(v.string()), // Emoji icon (optional for legacy profiles)
    avatar: v.optional(v.string()), // Legacy field for backwards compatibility
    ageRange: v.optional(v.string()), // Legacy field for backwards compatibility
    favoriteGenres: v.optional(v.array(v.string())), // Legacy field for backwards compatibility
    favoriteArtists: v.optional(v.array(v.string())), // Legacy field for backwards compatibility
    musicPreferences: v.optional(v.string()), // Legacy field for backwards compatibility
    pin: v.optional(v.string()), // Legacy field for backwards compatibility
    dailyTimeLimitMinutes: v.optional(v.number()), // Legacy field for backwards compatibility
    expoPushToken: v.optional(v.string()), // Legacy field for backwards compatibility
    musicPaused: v.optional(v.boolean()), // Legacy field for backwards compatibility
    color: v.string(), // Theme color
    shortsEnabled: v.optional(v.boolean()), // Allow Shorts videos (default true)
    maxVideosPerChannel: v.optional(v.number()), // Limit feed videos per channel (default 5)
    requestsEnabled: v.optional(v.boolean()), // Allow kid to request content (default true)
    timeLimitEnabled: v.optional(v.boolean()), // Legacy field for backwards compatibility
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // Approved YouTube channels
  approvedChannels: defineTable({
    userId: v.id("users"),
    kidProfileId: v.id("kidProfiles"),
    channelId: v.string(), // YouTube channel ID
    channelTitle: v.string(),
    thumbnailUrl: v.string(),
    description: v.optional(v.string()),
    subscriberCount: v.optional(v.string()),
    videoCount: v.optional(v.string()),
    addedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_kid", ["kidProfileId"])
    .index("by_channel", ["kidProfileId", "channelId"]),

  // Approved YouTube videos
  approvedVideos: defineTable({
    userId: v.id("users"),
    kidProfileId: v.id("kidProfiles"),
    videoId: v.string(), // YouTube video ID
    title: v.string(),
    thumbnailUrl: v.string(),
    channelId: v.string(),
    channelTitle: v.string(),
    duration: v.string(), // ISO 8601 duration
    durationSeconds: v.number(),
    madeForKids: v.boolean(),
    publishedAt: v.optional(v.string()),
    addedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_kid", ["kidProfileId"])
    .index("by_video", ["kidProfileId", "videoId"])
    .index("by_channel", ["kidProfileId", "channelId"]),

  // Watch history for kids
  watchHistory: defineTable({
    kidProfileId: v.id("kidProfiles"),
    videoId: v.string(),
    title: v.string(),
    thumbnailUrl: v.string(),
    channelTitle: v.string(),
    watchedAt: v.number(),
    watchDurationSeconds: v.optional(v.number()),
  })
    .index("by_kid", ["kidProfileId"])
    .index("by_kid_recent", ["kidProfileId", "watchedAt"]),

  // Video requests from kids to parents
  videoRequests: defineTable({
    userId: v.id("users"), // Parent user
    kidProfileId: v.id("kidProfiles"),
    videoId: v.string(),
    title: v.string(),
    thumbnailUrl: v.string(),
    channelId: v.string(),
    channelTitle: v.string(),
    duration: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    requestedAt: v.number(),
    status: v.string(), // 'pending', 'approved', 'denied'
    respondedAt: v.optional(v.number()),
    denyReason: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_kid", ["kidProfileId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_video", ["kidProfileId", "videoId"]),

  // Channel requests from kids to parents
  channelRequests: defineTable({
    userId: v.id("users"), // Parent user
    kidProfileId: v.id("kidProfiles"),
    channelId: v.string(),
    channelTitle: v.string(),
    thumbnailUrl: v.string(),
    description: v.optional(v.string()),
    subscriberCount: v.optional(v.string()),
    requestedAt: v.number(),
    status: v.string(), // 'pending', 'approved', 'denied'
    respondedAt: v.optional(v.number()),
    denyReason: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_kid", ["kidProfileId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_channel", ["kidProfileId", "channelId"]),

  // Time limits for kids
  timeLimits: defineTable({
    kidProfileId: v.id("kidProfiles"),
    dailyLimitMinutes: v.number(), // 0 = unlimited
    weekendLimitMinutes: v.optional(v.number()), // Optional different limit for weekends
    allowedStartHour: v.optional(v.number()), // 0-23, optional time window start
    allowedEndHour: v.optional(v.number()), // 0-23, optional time window end
    updatedAt: v.number(),
  })
    .index("by_kid", ["kidProfileId"]),

  // Kid playlists - kids can organize their approved videos into playlists
  kidPlaylists: defineTable({
    kidProfileId: v.id("kidProfiles"),
    name: v.string(),
    emoji: v.optional(v.string()), // Optional emoji icon for playlist
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_kid", ["kidProfileId"]),

  // Videos in kid playlists
  kidPlaylistVideos: defineTable({
    playlistId: v.id("kidPlaylists"),
    kidProfileId: v.id("kidProfiles"), // Denormalized for easy querying
    videoId: v.string(), // YouTube video ID
    title: v.string(),
    thumbnailUrl: v.string(),
    channelTitle: v.string(),
    durationSeconds: v.optional(v.number()),
    sortOrder: v.number(), // For ordering videos in playlist
    addedAt: v.number(),
  })
    .index("by_playlist", ["playlistId"])
    .index("by_kid", ["kidProfileId"])
    .index("by_playlist_order", ["playlistId", "sortOrder"]),

  // AI Channel Review Cache - stores OpenAI analysis of YouTube channels
  channelReviewCache: defineTable({
    channelId: v.string(), // YouTube channel ID
    channelTitle: v.string(),
    description: v.optional(v.string()),
    subscriberCount: v.optional(v.string()),
    summary: v.string(),
    contentCategories: v.array(v.string()),
    concerns: v.array(v.object({
      category: v.string(),
      severity: v.string(),
      description: v.string(),
    })),
    recommendation: v.string(), // "Recommended", "Review Videos First", "Not Recommended"
    ageRecommendation: v.string(),
    reviewedAt: v.number(),
    timesReused: v.number(),
    lastAccessedAt: v.number(),
  })
    .index("by_channel_id", ["channelId"]),
});
