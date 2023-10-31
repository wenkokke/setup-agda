# How to add a new Agda version

When a new Agda version is released:

1.  Add a new entry to `data/Agda.versions.yml`. You can use the template below, replacing `$AGDA_VERSION` with the new version, and replacing `$AGDA_STDLIB_VERSION_RANGE` and `$GHC_VERSION_RANGE` with the appropriate version ranges:

    ```yaml
    $AGDA_VERSION:
      binary:
        macos:
          x64: []
        linux:
          x64: []
        windows:
          x64: []
      compatibility:
        agda-stdlib: $AGDA_STDLIB_VERSION_RANGE
        ghc: $GHC_VERSION_RANGE
      configuration:
        macos: |
          --flags=+enable-cluster-counting
          --flags=+optimise-heavily
        linux: |
          --enable-split-sections
          --flags=+enable-cluster-counting
          --flags=+optimise-heavily
        windows: |
          --enable-split-sections
          --flags=+enable-cluster-counting
    ```

2.  If you have not installed the pre-commit hook in `hooks/pre-commit`,
    either install it now:

    ```bash
    cp ./hooks/pre-commit .git/hooks/pre-commit
    ```

    ...or run it manually before every commit:

    ```bash
    sh ./hooks/pre-commit
    ```

    Commit and push your changes.

    The workflow `build-latest` will build binaries for the latest release,
    which you can find here: <https://github.com/wenkokke/setup-agda/actions/workflows/build-latest.yml> When the workflow has completed, you can find the binary bundles under `Summary`.

3.  Attach the binary bundles to the latest release and add the download URLs and their SHA256 hashes to the entry you added in the previous step.

4.  Add a job for building the new version to `.github/workflows/build-legacy.yml`. You can copy and edit the job for the previous version. In most cases, you only need to change the version number and the required GHC version.

5.  Add a job for setting up the new version to `.github/workflows/setup-legacy.yml`. In most cases, you only need to change the version number.

6.  Commit and push your changes.

## How to add a new standard library version

1.  Add a new entry to `./data/agda-stdlib.versions.yml`. You can use the template below, replacing `$AGDA_STDLIB_VERSION` with the new version.

    ```yaml
    '$AGDA_STDLIB_VERSION':
    source:
      url: https://github.com/agda/agda-stdlib/archive/refs/tags/v$AGDA_STDLIB_VERSION.zip
      tag: v$AGDA_STDLIB_VERSION
      dir: agda-stdlib-$AGDA_STDLIB_VERSION
    ```

2.  Edit the `compatibility.agda-stdlib` range to include the new version for each compatible Agda version in `./data/Agda.yml`.

3.  Commit and push your changes.

## Update `haskell/actions` submodule

1.  Run the following commands, replacing `$HASKELL_ACTIONS_VERSION_TAG` with the tag for the new version:

    ```bash
    cd vendor/haskell/actions
    git pull
    git checkout $HASKELL_ACTIONS_VERSION_TAG
    ```

2.  Commit and push your changes.

# How to add an input to the `setup-agda` action

1.  Add the input to the `inputs` dictionary in `./action.yml`:

    - Create a new entry in `inputs` where the key is the option name.
    - Add a description field. Descriptions are automatically included in the `README.md`, and can be styled using Markdown.
    - Add `required: false`. No input should be mandatory.
    - For a _boolean flag_, the default value is always false. Never include the `default` field.
    - For a _string option_, always include the `default` field.

2.  Edit `./src/util/types.ts`.

    Your input is automatically included in the `ActionOptions` type, which contains the values of all inputs provided to the action.

    If your input is required by a specific command---e.g., install, build---you should edit to the appropriate types and functions.

    For instance, if your input is used by the build command in `./src/cli/build.ts`, you add the input name to the `BuildOptionKey` type, and edit the `pickBuildOptions` function to pick your input from the `ActionOptions`.

    If your input requires validation, you should perform this validation in the corresponding pick function, e.g., `pickBuildOptions`.
