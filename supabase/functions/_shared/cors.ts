// Every function here is called from a browser context somewhere (web mode
// during development, and the admin console in apps/web for create-operator)
// as well as the native app, where CORS enforcement doesn't apply. None of
// them set an Access-Control-Allow-Origin header, so a browser's preflight
// OPTIONS request -- which the browser sends automatically before the real
// POST, and which none of these functions ever answered -- was rejected
// before the function body ever ran. This surfaced as "Failed to send a
// request to the Edge Function" with no server-side error to read, because
// the browser blocks the response before JavaScript ever sees it.
//
// The wildcard origin is fine here: every function requires a bearer token
// or performs its own server-side checks before doing anything privileged,
// so no cookie-based or ambient-credential trust is at stake -- the origin
// header is not part of any of these functions' authorization decisions.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
