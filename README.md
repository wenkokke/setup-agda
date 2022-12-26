# setup-agda

[![ci](https://github.com/wenkokke/setup-agda/actions/workflows/ci.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/ci.yml)
[![setup nightly](https://github.com/wenkokke/setup-agda/actions/workflows/setup-nightly.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/setup-nightly.yml)
[![build nightly](https://github.com/wenkokke/setup-agda/actions/workflows/build-nightly.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/build-nightly.yml)
[![pre-commit.ci](https://results.pre-commit.ci/badge/github/wenkokke/setup-agda/main.svg)](https://results.pre-commit.ci/latest/github/wenkokke/setup-agda/main)

This action sets up an Agda environment for use in actions by installing or building a version of Agda and adding it to PATH.

For [supported versions](#supported-versions), this action uses [custom binary distributions][custom binary distributions][^0].

For all other versions, this action attempts to build Agda from source. If an older version of GHC is needed to build the specified version, this action will set it up using [`haskell/actions/setup`].

[^0]: All binary distributions support [cluster counting].

## Samples

#### Minimal

Setup the latest Agda version.

```yaml
name: minimal
on: [push]
jobs:
  check:
    name: Check greet.agda
    runs-on: ubuntu-latest # or macOS-latest, or windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: wenkokke/setup-agda@latest
      - run: agda greet.agda
```

#### Basic

Setup a specific Agda version and its recommended standard library version.

```yaml
name: basic
on: [push]
jobs:
  check:
    name: Check hello-world-dep.agda
    runs-on: ubuntu-latest # or macOS-latest, or windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: wenkokke/setup-agda@latest
        with:
          agda-version: '2.6.2.2'
          agda-stdlib-version: 'recommended'
      - run: agda hello-world-dep.agda
```

#### Matrix

Matrix test with multiple Agda versions.

```yaml
name: matrix
on: [push]
jobs:
  check:
    name: Check hello-world-proof.agda
    strategy:
      matrix:
        os: [ubuntu-latest, macOS-latest, windows-latest]
        agda-version: ['2.6.2.2', '2.6.1.3', '2.6.0.1', '2.5.4.2']
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: wenkokke/setup-agda@latest
        with:
          agda-version: ${{ matrix.agda-version }}
          agda-stdlib-version: 'recommended'
      - run: agda hello-world-proof.agda
```

#### Complex

Setup a specific Agda version, a specific standard library version, various other libraries, and an executable.

```yaml
name: complex
on: [push]
jobs:
  check:
    name: Check hello-schmitty.agda
    strategy:
      matrix:
        os: [ubuntu-latest, macOS-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: cda-tum/setup-z3@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: wenkokke/setup-agda@latest
        with:
          agda-version: '2.6.2.2'
          agda-stdlib-version: '1.7.1'
          agda-libraries: |
            https://github.com/gallais/agdarsec.git#v0.5.0
            https://github.com/wenkokke/schmitty.git#v1.0.1
          agda-executables: |
            z3
      - run: agda hello-schmitty.agda
```

## Supported versions

| Agda    | Ubuntu 20.04 | Ubuntu 22.04 | macOS 11   | macOS 12   | Windows 2019 | Windows 2022 |
| ------- | ------------ | ------------ | ---------- | ---------- | ------------ | ------------ |
| 2.6.2.2 | 📦 & 🏗       | 📦 & 🏗       | 📦 & 🏗     | 📦 & 🏗     | 📦 only      | 📦 & 🏗       |
| 2.6.2.1 | 📦 & 🏗       | 📦 & 🏗       | 📦 & 🏗     | 📦 & 🏗     | 📦 only      | 📦 & 🏗       |
| 2.6.2   | 📦 & 🏗       | 📦 & 🏗       | 📦 & 🏗     | 📦 & 🏗     | 📦 only      | 📦 & 🏗       |
| 2.6.1.3 | 📦 & 🏗       | 📦 & 🏗       | 📦 & 🏗     | 📦 & 🏗     | 📦 only      | 📦 & 🏗       |
| 2.6.0.1 | 📦 & 🏗       | 📦 & 🏗       | 📦 & 🏗     | 📦 & 🏗     |              |              |
| 2.5.4.2 | 📦 & 🏗       | 📦 & 🏗       | 📦 & 🏗     | 📦 & 🏗     |              |              |
| 2.5.3   | 📦 & 🏗       | 📦 & 🏗       | 📦 & 🏗     | 📦 & 🏗     |              |              |
| 2.5.2   | 📦 & 🏗       | 📦 only       | 📦 & 🏗     | 📦 & 🏗     |              |              |

If 📦 is specified, the platform supports setting up the Agda version from a binary distribution.

If 🏗 is specified, the platform supports building the Agda version from source.

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

- `force-cluster-counting`

  If specified, build with cluster counting.

  Default: `false`

- `force-no-cluster-counting`

  If specified, build without cluster counting.

  Default: `false`

- `force-optimise-heavily`

  If specified, build with optimise heavily.

  Default: `false`

- `force-no-optimise-heavily`

  If specified, build without optimise heavily.

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
  If `enable-stack` is specified, this may result in errors, as there may
  not be a `stack-XYZ.yaml` file for the specified GHC version.

  Default: `recommended`

- `ghc-version-match-exact`

  If specified, requires an exact match for the GHC version.
  
  By default, this action uses the pre-installed version of GHC if it is
  compatible with the requested Agda version (see `ghc-version-range`) in
  the major and minor version numbers, ignoring the patch version.

  Default: `false`

- `ghc-version-range`

  If specified, restricts the range of allowed GHC versions.
  
  By default, this action infers the set of compatible GHC versions from
  the `tested-with` field in Agda.cabal (if building with Cabal) or from the
  set of `stack-*.yaml` files (if building with Stack). If specified, this
  inferred set of is then filtered by `ghc-version-range`.

  Default: `*`

- `pre-build-hook`

  A shell script to be run before starting the build.

  Default: `false`

- `bdist-upload`

  If specified, will upload a binary distribution for the specified Agda version.

  Default: `false`

- `bdist-name`

  If specified, will be used as a name for the binary distribution package.
  
  The value is interpreted as a [mustache template](https://mustache.github.io/).
  The template may use `{{{agda-version}}}`, `{{{cabal-version}}}`, `{{{ghc-version}}}`,
  `{{{icu-version}}}`, `{{{stack-version}}}`, and `{{{upx-version}}}`, which will be
  replaced by the concrete versions, if installed, and to `{{{arch}}}`,
  `{{{platform}}}`, and `{{{release}}}`, which will be replaced by the system
  architecture, operating system, and operating system release, as returned
  by [the corresponding NodeJS functions](https://nodejs.org/api/os.html).
  
  Only used when `bdist-upload` is specified.

  Default: `agda-{{{agda-version}}}-{{{arch}}}-{{{platform}}}`

- `bdist-license-report`

  If specified, include a license report in the binary distribution.
  
  The `bdist-license-report` option is incompatible with `enable-stack`, since
  it relies on [`cabal-plan`](https://hackage.haskell.org/package/cabal-plan).
  
  Only used when `bdist-upload` is specified.

  Default: `false`

- `bdist-compress-exe`

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
  
  Only used when `bdist-upload` is specified.

  Default: `false`

- `bdist-retention-days`

  Duration after which bdist will expire in days.
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

- `disable-matcher`

  If specified, disables match messages from GHC as GitHub CI annotations.

  Default: `false`

## Licenses

This action is subject to [its license] as well as [the licenses of its dependencies].

The binary distributions bundle binaries for [icu4c], and as such are subject to the [icu4c license] in addition to the [Agda license] and the licenses of its depencencies.

[custom binary distributions]: https://github.com/wenkokke/setup-agda/releases/tag/latest
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
