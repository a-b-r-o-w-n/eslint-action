import micromatch from 'micromatch';

export const filterFiles = (files: string[], globs: string[]): string[] => {
  return micromatch(files, globs);
};
