import { statSync } from "fs";
import * as fs from "fs";

/**
 * Store a (rough) note of execution start time.
 */
const executionStartMs: number = Date.now();

/**
 * Helper that appends lines to a file.
 * If the target file was created befor the execution-start, it is deleted before first write.
 */
export class FilerAppender {
  private creationCheckCompleted: boolean = false;
  private fileName: string;

  constructor(fileName: string) {
    this.fileName = fileName;
  }

  public appendLines(...lines: string[]): void {
    if (!this.creationCheckCompleted) {
      this.creationCheckCompleted = true;
      if (fs.existsSync(this.fileName)) {
        const stats = statSync(this.fileName);
        if (stats.birthtimeMs < executionStartMs) {
          console.trace(
            `Appender file - ${this.fileName} - exists from pre-execution time - deleting now.`
          );
          fs.rmSync(this.fileName);
        } else {
          console.trace(
            `Appender file - ${this.fileName} - was created post-execution time - leaving it in place.`
          );
        }
      } else {
        console.trace(
          `Appender file - ${this.fileName} - does not exist and will be created on first write.`
        );
      }
    }
    fs.appendFileSync(this.fileName, lines.map((line) => `${line}\n`).join(""));
  }
}
