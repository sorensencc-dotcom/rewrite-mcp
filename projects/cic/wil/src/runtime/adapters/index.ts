// File: src/runtime/adapters/index.ts
// Wayland adapter interfaces

export interface ShellAdapter {
  execute(
    command: string,
    args: string[],
    options?: { timeoutMs?: number }
  ): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

export interface FileAdapter {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  list(path: string): Promise<{ name: string; type: "file" | "dir" }[]>;
}

export interface ModelAdapter {
  invoke(
    prompt: string,
    options: { maxTokens: number; temperature: number }
  ): Promise<{ text: string }>;
}

export interface HttpAdapter {
  get(url: string): Promise<{ status: number; body: string }>;
  post(url: string, body: any): Promise<{ status: number; body: string }>;
}

export interface BrowserAdapter {
  open(url: string): Promise<{ sessionId: string }>;
  search(query: string): Promise<{ title: string; url: string }[]>;
}
