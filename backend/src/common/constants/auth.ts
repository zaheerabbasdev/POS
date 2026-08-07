// Name of the httpOnly cookie the API sets on login and reads on
// subsequent requests. Kept in one place since app.ts, auth.controller.ts,
// and authenticate.ts all need to agree on it.
export const AUTH_COOKIE_NAME = "pos_token";
