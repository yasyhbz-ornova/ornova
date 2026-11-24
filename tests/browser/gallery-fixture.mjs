const user = {
  id: "fc3d7435-9816-4354-b8f1-09fe4cb10046",
  email: "gallery-test@example.invalid",
  role: "authenticated",
  aud: "authenticated",
  app_metadata: {},
  user_metadata: {},
};
const expires = 2_208_988_800;
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

export const galleryQA = {
  app: "http://localhost:3108",
  backend: "http://127.0.0.1:54382",
  user,
  session: {
    access_token: `${encode({ typ: "JWT", alg: "HS256" })}.${encode({ exp: expires, sub: user.id })}.dGVzdA`,
    refresh_token: "local-gallery-fixture",
    token_type: "bearer",
    expires_at: expires,
    expires_in: 3600,
    user,
  },
};

export function galleryTestCookie() {
  return { name: "sb-127-auth-token", value: `base64-${encode(galleryQA.session)}`, url: galleryQA.app };
}
