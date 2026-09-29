import { storage } from '$lib/services/storage';

// Whether this visitor says they're a designer: asked once, remembered, and sent with every
// vote so the rankings can be split by it. null = not asked yet.

const KEY = 'designer';

function read(): boolean | null {
  const v = storage.get(KEY);
  return v === 'yes' ? true : v === 'no' ? false : null;
}

class Designer {
  value = $state<boolean | null>(read());

  set(isDesigner: boolean) {
    this.value = isDesigner;
    storage.set(KEY, isDesigner ? 'yes' : 'no');
  }
}

export const designer = new Designer();
