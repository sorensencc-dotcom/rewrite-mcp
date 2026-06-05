# Context Memory Manager

## Purpose
Persist and retrieve conversation context across sessions with namespace isolation, TTL-based expiration, and tag-based queries.

## Input
- `action` (string, required): store|retrieve|delete|list
- `namespace` (string, required): Namespace for isolation (conversation, user, project)
- `key` (string, required for store/retrieve/delete): Key for storage
- `value` (object, for store): Value to store
- `ttl` (number, default: 86400): Time to live in seconds
- `tags` (array): Tags for bulk operations

## Output
For store: `{ success, namespace, key, stored, expiresAt, size }`
For retrieve: `{ success, namespace, key, value, expiresAt }`
For delete: `{ success, deleted, namespace, key }`
For list: `{ namespace, count, items }`

## Example
```javascript
await skill.invoke('context-memory-manager', {
  action: 'store',
  namespace: 'conversation-123',
  key: 'preferences',
  value: { theme: 'dark', language: 'en' },
  ttl: 604800,
  tags: ['user-data']
})
```
