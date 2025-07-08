import {workspace} from 'vscode'
import {ERBLint} from './erbLint'

export interface ERBLintConfig {
  command: string
  onSave: boolean
  configFilePath: string
  suppressERBLintWarnings: boolean
  executePath: string
  pathToBundler: string
  cache: boolean
}

/**
 * Read the workspace configuration for 'erb.erb-lint' and return a ERBLintConfig.
 * @return {ERBLintConfig} config object
 */
export const getConfig: () => ERBLintConfig = () => {
  const conf = workspace.getConfiguration('erb.erb-lint')
  const cmd = conf.get('cmd', 'erb_lint')
  const cache = conf.get('cache', false)
  const configPath = conf.get('executePath', '')
  const suppressERBLintWarnings = conf.get('suppressERBLintWarnings', true)
  const pathToBundler = conf.get('pathToBundler', 'bundle') || 'bundle'
  let command

  // if executePath is present in workspace config, use it.
  if (configPath.length !== 0) {
    command = configPath + cmd
  } else {
    command = `${pathToBundler} exec ${cmd}`
  }

  if (cache) {
    command = `${command} --cache`
  }

  return {
    command,
    configFilePath: conf.get('configFilePath', ''),
    onSave: conf.get('onSave', true),
    suppressERBLintWarnings,
    executePath: configPath,
    pathToBundler,
    cache
  }
}

export const onDidChangeConfiguration: (erbLint: ERBLint) => () => void = erbLint => {
  return () => (erbLint.config = getConfig())
}
