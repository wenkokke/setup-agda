# setup-agda

[![Setup Latest](https://github.com/wenkokke/setup-agda/actions/workflows/test-setup-latest.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/test-setup-latest.yml)
[![Build Latest](https://github.com/wenkokke/setup-agda/actions/workflows/test-build-latest.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/test-build-latest.yml)
[![Setup Legacy](https://github.com/wenkokke/setup-agda/actions/workflows/test-setup-legacy.yml/badge.svg)](https://github.com/wenkokke/setup-agda/actions/workflows/test-setup-legacy.yml)

This action sets up an Agda environment for use in actions by installing or building a version of Agda and adding it to PATH.

For supported versions, this action uses [custom binary distributions][custom-binary-distributions].
For all other versions, this action attempts to build Agda from source.

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


| Agda | Type | Ubuntu 20.04 | Ubuntu 22.04 | macOS 11 | macOS 12 | Windows 2019 | Windows 2022 |
| ------- | ------- | ------ | ----- | ----- | ----- | ----- | ----- |
| 2.6.2.2 | source  | ☑️     | ☑️    | ☑️    | ☑️    | -     | ☑️     |
| 2.6.2.2 | binary  | ☑️     | ☑️    | ☑️    | ☑️    | ☑️    | ☑️    |
| 2.6.2.1 | binary  | ☑️     | ☑️    | ☑️    | ☑️    | -     | -     |
| 2.6.2   | binary  | ☑️     | ☑️    | ☑️    | ☑️    | -     | -     |
| 2.6.1.3 | binary  | ☑️     | ☑️    | ☑️    | ☑️    | -     | -     |
| 2.6.0.1 | binary  | ☑️     | ☑️    | ☑️    | ☑️    | -     | -     |
| 2.5.4.2 | binary  | ☑️     | ☑️    | ☑️    | ☑️    | -     | -     |

If you find a configuration for this action which can build legacy versions not listed here, please open an issue.

[custom-binary-distributions]: https://github.com/wenkokke/setup-agda/releases/tag/latest
