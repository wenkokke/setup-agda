# GitHub Workflows for `setup-agda`

The action `setup-agda` is tested via a series of workflows, run in order:

- `check-dist`:
  Check if the distribution (in `dist/`) is up-to-date.
- `test-setup-latest`:
  Check if the following works:
  ```yaml
  - uses: wenkokke/setup-agda@latest
    with:
      agda-version: latest
      force-no-build: true
  ```
- `test-setup-2_6_2_2`:
  Check if the following works:
  ```yaml
  - uses: wenkokke/setup-agda@latest
    with:
      agda-version: '2.6.2.2'
      force-no-build: true
  ```
- `update-latest-release`:
  Update the `latest` tag to point to the current commit.

These are chained together using `workflow_run`, e.g. in `test-setup-2_6_2_2.yml` you will find:

```yaml
on:
  # Run the workflow when test-setup-latest finishes:
  workflow_run:
    branches: [main]
    workflows: ['Setup Agda (latest)']
    #            ^^^^^^^^^^^^^^^^^^^ Matches the workflow by name!
    types: [completed]

jobs:
  test-setup-2_6_2_2:
    # Skip the workflow if test-setup-latest did not succeed:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
```

There should be one workflow called `test-setup-X_Y_Z` for each binary distribution.

Building Agda from source is tested weekly, by `test-build-latest`, only for the _latest_ version.
When a new Agda version is released, this test automatically uploads a new binary release as a build artifact, which can then be added to [the latest release][setup-agda-latest], and to [the package index][package-index].

[package-index]: src/package-info/index.json
[setup-agda-latest]: https://github.com/wenkokke/setup-agda/releases/tag/latest
