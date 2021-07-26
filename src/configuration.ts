import {workspace} from 'vscode'
import {ERBLint} from './erbLint'

export interface ERBLintConfig {
  command: string
  onSave: boolean
  configFilePath: string
  suppressERBLintWarnings: boolean
  executePath: string
  pathToBundler: string
}

/**
 * Read the workspace configuration for 'erb.erb-lint' and return a ERBLintConfig.
 * @return {ERBLintConfig} config object
 */
export const getConfig: () => ERBLintConfig = () => {
  const cmd = 'erblint'
  const conf = workspace.getConfiguration('erb.erb-lint')
  const configPath = conf.get('executePath', '')
  const suppressERBLintWarnings = conf.get('suppressERBLintWarnings', true)
  const pathToBundler = conf.get('pathToBundler', 'bundle')
  let command

  // if executePath is present in workspace config, use it.
  if (configPath.length !== 0) {
    command = configPath + cmd
  } else {
    command = `${pathToBundler} exec ${cmd}`
  }

  return {
    command,
    configFilePath: conf.get('configFilePath', ''),
    onSave: conf.get('onSave', true),
    suppressERBLintWarnings,
    executePath: configPath,
    pathToBundler
  }
}

export const onDidChangeConfiguration: (erbLint: ERBLint) => () => void = erbLint => {
  return () => (erbLint.config = getConfig())
}
