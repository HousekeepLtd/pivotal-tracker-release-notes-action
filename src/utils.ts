import * as core from "@actions/core";

const extractLastReleaseMessage = (description: string): string => {
    /**
   * Match the release notes in the ticket description.
   * Must start with **Why** and finish with **Who**.
   */
  const releaseNotes = description
    ? description.match(/\*\*Why[\s\S]*?\*\*Who.+$/mg)
    : null;
  if (releaseNotes) {
    core.info(`Release notes found!`);
    return releaseNotes[releaseNotes.length - 1];
  } else {
    core.info(`No release notes found :(`);
    return '';
  }
}

export { extractLastReleaseMessage };
