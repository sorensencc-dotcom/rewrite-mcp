// File: tests/wil/mocks.ts
import {
  ShellAdapter,
  FileAdapter,
  ModelAdapter,
  HttpAdapter,
  BrowserAdapter
} from "../runtime/adapters";

export class MockShellAdapter implements ShellAdapter {
  async execute(command: string, args: string[]) {
    return { stdout: `mock:${command} ${args.join(" ")}`, stderr: "", exitCode: 0 };
  }
}

export class MockFileAdapter implements FileAdapter {
  private store = new Map<string, string>();

  async read(path: string) {
    return this.store.get(path) ?? "";
  }

  async write(path: string, content: string) {
    this.store.set(path, content);
  }

  async list(path: string) {
    return [{ name: "mock.txt", type: "file" as const }];
  }
}

export class MockModelAdapter implements ModelAdapter {
  async invoke(prompt: string) {
    return { text: `mock-response-for: ${prompt}` };
  }
}

export class MockHttpAdapter implements HttpAdapter {
  async get(url: string) {
    return { status: 200, body: `mock-get:${url}` };
  }

  async post(url: string, body: any) {
    return { status: 200, body: `mock-post:${url}:${JSON.stringify(body)}` };
  }
}

export class MockBrowserAdapter implements BrowserAdapter {
  async open(url: string) {
    return { sessionId: `mock-browser-${url}` };
  }

  async search(query: string) {
    return [{ title: `Result for ${query}`, url: "https://example.com" }];
  }
}
