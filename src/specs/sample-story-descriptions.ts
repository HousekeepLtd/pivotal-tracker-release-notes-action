interface DescriptionToReleaseMessageTestData {
    testDescription: string;
    storyDescription: string;
    releaseMessage: string;
}


const descriptionWithNoReleaseMessage: DescriptionToReleaseMessageTestData = {
    testDescription: 'returns empty string if no release message contained',
    storyDescription: 'This is my string',
    releaseMessage: ''
}


const testData: DescriptionToReleaseMessageTestData[] = [
    descriptionWithNoReleaseMessage
]

export { DescriptionToReleaseMessageTestData, testData };