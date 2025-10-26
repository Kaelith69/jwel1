// Update an order by docId or orderId
async function updateOrder(docIdOrOrderId, updates) {
  await init();
  if (!_state.useFirestore) {
    throw new Error('Firebase is not initialized. Cannot update order.');
  }
  if (!docIdOrOrderId) {
    throw new Error('Order identifier is required.');
  }
  const initialId = String(docIdOrOrderId);
  let targetId = initialId;
  let docRef = _state.doc(_state.db, 'orders', targetId);
  try {
    await _state.updateDoc(docRef, updates);
  } catch (err) {
    if (err && err.code === 'not-found') {
      // Try to resolve fallback docId if needed
      if (typeof resolveOrderDocId === 'function') {
        const fallbackId = await resolveOrderDocId(targetId);
        if (fallbackId) {
          targetId = fallbackId;
          docRef = _state.doc(_state.db, 'orders', targetId);
          await _state.updateDoc(docRef, updates);
        } else if (_state.setDoc) {
          await _state.setDoc(docRef, updates, { merge: true });
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }
  // Optionally update local cache if needed
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = bufferedStorage.getItem('proJetOrders');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        const idx = parsed.findIndex(entry =>
          String(entry.orderId) === initialId ||
          String(entry.orderId) === targetId ||
          String(entry._docId) === initialId ||
          String(entry._docId) === targetId
        );
        if (idx > -1) {
          const merged = { ...parsed[idx], ...updates };
          if (!merged._docId) merged._docId = targetId;
          parsed[idx] = merged;
          bufferedStorage.setItem('proJetOrders', JSON.stringify(parsed));
        }
      }
    } catch (err) {
      console.warn('Order cache update skipped after patch:', err);
    }
  }
  return targetId;
}
// Sign in with email and password (Firebase Auth)
async function signIn(email, password) {
  await init();
  if (_state.signInWithEmailAndPassword && _state.auth) {
    return _state.signInWithEmailAndPassword(_state.auth, email, password);
  }
  throw new Error('signInWithEmailAndPassword not available');
}
// firebase-adapter.js
// Lightweight adapter that tries to use Firebase (if configured) and falls back to localStorage.

// Import Firebase config helpers
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  docRef,
  getDocRef,
  setDocRef,
  onSnapshotRef,
  queryRef,
  orderByRef,
  serverTimestampRef,
  storageRef,
  uploadBytesRef,
  getDownloadURLRef,
  signInWithEmailAndPasswordRef,
  signOutRef,
  onAuthStateChangedRef,
  initFirebaseIfNeeded
} from './firebase-config.js';

// Adapter init: lazy-loads Firebase and populates _state
async function init() {
  if (_state.initialized) return _state;
  const core = await initFirebaseIfNeeded();
  _state.app = core.app;
  _state.auth = core.auth;
  _state.db = core.db;
  _state.storage = core.storage;
  _state.collection = collection;
  _state.getDocs = getDocs;
  _state.addDoc = addDoc;
  _state.updateDoc = updateDoc;
  _state.deleteDoc = deleteDoc;
  _state.doc = docRef;
  _state.getDoc = getDocRef;
  _state.setDoc = setDocRef;
  _state.onSnapshot = onSnapshotRef;
  _state.query = queryRef;
  _state.orderBy = orderByRef;
  _state.serverTimestamp = serverTimestampRef;
  _state.storageRef = storageRef;
  _state.uploadBytes = uploadBytesRef;
  _state.getDownloadURL = getDownloadURLRef;
  _state.signInWithEmailAndPassword = signInWithEmailAndPasswordRef;
  _state.signOut = signOutRef;
  _state.onAuthStateChanged = onAuthStateChangedRef;
  _state.useFirestore = !!core.db;
  _state.initialized = true;
  return _state;
}

let _state = {
  initialized: false
  // ...other state properties will be here...
};


async function getProducts() {
  await init();
  if (_state.useFirestore) {
    try {
      const col = _state.collection(_state.db, 'products');
      const q = _state.query && _state.orderBy ? _state.query(col, _state.orderBy('name')) : col;
      const qsnap = await _state.getDocs(q);
      const out = [];
      qsnap.forEach(d => {
        const data = d.data();
        const stableId = data && data.id ? data.id : d.id;
        out.push({ ...data, id: stableId, _docId: d.id });
      });
      console.log('[Firebase] Loaded', out.length, 'products from Firestore');
      return out;
    } catch (err) {
      console.error('Failed to read products from Firestore:', err);
      throw new Error('Firebase is required. Products could not be loaded from Firestore.');
    }
  } else {
    throw new Error('Firebase is not initialized. Cannot load products.');
  }
}

async function getProductById(docIdOrId) {
  await init();
  if(!_state.useFirestore || !_state.getDoc || !_state.doc) throw new Error('Firestore not available');
  const docRef = _state.doc(_state.db, 'products', String(docIdOrId));
  const snap = await _state.getDoc(docRef);
  if(!snap.exists()) return null;
  const data = snap.data();
  return { ...data, id: data?.id || snap.id, _docId: snap.id };
}

async function addProduct(product) {
  await init();
  if (_state.useFirestore) {
    try {
      const colRef = _state.collection(_state.db, 'products');
      const payload = { ...product };
      if (!payload.id) {
        payload.id = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      }
      if (_state.serverTimestamp) {
        payload.createdAt = _state.serverTimestamp();
      }
      if (_state.setDoc && _state.doc) {
        const targetRef = _state.doc(_state.db, 'products', String(payload.id));
        await _state.setDoc(targetRef, payload);
        console.log('[Firebase] Product added with ID:', targetRef.id);
        return targetRef.id;
      }
      const ref = await _state.addDoc(colRef, payload);
      console.log('[Firebase] Product added with ID:', ref.id);
      return ref.id;
    } catch (err) {
      console.error('Failed to add product to Firestore:', err);
      console.error('Error details:', err && err.code, err && err.message);
      console.error('Product data:', product);
      // Detect permission errors and provide a helpful message to the admin UI
      if (err && (err.code === 'permission-denied' || (err.code && String(err.code).toLowerCase().includes('permission')))) {
        throw new Error('Permission denied: you must be an admin to add products. Grant admin via scripts/grant-admin-claim.mjs or add a document in /admins/{uid}.');
      }
      throw new Error(`Failed to add product: ${err.message || err}`);
    }
  } else {
    throw new Error('Firebase is not initialized. Cannot add product.');
  }
}

// Orders API
async function getOrders(){
  await init();
  if(_state.useFirestore){
    try{
      const qsnap = await _state.getDocs(_state.collection(_state.db, 'orders'));
      const out=[];
      qsnap.forEach(d=>{ out.push({ ...d.data(), _docId: d.id }); });
      console.log('[Firebase] Loaded', out.length, 'orders from Firestore');
      return out;
    }catch(err){ 
      console.error('Failed to read orders from Firestore', err);
      throw new Error('Firebase is required. Orders could not be loaded.');
    }
  } else {
    throw new Error('Firebase is not initialized. Cannot load orders.');
  }
}

async function addOrder(order){
  await init();
  const payload = { ...order };
  // TODO: Implement addOrder logic for Firestore and local fallback
  throw new Error('addOrder not implemented yet.');
}

async function deleteOrder(docIdOrOrderId) {
  await init();
  if (!_state.useFirestore) {
    throw new Error('Firebase is not initialized. Cannot delete order.');
  }
  if (!docIdOrOrderId) {
    throw new Error('Order identifier is required.');
  }
  const initialId = String(docIdOrOrderId);
  let targetId = initialId;
  try {
    await _state.deleteDoc(_state.doc(_state.db, 'orders', targetId));
  } catch (err) {
    if (err && err.code === 'not-found') {
      const fallbackId = await resolveOrderDocId(targetId);
      if (!fallbackId) {
        throw err;
      }
      targetId = fallbackId;
      await _state.deleteDoc(_state.doc(_state.db, 'orders', targetId));
    } else {
      throw err;
    }
  }
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = bufferedStorage.getItem('proJetOrders');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(entry =>
          String(entry.orderId) !== initialId &&
          String(entry.orderId) !== targetId &&
          String(entry._docId) !== initialId &&
          String(entry._docId) !== targetId
        );
        bufferedStorage.setItem('proJetOrders', JSON.stringify(filtered));
      }
    } catch (err) {
      console.warn('Order cache update skipped after delete:', err);
    }
  }
  return targetId;
}

async function clearOrders() {
  await init();
  if (!_state.useFirestore) {
    throw new Error('Firebase is not initialized. Cannot clear orders.');
  }
  const snapshot = await _state.getDocs(_state.collection(_state.db, 'orders'));
  const deletions = [];
  snapshot.forEach(docSnap => {
    deletions.push(_state.deleteDoc(_state.doc(_state.db, 'orders', docSnap.id)));
  });
  if (deletions.length) {
    await Promise.all(deletions);
  }
  if (typeof localStorage !== 'undefined') {
    try {
      bufferedStorage.removeItem('proJetOrders');
    } catch (err) {
      console.warn('Order cache clear skipped:', err);
    }
  }
  return deletions.length;
}

// Batch operations for improved performance
async function batchUpdateProducts(updates) {
  await init();
  if (!_state.useFirestore) {
    throw new Error('Firebase is not initialized. Cannot batch update products.');
  }

  if (!Array.isArray(updates) || updates.length === 0) {
    return [];
  }

  // Firebase has a limit of 500 operations per batch
  const BATCH_SIZE = 500;
  const results = [];

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    const batchResults = await processProductBatch(batch);
    results.push(...batchResults);
  }

  return results;
}

async function processProductBatch(updates) {
  // Use Firebase batch write if available, otherwise process sequentially
  if (_state.writeBatch && _state.commitBatch) {
    const batch = _state.writeBatch(_state.db);

    updates.forEach(({ docId, product }) => {
      const docRef = _state.doc(_state.db, 'products', docId);
      const payload = { ...product };
      if (_state.serverTimestamp) {
        payload.updatedAt = _state.serverTimestamp();
      }
      batch.update(docRef, payload);
    });

    await batch.commit();
    console.log(`[Firebase] Batch updated ${updates.length} products`);
    return updates.map(({ docId }) => ({ success: true, docId }));
  } else {
    // Fallback to individual updates with Promise.all for concurrency
    const promises = updates.map(async ({ docId, product }) => {
      try {
        await updateProduct(docId, product);
        return { success: true, docId };
      } catch (err) {
        console.error(`Failed to update product ${docId}:`, err);
        return { success: false, docId, error: err.message };
      }
    });

    return await Promise.all(promises);
  }
}

async function batchDeleteProducts(docIds) {
  await init();
  if (!_state.useFirestore) {
    throw new Error('Firebase is not initialized. Cannot batch delete products.');
  }

  if (!Array.isArray(docIds) || docIds.length === 0) {
    return [];
  }

  // Firebase batch limit
  const BATCH_SIZE = 500;
  const results = [];

  for (let i = 0; i < docIds.length; i += BATCH_SIZE) {
    const batch = docIds.slice(i, i + BATCH_SIZE);
    const batchResults = await processDeleteBatch(batch, 'products');
    results.push(...batchResults);
  }

  return results;
}

async function batchUpdateOrders(updates) {
  await init();
  if (!_state.useFirestore) {
    throw new Error('Firebase is not initialized. Cannot batch update orders.');
  }

  if (!Array.isArray(updates) || updates.length === 0) {
    return [];
  }

  const BATCH_SIZE = 500;
  const results = [];

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    const batchResults = await processOrderBatch(batch);
    results.push(...batchResults);
  }

  return results;
}

async function processOrderBatch(updates) {
  if (_state.writeBatch && _state.commitBatch) {
    const batch = _state.writeBatch(_state.db);

    updates.forEach(({ docId, updates: orderUpdates }) => {
      const docRef = _state.doc(_state.db, 'orders', docId);
      const payload = { ...orderUpdates };
      if (_state.serverTimestamp) {
        payload.updatedAt = _state.serverTimestamp();
      }
      batch.update(docRef, payload);
    });

    await batch.commit();
    console.log(`[Firebase] Batch updated ${updates.length} orders`);
    return updates.map(({ docId }) => ({ success: true, docId }));
  } else {
    const promises = updates.map(async ({ docId, updates: orderUpdates }) => {
      try {
        await updateOrder(docId, orderUpdates);
        return { success: true, docId };
      } catch (err) {
        console.error(`Failed to update order ${docId}:`, err);
        return { success: false, docId, error: err.message };
      }
    });

    return await Promise.all(promises);
  }
}

async function processDeleteBatch(docIds, collection) {
  if (_state.writeBatch && _state.commitBatch) {
    const batch = _state.writeBatch(_state.db);

    docIds.forEach(docId => {
      const docRef = _state.doc(_state.db, collection, docId);
      batch.delete(docRef);
    });

    await batch.commit();
    console.log(`[Firebase] Batch deleted ${docIds.length} ${collection}`);
    return docIds.map(docId => ({ success: true, docId }));
  } else {
    const promises = docIds.map(async (docId) => {
      try {
        if (collection === 'products') {
          await deleteProduct(docId);
        } else if (collection === 'orders') {
          await deleteOrder(docId);
        }
        return { success: true, docId };
      } catch (err) {
        console.error(`Failed to delete ${collection} ${docId}:`, err);
        return { success: false, docId, error: err.message };
      }
    });

    return await Promise.all(promises);
  }
}

async function updateProduct(docIdOrLocalId, product) {
  await init();
  if (_state.useFirestore) {
    try {
      const dref = _state.doc(_state.db, 'products', docIdOrLocalId);
      const payload = { ...product };
      if (_state.serverTimestamp) {
        payload.updatedAt = _state.serverTimestamp();
      }
      await _state.updateDoc(dref, payload);
      console.log('[Firebase] Product updated:', docIdOrLocalId);
      return true;
    } catch (err) {
      console.error('Failed to update product in Firestore:', err);
      throw new Error('Firebase is required. Product could not be updated.');
    }
  } else {
    throw new Error('Firebase is not initialized. Cannot update product.');
  }
}

async function deleteProduct(docIdOrLocalId) {
  await init();
  if (_state.useFirestore) {
    try {
      await _state.deleteDoc(_state.doc(_state.db, 'products', docIdOrLocalId));
      console.log('[Firebase] Product deleted:', docIdOrLocalId);
      return true;
    } catch (err) {
      console.error('Failed to delete product from Firestore:', err);
      throw new Error('Firebase is required. Product could not be deleted.');
    }
  } else {
    throw new Error('Firebase is not initialized. Cannot delete product.');
  }
}

// Accepts File object or dataURL string. Returns a URL string (download URL or dataURL)
async function uploadImage(fileOrDataUrl) {
  await init();
  // If Firestore storage available and a File provided, upload and return download URL
  if (_state.useFirestore && _state.storage && _state.ref && _state.uploadBytes && _state.getDownloadURL) {
    try {
      // If data URL, convert to blob
      let blob = null;
      if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
        const res = await fetch(fileOrDataUrl);
        blob = await res.blob();
      } else if (fileOrDataUrl instanceof File || fileOrDataUrl instanceof Blob) {
        blob = fileOrDataUrl;
      }
      if (blob) {
        const fname = 'images/' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        const storageRef = _state.ref(_state.storage, fname);
        await _state.uploadBytes(storageRef, blob);
        const url = await _state.getDownloadURL(storageRef);
        return url;
      }
    } catch (err) {
      console.warn('Failed to upload to Firebase Storage:', err);
    }
  }
  // fallback: if data URL, return as-is; if File, convert to data URL and return
  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) return fileOrDataUrl;
  if (fileOrDataUrl instanceof File) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(fileOrDataUrl);
    });
  }
  return null;
}

// Settings API (Firestore-only)
async function getSettings() {
  await init();
  if (_state.useFirestore) {
    try {
      const snapshot = await _state.getDocs(_state.collection(_state.db, 'settings'));
      if (snapshot.empty) {
        console.log('[Firebase] No settings found, returning defaults');
  return { whatsappNumber: '919961165503' };
      }
      // Get the first (and should be only) settings document
      const settingsDoc = snapshot.docs.find(docSnap => docSnap.id === 'app') || snapshot.docs[0];
      const data = settingsDoc.data();
      console.log('[Firebase] Loaded settings from Firestore');
      return data;
    } catch (err) {
      console.warn('Failed to read settings from Firestore:', err);
      // Return defaults instead of throwing
      console.log('[Firebase] Returning default settings');
  return { whatsappNumber: '919961165503' };
    }
  } else {
    console.warn('Firebase is not initialized. Returning default settings.');
  return { whatsappNumber: '919961165503' };
  }
}

async function saveSettings(settings) {
  await init();
  if (_state.useFirestore) {
    try {
      // Use a fixed document ID 'app' for settings
      const docRef = _state.doc(_state.db, 'settings', 'app');
      if (_state.setDoc) {
        await _state.setDoc(docRef, settings, { merge: true });
      } else {
        await _state.updateDoc(docRef, settings);
      }
      console.log('[Firebase] Settings updated');
      return true;
    } catch (err) {
      // If document doesn't exist and setDoc wasn't available, create it once
      if (!_state.setDoc && err.code === 'not-found') {
        try {
          const colRef = _state.collection(_state.db, 'settings');
          await _state.addDoc(colRef, { ...settings, _id: 'app' });
          console.log('[Firebase] Settings created');
          return true;
        } catch (createErr) {
          console.error('Failed to create settings in Firestore:', createErr);
          throw new Error('Firebase is required. Settings could not be created.');
        }
      }
      console.error('Failed to save settings to Firestore:', err);
      throw new Error('Firebase is required. Settings could not be saved.');
    }
  } else {
    throw new Error('Firebase is not initialized. Cannot save settings.');
  }
}



// Buffered localStorage operations for better performance and error handling
class BufferedLocalStorage {
  constructor() {
    this.buffer = new Map();
    this.flushInterval = 5000; // Flush every 5 seconds
    this.maxBufferSize = 50; // Max operations before forced flush
    this.isFlushing = false;

    // Auto-flush buffer periodically
    if (typeof window !== 'undefined') {
      setInterval(() => this.flush(), this.flushInterval);
      // Flush on page unload
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  // Buffered set operation
  setItem(key, value) {
    this.buffer.set(key, { type: 'set', value });

    if (this.buffer.size >= this.maxBufferSize) {
      this.flush();
    }
  }

  // Buffered remove operation
  removeItem(key) {
    this.buffer.set(key, { type: 'remove' });

    if (this.buffer.size >= this.maxBufferSize) {
      this.flush();
    }
  }

  // Get item (immediate, not buffered)
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      console.warn('localStorage getItem failed:', err);
      return null;
    }
  }

  // Flush all buffered operations
  flush() {
    if (this.isFlushing || this.buffer.size === 0 || typeof localStorage === 'undefined') {
      return;
    }

    this.isFlushing = true;

    try {
      for (const [key, operation] of this.buffer) {
        if (operation.type === 'set') {
          localStorage.setItem(key, operation.value);
        } else if (operation.type === 'remove') {
          localStorage.removeItem(key);
        }
      }

      this.buffer.clear();
      console.log(`[BufferedLocalStorage] Flushed ${this.buffer.size} operations`);
    } catch (err) {
      console.error('Buffered localStorage flush failed:', err);

      // On quota exceeded, try to clear some space
      if (err.name === 'QuotaExceededError') {
        this.handleQuotaExceeded();
      }
    } finally {
      this.isFlushing = false;
    }
  }

  // Handle storage quota exceeded
  handleQuotaExceeded() {
    try {
      // Try to remove old cached data
      const keysToRemove = ['proJetOrders', 'products'];
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          // Ignore errors during cleanup
        }
      });

      // Try to flush again with reduced buffer
      if (this.buffer.size > 0) {
        const essentialOps = new Map();
        // Keep only essential operations
        for (const [key, op] of this.buffer) {
          if (key.includes('cart') || key.includes('settings')) {
            essentialOps.set(key, op);
          }
        }
        this.buffer = essentialOps;
        this.flush();
      }
    } catch (err) {
      console.error('Failed to handle quota exceeded:', err);
    }
  }

  // Force immediate flush
  forceFlush() {
    this.flush();
  }
}


// Create global buffered localStorage instance
const bufferedStorage = new BufferedLocalStorage();

// Update cache functions to use buffered storage
function cacheOrderLocally(orderRecord) {
  if (typeof localStorage === 'undefined') return;

  try {
    const raw = bufferedStorage.getItem('proJetOrders');
    const parsed = raw ? JSON.parse(raw) : [];
    const existing = Array.isArray(parsed) ? parsed : [];
    const filtered = existing.filter((entry) => {
      const sameOrderId = orderRecord.orderId && entry.orderId && String(entry.orderId) === String(orderRecord.orderId);
      const sameDocId = orderRecord._docId && entry._docId && String(entry._docId) === String(orderRecord._docId);
      return !(sameOrderId || sameDocId);
    });
    filtered.push(orderRecord);
    filtered.sort((a, b) => {
      const aDate = new Date(a.date || a.createdAt || a.updatedAt || 0).getTime();
      const bDate = new Date(b.date || b.createdAt || b.updatedAt || 0).getTime();
      return bDate - aDate;
    });
    bufferedStorage.setItem('proJetOrders', JSON.stringify(filtered));
  } catch (err) {
    console.warn('Order cache update skipped:', err);
  }
}


// --- SINGLE EXPORT DEFAULT AT END ---
export default {
  init,
  getProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  // Batch operations
  batchUpdateProducts,
  batchDeleteProducts,
  batchUpdateOrders,
  uploadImage,
  // orders
  getOrders,
  addOrder,
  updateOrder,
  deleteOrder,
  clearOrders,
  // settings
  getSettings,
  saveSettings,
  // auth
  signIn,
  signOut: _state.signOut,
  onAuthStateChanged: _state.onAuthStateChanged,
  // real-time
  onProductsSnapshot: async function(callback){
    await init();
    if(_state.useFirestore && _state.onSnapshot && _state.collection){
      const col = _state.collection(_state.db, 'products');
      const q = _state.query && _state.orderBy ? _state.query(col, _state.orderBy('name')) : col;
      return _state.onSnapshot(q, (snap)=>{
        const arr=[]; snap.forEach(d=>arr.push({ ...d.data(), _docId:d.id })); callback(arr);
      });
    }
    // fallback: emit whatever is in localStorage so UI stays usable offline
    try {
      const local = JSON.parse(bufferedStorage.getItem('products') || '[]');
      callback(Array.isArray(local) ? local : []);
    } catch (err) {
      console.warn('Local products read failed', err);
      callback([]);
    }
    return ()=>{};
  },
  onOrdersSnapshot: async function(callback){
    await init();
    if(_state.useFirestore && _state.onSnapshot && _state.collection){
      const col = _state.collection(_state.db, 'orders');
      const q = _state.query && _state.orderBy ? _state.query(col, _state.orderBy('date','desc')) : col;
      return _state.onSnapshot(q, (snap)=>{
        const arr=[]; snap.forEach(d=>arr.push({ ...d.data(), _docId:d.id })); callback(arr);
      });
    }
    // fallback: emit whatever is in localStorage so UI stays usable offline
    try {
      const local = JSON.parse(bufferedStorage.getItem('proJetOrders') || '[]');
      callback(Array.isArray(local) ? local : []);
    } catch (err) {
      console.warn('Local orders read failed', err);
      callback([]);
    }
    return ()=>{};
  }
};
