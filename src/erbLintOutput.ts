// output of erb-lint JSON format

interface ERBLintLocation {
  line: number;
  column: number;
}

export interface ERBLintOffense {
  message: string;
  location: ERBLintLocation;
}

export interface ERBLintFile {
  path: string;
  offenses: Array<ERBLintOffense>;
}

export interface ERBLintOutput {
  files: Array<ERBLintFile>;
}
