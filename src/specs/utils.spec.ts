import { extractLastReleaseMessage } from "../utils";

describe("extractLastReleaseMessage", () => {
  it("returns empty string if story description is empty string", () => {
    expect(extractLastReleaseMessage("")).toEqual("");
  });
  it("returns empty string if no release message contained in description with text", () => {
    expect(extractLastReleaseMessage("This is my string")).toEqual("");
  });
  it("returns release message when only one is present", () => {
    expect(
      extractLastReleaseMessage(
        "# Objective/Key Result\n- KR13: Reduce short+late cancellations from " +
          "5.0%>3.0%\n\n### Tech Areas impacted\n- Breaks API\n- Database Models\n- Database Migrations\n\n\n" +
          "# Release messages\n## Release 1\n**Why:** Because we want to\n**What:** Make the change\n**Impacts:** " +
          "Devs\n**Who:** Alpha, Bravo"
      )
    ).toEqual(
      "**Why:** Because we want to\n**What:** Make the change\n**Impacts:** Devs\n**Who:** Alpha, Bravo"
    );
  });
  it("returns second release message when two are present", () => {
    expect(
      extractLastReleaseMessage(
        "# Objective/Key Result\n- KR13: Reduce short+late cancellations from " +
          "5.0%>3.0%\n\n### Tech Areas impacted\n- Breaks API\n- Database Models\n- Database Migrations\n\n\n" +
          "# Release messages\n## Release 1\n**Why:** Because we want to\n**What:** Make the change\n" +
          "**Impacts:** Devs\n**Who:** Alpha, Bravo\n\n## Release 2\n**Why:** Because we really want to" +
          "\n**What:** Make a really good change\n**Impacts:** Ops\n**Who:** Charlie, Delta"
      )
    ).toEqual(
      "**Why:** Because we really want to\n**What:** Make a really good change\n**Impacts:** " +
        "Ops\n**Who:** Charlie, Delta"
    );
  });
  it("returns third release message when three are present", () => {
    expect(
      extractLastReleaseMessage(
        "# Objective/Key Result\n- KR13: Reduce short+late cancellations " +
          "from 5.0%>3.0%\n\n### Tech Areas impacted\n- Breaks API\n- Database Models\n- Database Migrations" +
          "\n\n\n# Release messages\n## Release 1\n**Why:** Because we want to\n**What:** Make the change" +
          "\n**Impacts:** Devs\n**Who:** Alpha, Bravo\n\n## Release 2\n**Why:** Because we really want to" +
          "\n**What:** Make a really good change\n**Impacts:** Ops\n**Who:** Charlie, Delta\nSome unrelated " +
          "text\n\n## Release 3\n**Why:** Because it's an excellent idea\n**What:** Implement our excellent " +
          "idea\n**Impacts:** Rec\n**Who:** Echo, Foxtrot\nSome other comments that aren't release messages"
      )
    ).toEqual(
      "**Why:** Because it's an excellent idea\n**What:** Implement our excellent idea" +
        "\n**Impacts:** Rec\n**Who:** Echo, Foxtrot"
    );
  });
});
