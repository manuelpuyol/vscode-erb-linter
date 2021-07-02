import { ERBLintOutput, ERBLintFile, ERBLintOffense } from "./erbLintOutput";
import { TaskQueue, Task } from "./taskQueue";
import * as cp from "child_process";
import * as vscode from "vscode";
import { getConfig, ERBLintConfig } from "./configuration";
import { getCurrentPath, getCommandArguments } from "./utils";

function isFileUri(uri: vscode.Uri): boolean {
  return uri.scheme === "file";
}

export class ERBLint {
  public config: ERBLintConfig;
  private diag: vscode.DiagnosticCollection;
  private additionalArguments: string[];
  private taskQueue: TaskQueue = new TaskQueue();

  constructor(
    diagnostics: vscode.DiagnosticCollection,
    additionalArguments: string[] = []
  ) {
    this.diag = diagnostics;
    this.additionalArguments = additionalArguments;
    this.config = getConfig();
  }

  public execute(document: vscode.TextDocument, onComplete?: () => void): void {
    if (
      document.languageId !== "html.erb" ||
      document.isUntitled ||
      !isFileUri(document.uri)
    )
      return;

    const fileName = document.fileName;
    const uri = document.uri;
    const currentPath = getCurrentPath(fileName);

    let onDidExec = (
      error: cp.ExecException | null,
      stdout: string,
      stderr: string
    ) => {
      this.reportError(error, stderr);
      let erbLint = this.parse(stdout);
      if (erbLint === undefined || erbLint === null) {
        return;
      }

      this.diag.delete(uri);

      let entries: [vscode.Uri, vscode.Diagnostic[]][] = [];
      erbLint.files.forEach((file: ERBLintFile) => {
        let diagnostics: vscode.Diagnostic[] = [];
        file.offenses.forEach((offence: ERBLintOffense) => {
          const loc = offence.location;
          const range = new vscode.Range(
            loc.start_line - 1,
            loc.start_column - 1,
            loc.last_line - 1,
            loc.last_column - 1,
          );
          const message = `${offence.message} (${offence.linter})`;
          const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
          diagnostics.push(diagnostic);
        });
        entries.push([uri, diagnostics]);
      });

      this.diag.set(entries);
    };

    const args = getCommandArguments(fileName).concat(this.additionalArguments).concat([fileName])

    let task = new Task(uri, (token) => {
      let process = this.executeERBLint(
        args,
        { cwd: currentPath },
        (error, stdout, stderr) => {
          if (token.isCanceled) {
            return;
          }
          onDidExec(error, stdout, stderr);
          token.finished();
          if (onComplete) {
            onComplete();
          }
        }
      );
      return () => process.kill();
    });
    this.taskQueue.enqueue(task);
  }

  public get isOnSave(): boolean {
    return this.config.onSave;
  }

  public clear(document: vscode.TextDocument): void {
    let uri = document.uri;
    if (isFileUri(uri)) {
      this.taskQueue.cancel(uri);
      this.diag.delete(uri);
    }
  }

  // execute erbLint
  private executeERBLint(
    args: string[],
    options: cp.ExecOptions,
    cb: (err: cp.ExecException | null, stdout: string, stderr: string) => void
  ): cp.ChildProcess {
    let child: cp.ChildProcess;

    if (this.config.executePath.length === 0) {
      child = cp.exec(`${this.config.command} ${args.join(" ")}`, options, cb);
    } else {
      child = cp.execFile(this.config.command, args, options, cb);
    }

    return child;
  }

  // parse erbLint(JSON) output
  private parse(output: string): ERBLintOutput | null {
    let erbLint: ERBLintOutput | null = null;

    if (output.length < 1) {
      let message = `command ${this.config.command} returns empty output! please check configuration.`;
      vscode.window.showWarningMessage(message);

      return null;
    }

    try {
      erbLint = JSON.parse(output);
    } catch (e) {
      if (e instanceof SyntaxError) {
        let regex = /[\r\n \t]/g;
        let message = output.replace(regex, " ");
        let errorMessage = `Error on parsing output (It might non-JSON output) : "${message}"`;
        vscode.window.showWarningMessage(errorMessage);

        return null;
      }
    }

    return erbLint;
  }

  // checking erbLint output has error
  private reportError(error: cp.ExecException | null, stderr: string): boolean {
    let errorOutput = stderr.toString();
    if (error && (<any>error).code === "ENOENT") {
      vscode.window.showWarningMessage(
        `${this.config.command} is not executable`
      );
      return true;
    } else if (error && (<any>error).code === 127) {
      vscode.window.showWarningMessage(stderr);
      return true;
    } else if (errorOutput.length > 0 && !this.config.suppressERBLintWarnings) {
      vscode.window.showWarningMessage(stderr);
      return true;
    }

    return false;
  }
}
