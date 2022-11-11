# v1.1.0

### Support for libraries, defaults, and executables

Added support for automatically installing libraries from Git repositories, and for registering libraries, defaults, and executables.

#### `agda-libraries`

Takes a list of Agda libraries to install, specified by their Git URL and end in a version anchor, e.g.,

```yaml
agda-libraries: |
  https://github.com/agda/agda-categories.git#v0.1.7.1
  https://github.com/agda/cubical.git#v0.3
```

To setup the Agda standard library, use "agda-stdlib-version" instead, as that ensures that the standard library and Agda versions are compatible.

This input requires that the library has a tagged release and that the repository contains a .agda-lib file, and relies on the convention that the filename of the .agda-lib file is the name of the library, and will refuse to install any library whose .agda-lib file is simple named ".agda-lib".

#### `agda-defaults`

Takes a list of installed Agda libraries to add to defaults.

```yaml
agda-defaults: |
  agda-categories
  cubical
```

#### `agda-executables`

Takes a list of executables to register with Agda.
Executables must be specified by their name or path, e.g.,

```yaml
agda-executables: |
  z3
  /bin/sh
```

### Bug fixes

Fixed a bug where providing a concrete version number for `agda-stdlib-version` would cause the action to fail.

# v1.0.0

First version.
