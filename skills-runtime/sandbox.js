// Skill Runtime — Sandbox Module
// Executes skills with timeout and resource limits

export class SandboxOptions {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000; // 30s default
    this.memoryLimit = options.memoryLimit || 512; // MB
    this.retries = options.retries || 0;
    this.retryDelay = options.retryDelay || 100; // ms
  }
}

export async function runInSandbox(skillFunc, payload, options = {}) {
  const opts = options instanceof SandboxOptions ? options : new SandboxOptions(options);

  let lastError;
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      const result = await executeWithTimeout(skillFunc, payload, opts.timeout);
      return result;
    } catch (err) {
      lastError = err;
      if (attempt < opts.retries) {
        await delay(opts.retryDelay);
      }
    }
  }

  throw lastError;
}

async function executeWithTimeout(func, payload, timeoutMs) {
  return new Promise((resolve, reject) => {
    let completed = false;
    const timeoutId = setTimeout(() => {
      if (!completed) {
        completed = true;
        reject(new Error(`Skill execution timeout after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    try {
      const result = func(payload);
      if (result && typeof result.then === "function") {
        result
          .then(res => {
            completed = true;
            clearTimeout(timeoutId);
            resolve(res);
          })
          .catch(err => {
            completed = true;
            clearTimeout(timeoutId);
            reject(err);
          });
      } else {
        completed = true;
        clearTimeout(timeoutId);
        resolve(result);
      }
    } catch (err) {
      completed = true;
      clearTimeout(timeoutId);
      reject(err);
    }
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runWithRetries(skillFunc, payload, maxRetries = 3, delayMs = 100) {
  const opts = new SandboxOptions({ retries: maxRetries, retryDelay: delayMs });
  return runInSandbox(skillFunc, payload, opts);
}
