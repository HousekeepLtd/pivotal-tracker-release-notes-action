import * as core from '@actions/core';
import * as github from '@actions/github';
import axios from 'axios';

interface PivotalTrackerStory {
  name: string;
  description: string;
  url: string;
  story_type: 'feature' | 'bug' | 'chore';
  release_notes?: string;
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
     * 
     * @TODO: We only want commits not on `master`.
     */
    core.info(`Getting commits for PR number ${pullRequest.number}...`);
    const response = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/commits', {
      ...github.context.repo,
      pull_number: pullRequest.number
    });

    /**
     * From commits, filter down to a list of Pivotal Tracker story IDs.
     */
    let storyIds = response.data
      .map(commit => commit.commit.message)
      .map(message => {
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
      const { data } = await axios.get<PivotalTrackerStory>(`https://www.pivotaltracker.com/services/v5/stories/${storyId}`, {
        headers: {
          'X-TrackerToken': PT_TOKEN
        }
      });
      stories.push(data);
    }

    /**
     * Match the release notes in the ticket description.
     * Must start with **Why** and finish with **Who**.
     */
    stories = stories.map(story => {
      const releaseNotes = story.description.match(/\*\*Why[\s\S]+\*\*Who.+$/m);
      if (!releaseNotes) return story;
      return {
        ...story,
        release_notes: releaseNotes[0]
      }
    });

    /**
     * Compose the comment to add to the PR.
     */
    let commentBody = '';
    for (const story of stories) {
      commentBody += `**${story.story_type.toUpperCase()}: ${story.name.toUpperCase()}**\n`;
      if (story.release_notes) {
        commentBody += `${story.release_notes}\n`;
      }
      commentBody += `**Link:** ${story.url}\n\n`;
    }

    /**
     * Add the 
     */
    core.info(`Adding comment to pull request...`);
    octokit.issues.createComment({
      ...github.context.repo,
      issue_number: pullRequest.number,
      body: commentBody,
    });

  } catch (error) {
    core.setFailed(error);
  }
}

/**
 * Main entry point
 */
run();
