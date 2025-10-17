// firebase-init.js
// Re-exports initialized Firebase instances. Edit firebase-config.js with your config.
import { app, auth, db, storage } from './firebase-config.js';
export { app, auth, db, storage };

// Also export helpers (lazy import if needed elsewhere)
export async function helpers(){
  const mod = await import('./firebase-config.js');
  return mod;
}

// Convenience re-export of init helper when available
export async function initFirebase(){
  const mod = await import('./firebase-config.js');
  if(mod && typeof mod.initFirebaseIfNeeded === 'function'){
    return mod.initFirebaseIfNeeded();
  }
  return { app:null, auth:null, db:null, storage:null };
}
