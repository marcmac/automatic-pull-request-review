import * as core from '@actions/core'
import * as github from '@actions/github'

const token = core.getInput('repo-token')
const requestEvent = core.getInput('event')
const body = core.getInput('body')

const octokit = github.getOctokit(token)

if (
  (requestEvent === 'COMMENT'
  || requestEvent === 'REQUEST_CHANGES'
  || requestEvent === 'DISMISS') &&
  !body
) {
  core.setFailed('Event types DISMISS, COMMENT & REQUEST_CHANGES require a body.')
}

const pullRequest = github.context.payload['pull_request']

const repository = github.context.payload['repository']

const repoOwner = repository?.owner?.login
const repoName = repository?.name

if (!pullRequest || !repository) {
  core.setFailed('This action is meant to be run on pull requests')
}

if (
  requestEvent === 'DISMISS'
) {
  const getReviews = `
  query {
    repository(owner: "${repoOwner}", name: "${repoName}") {
      pullRequest(number: ${(<any>pullRequest)['number']}) {
        id
        number
        title
        reviews(last: 100, states: APPROVED, author: "github-actions[bot]") {
          nodes {
            author {
              login
            }
            state
            id
          }
        }
      }
    }
    viewer {
      login
      id
    }
  }`;
  core.debug(`getReviews: ${getReviews}`)

  octokit.graphql(getReviews).then((result) => {
    core.debug(`result: ${JSON.stringify(result, null, 2)}`)
    const reviews = Object(result).repository.pullRequest.reviews.nodes
    for (const review of reviews) {
      const reviewId = review["id"]
      core.info(`Dismissing ${reviewId}`)
      const dismissReview = `
        mutation {dismissPullRequestReview(input: {
          pullRequestReviewId: "${reviewId}",
          message: "${body}"
        }){clientMutationId}
        }
      `;
      core.debug(dismissReview)
      octokit.graphql(dismissReview).catch((err) => {
        core.info(dismissReview)
        core.error(err)
        core.setFailed(err.message)
      });

    }
  }).catch((err) => {
    core.info(getReviews)
    core.error(err)
    core.setFailed(err.message)
  });


} else {
  const query = `
  mutation {
    addPullRequestReview(input: {
      pullRequestId: "${(<any>pullRequest)['node_id']}",
      event: ${requestEvent},
      body: "${body}"
    }) {clientMutationId}
  }`;

  core.info(`Query: ${query}`)

  octokit.graphql(query).catch((err) => {
    core.info(query)
    core.error(err)
    core.setFailed(err.message)
  });
}
