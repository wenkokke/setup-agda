# setup-agda

Set up a specific version of Agda for your GitHub Actions workflow.

- With the spec `nightly`:
  Download and install from [agda/agda#nightly](https://github.com/agda/agda/releases/tag/nightly).

- With the spec `latest`:
  Resolve the latest version number from [agda/agda#tags](https://github.com/agda/agda/tags).

- With a version number, i.e., `2.x.y.z.`:

  - on Ubuntu, try:
    ```sh
    # check version with `apt-cache policy Agda`
    apt-get install Agda=2.x.y.z
    ```
  - on macOS, try:
    ```sh
    # check version with `brew info agda`
    brew install agda@2.x.y.z
    ```
  - otherwise:
    ```sh
    # actions/setup/haskell
    cabal install Agda
    ```

- With a commit hash:
  ```sh
  # actions/setup/haskell
  # clone agda/agda
  cabal install
  ```

[linux]: https://github.com/agda/agda/releases/download/nightly/Agda-nightly-linux.tar.xz
[macos]: https://github.com/agda/agda/releases/download/nightly/Agda-nightly-macOS.tar.xz
[windows]: https://github.com/agda/agda/releases/download/nightly/Agda-nightly-win64.tar.xz
