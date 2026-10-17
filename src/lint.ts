import * as fs from "fs";
import * as path from "path";

const ROOT_DIRECTORY = "./data/source";

const errors: string[] = [];
const warnings: string[] = [];
/**
 * id -> metadata files using it
 */
const seenIds = new Map<number, string[]>();

const lintDirectory = (directory: string): void => {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const dirName = path.basename(directory);
  const metadataFileName = `${dirName}.metadata.json`;

  const hasDataFiles = entries.some(
    (entry) =>
      entry.isFile() &&
      !entry.name.startsWith(".") &&
      entry.name !== metadataFileName
  );

  for (const entry of entries) {
    if (
      entry.isFile() &&
      entry.name.endsWith(".metadata.json") &&
      entry.name !== metadataFileName
    ) {
      warnings.push(
        `${path.join(directory, entry.name)}: badly named (expected ${metadataFileName}), it will be ignored`
      );
    }
  }

  if (hasDataFiles) {
    lintMetadata(path.join(directory, metadataFileName));
  }

  for (const entry of entries) {
    // Directories starting with "_" (eg _stops) aren't categories
    if (entry.isDirectory() && !entry.name.startsWith("_")) {
      lintDirectory(path.join(directory, entry.name));
    }
  }
};

const lintMetadata = (metadataPath: string): void => {
  if (!fs.existsSync(metadataPath)) {
    errors.push(`${metadataPath}: missing`);
    return;
  }

  let metadata: Record<string, unknown>;
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
  } catch (e) {
    errors.push(`${metadataPath}: invalid JSON (${(e as Error).message})`);
    return;
  }

  const { id, short_description } = metadata;
  if (!Number.isInteger(id) || (id as number) < 1) {
    errors.push(`${metadataPath}: missing or invalid "id"`);
  } else {
    seenIds.set(id as number, [...(seenIds.get(id as number) ?? []), metadataPath]);
  }

  if (typeof short_description !== "string" || !short_description.trim()) {
    errors.push(`${metadataPath}: missing "short_description"`);
  }
};

lintDirectory(ROOT_DIRECTORY);

for (const [id, metadataPaths] of seenIds) {
  if (metadataPaths.length > 1) {
    errors.push(`duplicate id ${id}: ${metadataPaths.join(", ")}`);
  }
}

warnings.forEach((warning) => console.warn(`warning: ${warning}`));

if (errors.length) {
  errors.forEach((error) => console.error(error));
  console.error(`\nlint failed: ${errors.length} error(s)`);
  process.exit(1);
}

const maxId = Math.max(...seenIds.keys());
console.log(`lint passed: ${seenIds.size} categories, next free id ${maxId + 1}`);
