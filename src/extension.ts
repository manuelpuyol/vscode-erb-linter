import * as vscode from 'vscode'
import {ERBLint} from './erbLint'
import {ERBLintAutocorrectProvider} from './erbLintAutocorrectProvider'
import {onDidChangeConfiguration} from './configuration'

export const LANGUAGES = ['erb', 'html.erb', 'js.erb']

// entry point of extension
export function activate(context: vscode.ExtensionContext): void {
  'use strict'

  const diag = vscode.languages.createDiagnosticCollection('erb')
  context.subscriptions.push(diag)

  const erbLint = new ERBLint(diag)
  const disposableLint = vscode.commands.registerCommand('erb.erb-lint', () => {
    const document = vscode.window.activeTextEditor?.document
    document && erbLint.execute(document)
  })

  const disposableCorrect = vscode.commands.registerCommand('erb.erb-lint.correct', () => {
    const document = vscode.window.activeTextEditor?.document
    document && erbLint.correct(document)
  })

  context.subscriptions.push(disposableLint)
  context.subscriptions.push(disposableCorrect)

  const ws = vscode.workspace

  ws.onDidChangeConfiguration(onDidChangeConfiguration(erbLint))

  for (const e of ws.textDocuments) {
    erbLint.execute(e)
  }

  ws.onDidOpenTextDocument((e: vscode.TextDocument) => {
    erbLint.execute(e)
  })

  ws.onDidSaveTextDocument((e: vscode.TextDocument) => {
    if (erbLint.isOnSave) {
      erbLint.execute(e)
    }
  })

  ws.onDidCloseTextDocument((e: vscode.TextDocument) => {
    erbLint.clear(e)
  })

  const formattingProvider = new ERBLintAutocorrectProvider()

  for (const language of LANGUAGES) {
    vscode.languages.registerDocumentFormattingEditProvider(language, formattingProvider)
  }
}
