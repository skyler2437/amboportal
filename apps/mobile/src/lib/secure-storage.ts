import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase requires a storage adapter with getItem, setItem, removeItem.
// On native platforms, use SecureStore for encrypted storage.
// On web, fall back to AsyncStorage (SecureStore is not available on web).
//
// SecureStore has a 2048-byte value limit. The persisted Supabase session
// (access JWT + refresh token + user object) is ~3-4KB, so large values are
// split across multiple SecureStore entries — every byte stays in the
// keychain. Previous builds diverted oversized values to PLAINTEXT
// AsyncStorage, which left the session tokens unencrypted; values found at
// that legacy location are migrated into chunked SecureStore on first read.
//
// Chunked layout for a logical `key`:
//   key                      -> "__chunked__:<gen>:<count>"   (manifest)
//   key__chunk_<gen>_<i>     -> chunk i of <count>
// Writes go to the opposite generation ('a'/'b') before the manifest is
// swapped, so a crash mid-write leaves the previous value readable.
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
const CHUNK_SIZE = 1900;
const CHUNK_MANIFEST_PREFIX = '__chunked__';
const LEGACY_FALLBACK_PREFIX = '__ss_fallback__';

type Generation = 'a' | 'b';

const chunkKey = (key: string, gen: Generation, index: number) =>
  `${key}__chunk_${gen}_${index}`;

function parseManifest(value: string): { gen: Generation; count: number } | null {
  if (!value.startsWith(`${CHUNK_MANIFEST_PREFIX}:`)) return null;
  const [, gen, countRaw] = value.split(':');
  const count = Number(countRaw);
  if ((gen !== 'a' && gen !== 'b') || !Number.isInteger(count) || count <= 0) {
    return null;
  }
  return { gen, count };
}

async function readManifest(key: string): Promise<{ gen: Generation; count: number } | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    return raw ? parseManifest(raw) : null;
  } catch {
    return null;
  }
}

async function readChunked(key: string, gen: Generation, count: number): Promise<string | null> {
  const chunks = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      SecureStore.getItemAsync(chunkKey(key, gen, i)).catch(() => null)
    )
  );
  if (chunks.some((chunk) => chunk === null)) return null;
  return chunks.join('');
}

async function deleteChunks(key: string, gen: Generation, count: number): Promise<void> {
  await Promise.all(
    Array.from({ length: count }, (_, i) =>
      SecureStore.deleteItemAsync(chunkKey(key, gen, i)).catch(() => {})
    )
  );
}

/** Returns true when the value is durably stored. */
async function setItemSecure(key: string, value: string): Promise<boolean> {
  const oldManifest = await readManifest(key);
  const mustChunk =
    value.length > CHUNK_SIZE || value.startsWith(`${CHUNK_MANIFEST_PREFIX}:`);

  try {
    if (!mustChunk) {
      await SecureStore.setItemAsync(key, value);
    } else {
      const gen: Generation = oldManifest?.gen === 'a' ? 'b' : 'a';
      const count = Math.ceil(value.length / CHUNK_SIZE);
      for (let i = 0; i < count; i++) {
        await SecureStore.setItemAsync(
          chunkKey(key, gen, i),
          value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        );
      }
      // Swapping the manifest is the commit point.
      await SecureStore.setItemAsync(key, `${CHUNK_MANIFEST_PREFIX}:${gen}:${count}`);
    }
  } catch (err) {
    if (__DEV__) console.warn('[secure-storage] setItem failed:', err);
    return false;
  }

  // Best-effort cleanup of the previous generation and any legacy
  // plaintext copy.
  if (oldManifest) await deleteChunks(key, oldManifest.gen, oldManifest.count);
  try {
    await AsyncStorage.removeItem(LEGACY_FALLBACK_PREFIX + key);
  } catch {
    // ignore
  }
  return true;
}

const SecureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (!isNative) {
      return AsyncStorage.getItem(key);
    }

    // Legacy plaintext fallback first (old builds preferred it as the most
    // recent write); migrate it into chunked SecureStore and delete it.
    try {
      const legacy = await AsyncStorage.getItem(LEGACY_FALLBACK_PREFIX + key);
      if (legacy !== null) {
        const migrated = await setItemSecure(key, legacy);
        if (migrated) {
          try {
            await AsyncStorage.removeItem(LEGACY_FALLBACK_PREFIX + key);
          } catch {
            // ignore
          }
        }
        return legacy;
      }
    } catch {
      // ignore
    }

    try {
      const direct = await SecureStore.getItemAsync(key);
      if (direct !== null) {
        const manifest = parseManifest(direct);
        if (!manifest) return direct;
        return readChunked(key, manifest.gen, manifest.count);
      }
    } catch {
      // SecureStore can fail if the item was stored by a different app version
    }

    return AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!isNative) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    // No plaintext fallback on failure: better to lose session persistence
    // in a rare keychain error than to store auth tokens unencrypted.
    await setItemSecure(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (!isNative) {
      await AsyncStorage.removeItem(key);
      return;
    }
    const manifest = await readManifest(key);
    if (manifest) await deleteChunks(key, manifest.gen, manifest.count);
    try { await SecureStore.deleteItemAsync(key); } catch { /* ignore */ }
    try { await AsyncStorage.removeItem(LEGACY_FALLBACK_PREFIX + key); } catch { /* ignore */ }
    try { await AsyncStorage.removeItem(key); } catch { /* ignore */ }
  },
};

export default SecureStorageAdapter;
