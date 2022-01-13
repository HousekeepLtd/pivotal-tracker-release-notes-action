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
const utils_1 = require("./utils");
const storyTypeLabel = (type) => {
    switch (type) {
        case "bug": {
            return "Bugfix";
        }
        case "chore": {
            return "Chore";
        }
        case "feature": {
            return "Feature";
        }
    }
};
const formatCommentBodyForGoogleChat = (commentBody) => {
    let str = "```\n";
    str += commentBody.replace(/\*\*/g, "*");
    str += "```";
    return str;
};
/**
 * Main function.
 */
function run() {
    return __awaiter(this, void 0, void 0, function* () {
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
            let commits = [];
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
                const response = yield octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/commits", Object.assign(Object.assign({}, github.context.repo), { pull_number: pullRequest.number, per_page: 100, page: page }));
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
                if (!matches)
                    return undefined;
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
            let stories = [];
            for (const storyId of storyIds) {
                core.info(`Getting data for story ${storyId}...`);
                let story;
                try {
                    const { data } = yield axios_1.default.get(`https://www.pivotaltracker.com/services/v5/stories/${storyId}`, {
                        headers: {
                            "X-TrackerToken": PT_TOKEN
                        }
                    });
                    story = data;
                }
                catch (e) {
                    core.info(`Could not retrieve story.`);
                    continue; // Skip to next iteration.
                }
                story.release_notes = (0, utils_1.extractLastReleaseMessage)(story.description);
                stories.push(story);
            }
            const commentWarning = commits.length === 250
                ? "### Warning: Github API returns a maximum of 250 commits." +
                    "Some release notes may be missing.\n\n"
                : "";
            /**
             * Compose the comment.
             */
            let commentBody = "";
            for (const story of stories) {
                const title = story.name.replace("`", '"').toUpperCase();
                commentBody += `**${storyTypeLabel(story.story_type)}: ${title.trim()}**\n`;
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
                core.info(`Adding comments to pull request...`);
                yield octokit.issues.createComment(Object.assign(Object.assign({}, github.context.repo), { issue_number: pullRequest.number, body: commentWarning + commentBody }));
                yield octokit.issues.createComment(Object.assign(Object.assign({}, github.context.repo), { issue_number: pullRequest.number, body: commentWarning +
                        "### Formatting for Google Chat:\n\n" +
                        formatCommentBodyForGoogleChat(commentBody) }));
            }
            else {
                core.info("No comments to add to pull request");
            }
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
