// output of erb-lint JSON format
interface ERBLintSummary {
  offenses: number;
  target_files: number;
  corrected: number;
}

interface ERBLintLocation {
  start_line: number;
  start_column: number;
  last_line: number;
  last_column: number;
  length: number;
}

export interface ERBLintOffense {
  message: string;
  linter: string;
  location: ERBLintLocation;
}

export interface ERBLintFile {
  path: string;
  offenses: Array<ERBLintOffense>;
}

interface ERBLintMetadata {
  erb_lint_version: string;
  ruby_engine: string;
  ruby_version: string;
  ruby_patchlevel: string;
  ruby_platform: string;
}

export interface ERBLintOutput {
  metadata: ERBLintMetadata;
  files: Array<ERBLintFile>;
  summary: ERBLintSummary;
}
