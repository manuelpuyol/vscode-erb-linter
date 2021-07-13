import * as vscode from "vscode";
import * as cp from "child_process";
import { getConfig } from "./configuration";
import { getCurrentPath, getCommandArguments } from "./utils";

export class ERBLintAutocorrectProvider
  implements vscode.DocumentFormattingEditProvider {
  public provideDocumentFormattingEdits(
    document: vscode.TextDocument
  ): vscode.TextEdit[] {
    const config = getConfig();
    try {
      const args = getCommandArguments(document.fileName, { autoCorrect: true, stdin: true })
      const options = {
        cwd: getCurrentPath(document.fileName),
        input: document.getText(),
      };
      let stdout;
      if (config.executePath.length === 0) {
        stdout = cp.execSync(`${config.command} ${args.join(' ')}`, options);
      } else {
        stdout = cp.execFileSync(config.command, args, options);
      }

      return this.onSuccess(document, stdout);
    } catch (e) {
      // if there are still some offences not fixed RuboCop will return status 1
      if (e.status !== 1) {
        vscode.window.showWarningMessage(
          'An error occurred during auto-correction'
        );
        console.log(e);
        return [];
      } else {
        return this.onSuccess(document, e.stdout);
      }
    }
  }

  // Output of auto-correction looks like this:
  //
  // {"metadata": ... {"offense_count":5,"target_file_count":1,"inspected_file_count":1}}
  // ==================== file_path ===================
  // <div>
  //   Some ERB
  // </div>
  //
  // So we need to parse out the actual auto-corrected ruby
  private onSuccess(document: vscode.TextDocument, stdout: Buffer): vscode.TextEdit[]  {
    const stringOut = stdout.toString();
    const autoCorrection = stringOut.match(
      /^.*\n=+ (\/.*)+ =+(?:\n|\r\n)([.\s\S]*)/m
    );

    if (!autoCorrection) {
      throw new Error(`Error parsing auto-correction from CLI: ${stringOut}`);
    }

    const autoCorrected = autoCorrection.pop();

    if (!autoCorrected) return [];

    return [
      vscode.TextEdit.replace(this.getFullRange(document), autoCorrected),
    ];
  }

  private getFullRange(document: vscode.TextDocument): vscode.Range {
    return new vscode.Range(
      new vscode.Position(0, 0),
      document.lineAt(document.lineCount - 1).range.end
    );
  }
}
