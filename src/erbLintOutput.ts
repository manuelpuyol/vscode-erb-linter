// output of erb-lint JSON format
interface ERBLintSummary {
  offence_count: number;
  target_file_count: number;
  inspected_file_count: number;
}

interface ERBLintLocation {
  line: number;
  column: number;
  length: number;
}

export interface ERBLintOffense {
  severity: string;
  message: string;
  cop_name: string;
  corrected: boolean;
  location: ERBLintLocation;
}

export interface ERBLintFile {
  path: string;
  offenses: Array<ERBLintOffense>;
}

interface ERBLintMetadata {
  erb_lint_version: string;
  erb_lint_engine: string;
  ruby_version: string;
  ruby_patchlevel: string;
  ruby_platform: string;
}

export interface ERBLintOutput {
  metadata: ERBLintMetadata;
  files: Array<ERBLintFile>;
  summary: ERBLintSummary;
}
