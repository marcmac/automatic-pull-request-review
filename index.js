const core = require('@actions/core');
const github = require('@actions/github');

const token = core.getInput('repo-token');

const octokit = new github.GitHub(token);

console.log('i got ran');
console.log(JSON.stringify(github.context));


(async() => {
  await octokit.graphql(`mutation {
    submitPullRequestReview( input: { pullRequestReviewId: "${github.context.payload['pull_request'].base.repo['node_id']}", pullRequestReview: "APPROVE"
  }) { clientMutationId } }`)
})()
