import { storage } from '$lib/services/storage';

// Posters this browser has been shown, remembered across visits so new ones come first.

const KEY = 'seen';

export function createSeen() {
  const ids = new Set(storage.getJSON<string[]>(KEY, []));
  return {
    has: (id: string) => ids.has(id),
    add(newIds: string[]) {
      newIds.forEach((id) => ids.add(id));
      storage.setJSON(KEY, [...ids]);
    }
  };
}
