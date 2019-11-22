import fs from 'fs';
import path from 'path';

import micromatch from 'micromatch';

export const filterFiles = (files: string[], globs: string[]): string[] => {
  const result: string[] = [];
  const filtered = micromatch(files, globs);

  for (const file of filtered) {
    if (fs.existsSync(path.resolve(file))) {
      result.push(file);
    }
  }

  return result;
};
