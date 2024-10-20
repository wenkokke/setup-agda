# setup-agda

[![setup-latest](https://github.com/wenkokke/setup-agda/actions/workflows/setup-latest.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/setup-latest.yml)
[![setup-legacy](https://github.com/wenkokke/setup-agda/actions/workflows/setup-legacy.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/setup-legacy.yml)
[![setup-nightly](https://github.com/wenkokke/setup-agda/actions/workflows/setup-nightly.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/setup-nightly.yml)
[![build-latest](https://github.com/wenkokke/setup-agda/actions/workflows/build-latest.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/build-latest.yml)
[![build-legacy](https://github.com/wenkokke/setup-agda/actions/workflows/build-legacy.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/build-legacy.yml)
[![build-nightly](https://github.com/wenkokke/setup-agda/actions/workflows/build-nightly.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/build-nightly.yml)
[![pre-commit.ci](https://results.pre-commit.ci/badge/github/wenkokke/setup-agda/main.svg)](https://results.pre-commit.ci/latest/github/wenkokke/setup-agda/main)

Set up Agda, the standard library, or any Git-hosted library, for use in GitHub Actions.
This action can install Agda from binary distributions[^0] or build Agda from source.
If an older version of GHC is needed to build the specified version, `setup-agda` action will call [`haskell/actions/setup`].

[^0]: All binary distributions support [cluster counting].

## Table of Contents

- [Samples](README.md#samples):
  Sample GitHub Workflows that use `setup-agda`.
- [Supported Versions](README.md#supported-versions):
  The versions of Agda that are supported by `setup-agda`.
- [Usage](README.md#usage):
  Detailed list of inputs used to configure this action.

## Samples

### Minimal

[![minimal](https://github.com/wenkokke/setup-agda/actions/workflows/sample-minimal.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/sample-minimal.yml)

```yaml
name: minimal
on:
  push:
    branches: ['main']
jobs:
  check:
    name: Check greet.agda
    runs-on: ubuntu-latest # or macOS-latest, or windows-latest
    steps:
      - uses: actions/checkout@v4

      # Setup the latest version of Agda:
      - uses: wenkokke/setup-agda@v2

      # Check greet.agda, which you can find in tests/agda:
      - run: agda greet.agda
        working-directory: tests/agda
```

### Basic

[![basic](https://github.com/wenkokke/setup-agda/actions/workflows/sample-basic.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/sample-basic.yml)

```yaml
name: basic
on:
  push:
    branches: ['main']
jobs:
  check:
    name: Check hello-world-dep.agda
    runs-on: ubuntu-latest # or macOS-latest, or windows-latest
    steps:
      - uses: actions/checkout@v4

      # Setup Agda 2.6.2.2 with its recommended version of agda-stdlib:
      - uses: wenkokke/setup-agda@v2
        with:
          agda-version: '2.6.2.2'
          agda-stdlib-version: 'recommended'

      # Check hello-world-dep.agda, which you can find in tests/agda-stdlib:
      - run: agda hello-world-dep.agda
        working-directory: tests/agda-stdlib
```

### Matrix

[![matrix](https://github.com/wenkokke/setup-agda/actions/workflows/sample-matrix.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/sample-matrix.yml)

```yaml
name: matrix
on:
  push:
    branches: ['main']
jobs:
  check:
    name: Check hello-world-proof.agda
    strategy:
      matrix:
        os: [ubuntu-latest, macOS-latest, windows-latest]
        agda-version: ['2.6.4.3', '2.6.3', '2.6.2.2']
        exclude:
          # Exclude older Agda versions for macOS (>=14)
          - agda-version: '2.6.2.2'
            os: macos-14

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4

      # Setup the versions of Agda specified in the matrix,
      # together with their recommended versions of agda-stdlib:
      - uses: wenkokke/setup-agda@v2
        with:
          agda-version: ${{ matrix.agda-version }}
          agda-stdlib-version: 'recommended'

      # Check hello-world-proof.agda, which you can find in tests/agda-stdlib:
      - run: agda hello-world-proof.agda
        working-directory: tests/agda-stdlib
```

### Complex

[![complex](https://github.com/wenkokke/setup-agda/actions/workflows/sample-complex.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/sample-complex.yml)

```yaml
name: complex
on:
  push:
    branches: ['main']
jobs:
  check:
    name: Check wenkokke/schmitty
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macOS-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      # Check out wenkokke/schmitty
      - uses: actions/checkout@v4
        with:
          repository: wenkokke/schmitty

      # Setup Z3 using cda-tum/setup-z3
      - id: setup-z3
        uses: cda-tum/setup-z3@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # Setup Agda 2.6.2.2 together with agda-stdlib 1.7.1, agdarsec 0.5.0,
      # and schmitty 1.0.1, and register Z3 as a safe executable with Agda:
      - uses: wenkokke/setup-agda@v2
        with:
          agda-version: '2.6.2.2'
          agda-stdlib-version: '1.7.1'
          agda-libraries: |
            https://github.com/gallais/agdarsec.git#v0.5.0
            https://github.com/wenkokke/schmitty.git#v1.0.1
          agda-executables: |
            ${{ steps.setup-z3.outputs.z3-root }}/bin/z3

      # Run the test suite for wenkokke/schmitty:
      - name: Test Schmitty
        run: |
          ./scripts/test-succeed.sh
          ./scripts/test-fail.sh
```

## Supported Versions

| Agda    | Ubuntu  | macOS (Intel) | macOS (Apple) | Windows |
| :------ | :-----: | :-----------: | :-----------: | :-----: |
| 2.7.0.1 | >=20.04 |     >=12      |     >=14      | >=2019  |
| 2.7.0   | >=20.04 |     >=12      |     >=14      | >=2019  |
| 2.6.4.3 | >=20.04 |     >=11      |     >=14      | >=2019  |
| 2.6.4.1 | >=20.04 |     >=11      |     >=14      | >=2019  |
| 2.6.4   | >=20.04 |     >=11      |     >=14      | >=2019  |
| 2.6.3   | >=20.04 |     >=11      |     >=14      | >=2019  |
| 2.6.2.2 | >=20.04 |     >=11      |               | >=2019  |
| 2.6.2.1 | >=20.04 |     >=11      |               | >=2019  |
| 2.6.2   | >=20.04 |     >=11      |               | >=2019  |
| 2.6.1.3 | >=20.04 |     >=11      |               |         |
| 2.6.0.1 | >=20.04 |     >=11      |               |         |
| 2.5.4.2 | >=20.04 |     >=11      |               |         |
| 2.5.3   | >=20.04 |     >=11      |               |         |
| 2.5.2   | >=20.04 |     >=11      |               |         |

We encourage using the binary distributions. The binary distributions are tested on every commit. Building the latest Agda version is tested weekly on all platforms except Windows 2019. Please do not rely on the legacy builds, as these are not regularly tested. Please report any failing build _that is listed as working_, and we will update the table.

If you find a configuration for this action which builds a legacy version not listed here, please open an issue and include the GitHub workflow. You can find the configuration for the current legacy builds in the [build-legacy] workflow.

## Usage

You can customize the behaviour of `setup-agda` using its inputs, such as `agda-version` and `agda-stdlib-version` in [basic](#basic).

This section describes all inputs:

- `agda-version`

  The Agda version.

  Can be "latest" or a specific version number (e.g., 2.6.2.2).

  Default: `latest`

- `agda-stdlib-version`

  The Agda standard library version.

  Can be "none", "recommended", "latest", or a specific version number (e.g., 1.7.1).

  If set to "recommended", it will install the latest version of the Agda
  standard library compatible with the specified Agda version, as specified
  on [the Agda Wiki](https://wiki.portal.chalmers.se/agda/Libraries/StandardLibrary).

  If set to "latest" or a specific version number, it will install the
  latest or that specific version, regardless of compatibility with the
  specified Agda version.

  Default: `none`

- `agda-libraries`

  A list of Agda libraries to install.

  Libraries must be specified by their Git URL and end in a version anchor,
  e.g.,

  ```yaml
  agda-libraries: |
    https://github.com/agda/agda-categories.git#v0.1.7.1
    https://github.com/agda/cubical.git#v0.3
  ```

  To setup the Agda standard library, use "agda-stdlib-version" instead, as
  that ensures that the standard library and Agda versions are compatible.

  This input requires that the library has a tagged release and that the
  repository contains a .agda-lib file.

  This input relies on the convention that the filename of the .agda-lib
  file is the name of the library, and will refuse to install any library
  whose .agda-lib file is simple named ".agda-lib".

  Default: `false`

- `agda-defaults`

  A list of installed Agda libraries to add to defaults.

  Libraries must be specified by the name of their .agda-lib file, e.g.,

  ```yaml
  agda-defaults: |
    standard-library
    agda-categories
    cubical
  ```

  Default: `false`

- `agda-executables`

  A list of executables to register with Agda.

  Executables must be specified by their name or path, e.g.,

  ```yaml
  agda-executables: |
    z3
    /bin/echo
  ```

  Default: `false`

- `force-build`

  If specified, always build from source.

  Default: `false`

- `force-no-build`

  If specified, never build from source.

  Default: `false`

- `ghc-version`

  Version of GHC to use.

  Can be "recommended", "latest", or a specific version number (e.g., 9.4.2).

  If set to "recommended", it will get the latest version supported by
  `haskell/actions/setup` which the Agda version is tested-with.
  If `ghc-version-match-exact` is set to false, it will favour versions
  which are supported by `haskell/actions/setup`.

  If set "latest" or to a specific GHC version, this version will be used
  even if it is incompatible with the Agda version.

  Default: `recommended`

- `pre-build-hook`

  A shell script to be run before starting the build.

  Default: `false`

- `configure-options`

  Can be "none", "recommended", or text.

  If set to "none", no configuration flags will be passed to `cabal configure`.
  If set to "recommended", the recommended configuration flags will be passed to `cabal configure`.
  Otherwise, the value will be passed to `cabal configure` verbatim.

  Only used when building Agda from source.

  Default: `recommended`

- `bundle`

  If specified, bundle Agda and its non-standard dependencies, and upload
  the bundle as an artifact.

  Default: `false`

- `bundle-name`

  If specified, will be used as a name for the bundle.

  The value is interpreted as a [nunjucks template](https://mozilla.github.io/nunjucks/).
  The template may use `{{agda}}`, `{{cabal}}`, `{{ghc}}`, `{{icu}}`,
  which will be replaced by their respective versions, if used, and
  `{{arch}}`, `{{platform}}`, and `{{release}}`. The variable `{{arch}}`
  is replaced by the system architecture---e.g., `x64`, `arm64`, etc.
  The variable `{{platform}}` is replaced by one of of `linux`, `macos`,
  or `windows`. The variable `{{release}}` is replaced by a release
  identifier, e.g., `ubuntu-22.04`, `macos-12`, or `windows-2022`.

  Only used when `bundle` is specified.

  Default: `agda-{{ agda }}
    -{{ arch }}
    -{{ release }}
    -ghc{{ ghc }}
    -cabal{{ cabal }}
    {% if icu %}-icu{{ icu }}{% endif %}
`

- `bundle-license-report`

  If specified, include a license report in the bundle.

  Only used when `bundle` is specified.

  Default: `false`

- `bundle-compress`

  If specified, the executables are compressed with [UPX](https://upx.github.io).

  Beware that on MacOS and Windows the resulting executables are unsigned,
  and therefore will cause problems with security.
  There is a workaround for this on MacOS:

  ```sh
  # for each executable file in <package>/bin:
  chmod +x <bin>
  xattr -c <bin>

  # for each library file in <package>/lib:
  chmod +w <lib>
  xattr -c <lib>
  chmod -w <lib>
  ```

  Only used when `bundle` is specified.

  Default: `false`

- `bundle-retention-days`

  Duration after which bundle will expire in days.
  0 means using default retention.

  Minimum 1 day.
  Maximum 90 days unless changed from the repository settings page.

  Default: `0`

- `cabal-version`

  Version of Cabal to use. If set to "latest", it will always get the latest stable version.

  Default: `latest`

- `stack-version`

  Version of Stack to use. If set to "latest", it will always get the latest stable version.

  Default: `latest`

- `enable-stack`

  If specified, will setup Stack.

  Default: `false`

- `stack-no-global`

  If specified, enable-stack must be set. Prevents installing GHC and Cabal globally.

  Default: `false`

- `stack-setup-ghc`

  If specified, enable-stack must be set. Will run stack setup to install the specified GHC.

  Default: `false`

- `cabal-update`

  If specified, will run `cabal update`.

  Default: `false`

- `ghcup-release-channel`

  If specified, value is added as a ghcup release channel via `ghcup config add-release-channel`.

  Default: `false`

- `disable-matcher`

  If specified, disables match messages from GHC as GitHub CI annotations.

  Default: `false`

## Licenses

This action is subject to [its license] as well as [the licenses of its dependencies].

The binary distributions bundle binaries for [icu4c], and as such are subject to the [icu4c license] in addition to the [Agda license] and the licenses of its depencencies.

[binary distributions]: https://github.com/wenkokke/setup-agda/releases/tag/latest
[cluster counting]: https://agda.readthedocs.io/en/latest/tools/generating-latex.html#counting-extended-grapheme-clusters
[`haskell/actions/setup`]: https://github.com/haskell/actions/tree/main/setup#readme
[build-legacy]: .github/workflows/build-legacy.yml
[action.yml]: action.yml
[icu4c]: https://unicode-org.github.io/icu/userguide/icu4c
[icu4c license]: https://github.com/unicode-org/icu/blob/main/icu4c/LICENSE
[agda license]: https://github.com/agda/agda/blob/master/LICENSE
[its license]: https://github.com/wenkokke/setup-agda/blob/main/LICENSE
[the licenses of its dependencies]: https://github.com/wenkokke/setup-agda/blob/main/dist/licenses.txt
[build.yml]: .github/workflows/build.yml
