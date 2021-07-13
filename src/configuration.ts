import * as vs from "vscode";
import { ERBLint } from "./erbLint";

export interface ERBLintConfig {
  command: string;
  onSave: boolean;
  configFilePath: string;
  suppressERBLintWarnings: boolean;
  executePath: string;
}

/**
 * Read the workspace configuration for 'erb.erb-lint' and return a ERBLintConfig.
 * @return {ERBLintConfig} config object
 */
export const getConfig: () => ERBLintConfig = () => {
  const cmd = "erblint";
  const conf = vs.workspace.getConfiguration("erb.erb-lint");
  let configPath = conf.get("executePath", "");
  let suppressERBLintWarnings = conf.get("suppressERBLintWarnings", true);
  let command;

  // if executePath is present in workspace config, use it.
  if (configPath.length !== 0) {
    command = configPath + cmd;
  } else {
    command = `bundle exec ${cmd}`;
  }

  return {
    command,
    configFilePath: conf.get("configFilePath", ""),
    onSave: conf.get("onSave", true),
    suppressERBLintWarnings,
    executePath: configPath,
  };
};

export const onDidChangeConfiguration: (erbLint: ERBLint) => () => void = (
  erbLint
) => {
  return () => (erbLint.config = getConfig());
};
