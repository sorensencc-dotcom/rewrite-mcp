const storage = new Map();

module.exports = async function contextMemoryManager(params) {
  try {
    if (!params || typeof params !== 'object') {
      throw new Error('params must be an object');
    }

    if (!params.action || typeof params.action !== 'string') {
      throw new Error('action required');
    }

    if (!params.namespace || typeof params.namespace !== 'string') {
      throw new Error('namespace required');
    }

  const { action, namespace, key, value, ttl = 86400, tags = [] } = params;

  switch (action) {
    case 'store':
      if (!key) throw new Error('key required for store action');
      return storeValue(namespace, key, value, ttl, tags);

    case 'retrieve':
      if (!key) throw new Error('key required for retrieve action');
      return retrieveValue(namespace, key);

    case 'delete':
      if (!key) throw new Error('key required for delete action');
      return deleteValue(namespace, key);

    case 'list':
      return listNamespace(namespace);

    default:
      throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    throw new Error(`Context memory error: ${error.message}`);
  }
};

function storeValue(namespace, key, value, ttl, tags) {
  const nsKey = `${namespace}:${key}`;
  const expiresAt = new Date(Date.now() + ttl * 1000);

  storage.set(nsKey, {
    namespace,
    key,
    value,
    tags,
    storedAt: new Date(),
    expiresAt,
    size: JSON.stringify(value).length
  });

  return {
    success: true,
    action: 'store',
    namespace,
    key,
    stored: value,
    expiresAt,
    size: JSON.stringify(value).length
  };
}

function retrieveValue(namespace, key) {
  const nsKey = `${namespace}:${key}`;
  const entry = storage.get(nsKey);

  if (!entry) {
    return { success: false, error: 'Not found' };
  }

  if (entry.expiresAt < new Date()) {
    storage.delete(nsKey);
    return { success: false, error: 'Expired' };
  }

  return {
    success: true,
    namespace,
    key,
    value: entry.value,
    expiresAt: entry.expiresAt
  };
}

function deleteValue(namespace, key) {
  const nsKey = `${namespace}:${key}`;
  const existed = storage.has(nsKey);
  storage.delete(nsKey);

  return {
    success: true,
    deleted: existed,
    namespace,
    key
  };
}

function listNamespace(namespace) {
  const results = [];
  for (const [nsKey, entry] of storage) {
    if (entry.namespace === namespace && entry.expiresAt >= new Date()) {
      results.push({
        key: entry.key,
        tags: entry.tags,
        expiresAt: entry.expiresAt,
        size: entry.size
      });
    }
  }

  return {
    namespace,
    count: results.length,
    items: results
  };
}
