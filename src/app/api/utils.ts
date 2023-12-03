import axios from "axios";

const TRY_AGAIN_LATER = "Please try again later";

const SECONDARY_ERROR_MESSAGES: Record<string, string> = {
  MAX_RETRY: "You can deploy own instance or wait until public will be no longer limited",
  NO_TOKENS: "Please add an env variable called PAT_1 with your GitHub API token in vercel",
  USER_NOT_FOUND: "Make sure the provided username is not an organization",
  GRAPHQL_ERROR: TRY_AGAIN_LATER,
  GITHUB_REST_API_ERROR: TRY_AGAIN_LATER,
  WAKATIME_USER_NOT_FOUND: "Make sure you have a public WakaTime profile",
};

/**
 * Custom error class to handle custom GRS errors.
 */
class CustomError extends Error {
  type: string;
  secondaryMessage: string;

  /**
   * @param {string} message Error message.
   * @param {string} type Error type.
   */
  constructor(message: string, type: string) {
    super(message);
    this.type = type;
    this.secondaryMessage = SECONDARY_ERROR_MESSAGES[type] || type;
  }

  static MAX_RETRY = "MAX_RETRY";
  static NO_TOKENS = "NO_TOKENS";
  static USER_NOT_FOUND = "USER_NOT_FOUND";
  static GRAPHQL_ERROR = "GRAPHQL_ERROR";
  static GITHUB_REST_API_ERROR = "GITHUB_REST_API_ERROR";
  static WAKATIME_ERROR = "WAKATIME_ERROR";
}

/**
 * Encode string as HTML.
 *
 * @see https://stackoverflow.com/a/48073476/10629172
 *
 * @param {string} str String to encode.
 * @returns {string} Encoded string.
 */
// const encodeHTML = (str: string) => {
//   return str
//     .replace(/[\u00A0-\u9999<>&](?!#)/gim, (i) => {
//       return "&#" + i.charCodeAt(0) + ";";
//     })
//     .replace(/\u0008/gim, "");
// };

const noop = () => {};
// return console instance based on the environment
const logger = process.env.NODE_ENV === "test" ? { log: noop, error: noop } : console;

/**
 * Missing query parameter class.
 */
class MissingParamError extends Error {
  missedParams: string[];
  secondaryMessage: string;

  /**
   * Missing query parameter error constructor.
   *
   * @param {string[]} missedParams An array of missing parameters names.
   * @param {string=} secondaryMessage Optional secondary message to display.
   */
  constructor(missedParams: string[], secondaryMessage: string) {
    const msg = `Missing params ${missedParams
      .map((p) => `"${p}"`)
      .join(", ")} make sure you pass the parameters in URL`;
    super(msg);
    this.missedParams = missedParams;
    this.secondaryMessage = secondaryMessage;
  }
}

const request = (data: any, headers: any) => {
  return axios({
    url: "https://api.github.com/graphql",
    method: "post",
    headers,
    data,
  });
};

export { logger, CustomError, MissingParamError, request };
