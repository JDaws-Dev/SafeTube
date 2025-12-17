import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Allowed origins for CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://getsafetube.com",
  "https://www.getsafetube.com",
];

// Create CORS headers based on request origin
function getCorsHeaders(request: Request) {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

// Handle CORS preflight for all /api/auth/* routes
http.route({
  path: "/api/auth/sign-up/email",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }),
});

http.route({
  path: "/api/auth/sign-in/email",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }),
});

http.route({
  path: "/api/auth/get-session",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }),
});

http.route({
  path: "/api/auth/sign-out",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }),
});

// Better Auth routes - handles all /api/auth/* routes with CORS enabled
authComponent.registerRoutes(http, createAuth, { cors: true });

export default http;
