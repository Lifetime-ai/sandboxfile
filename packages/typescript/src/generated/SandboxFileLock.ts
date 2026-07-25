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
      resolved: OciDescriptor;
      /**
       * The immutable image manifest selected for one execution platform.
       */
      selected: {
        descriptor: OciManifestDescriptor;
        platform: OciPlatform;
      };
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
/**
 * The top-level descriptor resolved by the requested reference.
 */
export interface OciDescriptor {
  mediaType:
    | "application/vnd.oci.image.index.v1+json"
    | "application/vnd.oci.image.manifest.v1+json"
    | "application/vnd.docker.distribution.manifest.list.v2+json"
    | "application/vnd.docker.distribution.manifest.v2+json";
  digest: Sha256;
  size: number;
}
export interface OciManifestDescriptor {
  mediaType:
    | "application/vnd.oci.image.manifest.v1+json"
    | "application/vnd.docker.distribution.manifest.v2+json";
  digest: Sha256;
  size: number;
}
export interface OciPlatform {
  os: string;
  architecture: string;
  variant?: string;
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
