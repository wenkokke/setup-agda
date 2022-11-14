# setup-agda

[![setup](https://github.com/wenkokke/setup-agda/actions/workflows/setup.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/setup.yml)
[![setup nightly](https://github.com/wenkokke/setup-agda/actions/workflows/setup-nightly.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/setup-nightly.yml)
[![build](https://github.com/wenkokke/setup-agda/actions/workflows/build.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/build.yml)
[![build nightly](https://github.com/wenkokke/setup-agda/actions/workflows/build-nightly.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/build-nightly.yml)
[![pre-commit.ci](https://results.pre-commit.ci/badge/github/wenkokke/setup-agda/main.svg)](https://results.pre-commit.ci/latest/github/wenkokke/setup-agda/main)

This action sets up an Agda environment for use in actions by installing or building a version of Agda and adding it to PATH.

For [supported versions](#supported-versions), this action uses [custom binary distributions][custom binary distributions][^0].

For all other versions, this action attempts to build Agda from source. If an older version of GHC is needed to build the specified version, this action will set it up using [`haskell/actions/setup`].

[^0]: All binary distributions support [cluster counting].

## Usage

See [action.yml](action.yml)

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
| 2.6.2.1 | 📦 & 🏗[^1]   | 📦 & 🏗[^1]   | 📦 & 🏗[^1] | 📦 & 🏗[^1] | 📦 only      | 📦 & 🏗[^1]   |
| 2.6.2   | 📦 & 🏗       | 📦 & 🏗       | 📦 & 🏗     | 📦 & 🏗     | 📦 only      | 📦 & 🏗       |
| 2.6.1.3 | 📦 & 🏗[^1]   | 📦 & 🏗[^1]   | 📦 & 🏗[^1] | 📦 & 🏗[^1] | 📦 only      | 📦 & 🏗[^1]   |
| 2.6.0.1 | 📦 & 🏗[^1]   | 📦 & 🏗[^1]   | 📦 & 🏗[^1] | 📦 & 🏗[^1] |              |              |
| 2.5.4.2 | 📦 & 🏗[^1]   | 📦 & 🏗[^1]   | 📦 & 🏗[^1] | 📦 & 🏗[^1] |              |              |
| 2.5.2   | 📦 & 🏗[^1]   | 📦 & 🏗[^1]   | 📦 & 🏗[^1] | 📦 & 🏗[^1] |              |              |

If 📦 is specified, the platform supports setting up the Agda version from a binary distribution.

If 🏗 is specified, the platform supports building the Agda version from source.

We encourage using the binary distributions. The binary distributions are tested on every commit. Building the latest Agda version is tested weekly on all platforms except Windows 2019. Please do not rely on the legacy builds, as these are not regularly tested. Please report any failing build _that is listed as working_, and we will update the table.

If you find a configuration for this action which builds a legacy version not listed here, please open an issue and include the GitHub workflow. You can find the configuration for the current legacy builds in the [build-legacy] workflow.

[^1]: This version can only be built with Stack. Set the input `enable-stack` to build with Stack. See [build.yml] for details.

## Licenses

This action is subject to [its license] as well as [the licenses of its dependencies].

The binary distributions bundle binaries for [icu4c], and as such are subject to the [icu4c license] in addition to the [Agda license] and the licenses of its depencencies.

[custom binary distributions]: https://github.com/wenkokke/setup-agda/releases/tag/latest
[cluster counting]: https://agda.readthedocs.io/en/latest/tools/generating-latex.html#counting-extended-grapheme-clusters
[`haskell/actions/setup`]: https://github.com/haskell/actions/tree/main/setup#readme
[build-legacy]: .github/workflows/build-legacy.yml
[icu4c]: https://unicode-org.github.io/icu/userguide/icu4c
[icu4c license]: https://github.com/unicode-org/icu/blob/main/icu4c/LICENSE
[agda license]: https://github.com/agda/agda/blob/master/LICENSE
[its license]: https://github.com/wenkokke/setup-agda/blob/main/LICENSE
[the licenses of its dependencies]: https://github.com/wenkokke/setup-agda/blob/main/dist/licenses.txt
[build.yml]: .github/workflows/build.yml
