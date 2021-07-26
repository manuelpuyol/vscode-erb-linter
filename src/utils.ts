import * as vscode from 'vscode'
import {dirname, join} from 'path'
import {existsSync} from 'fs'
import {getConfig} from './configuration'

export function getCurrentPath(fileName: string): string {
  return vscode.workspace.rootPath || dirname(fileName)
}

// extract argument to an array
export function getCommandArguments(fileName: string, options: {autoCorrect?: boolean; stdin?: boolean}): string[] {
  let commandArguments = ['--format', 'json']
  const extensionConfig = getConfig()

  if (extensionConfig.configFilePath !== '') {
    const found = [extensionConfig.configFilePath]
      .concat(
        (vscode.workspace.workspaceFolders || []).map((ws: vscode.WorkspaceFolder) =>
          join(ws.uri.path, extensionConfig.configFilePath)
        )
      )
      .filter((p: string) => existsSync(p))

    if (found.length === 0) {
      vscode.window.showWarningMessage(`${extensionConfig.configFilePath} file does not exist. Ignoring...`)
    } else {
      if (found.length > 1) {
        vscode.window.showWarningMessage(`Found multiple files (${found}) will use ${found[0]}`)
      }
      const config = ['--config', found[0]]

      commandArguments = [...commandArguments, ...config]
    }
  }

  if (options.autoCorrect) commandArguments = [...commandArguments, '--autocorrect']
  if (options.stdin) commandArguments = [...commandArguments, '--stdin', fileName]

  return commandArguments
}

export function isFileUri(uri: vscode.Uri): boolean {
  return uri.scheme === 'file'
}
