import { testData } from './sample-story-descriptions';
import { extractLastReleaseMessage } from '../utils'


describe('extractLastReleaseMessage', () => {
    testData.forEach(
        (data) => {
            it(data.testDescription, () => {
                expect(extractLastReleaseMessage(data.storyDescription)).toEqual(data.releaseMessage);
            });
        }
    )
});