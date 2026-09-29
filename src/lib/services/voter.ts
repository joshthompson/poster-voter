import { storage } from './storage';

/** Anonymous id for this browser, so votes can be counted per voter. */
export function voterId() {
  let id = storage.get('id');
  if (!id) {
    id = crypto.randomUUID();
    storage.set('id', id);
  }
  // Without storage the id can't persist; share one so a visit still works.
  return storage.get('id') ? id : 'anonymous';
}
