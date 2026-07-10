const cacheStore = new Map();

function cached(fn, ttlMs, keyFn) {
  return async (...args) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    const entry = cacheStore.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.value;
    }
    const value = await fn(...args);
    cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  };
}

function clearCache() {
  cacheStore.clear();
}

function clearByPrefix(prefix) {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}

module.exports = { cached, clearCache, clearByPrefix };
