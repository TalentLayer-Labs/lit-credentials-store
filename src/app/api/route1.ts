import { CustomError, logger, request } from "./utils";

/**
 * @typedef {import("axios").AxiosRequestHeaders} AxiosRequestHeaders Axios request headers.
 * @typedef {import("axios").AxiosResponse} AxiosResponse Axios response.
 */

/**
 * Top languages fetcher object.
 *
 * @param {AxiosRequestHeaders} variables Fetcher variables.
 * @param {string} token GitHub token.
 * @returns {Promise<AxiosResponse>} Languages fetcher response.
 */
const fetcher = (variables: any, token: string) => {
  return request(
    {
      query: `
      query userInfo($login: String!) {
        user(login: $login) {
          # fetch only owner repos & not forks
          repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
            nodes {
              name
              languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                edges {
                  size
                  node {
                    color
                    name
                  }
                }
              }
            }
          }
        }
      }
      `,
      variables,
    },
    {
      Authorization: `token ${token}`,
    },
  );
};

/**
 * @typedef {import("./types").TopLangData} TopLangData Top languages data.
 */

/**
 * Fetch top languages for a given username.
 *
 * @param {string} username GitHub username.
 * @param {string[]} exclude_repo List of repositories to exclude.
 * @param {number} size_weight Weightage to be given to size.
 * @param {number} count_weight Weightage to be given to count.
 * @returns {Promise<TopLangData>} Top languages data.
 */
const fetchTopLanguages = async (
  username: string,
  token: string,
  exclude_repo: string[] = [],
  size_weight: number = 1,
  count_weight: number = 0,
) => {
  const res = await fetcher({ login: username }, token);

  if (res.data.errors) {
    logger.error(res.data.errors);
    if (res.data.errors[0].type === "NOT_FOUND") {
      throw new CustomError(
        res.data.errors[0].message || "Could not fetch user.",
        CustomError.USER_NOT_FOUND,
      );
    }
    if (res.data.errors[0].message) {
      throw new CustomError(res.data.errors[0].message, res.statusText);
    }
    throw new CustomError(
      "Something went wrong while trying to retrieve the language data using the GraphQL API.",
      CustomError.GRAPHQL_ERROR,
    );
  }

  let repoNodes: any[] = res.data.data.user.repositories.nodes;
  console.log(repoNodes.length);

  // return repoNodes;

  let repoToHide: Record<string, boolean> = {};

  // populate repoToHide map for quick lookup
  // while filtering out
  if (exclude_repo) {
    exclude_repo.forEach((repoName) => {
      repoToHide[repoName] = true;
    });
  }

  // filter out repositories to be hidden
  repoNodes = repoNodes.sort((a, b) => b.size - a.size).filter((name) => !repoToHide[name.name]);

  let repoCount = 0;

  console.log(repoNodes);

  repoNodes = repoNodes
    .filter((node) => node.languages.edges.length > 0)
    .reduce((acc, curr) => curr.languages.edges.concat(acc), [])
    // flatten the list of language nodes
    .reduce((acc: any, prev: any) => {
      // get the size of the language (bytes)
      let langSize = prev.size;

      // if we already have the language in the accumulator
      // & the current language name is same as previous name
      // add the size to the language size and increase repoCount.
      if (acc[prev.node.name] && prev.node.name === acc[prev.node.name].name) {
        langSize = prev.size + acc[prev.node.name].size;
        repoCount = acc[prev.node.name].count + 1;
      } else {
        // reset repoCount to 1
        // language must exist in at least one repo to be detected
        repoCount = 1;
      }
      return {
        ...acc,
        [prev.node.name]: {
          name: prev.node.name,
          color: prev.node.color,
          size: langSize,
          count: repoCount,
        },
      };
    }, {});

  Object.keys(repoNodes).forEach((name) => {
    // comparison index calculation
    (repoNodes as any)[name].size =
      Math.pow((repoNodes as any)[name].size, size_weight) *
      Math.pow((repoNodes as any)[name].count, count_weight);
  });

  const topLangs = Object.keys(repoNodes)
    .sort((a, b) => (repoNodes as any)[b].size - (repoNodes as any)[a].size)
    .reduce((result, key) => {
      (result as any)[key] = (repoNodes as any)[key];
      return result;
    }, {});

  return topLangs;
};

export { fetchTopLanguages };
export default fetchTopLanguages;
