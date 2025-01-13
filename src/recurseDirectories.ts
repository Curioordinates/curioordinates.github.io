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
        recurseDirectories({
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
