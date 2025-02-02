import { tryGetWikipediaPage } from "./tryWikipedia";

describe("tryWikipedia", () => {
  it("should find known page", async () => {
    // given
    const text = " sherwood    forest";

    // when
    const [_, result] = await tryGetWikipediaPage(text);

    // then
    expect(result).not.toBeNull();
  });

  it("should not - error for unknown", async () => {
    // given
    const text = " flamp barooo forest";

    // when
    const [error, result] = await tryGetWikipediaPage(text);

    // then
    expect(result).toBeUndefined();
    expect(error).not.toBeNull();
    expect(error.message).toBe("Not Found");
  });
});
