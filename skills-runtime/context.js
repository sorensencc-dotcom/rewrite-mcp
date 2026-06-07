// Skill Runtime — Context Module
// Manages shared state and context across skill executions

class Context {
  constructor() {
    this.store = {};
    this.ttls = {};
  }

  set(namespace, key, value, ttlMs = null) {
    if (!this.store[namespace]) {
      this.store[namespace] = {};
    }
    this.store[namespace][key] = value;

    if (ttlMs) {
      const expiresAt = Date.now() + ttlMs;
      if (!this.ttls[namespace]) {
        this.ttls[namespace] = {};
      }
      this.ttls[namespace][key] = expiresAt;

      setTimeout(() => {
        if (this.ttls[namespace] && this.ttls[namespace][key] === expiresAt) {
          delete this.store[namespace][key];
          delete this.ttls[namespace][key];
        }
      }, ttlMs);
    }

    return value;
  }

  get(namespace, key) {
    if (!this.store[namespace]) return undefined;

    const expiresAt = this.ttls[namespace]?.[key];
    if (expiresAt && Date.now() > expiresAt) {
      delete this.store[namespace][key];
      delete this.ttls[namespace][key];
      return undefined;
    }

    return this.store[namespace][key];
  }

  has(namespace, key) {
    return this.get(namespace, key) !== undefined;
  }

  delete(namespace, key) {
    if (this.store[namespace]) {
      delete this.store[namespace][key];
    }
    if (this.ttls[namespace]) {
      delete this.ttls[namespace][key];
    }
  }

  clear(namespace) {
    if (namespace) {
      delete this.store[namespace];
      delete this.ttls[namespace];
    } else {
      this.store = {};
      this.ttls = {};
    }
  }

  getAll(namespace) {
    return this.store[namespace] ? { ...this.store[namespace] } : {};
  }

  export() {
    return {
      store: this.store,
      ttls: this.ttls
    };
  }
}

export const context = new Context();

export function createContext() {
  return new Context();
}
