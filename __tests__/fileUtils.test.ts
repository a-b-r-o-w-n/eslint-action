import fs from 'fs';
import path from 'path';

import { filterFiles } from '../src/fileUtils';

jest.mock('fs');
jest.mock('path');

describe('filterByGlob', () => {
  it('returns files that match any glob pattern', () => {
    (path.resolve as jest.Mock).mockImplementation(path => path);
    (fs.existsSync as jest.Mock).mockImplementation(() => true);

    const globs = ['src/**/*', 'test/**/*.js'];
    const files = ['src/foo/bar.ts', 'src/foo/baz.js', 'test/foo/bar.ts', 'test/foo/baz.js', 'config/env.json'];

    expect(filterFiles(files, globs)).toEqual(['src/foo/bar.ts', 'src/foo/baz.js', 'test/foo/baz.js']);
  });

  it('filters deleted files', () => {
    (path.resolve as jest.Mock).mockImplementation(path => path);
    (fs.existsSync as jest.Mock).mockImplementation(path => !path.includes('deleted-file'));

    const globs = ['src/**/*', 'test/**/*.js'];
    const files = ['src/foo/bar.ts', 'src/foo/baz.js', 'src/deleted-file.js'];

    expect(filterFiles(files, globs)).toEqual(['src/foo/bar.ts', 'src/foo/baz.js']);
  });
});
