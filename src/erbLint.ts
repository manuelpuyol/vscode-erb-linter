import * as cp from 'child_process'
import * as vscode from 'vscode'
import {ERBLintOutput} from './erbLintOutput'
import {TaskQueue, Task} from './taskQueue'
import {getConfig, ERBLintConfig} from './configuration'
import {getCurrentPath, getCommandArguments, isFileUri} from './utils'
import {LANGUAGES} from './extension'

export class ERBLint {
  public config: ERBLintConfig
  private diag: vscode.DiagnosticCollection
  private additionalArguments: string[]
  private taskQueue: TaskQueue = new TaskQueue()

  constructor(diagnostics: vscode.DiagnosticCollection, additionalArguments: string[] = []) {
    this.diag = diagnostics
    this.additionalArguments = additionalArguments
    this.config = getConfig()
  }

  public execute(document: vscode.TextDocument, onComplete?: () => void): void {
    if (!this.shouldRun(document)) return

    const uri = document.uri

    const onDidExec = (stdout: string) => {
      const erbLint = this.parse(stdout)
      if (erbLint === undefined || erbLint === null) {
        return
      }

      this.diag.delete(uri)

      const entries: Array<[vscode.Uri, vscode.Diagnostic[]]> = []
      for (const file of erbLint.files) {
        const diagnostics: vscode.Diagnostic[] = []

        for (const offense of file.offenses) {
          const loc = offense.location
          const range = new vscode.Range(loc.start_line - 1, loc.start_column, loc.last_line - 1, loc.last_column)
          const message = `${offense.message} (${offense.linter})`
          const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Information)
          diagnostics.push(diagnostic)
        }

        entries.push([uri, diagnostics])
      }

      this.diag.set(entries)
    }

    this.scheduleERBTask(document, false, onComplete, onDidExec)
  }

  public correct(document: vscode.TextDocument): void {
    if (!this.shouldRun(document)) return

    this.scheduleERBTask(document, true, () => {
      this.execute(document)
    })
  }

  public get isOnSave(): boolean {
    return this.config.onSave
  }

  public clear(document: vscode.TextDocument): void {
    const uri = document.uri
    if (isFileUri(uri)) {
      this.taskQueue.cancel(uri)
      this.diag.delete(uri)
    }
  }

  private shouldRun(document: vscode.TextDocument): boolean {
    return this.isERB(document) && !document.isUntitled && isFileUri(document.uri)
  }

  private isERB(document: vscode.TextDocument): boolean {
    return LANGUAGES.includes(document.languageId)
  }

  private scheduleERBTask(
    document: vscode.TextDocument,
    autoCorrect: boolean,
    onComplete?: () => void,
    onDidExec?: (stdout: string) => void
  ) {
    const fileName = document.fileName
    const uri = document.uri
    const currentPath = getCurrentPath(fileName)

    const args = getCommandArguments(fileName, {autoCorrect}).concat(this.additionalArguments).concat([fileName])

    const task = new Task(uri, token => {
      const process = this.executeERBLint(args, {cwd: currentPath}, (error, stdout, stderr) => {
        if (token.isCanceled) return
        if (this.reportError(error, stderr)) return

        onDidExec && onDidExec(stdout)
        token.finished()
        onComplete && onComplete()
      })
      return () => process.kill()
    })
    this.taskQueue.enqueue(task)
  }

  // execute erbLint
  private executeERBLint(
    args: string[],
    options: cp.ExecOptions,
    cb: (err: cp.ExecException | null, stdout: string, stderr: string) => void
  ): cp.ChildProcess {
    let child: cp.ChildProcess

    if (this.config.executePath.length === 0) {
      child = cp.exec(`${this.config.command} ${args.join(' ')}`, options, cb)
    } else {
      child = cp.execFile(this.config.command, args, options, cb)
    }

    return child
  }

  // parse erbLint(JSON) output
  private parse(output: string): ERBLintOutput | null {
    let erbLint: ERBLintOutput | null = null

    if (output.length < 1) {
      const message = `command ${this.config.command} returns empty output! please check configuration.`
      vscode.window.showWarningMessage(message)

      return null
    }

    try {
      erbLint = JSON.parse(output)
    } catch (e) {
      if (e instanceof SyntaxError) {
        const regex = /[\r\n \t]/g
        const message = output.replace(regex, ' ')
        const errorMessage = `Error on parsing output (It might non-JSON output) : "${message}"`
        vscode.window.showWarningMessage(errorMessage)

        return null
      }
    }

    return erbLint
  }

  // checking erbLint output has error
  private reportError(error: cp.ExecException | null, stderr: string): boolean {
    const errorOutput = stderr.toString()

    if (/^no files found/.test(errorOutput)) {
      return true
    } else if (error && error.code === 127) {
      vscode.window.showWarningMessage(stderr)
      return true
    } else if (errorOutput.length > 0 && !this.config.suppressERBLintWarnings) {
      vscode.window.showWarningMessage(stderr)
      return true
    }

    return false
  }
}
