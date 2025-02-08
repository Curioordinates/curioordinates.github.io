import { getNamely, tryGetWikipediaPage } from "./tryWikipedia";
import { convert } from "html-to-text";
describe("tryWikipedia", () => {
  it("should find known page", async () => {
    // given
    const text = " sherwood    forest";

    // when
    const [_, result] = await tryGetWikipediaPage(text);

    // then
    expect(result).not.toBeNull();
    console.log(convert(result!));
  });

  it("should do namely lookup", async () => {
    const result = await getNamely("sherWood ForEst");
    console.log(result);
  });

  it("wiki items without locations should not cause problems", async () => {
    const result = await getNamely("oliver twist");
    console.log(result);
  });

  it("should handle a nonsense namely lookup", async () => {
    const result = await getNamely("flamp barooo forest");
    console.log(result);
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
