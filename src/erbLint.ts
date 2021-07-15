import * as cp from "child_process";
import * as vscode from "vscode";
import * as path from "path";
import { ERBLintOutput, ERBLintFile, ERBLintOffense } from "./erbLintOutput";
import { TaskQueue, Task } from "./taskQueue";
import { getConfig, ERBLintConfig } from "./configuration";
import { getCurrentPath, getCommandArguments, isFileUri } from "./utils";

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
    if (!this.shouldRun(document)) return;

    const uri = document.uri;

    let onDidExec = (stdout: string) => {
      let erbLint = this.parse(document, stdout);
      if (erbLint === undefined || erbLint === null) {
        return;
      }

      this.diag.delete(uri);

      let entries: [vscode.Uri, vscode.Diagnostic[]][] = [];
      erbLint.files.forEach((file: ERBLintFile) => {
        let diagnostics: vscode.Diagnostic[] = [];
        file.offenses.forEach((offence: ERBLintOffense) => {
          const loc = offence.location;
          const range = document.lineAt(loc.line - 1).range
          const diagnostic = new vscode.Diagnostic(
            range,
            offence.message,
            vscode.DiagnosticSeverity.Information
          );
          diagnostics.push(diagnostic);
        });
        entries.push([uri, diagnostics]);
      });

      this.diag.set(entries);
    };

    this.scheduleERBTask(document, false, onComplete, onDidExec);
  }

  public correct(document: vscode.TextDocument): void {
    if (!this.shouldRun(document)) return;

    this.scheduleERBTask(document, true, () => {
      this.execute(document);
    });
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

  private shouldRun(document: vscode.TextDocument) {
    return (
      document.languageId === "html.erb" &&
      !document.isUntitled &&
      isFileUri(document.uri)
    );
  }

  private scheduleERBTask(
    document: vscode.TextDocument,
    autoCorrect: boolean,
    onComplete?: () => void,
    onDidExec?: (stdout: string) => void
  ) {
    const fileName = document.fileName;
    const uri = document.uri;
    const currentPath = getCurrentPath(fileName);

    const args = getCommandArguments(fileName, { autoCorrect })
      .concat(this.additionalArguments)
      .concat([fileName]);

    let task = new Task(uri, (token) => {
      let process = this.executeERBLint(
        args,
        { cwd: currentPath },
        (error, stdout, stderr) => {
          if (token.isCanceled) return;

          this.reportError(error, stderr);
          onDidExec && onDidExec(stdout);
          token.finished();
          onComplete && onComplete();
        }
      );
      return () => process.kill();
    });
    this.taskQueue.enqueue(task);
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
  private parse(document: vscode.TextDocument, output: string): ERBLintOutput | null {
    if (output.length < 1) {
      let message = `command ${this.config.command} returns empty output! please check configuration.`;
      vscode.window.showWarningMessage(message);

      return null;
    }

    if (output.includes("No errors were found in ERB files"))
      return null;

    const lines = output.split(/^.*\.erb:/m);
    // first line is a progress message
    lines.shift()

    let offenses: Array<ERBLintOffense> = []

    lines.forEach((l) => {
      const match = l.trim().match(/(?<line>\d+):(?<column>\d+): (?<message>(.|\n)*)/m);
      if (!match || !match.groups) return;

      const {
        line,
        column,
        message,
      } = match.groups;

      offenses = [...offenses, {
        message,
        location: {
          line: parseInt(line),
          column: parseInt(column),
        }
      }];
    });

    return {
      files: [{
        path: document.fileName,
        offenses
      }]
    };
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
