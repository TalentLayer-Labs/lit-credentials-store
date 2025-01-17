import { env } from "./env.mjs";

export const availableCreds: Record<
  string,
  { name: string; clientId: string; scope: string; authenticationUrl: string }
> = {
  github: {
    name: "Github",
    clientId: env.NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID,
    scope: "read:user",
    authenticationUrl: "https://github.com/login/oauth/authorize",
  },
};
