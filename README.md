# ERB Linter for Visual Studio Code

_This project is based on [ruby-rubocop](https://github.com/misogi/vscode-ruby-rubocop)_

This extensions provides interfaces to [erb-lint](https://github.com/Shopify/erb-lint) for vscode. **It requires version `>= 0.1.0` to work.**

![demo](./assets/demo.gif)

## Features

- Lint ERB files using `ERB Linter: lint with erb-lint` in the command palette.
- Lint on save.
- Autocorrect using `ERB Linter: autocorrect current file with erb-lint` in the command palette.
- Format on save

# Installation

You can configure rules and behaviors like explained in the [erb-lint docs](https://github.com/Shopify/erb-lint).
To install the gem, there are two methods.

## Preferred

Add `erb_lint` to your project's Gemfile and install it with Bundler.

## Global install

Install in globally using `gem install erb_lint`. If you want to use it globally, you must set the `executePath`.

# Enabling format on save

To enable Format on Save for ERB files, you have to update your VSCode configs with:

```json
"[erb]": {
  "editor.defaultFormatter": "manuelpuyol.erb-linter",
  "editor.formatOnSave": true
},
```

_Note: If you are using the [Rails](https://marketplace.visualstudio.com/items?itemName=bung87.rails) extension, you may need to set the same configuration for `html.erb`_

# Options

## erb.erb-lint.executePath

Declare an specific path to run `erb-lint`. This is untested and may have some issues loading your configuration file (see configFilePath to fix this).
If no path is provided, the extension will default to running `erb-lint` with `bundle`.

The extension expected the **executable** path, so instead of 

```
$ gem which erb_lint
~/.rvm/gems/ruby-3.1.0/gems/erb_lint-0.4.0/lib/erb_lint.rb
```

use 

```
~/.rvm/gems/ruby-3.1.0/gems/erb_lint-0.4.0/exe
```

In case of a globally installed erblint, use

```
$ which erblint
/opt/rubies/ruby-2.7.8/bin/erblint
```

## erb.erb-lint.configFilePath

Path to the `erb-lint` configuration file. The extension will try to use your root `.erb-lint.yml` file.

## erb.erb-lint.onSave

Whether or not to run `erb-lint` in the current file on save. This defaults to `true`.

## erb.erb-lint.suppressERBLintWarnings

Suppress warnings from erb-lint and attempt to run regardless. Useful if you have random warnings in the `erb-lint` execution. This defaults to `true`.

## erb.erb-lint.pathToBundler

Uses `bundle` by default, but can be modified in case you use a custom path.

# TODOs

- Add tests
- Improve usability with global `erb-lint`
