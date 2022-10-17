# setup-agda

This action sets up an Agda environment for use in actions by installing or building a version of Agda and adding it to PATH.

For supported versions, this action uses [custom binary distributions][custom-binary-distributions].
For all other versions, this action attempts to build Agda from source.

## Supported versions

| Agda    | Release | Ubuntu  | macOS   | Windows |
| ------- | ------- | ------- | ------- | ------- |
| 2.6.2.2 | source  | *       | *       | >=2022  |
| 2.6.2.2 | binary  | *       | *       | *       |
| ...     | ...     | ...     | ...     | ...     |


[custom-binary-distributions]: https://github.com/wenkokke/setup-agda/releases/tag/latest