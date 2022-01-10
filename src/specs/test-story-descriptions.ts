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

const descriptionWithOneReleaseMessage: DescriptionToReleaseMessageTestData = {
    testDescription: 'returns release message when only one is present',
    storyDescription: '# Objective/Key Result\n- KR13: Reduce short+late cancellations from 5.0%>3.0%\n\n### Tech ' +
        'Areas impacted\n- Breaks API\n- Database Models\n- Database Migrations\n\n\n# Release messages\n## ' +
        'Release 1\n**Why:** Because we want to\n**What:** Make the change\n**Impacts:** Devs\n**Who:** Alpha, Bravo',
    releaseMessage: '**Why:** Because we want to\n**What:** Make the change\n**Impacts:** Devs\n**Who:** Alpha, Bravo'
}

const descriptionWithTwoReleaseMessages: DescriptionToReleaseMessageTestData = {
    testDescription: 'returns second release message when two are present',
    storyDescription: '# Objective/Key Result\n- KR13: Reduce short+late cancellations from 5.0%>3.0%\n\n### Tech ' +
        'Areas impacted\n- Breaks API\n- Database Models\n- Database Migrations\n\n\n# Release messages\n## ' +
        'Release 1\n**Why:** Because we want to\n**What:** Make the change\n**Impacts:** Devs\n**Who:** Alpha, ' +
        'Bravo\n\n## Release 2\n**Why:** Because we really want to\n**What:** Make a really good change\n' +
        '**Impacts:** Ops\n**Who:** Charlie, Delta',
    releaseMessage: '**Why:** Because we really want to\n**What:** Make a really good change\n**Impacts:** Ops\n' +
        '**Who:** Charlie, Delta'
}

const descriptionWithThreeReleaseMessages: DescriptionToReleaseMessageTestData = {
    testDescription: 'returns third release message when three are present',
    storyDescription: '# Objective/Key Result\n- KR13: Reduce short+late cancellations from 5.0%>3.0%\n\n### Tech ' +
        'Areas impacted\n- Breaks API\n- Database Models\n- Database Migrations\n\n\n# Release messages\n## Release ' +
        '1\n**Why:** Because we want to\n**What:** Make the change\n**Impacts:** Devs\n**Who:** Alpha, Bravo\n\n## ' +
        'Release 2\n**Why:** Because we really want to\n**What:** Make a really good change\n**Impacts:** Ops\n' +
        '**Who:** Charlie, Delta\nSome unrelated text\n\n## Release 3\n**Why:** Because it\'s an excellent idea\n' +
        '**What:** Implement our excellent idea\n**Impacts:** Rec\n**Who:** Echo, Foxtrot\nSome other comments that ' +
        'aren\'t release messages',
    releaseMessage: '**Why:** Because it\'s an excellent idea\n**What:** Implement our excellent idea\n**Impacts:** ' +
        'Rec\n**Who:** Echo, Foxtrot'
}

const testData: DescriptionToReleaseMessageTestData[] = [
    descriptionWithNoReleaseMessage, descriptionWithOneReleaseMessage,
    descriptionWithTwoReleaseMessages, descriptionWithThreeReleaseMessages
]

export { DescriptionToReleaseMessageTestData, testData };
