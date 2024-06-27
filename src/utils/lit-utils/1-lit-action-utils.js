// This file defines a LitAction that creates a credential for a given user 
// It checks his programming skills and open source contributions from GitHub.
// The file is uploaded on ipfs and the ccid is passed to the LitAction in page.tsx

export const generateUUIDwithTimestamp = () => {
  const timestamp = Date.now().toString()
  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (
    c
  ) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
  return uuid + "-" + timestamp;
}

const TRY_AGAIN_LATER = "Please try again later";

const SECONDARY_ERROR_MESSAGES = {
  MAX_RETRY:
    "You can deploy own instance or wait until public will be no longer limited",
  NO_TOKENS:
    "Please add an env variable called PAT_1 with your GitHub API token in vercel",
  USER_NOT_FOUND: "Make sure the provided username is not an organization",
  GRAPHQL_ERROR: TRY_AGAIN_LATER,
  GITHUB_REST_API_ERROR: TRY_AGAIN_LATER,
  WAKATIME_USER_NOT_FOUND: "Make sure you have a public WakaTime profile"
}

/**
 * Custom error class to handle custom GRS errors.
 */
export class CustomError extends Error {
  /**
   * @param {string} message Error message.
   * @param {string} type Error type.
   */
  constructor(message, type) {
    super(message)
    this.type = type
    this.secondaryMessage = SECONDARY_ERROR_MESSAGES[type] || type
  }

  static MAX_RETRY = "MAX_RETRY"
  static NO_TOKENS = "NO_TOKENS"
  static USER_NOT_FOUND = "USER_NOT_FOUND"
  static GRAPHQL_ERROR = "GRAPHQL_ERROR"
  static GITHUB_REST_API_ERROR = "GITHUB_REST_API_ERROR"
  static WAKATIME_ERROR = "WAKATIME_ERROR"
}
