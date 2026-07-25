export interface Diagnostic {
  code: string;
  path: string;
  message: string;
}

export interface ParseOptions {
  maximumBytes?: number;
  maximumAliases?: number;
  maximumDepth?: number;
}

export function parseSandboxFile(
  source: string,
  options?: ParseOptions
): unknown;
export function validateDocument(document: unknown): Diagnostic[];
export function validateLockPair(
  manifest: unknown,
  lock: unknown
): Diagnostic[];
export function canonicalizeJson(value: unknown): Uint8Array;
export function applySandboxFileDefaults<T>(manifest: T): T;
export function sha256Digest(bytes: Uint8Array): string;
export function digestSandboxFile(manifest: unknown): string;
export function digestContextEntries(entries: unknown[]): string;
