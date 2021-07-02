# ERB Linter for Visual Studio Code

_This project is based on [ruby-robocop](https://github.com/misogi/vscode-ruby-rubocop)_

DISCLAIMER: This extension requires the update in [this PR](https://github.com/Shopify/erb-lint/pull/219).

This extensions provides interfaces to [erb-lint](https://github.com/Shopify/erb-lint) for vscode.

## Features

- Lint ERB files using "ERB Linter: lint with erb-lint" in the command palette.
- Lint on save.
- Autocorrect using "ERB Linter: autocorrect current file with erb-lint" in the command palette.

# Installation

You can configure rules and behaviors like explained in the [erb-lint docs](https://github.com/Shopify/erb-lint).
To install the gem, there are two methods.

## Preferred

Add `erb_lint` to your project's Gemfile and install it with Bundler.

## Global install

Install in globally using `gem install erb_lint`. If you want to use it globally. you must set the `executePath`.


## Options

### erb.erb-lint.executePath

Declare an specific path to run `erb-lint`. This is untested and may have some issues loading your configuration file (see configFilePath to fix this).
If no path is provided, the extension will default to running `erb-lint` with `bundle`.

### erb.erb-lint.configFilePath

Path to the `erb-lint` configuration file. The extension will try to use your root `.erb-lint.yml` file.

### erb.erb-lint.onSave

Whether or not to run `erb-lint` in the current file on save. This defaults to `true`.

### erb.erb-lint.suppressERBLintWarnings

Suppress warnings from erb-lint and attempt to run regardless. Useful if you have random warnings in the `erb-lint` execution. This defaults to `true`.

# TODOs

- Add tests
- Add formatter on save instead of command in the palette
- Improve usability with global `erb-lint`
