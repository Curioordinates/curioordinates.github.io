import { processFile } from "./file-processor";

describe("file processor", () => {
  it("should work", async () => {
    processFile("./data/source/prediction/prediction.csv", () => {});
  });
});
