/**
 * Generated from the normative SandboxFile JSON Schema.
 * Do not edit directly. Run `pnpm generate`.
 */

export type Name = string;
export type AbsolutePath = string;
export type CpuQuantity = string;
export type StorageQuantity = string;
export type Duration = string;
export type Source = ContextSource | GitSource;
/**
 * A Git HTTPS URL without userinfo, query, or fragment; an SSH URL without a password, query, or fragment; or a git@host:path SSH shorthand.
 */
export type GitUrl = string;
/**
 * A path or glob relative to environment.workdir without parent traversal.
 */
export type ArtifactPath = string;
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | {
      [k: string]: JsonValue;
    };

/**
 * A provider-neutral request for a reproducible, policy-controlled agent computer.
 */
export interface SandboxFile {
  apiVersion: "sandboxfile.dev/v1alpha1";
  kind: "Sandbox";
  metadata: Metadata;
  environment: Environment;
  resources?: Resources;
  lifecycle?: Lifecycle;
  sources?: Sources;
  setup?: Setup;
  tasks?: {
    [k: string]: Task;
  };
  network?: Network;
  /**
   * @maxItems 32
   */
  credentials?: CredentialRequest[];
  capabilities?: Capabilities;
  persistence?: Persistence;
  outputs?: Outputs;
  /**
   * Namespaced, non-secret extension requests. Unsupported extensions are critical by default.
   */
  extensions?: {
    [k: string]: ExtensionRequest;
  };
}
export interface Metadata {
  name: Name;
  description?: string;
  labels?: {
    [k: string]: string;
  };
}
export interface Environment {
  /**
   * An OCI image reference. Production execution must use the digest resolved in SandboxFile.lock.
   */
  image: string;
  workdir?: AbsolutePath;
  user?: string;
  /**
   * @minItems 1
   * @maxItems 64
   */
  entrypoint?: [string, ...string[]];
  /**
   * Non-secret environment variables only. Credential values are forbidden.
   */
  env?: {
    [k: string]: string;
  };
}
export interface Resources {
  cpu?: CpuRange;
  memory?: StorageRange;
  disk?: {
    limit: StorageQuantity;
  };
  processes?: {
    limit: number;
  };
}
export interface CpuRange {
  request?: CpuQuantity;
  limit?: CpuQuantity;
}
export interface StorageRange {
  request?: StorageQuantity;
  limit?: StorageQuantity;
}
export interface Lifecycle {
  ttl?: Duration;
  idleTimeout?: Duration;
  cleanup?: "destroy" | "retain";
}
export interface Sources {
  primary?: Source;
  /**
   * @maxItems 32
   */
  repositories?: Repository[];
}
export interface ContextSource {
  type: "context";
  path: AbsolutePath;
  access?: "read-only" | "read-write";
}
export interface GitSource {
  type: "git";
  url: GitUrl;
  ref?: string;
  path: AbsolutePath;
  access?: "read-only" | "read-write";
}
export interface Repository {
  name: Name;
  type: "git";
  url: GitUrl;
  ref?: string;
  path: AbsolutePath;
  access?: "read-only" | "read-write";
}
export interface Setup {
  /**
   * @maxItems 128
   */
  bootstrap?: string[];
  ready?: Command;
}
export interface Command {
  command: string;
  timeout?: Duration;
}
export interface Task {
  command: string;
  timeout?: Duration;
  /**
   * @maxItems 64
   */
  dependsOn?: Name[];
}
export interface Network {
  default?: "deny" | "allow";
  /**
   * @maxItems 256
   */
  allow?: EgressRule[];
  /**
   * @maxItems 64
   */
  ingress?: IngressRule[];
}
export interface EgressRule {
  /**
   * A lowercase ASCII DNS host or a single leading wildcard label, not a URL.
   */
  host: string;
  /**
   * @minItems 1
   */
  protocols: ["http" | "https" | "ssh", ...("http" | "https" | "ssh")[]];
}
export interface IngressRule {
  name: Name;
  port: number;
  visibility?: "private" | "public";
  protocol?: "http" | "tcp";
}
export interface CredentialRequest {
  name: Name;
  provider: string;
  permissions: {
    [k: string]: "read" | "write";
  };
  /**
   * @maxItems 64
   */
  repositories?: string[];
  delivery?: "proxy";
}
export interface Capabilities {
  shell?: boolean;
  browser?: boolean;
  privileged?: boolean;
  hostMounts?: boolean;
  /**
   * Requests an isolated OCI-compatible nested or provider-managed container runtime. It never implies access to the host runtime.
   */
  containerRuntime?: boolean;
}
export interface Persistence {
  /**
   * @maxItems 64
   */
  caches?: Cache[];
}
export interface Cache {
  name: Name;
  path: AbsolutePath;
  scope: "task" | "sandbox" | "project" | "user";
  retention?: Duration;
}
export interface Outputs {
  /**
   * @maxItems 128
   */
  artifacts?: Artifact[];
  evidence?: {
    commands?: boolean;
    gitDiff?: boolean;
    tests?: boolean;
    resourceUsage?: boolean;
    networkAccess?: boolean;
  };
}
export interface Artifact {
  name: Name;
  path: ArtifactPath;
  retention?: Duration;
}
export interface ExtensionRequest {
  /**
   * Whether a consumer that does not support this extension must reject the manifest.
   */
  critical?: boolean;
  value: JsonValue;
}
