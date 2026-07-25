/**
 * Generated from the normative SandboxFile JSON Schema.
 * Do not edit directly. Run `pnpm generate`.
 */

export type Name = string;
export type Sha256 = string;
export type ImageReference = string;
export type ResolvedSource = ResolvedContextSource | ResolvedGitSource;
export type AbsolutePath = string;
/**
 * A Git HTTPS URL without userinfo, query, or fragment; an SSH URL without a password, query, or fragment; or a git@host:path SSH shorthand.
 */
export type GitUrl = string;
export type GitCommit = string;

/**
 * Immutable provider-neutral resolutions for a SandboxFile.
 */
export interface SandboxFileLock {
  apiVersion: "sandboxfile.dev/v1alpha1";
  kind: "SandboxLock";
  metadata: {
    name: Name;
    sandboxFileDigest: Sha256;
    generatedBy?: {
      name: string;
      version: string;
    };
  };
  environment: {
    image: {
      reference: ImageReference;
      digest: Sha256;
    };
  };
  sources?: {
    primary?: ResolvedSource;
    /**
     * @maxItems 32
     */
    repositories?: ResolvedRepository[];
  };
}
export interface ResolvedContextSource {
  type: "context";
  path: AbsolutePath;
  contentDigest: Sha256;
  access?: "read-only" | "read-write";
}
export interface ResolvedGitSource {
  type: "git";
  url: GitUrl;
  requestedRef?: string;
  commit: GitCommit;
  path: AbsolutePath;
  access?: "read-only" | "read-write";
}
export interface ResolvedRepository {
  name: Name;
  type: "git";
  url: GitUrl;
  requestedRef?: string;
  commit: GitCommit;
  path: AbsolutePath;
  access?: "read-only" | "read-write";
}
