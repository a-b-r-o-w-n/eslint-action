# Eslint Annotate

Runs eslint on changed files and creates inline annotations with errors.

## Usage

In `.github/workflows/main.yml:

```yml
name: Example Workflow

on: [pull_request, push]

jobs:
  lint:
    steps:
      - uses: actions/checkout@v1
      - uses: a-b-r-o-w-n/eslint-action@master
        with:
          repo-token: "${{ secrets.GITHUB_TOKEN }}"
          files: "src/**/*"
          ignore: "src/some-file-to-ignore.js"
          extensions: ".js,.ts"
```
