import 'fake-indexeddb/auto';

// Polyfill crypto.randomUUID for test environments that lack it
if (!globalThis.crypto?.randomUUID) {
  try {
    // Dynamic import for Node.js crypto (only in test environment)
    const nodeCrypto = await Function('return import("crypto")')();
    Object.defineProperty(globalThis, 'crypto', {
      value: { ...globalThis.crypto, randomUUID: nodeCrypto.randomUUID },
      writable: true,
    });
  } catch {
    // Fallback: simple UUID v4 generator
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        ...globalThis.crypto,
        randomUUID: () =>
          'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          }),
      },
      writable: true,
    });
  }
}
