import { ERBLintOutput, ERBLintFile, ERBLintOffense } from "./erbLintOutput";
import { TaskQueue, Task } from "./taskQueue";
import * as cp from "child_process";
import * as vscode from "vscode";
import { getConfig, ERBLintConfig } from "./configuration";
import { getCurrentPath, isFileUri, getCommandArguments } from "./utils";

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
      document.languageId !== "erb" ||
      document.isUntitled ||
      !isFileUri(document.uri)
    )
      return;

    const fileName = document.fileName;
    const uri = document.uri;
    let currentPath = getCurrentPath(fileName);

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
            loc.line - 1,
            loc.column - 1,
            loc.line - 1,
            loc.length + loc.column - 1
          );
          const sev = this.severity(offence.severity);
          const message = `${offence.message} (${offence.severity}:${offence.cop_name})`;
          const diagnostic = new vscode.Diagnostic(range, message, sev);
          diagnostics.push(diagnostic);
        });
        entries.push([uri, diagnostics]);
      });

      this.diag.set(entries);
    };

    const jsonOutputFormat = ["--format", "json"];
    const args = getCommandArguments(fileName)
      .concat(this.additionalArguments)
      .concat(jsonOutputFormat);

    let task = new Task(uri, (token) => {
      let process = this.executeERBLint(
        args,
        document.getText(),
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
    fileContents: string,
    options: cp.ExecOptions,
    cb: (err: cp.ExecException | null, stdout: string, stderr: string) => void
  ): cp.ChildProcess {
    let child: cp.ChildProcess;

    if (this.config.useBundler) {
      child = cp.exec(`${this.config.command} ${args.join(" ")}`, options, cb);
    } else {
      child = cp.execFile(this.config.command, args, options, cb);
    }

    if (!child.stdin) {
      throw new Error("ERBLint: ChildProcess.stdin is undefined!");
    }

    child.stdin.write(fileContents);
    child.stdin.end();

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

  private severity(sev: string): vscode.DiagnosticSeverity {
    switch (sev) {
      case "refactor":
        return vscode.DiagnosticSeverity.Hint;
      case "convention":
        return vscode.DiagnosticSeverity.Information;
      case "warning":
        return vscode.DiagnosticSeverity.Warning;
      case "error":
        return vscode.DiagnosticSeverity.Error;
      case "fatal":
        return vscode.DiagnosticSeverity.Error;
      default:
        return vscode.DiagnosticSeverity.Error;
    }
  }
}
