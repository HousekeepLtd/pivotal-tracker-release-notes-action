"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const axios_1 = __importDefault(require("axios"));
/**
 * Main function.
 */
function run() {
    return __awaiter(this, void 0, void 0, function* () {
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
            const response = yield octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/commits', Object.assign(Object.assign({}, github.context.repo), { pull_number: pullRequest.number }));
            /**
             * From commits, filter down to a list of Pivotal Tracker story IDs.
             */
            let storyIds = response.data
                .map(commit => commit.commit.message)
                .map(message => {
                const matches = message.match(/^\[#([0-9]+?)\]/);
                if (!matches)
                    return undefined;
                return matches[1]; // Just the ticket number, with no # or [] symbols.
            })
                .filter(ticket => ticket);
            /**
             * De-deduplicate the story IDs.
             */
            storyIds = [...new Set(storyIds)];
            core.info(`Pivotal Tracker story IDs detected: ${storyIds.join(', ')}`);
            /**
             * Get the data for each Pivotal Tracker story.
             */
            let stories = [];
            for (const storyId of storyIds) {
                core.info(`Getting data for story ${storyId}...`);
                const { data } = yield axios_1.default.get(`https://www.pivotaltracker.com/services/v5/stories/${storyId}`, {
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
                if (!releaseNotes)
                    return story;
                return Object.assign(Object.assign({}, story), { release_notes: releaseNotes[0] });
            });
            /**
             * Compose the comment to add to the PR.
             */
            let commentBody = '';
            for (const story of stories) {
                commentBody += `**${story.story_type.toUpperCase}: ${story.name.toUpperCase()}**\n`;
                if (story.release_notes) {
                    commentBody += `${story.release_notes}\n`;
                }
                commentBody += `**Link:** ${story.url}\n\n`;
            }
            /**
             * Add the
             */
            core.info(`Adding comment to pull request...`);
            octokit.issues.createComment(Object.assign(Object.assign({}, github.context.repo), { issue_number: pullRequest.number, body: commentBody }));
        }
        catch (error) {
            core.setFailed(error);
        }
    });
}
/**
 * Main entry point
 */
run();
