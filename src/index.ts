import * as core from "@actions/core";
import * as github from "@actions/github";
import axios from "axios";

import { extractLastReleaseMessage } from "./utils";

type StoryType = "bug" | "chore" | "feature";

interface PivotalTrackerStory {
  name: string;
  description: string;
  url: string;
  story_type: StoryType;
  release_notes?: string;
}

const formatCommentBodyForGoogleChat = (commentBody: string): string => {
  let str = "```\n";
  str += commentBody.replace(/\*\*/g, "*");
  str += "```";
  return str;
};

/**
 * Main function.
 */
async function run(): Promise<void> {
  try {
    const GITHUB_TOKEN = core.getInput("github-token");
    const PT_TOKEN = core.getInput("pt-token");

    if (!github.context.payload.pull_request) {
      throw new Error("No pull request found.");
    }

    const pullRequest = github.context.payload.pull_request;
    const octokit = github.getOctokit(GITHUB_TOKEN);

    /**
     * Get all commits on the PR.
     */

    let commits: any[] = [];

    /**
     * Attempt to get all commits on the PR. This endpoint will return a maximum of
     * 250 commits, with a 100 per page limit. Loop over pages 1, 2 and 3 to create an
     * array of commits.
     */
    let page = 1;
    for (const max of [0, 100, 200]) {
      /**
       * Early exit. No need to check subsequent pages if we have received less than
       * the maximum number of results.
       */
      if (commits.length < max) {
        break;
      }

      core.info(`Getting commits for PR number ${pullRequest.number} page ${page}...`);
      const response = await octokit.request(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}/commits",
        {
          ...github.context.repo,
          pull_number: pullRequest.number,
          per_page: 100,
          page: page
        }
      );
      core.debug(JSON.stringify(response));
      commits.push(...response.data);
      page++;
    }

    core.info(`Found ${commits.length} commits.`);

    /**
     * From commits, filter down to a list of Pivotal Tracker story IDs.
     */
    let storyIds = commits
      .map(commit => commit.commit.message)
      .map(message => {
        core.info(`Commit message: ${message}`);
        const matches = message.match(/^\[#([0-9]+?)\]/);
        if (!matches) return undefined;
        return matches[1]; // Just the ticket number, with no # or [] symbols.
      })
      .filter(ticket => ticket);

    /**
     * De-deduplicate the story IDs.
     */
    storyIds = [...new Set(storyIds)];

    if (storyIds.length === 0) {
      core.info(`No Pivotal Tracker story IDs detected`);
      return;
    }

    core.info(`Pivotal Tracker story IDs detected: ${storyIds.join(", ")}`);

    /**
     * Get the data for each Pivotal Tracker story.
     */
    let stories: PivotalTrackerStory[] = [];
    for (const storyId of storyIds) {
      core.info(`Getting data for story ${storyId}...`);
      let story;
      try {
        const { data } = await axios.get<PivotalTrackerStory>(
          `https://www.pivotaltracker.com/services/v5/stories/${storyId}`,
          {
            headers: {
              "X-TrackerToken": PT_TOKEN
            }
          }
        );
        story = data;
      } catch (e: any) {
        core.info(`Could not retrieve story.`);
        core.info(e.message);
        core.error(e, e.stack);
        continue; // Skip to next iteration.
      }

      story.release_notes = extractLastReleaseMessage(story.description);

      stories.push(story);
    }

    const commentWarning =
      commits.length === 250
        ? "### Warning: Github API returns a maximum of 250 commits." +
          "Some release notes may be missing.\n\n"
        : "";

    /**
     * Compose the comment.
     */
    let commentBody = "";
    for (const story of stories) {
      const title = story.name.replace("`", '"');
      commentBody += `**TECH (${story.story_type}): ${title.trim()}**\n`;
      if (story.release_notes) {
        commentBody += `${story.release_notes}\n`;
      }
      commentBody += `**Link:** ${story.url}`;
      commentBody += `\n\n`;
    }

    /**
     * Add the comment to the PR.
     */
    if (commentBody) {
      core.info(`Adding comment to pull request...`);

      await octokit.rest.issues.createComment({
        ...github.context.repo,
        issue_number: pullRequest.number,
        body:
          commentWarning +
          formatCommentBodyForGoogleChat(commentBody)
      });
    } else {
      core.info("No comment to add to pull request");
    }
  } catch (error: any) {
    core.setFailed(error);
  }
}

/**
 * Main entry point
 */
run();
