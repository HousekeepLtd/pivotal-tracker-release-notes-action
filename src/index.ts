import * as core from '@actions/core';
import * as github from '@actions/github';
import axios from 'axios';

type StoryType = 'bug' | 'chore' | 'feature';

interface PivotalTrackerStory {
  name: string;
  description: string;
  url: string;
  story_type: StoryType;
  release_notes?: string;
}

const storyTypeLabel = (type: StoryType): string => {
  switch (type) {
    case 'bug': {
      return 'Bugfix';
    }
    case 'chore': {
      return 'Chore';
    }
    case 'feature': {
      return 'Feature';
    }
  }
}

const formatCommentBodyForGoogleChat = (commentBody: string): string => {
  let str = "```";
  str += commentBody.replaceAll("\*\*", "*");
  str += "```";
  return str;
}

/**
 * Main function.
 */
async function run(): Promise<void> {
  try {
    const GITHUB_TOKEN = core.getInput('github-token');
    const PT_TOKEN = core.getInput('pt-token');

    if (!github.context.payload.pull_request) {
      throw new Error('No pull request found.');
    }

    const pullRequest = github.context.payload.pull_request;
    const octokit = github.getOctokit(GITHUB_TOKEN);
  
    /**
     * Get all commits on the PR.
     */
    core.info(`Getting commits for PR number ${pullRequest.number}...`);
    const response = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/commits', {
      ...github.context.repo,
      pull_number: pullRequest.number,
      per_page: 100
    });

    core.debug(JSON.stringify(response));

    core.info(`Found ${response.data.length} commits:`);

    /**
     * From commits, filter down to a list of Pivotal Tracker story IDs.
     */
    let storyIds = response.data
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
    storyIds = [ ...new Set(storyIds) ];
    core.info(`Pivotal Tracker story IDs detected: ${storyIds.join(', ')}`);

    /**
     * Get the data for each Pivotal Tracker story.
     */
    let stories: PivotalTrackerStory[]  = [];
    for (const storyId of storyIds) {
      core.info(`Getting data for story ${storyId}...`);
      const { data: story } = await axios.get<PivotalTrackerStory>(`https://www.pivotaltracker.com/services/v5/stories/${storyId}`, {
        headers: {
          'X-TrackerToken': PT_TOKEN
        }
      });

      /**
       * Match the release notes in the ticket description.
       * Must start with **Why** and finish with **Who**.
       */
      const releaseNotes = story.description ? story.description.match(/\*\*Why[\s\S]+\*\*Who.+$/m) : null;
      if (releaseNotes) {
        core.info(`Release notes found!`);
        story.release_notes = releaseNotes[0];
      } else {
        core.info(`No release notes found :(`);
      }

      stories.push(story);
    }

    /**
     * Compose the comment.
     */
    let commentBody = '';
    for (const story of stories) {
      const title = story.name.replace('`', '"').toUpperCase();
      commentBody += `**${storyTypeLabel(story.story_type)}: ${title}**\n`;
      if (story.release_notes) {
        commentBody += `${story.release_notes}\n`;
      }
      commentBody += `**Link:** ${story.url}`;
      commentBody += `\n&nbsp;\n`;
    }

    /**
     * Add the comment to the PR.
     */
    core.info(`Adding comments to pull request...`);
    await octokit.issues.createComment({
      ...github.context.repo,
      issue_number: pullRequest.number,
      body: commentBody,
    });

    await octokit.issues.createComment({
      ...github.context.repo,
      issue_number: pullRequest.number,
      body: "### Formatting for Google Chat:\n\n"
        + formatCommentBodyForGoogleChat(commentBody),
    });

  } catch (error) {
    core.setFailed(error);
  }
}

/**
 * Main entry point
 */
run();
