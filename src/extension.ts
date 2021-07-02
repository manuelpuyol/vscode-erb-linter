import * as vscode from 'vscode';
import { ERBLint } from './erbLint';
import { ERBLintAutocorrectProvider} from './erbLintAutocorrectProvider';
import { onDidChangeConfiguration } from './configuration';

// entry point of extension
export function activate(context: vscode.ExtensionContext): void {
  'use strict';

  const diag = vscode.languages.createDiagnosticCollection('erb');
  context.subscriptions.push(diag);

  const erbLint = new ERBLint(diag);
  const disposable = vscode.commands.registerCommand('erb.erb-lint', () => {
    const document = vscode.window.activeTextEditor?.document;
    document && erbLint.execute(document);
  });

  context.subscriptions.push(disposable);

  const ws = vscode.workspace;

  ws.onDidChangeConfiguration(onDidChangeConfiguration(erbLint));

  ws.textDocuments.forEach((e: vscode.TextDocument) => {
    erbLint.execute(e);
  });

  ws.onDidOpenTextDocument((e: vscode.TextDocument) => {
    erbLint.execute(e);
  });

  ws.onDidSaveTextDocument((e: vscode.TextDocument) => {
    if (erbLint.isOnSave) {
      erbLint.execute(e);
    }
  });

  ws.onDidCloseTextDocument((e: vscode.TextDocument) => {
    erbLint.clear(e);
  });

  const formattingProvider = new ERBLintAutocorrectProvider();

  vscode.languages.registerDocumentFormattingEditProvider(
    'erb',
    formattingProvider
  );
}
