
// Using concatenation with proper escaping of quotes and new lines.
// GraphQL queries.
const GRAPHQL_REPOS_FIELD = `
  repositories(first: 100, ownerAffiliations: OWNER, orderBy: {direction: DESC, field: STARGAZERS}, after: $after) {
    totalCount
    nodes {
      name
      stargazers {
        totalCount
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
`

const GRAPHQL_STATS_QUERY = `
  query userInfo($login: String!, $after: String, $includeMergedPullRequests: Boolean!, $includeDiscussions: Boolean!, $includeDiscussionsAnswers: Boolean!) {
    user(login: $login) {
      name
      login
      contributionsCollection {
        totalCommitContributions,
        totalPullRequestReviewContributions
      }
      repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) {
        totalCount
      }
      pullRequests(first: 1) {
        totalCount
      }
      mergedPullRequests: pullRequests(states: MERGED) @include(if: $includeMergedPullRequests) {
        totalCount
      }
      openIssues: issues(states: OPEN) {
        totalCount
      }
      closedIssues: issues(states: CLOSED) {
        totalCount
      }
      followers {
        totalCount
      }
      repositoryDiscussions @include(if: $includeDiscussions) {
        totalCount
      }
      repositoryDiscussionComments(onlyAnswers: true) @include(if: $includeDiscussionsAnswers) {
        totalCount
      }
      ${GRAPHQL_REPOS_FIELD}
    }
  }
`

const GRAPHQL_TOP_LANGUAGES_QUERY = `
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
`



/**
 * Stats fetcher object.
 *
 * @param {string} query The graphql query.
 * @param {object} variables Fetcher variables.
 * @param {string} token GitHub token.
 * @returns {Promise<any>} Promise.
 */
const graphqlFetcher = async (query, variables, token) => {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
    body: JSON.stringify({
      query,
      variables
    })
  })
  return await response.json()
}

/**
 * Fetch stats information for a given username.
 *
 * @param {object} variables Fetcher variables.
 * @param {string} variables.username Github username.
 * @param {boolean} variables.includeMergedPullRequests Include merged pull requests.
 * @param {boolean} variables.includeDiscussions Include discussions.
 * @param {boolean} variables.includeDiscussionsAnswers Include discussions answers.
 * @param {string} token Auth Token
 * @returns {Promise<any>} Promise response.
 *
 * @description This function supports multi-page fetching if the 'FETCH_MULTI_PAGE_STARS' environment variable is set to true.
 */
const statsFetcher = async (
  {
    username,
    includeMergedPullRequests,
    includeDiscussions,
    includeDiscussionsAnswers
  },
  token
) => {
  let stats
  let hasNextPage = true
  let endCursor = null
  while (hasNextPage) {
    const variables = {
      login: username,
      first: 100,
      after: endCursor,
      includeMergedPullRequests,
      includeDiscussions,
      includeDiscussionsAnswers
    }
    let res = await graphqlFetcher(GRAPHQL_STATS_QUERY, variables, token)
    if (res.data.errors) {
      return res
    }

    // Store stats data.
    const repoNodes = res.data.user.repositories.nodes
    if (stats) {
      stats.data.user.repositories.nodes.push(...repoNodes)
    } else {
      stats = res
    }

    // Disable multi page fetching on public Vercel instance due to rate limits.
    const repoNodesWithStars = repoNodes.filter(
      node => node.stargazers.totalCount !== 0
    )
    hasNextPage =
      repoNodes.length === repoNodesWithStars.length &&
      res.data.user.repositories.pageInfo.hasNextPage
    endCursor = res.data.user.repositories.pageInfo.endCursor
  }

  return stats
}

/**
 * Fetch all the commits for all the repositories of a given username.
 *
 * @param {string} username GitHub username.
 * @returns {Promise<number>} Total commits.
 *
 * @description Done like this because the GitHub API does not provide a way to fetch all the commits. See
 * #92#issuecomment-661026467 and #211 for more information.
 */
const totalCommitsFetcher = async (username, token) => {
  // https://developer.github.com/v3/search/#search-commits
  let res
  try {
    res = await fetch(
      "https://api.github.com/search/commits?q=author:" + username,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/vnd.github.cloak-preview",
          "Authorization": "Bearer " + token
        }
      }
    )
    res = await res.json();
  } catch (err) {
    throw new Error(err)
  }

  const totalCount = res.total_count
  if (!totalCount || isNaN(totalCount)) {
    throw new CustomError(
      "Could not fetch total commits.",
      CustomError.GITHUB_REST_API_ERROR
    )
  }
  return totalCount
}

/**
 * @typedef {import("./types").StatsData} StatsData Stats data.
 */

/**
 * Fetch stats for a given username.
 *
 * @param {string} username GitHub username.
 * @param {boolean} include_all_commits Include all commits.
 * @param {boolean} include_merged_pull_requests Include merged pull requests.
 * @param {boolean} include_discussions Include discussions.
 * @param {boolean} include_discussions_answers Include discussions answers.
 * @returns {Promise<StatsData>} Stats data.
 */
const fetchStats = async (
  username,
  include_all_commits = false,
  include_merged_pull_requests = false,
  include_discussions = false,
  include_discussions_answers = false,
  token
) => {
  if (!username) {
    throw "MissingParamError : " + username
  }

  const stats = {
    name: "",
    totalPRs: 0,
    totalPRsMerged: 0,
    mergedPRsPercentage: 0,
    totalReviews: 0,
    totalCommits: 0,
    totalIssues: 0,
    totalStars: 0,
    totalDiscussionsStarted: 0,
    totalDiscussionsAnswered: 0,
    contributedTo: 0
  }

  let res = await statsFetcher(
    {
      username,
      includeMergedPullRequests: include_merged_pull_requests,
      includeDiscussions: include_discussions,
      includeDiscussionsAnswers: include_discussions_answers
    },
    token
  )

  if (!res) return

  // Catch GraphQL errors.
  if (res.data.errors) {
    if (res.data.errors[0].type === "NOT_FOUND") {
      throw new CustomError(
        res.data.errors[0].message || "Could not fetch user.",
        CustomError.USER_NOT_FOUND
      )
    }
    if (res.data.errors[0].message) {
      throw new CustomError(res.data.errors[0].message, res.statusText)
    }
    throw new CustomError(
      "Something went wrong while trying to retrieve the stats data using the GraphQL API.",
      CustomError.GRAPHQL_ERROR
    )
  }

  const user = res.data.user

  stats.name = user.name || user.login

  // if include_all_commits, fetch all commits using the REST API.
  if (include_all_commits) {
    stats.totalCommits = await totalCommitsFetcher(username, token)
  } else {
    stats.totalCommits = user.contributionsCollection.totalCommitContributions
  }

  stats.totalPRs = user.pullRequests.totalCount
  if (include_merged_pull_requests) {
    stats.totalPRsMerged = user.mergedPullRequests.totalCount
    stats.mergedPRsPercentage =
      (user.mergedPullRequests.totalCount / user.pullRequests.totalCount) * 100
  }
  stats.totalReviews =
    user.contributionsCollection.totalPullRequestReviewContributions
  stats.totalIssues = user.openIssues.totalCount + user.closedIssues.totalCount
  if (include_discussions) {
    stats.totalDiscussionsStarted = user.repositoryDiscussions.totalCount
  }
  if (include_discussions_answers) {
    stats.totalDiscussionsAnswered =
      user.repositoryDiscussionComments.totalCount
  }
  stats.contributedTo = user.repositoriesContributedTo.totalCount

  stats.totalStars = user.repositories.nodes.reduce((prev, curr) => {
    return prev + curr.stargazers.totalCount
  }, 0)

  return stats
}

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
  username,
  token,
  exclude_repo = [],
  size_weight = 1,
  count_weight = 0
) => {
  const res = await graphqlFetcher(
    GRAPHQL_TOP_LANGUAGES_QUERY,
    { login: username },
    token
  )

  if (res.data.errors) {
    if (res.data.errors[0].type === "NOT_FOUND") {
      throw new CustomError(
        res.data.errors[0].message || "Could not fetch user.",
        CustomError.USER_NOT_FOUND
      )
    }
    if (res.data.errors[0].message) {
      throw new CustomError(res.data.errors[0].message, res.statusText)
    }
    throw new CustomError(
      "Something went wrong while trying to retrieve the language data using the GraphQL API.",
      CustomError.GRAPHQL_ERROR
    )
  }

  let repoNodes = res.data.user.repositories.nodes

  let repoToHide = {}

  // populate repoToHide map for quick lookup
  // while filtering out
  if (exclude_repo) {
    exclude_repo.forEach(repoName => {
      repoToHide[repoName] = true
    })
  }

  // filter out repositories to be hidden
  repoNodes = repoNodes
    .sort((a, b) => b.size - a.size)
    .filter(name => !repoToHide[name.name])

  let repoCount = 0

  repoNodes = repoNodes
    .filter(node => node.languages.edges.length > 0)
    .reduce((acc, curr) => curr.languages.edges.concat(acc), [])
    // flatten the list of language nodes
    .reduce((acc, prev) => {
      // get the size of the language (bytes)
      let langSize = prev.size

      // if we already have the language in the accumulator
      // & the current language name is same as previous name
      // add the size to the language size and increase repoCount.
      if (acc[prev.node.name] && prev.node.name === acc[prev.node.name].name) {
        langSize = prev.size + acc[prev.node.name].size
        repoCount = acc[prev.node.name].count + 1
      } else {
        // reset repoCount to 1
        // language must exist in at least one repo to be detected
        repoCount = 1
      }
      return {
        ...acc,
        [prev.node.name]: {
          name: prev.node.name,
          color: prev.node.color,
          size: langSize,
          count: repoCount
        }
      }
    }, {})

  Object.keys(repoNodes).forEach(name => {
    // comparison index calculation
    repoNodes[name].size =
      Math.pow(repoNodes[name].size, size_weight) *
      Math.pow(repoNodes[name].count, count_weight)
  })

  const topLangs = Object.keys(repoNodes)
    .sort((a, b) => repoNodes[b].size - repoNodes[a].size)
    .reduce((result, key) => {
      result[key] = repoNodes[key]
      return result
    }, {})

  return topLangs
}

async function createClaims(token) {
  let claims = []

  const response = await fetch("https://api.github.com/user", {
    method: "GET",
    headers: {
      "Authorization": "Bearer " + token
    }
  })
  const userData = await response.json();
  const createdAt = new Date(userData.created_at)
  const createdAtMonth = new Date(createdAt.getFullYear(), createdAt.getMonth())

  const accountCreationClaim = {
    id: generateUUIDwithTimestamp(),
    platform: "github.com",
    criteria: "accountCreation",
    condition: "==",
    value: createdAtMonth.toISOString()
  }

  claims.push(accountCreationClaim)

  if (userData.followers > 0) {
    const followersClaim = {
      id: generateUUIDwithTimestamp(),
      platform: "github.com",
      criteria: "followers",
      condition: ">=",
      value:
        userData.followers > 100
          ? Math.floor(userData.followers / 10) * 10
          : userData.followers
    }

    claims.push(followersClaim)
  }

  const stats = await fetchStats(userData.login, true, true, true, true, token)

  const matrixPoints = ["totalStars", "totalPRsMerged", "totalCommits"]

  if (stats) {
    for (const matrixPoint of matrixPoints) {
      if (stats[matrixPoint] > 0) {
        claims.push({
          id: generateUUIDwithTimestamp(),
          platform: "github.com",
          criteria: matrixPoint,
          condition: "==",
          value: stats[matrixPoint]
        })
      }
    }
  }

  const topLanguages = await fetchTopLanguages(userData.login, token)
  const top5Languages = Object.keys(topLanguages).slice(0, 5)

  if (top5Languages.length != 0) {
    claims.push({
      id: generateUUIDwithTimestamp(),
      platform: "github.com",
      criteria: "top5Languages",
      condition: "==",
      value: top5Languages
    })
  }

  return claims
}
