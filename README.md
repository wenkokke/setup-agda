# setup-agda

[![Setup Latest](https://github.com/wenkokke/setup-agda/actions/workflows/test-setup-latest.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/test-setup-latest.yml)
[![Build Latest](https://github.com/wenkokke/setup-agda/actions/workflows/test-build-latest.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/test-build-latest.yml)
[![Setup Legacy](https://github.com/wenkokke/setup-agda/actions/workflows/test-setup-legacy.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/test-setup-legacy.yml)

This action sets up an Agda environment for use in actions by installing or building a version of Agda and adding it to PATH. For [supported versions](#supported-versions), this action uses [custom binary distributions]. For all other versions, this action attempts to build Agda from source. If an older version of GHC is needed to build the specified version, this action will set it up using [`haskell/actions/setup`].

[^0]: All binary distributions support [cluster counting].

## Usage

See [action.yml](action.yml)

Minimal:

```yaml
on: [push]
name: check
jobs:
  check:
    name: Check Hello.agda
    runs-on: ubuntu-latest # or macOS-latest, or windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: wenkokke/setup-agda@latest
      - run: agda Hello.agda
```

Basic:

```yaml
on: [push]
name: check
jobs:
  check:
    name: Check Hello.agda
    runs-on: ubuntu-latest # or macOS-latest, or windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: wenkokke/setup-agda@latest
        with:
          agda-version: '2.6.2.2'
      - run: agda Hello.agda
```

## Supported versions

| Agda    | Ubuntu 20.04 | Ubuntu 22.04 | macOS 11    | macOS 12    | Windows 2019 | Windows 2022 |
| ------- | ------------ | ------------ | ----------- | ----------- | ------------ | ------------ |
| 2.6.2.2 | 📦 & 🏗      | 📦 & 🏗     | 📦 & 🏗     | 📦 & 🏗     | 📦 only      | 📦 & 🏗      |
| 2.6.2.1 | 📦 & 🏗[^1]  | 📦 & 🏗[^1] | 📦 & 🏗[^1] | 📦 & 🏗[^1] |              |               |
| 2.6.2   | 📦 & 🏗      | 📦 & 🏗     | 📦 & 🏗     | 📦 & 🏗     |              |               |
| 2.6.1.3 | 📦 & 🏗[^1]  | 📦 & 🏗[^1] | 📦 & 🏗[^1] | 📦 & 🏗[^1] |              |               |
| 2.6.0.1 | 📦 & 🏗[^1]  | 📦 & 🏗[^1] | 📦 & 🏗[^1] | 📦 & 🏗[^1] |              |               |
| 2.5.4.2 | 📦 & 🏗[^1]  | 📦 & 🏗[^1] | 📦 & 🏗[^1] | 📦 & 🏗[^1] |              |               |

If 📦 is specified, the platform supports setting up the Agda version from a binary distribution.

If 🏗 is specified, the platform supports building the Agda version from source.

We encourage using the binary distributions. The binary distributions are tested on every commit. Building the latest Agda version is tested weekly on all platforms except Windows 2019. Please do not rely on the legacy builds, as these are not regularly tested. Please report any failing build *that is listed as working*, and we will update the table.

If you find a configuration for this action which builds a legacy version not listed here, please open an issue and include the GitHub workflow. You can find the configuration for the current legacy builds in the [test-build-legacy] workflow. 

[^1]: This version can only be built with Stack. Set the input `enable-stack` to build with Stack.


## License

This action is subject to [its license] as well as [the licenses of its dependencies].

The binary distributions bundle binaries for [icu4c], and as such are subject to the [icu4c licence] in addition to the [Agda license] and the licenses of its depencencies.


[custom binary distributions]: https://github.com/wenkokke/setup-agda/releases/tag/latest
[cluster counting]: https://agda.readthedocs.io/en/latest/tools/generating-latex.html#counting-extended-grapheme-clusters
[`haskell/actions/setup`]: https://github.com/haskell/actions/tree/main/setup#readme
[test-build-legacy]: .github/workflows/test-build-legacy.yml
[icu4c]: https://unicode-org.github.io/icu/userguide/icu4c
[icu4c license]: https://github.com/unicode-org/icu/blob/main/icu4c/LICENSE
[Agda license]: https://github.com/agda/agda/blob/master/LICENSE
[its license]: https://github.com/wenkokke/setup-agda/blob/main/LICENSE
[the licenses of its dependencies]: https://github.com/wenkokke/setup-agda/blob/main/dist/licenses.txt
