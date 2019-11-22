import { filterFiles } from '../src/fileUtils';

describe('filterByGlob', () => {
  it('returns files that match any glob pattern', () => {
    const globs = ['src/**/*', 'test/**/*.js'];
    const files = ['src/foo/bar.ts', 'src/foo/baz.js', 'test/foo/bar.ts', 'test/foo/baz.js', 'config/env.json'];

    expect(filterFiles(files, globs)).toEqual(['src/foo/bar.ts', 'src/foo/baz.js', 'test/foo/baz.js']);
  });
});
