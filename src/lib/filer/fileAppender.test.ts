import * as path from "path";
import { FilerAppender } from "./filerAppender";

describe("fileAppender", () => {
  it("should append new file", () => {
    const outputFile = path.join(__dirname, "test-out.git-ignore.txt");

    const appender1 = new FilerAppender(outputFile);
    const appender2 = new FilerAppender(outputFile);

    appender1.appendLines("hello1", "world1");
    appender2.appendLines("hello2", "world2");
  });
});
