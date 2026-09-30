import { storage } from '$lib/services/storage';

// How far this browser has got through each collection's pairs, remembered across visits:
// the seed that fixes the order they come in (see pairing.ts) and the index to carry on from.
// Stored as postervote:votes = [{ collection, seed, index }], one entry per collection.

const KEY = 'votes';

type Progress = { collection: string; seed: number; index: number };

export function createProgress() {
  storage.remove('seen'); // the posters shown, which this replaced
  // Kept here too, so without storage a visit still sticks to one order.
  const entries = storage.getJSON<Progress[]>(KEY, []);

  const find = (collection: string) => {
    let entry = entries.find((e) => e.collection === collection);
    if (!entry) {
      entry = { collection, seed: Math.floor(Math.random() * 2 ** 32), index: 0 };
      entries.push(entry);
    }
    return entry;
  };

  return {
    /** Where this browser is up to in `collection`; the first time, the start of a new order. */
    get: (collection: string) => ({ ...find(collection) }),
    /** Remember that `collection` carries on from `index`. */
    set(collection: string, index: number) {
      find(collection).index = index;
      storage.setJSON(KEY, entries);
    }
  };
}
