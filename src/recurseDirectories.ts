import * as fs from "fs";
import * as path from "path";

export const recurseDirectories = async ({
  rootDirectory,
  relativeSteps = [],
  callback,
}: {
  rootDirectory: string;
  relativeSteps?: string[];
  callback: (params: {
    directoryPath: string;
    relativeSteps: string[];
  }) => void;
}): Promise<void> => {
  try {
    const entries = fs.readdirSync(rootDirectory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const directoryPath = path.join(rootDirectory, entry.name);
        const newRelativeSteps = [...relativeSteps, entry.name];
        // Await the descent so a subdirectory's callback (eg a more
        // specific feature type) always completes - and so claims any
        // shared hitMap locations - before its parent's callback runs.
        // Previously this call was fire-and-forget, which raced against
        // the parent's own callback and made dedupe results between nested
        // feature types non-deterministic between runs.
        await recurseDirectories({
          rootDirectory: directoryPath,
          relativeSteps: newRelativeSteps,
          callback,
        });
        await callback({ directoryPath, relativeSteps: newRelativeSteps });
      }
    }
  } catch (_) {
    // permission denied EACCESS error.
  }
};
