// firebase-adapter.js
// Lightweight adapter that tries to use Firebase (if configured) and falls back to localStorage.
// Methods: init(), getProducts(), addProduct(), updateProduct(docId, product), deleteProduct(docId), uploadImage(fileOrDataUrl)

let _state = {
  initialized: false,
  useFirestore: false,
  db: null,
  storage: null,
  auth: null,
  collection: null,
  getDocs: null,
  getDoc: null,
  addDoc: null,
  updateDoc: null,
  deleteDoc: null,
  doc: null,
  setDoc: null,
  ref: null,
  uploadBytes: null,
  getDownloadURL: null,
  onSnapshot: null,
  query: null,
  orderBy: null,
  serverTimestamp: null,
  signInWithEmailAndPassword: null,
  signInAnonymously: null,
  signOut: null,
  onAuthStateChanged: null
};

function cacheOrderLocally(orderRecord) {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem('proJetOrders');
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
    localStorage.setItem('proJetOrders', JSON.stringify(filtered));
  } catch (err) {
    console.warn('Order cache update skipped:', err);
  }
}

// Remove undefined values recursively and normalize primitives for Firestore
function sanitizeForFirestore(value) {
  if (value === undefined) return undefined; // caller will drop
  if (value === null) return null;
  if (Array.isArray(value)) {
    const arr = value
      .map((v) => sanitizeForFirestore(v))
      .filter((v) => v !== undefined);
    return arr;
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const sv = sanitizeForFirestore(v);
      if (sv !== undefined) out[k] = sv;
    }
    return out;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    return value; // keep as-is; upstream may want empty strings
  }
  if (typeof value === 'boolean') return value;
  return undefined;
}

async function init() {
  if (_state.initialized) {
    console.log('[firebase-adapter] Already initialized, returning cached state');
    return _state;
  }
  _state.initialized = true;
  console.log('[firebase-adapter] Starting Firebase initialization...');
  try {
    // dynamic import so the file doesn't throw when firebase-config is not set up
    console.log('[firebase-adapter] Attempting to load firebase-config.js...');
    let cfg = await import('./firebase-config.js');
    console.log('[firebase-adapter] Successfully loaded firebase-config.js');
    // If firebase-config provides an init helper, call it so SDKs load and exported
    // references (db/auth/storage) become available.
    if (cfg && typeof cfg.initFirebaseIfNeeded === 'function') {
      try {
        console.log('[firebase-adapter] Initializing Firebase SDK...');
        await cfg.initFirebaseIfNeeded();
        console.log('[firebase-adapter] Firebase SDK initialized successfully');
      } catch (e) {
        console.warn('[firebase-adapter] firebase-config init failed:', e && e.message ? e.message : e);
        console.warn('[firebase-adapter] Full error:', e);
        // Check if this might be a mobile network issue
        if (e.message && e.message.includes('network') || e.message.includes('CORS') || e.message.includes('SDK loading failed')) {
          console.warn('[firebase-adapter] This appears to be a network/connectivity issue, possibly on mobile');
        }
      }
    }
    // If firebase-config.js exported db/storage then use Firestore/Storage
    if (cfg && cfg.db) {
      console.log('[firebase-adapter] Firebase config loaded successfully, enabling Firestore');
      _state.useFirestore = true;
      _state.db = cfg.db;
      _state.auth = cfg.auth || null;
      _state.storage = cfg.storage;
      // also copy helpers if present
      _state.collection = cfg.collection;
      _state.getDocs = cfg.getDocs;
  _state.getDoc = cfg.getDoc || null;
      _state.addDoc = cfg.addDoc;
      _state.updateDoc = cfg.updateDoc;
      _state.deleteDoc = cfg.deleteDoc;
      _state.doc = cfg.doc;
      _state.setDoc = cfg.setDoc;
      _state.onSnapshot = cfg.onSnapshot;
      _state.query = cfg.query;
  _state.orderBy = cfg.orderBy;
  _state.serverTimestamp = cfg.serverTimestamp || null;
      _state.ref = cfg.ref;
  _state.uploadBytes = cfg.uploadBytes;
  _state.getDownloadURL = cfg.getDownloadURL;
  _state.signInWithEmailAndPassword = cfg.signInWithEmailAndPassword || null;
  _state.signInAnonymously = cfg.signInAnonymously || null;
  _state.signOut = cfg.signOut || null;
      _state.onAuthStateChanged = cfg.onAuthStateChanged || null;
    } else {
      console.warn('[firebase-adapter] Firebase config loaded but db not available');
    }
  } catch (err) {
    console.warn('[firebase-adapter] Firebase not available or not configured:', err && err.message ? err.message : err);
    _state.useFirestore = false;
    // Provide more specific error for mobile devices
    if (typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      console.warn('[firebase-adapter] Mobile device detected - Firebase loading may be blocked by network restrictions');
    }
  }
  return _state;
}

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
        throw new Error('Permission denied: you must sign in as admin to add products.');
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
  console.log('[firebase-adapter] addOrder called with:', order);
  console.log('[firebase-adapter] User agent:', navigator.userAgent);
  console.log('[firebase-adapter] Is mobile device:', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Windows Phone|Opera Mini/i.test((navigator.userAgent || '').toLowerCase()));
  await init();
  console.log('[firebase-adapter] Firebase state after init:', {
    initialized: _state.initialized,
    useFirestore: _state.useFirestore,
    hasDb: !!_state.db,
    hasCollection: !!_state.collection,
    hasAddDoc: !!_state.addDoc,
    hasSetDoc: !!_state.setDoc,
    hasDoc: !!_state.doc
  });

  const payload = { ...order };
  if (!payload.orderId) {
    payload.orderId = `ORD-${Date.now()}`;
  }
  if (!payload.date) {
    const nowIso = new Date().toISOString();
    payload.date = nowIso;
    if (!payload.createdAt) payload.createdAt = nowIso;
    if (!payload.updatedAt) payload.updatedAt = nowIso;
  }
  if (!payload.createdAt) payload.createdAt = payload.date;
  if (!payload.updatedAt) payload.updatedAt = payload.createdAt;
  if (!payload.status) payload.status = 'Pending';

  if(_state.useFirestore){
    try{
      console.log('[firebase-adapter] Attempting to save order to Firestore...');
      const collectionRef = _state.collection(_state.db,'orders');
      let docId = null;
      // Ensure items are well-formed for Firestore
      if (Array.isArray(payload.items)) {
        payload.items = payload.items.map((it, idx) => {
          const id = it?.id ?? it?._docId ?? String(it?.sku ?? it?.name ?? idx);
          const qty = Number(it?.quantity) || 1;
          const price = Number(it?.price) || 0;
          const lineTotal = Number.isFinite(it?.lineTotal) ? Number(it.lineTotal) : price * qty;
          return {
            id: String(id),
            name: it?.name || `item-${idx}`,
            price,
            quantity: qty,
            lineTotal,
            // keep any other fields, but drop undefineds later
            ...it
          };
        });
      }

      // Drop undefineds recursively (Firestore rejects undefined anywhere)
      let payloadTs = sanitizeForFirestore({ ...payload });
      if (_state.serverTimestamp) {
        payloadTs.createdAt = _state.serverTimestamp();
        payloadTs.updatedAt = _state.serverTimestamp();
      }
      if (_state.setDoc && _state.doc && payload.orderId) {
        const docRef = _state.doc(_state.db, 'orders', String(payload.orderId));
        await _state.setDoc(docRef, payloadTs, { merge: true });
        docId = docRef.id;
      } else {
        const ref = await _state.addDoc(collectionRef, payloadTs);
        docId = ref.id;
      }
      console.log('[firebase-adapter] Order saved successfully with ID:', docId);
      const savedOrder = { ...payload, _docId: docId, id: docId };
      cacheOrderLocally(savedOrder);
      return docId;
    }catch(err){
      console.error('[firebase-adapter] Failed to add order to Firestore:', err);
      console.error('[firebase-adapter] Error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });

      // Decide if we should fall back to local storage
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Windows Phone|Opera Mini/i.test((navigator.userAgent || '').toLowerCase());
      const offline = typeof navigator !== 'undefined' && navigator && navigator.onLine === false;
      const networkCodes = new Set(['unavailable','network-request-failed','deadline-exceeded']);
      const permissionCodes = new Set(['permission-denied']);
      const invalidArg = (err && typeof err.message === 'string' && err.message.toLowerCase().includes('unsupported field value: undefined'))
        || (err && err.code === 'invalid-argument');

      if (invalidArg) {
        // Surface a helpful message to fix undefined fields
        throw new Error('Invalid order data: Found undefined field(s). Please ensure all item fields (id, name, price, quantity) are defined.');
      }

      if ((isMobile && (offline || networkCodes.has(err?.code))) || (offline)) {
        console.warn('[firebase-adapter] Falling back to local storage (offline/network issue)');
        const savedOrder = { ...payload, _localOnly: true, _syncError: err?.message || String(err) };
        cacheOrderLocally(savedOrder);
        throw new Error('Order saved locally due to connectivity issue. Please check your internet connection.');
      }

      if (permissionCodes.has(err?.code)) {
        throw new Error('Permission denied saving order. Check your Firestore rules.');
      }

      // Default: bubble up original error message for transparency
      throw new Error(`Failed to save order to Firebase: ${err?.message || String(err)}`);
    }
  } else {
    console.error('[firebase-adapter] Firebase not available - cannot save order');
    console.error('[firebase-adapter] State:', _state);
    throw new Error('Firebase is not available. Please check your internet connection and try again.');
  }
}

async function resolveOrderDocId(orderId) {
  await init();
  if (!_state.useFirestore || !orderId) return null;
  if (!_state.collection || !_state.getDocs) return null;
  const snapshot = await _state.getDocs(_state.collection(_state.db, 'orders'));
  let resolved = null;
  snapshot.forEach(docSnap => {
    if (resolved) return;
    const data = docSnap.data();
    if (String(docSnap.id) === String(orderId)) {
      resolved = docSnap.id;
      return;
    }
    if (data && data.orderId && String(data.orderId) === String(orderId)) {
      resolved = docSnap.id;
    }
  });
  return resolved;
}

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
  }
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('proJetOrders');
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
          localStorage.setItem('proJetOrders', JSON.stringify(parsed));
        }
      }
    } catch (err) {
      console.warn('Order cache update skipped after patch:', err);
    }
  }
  return targetId;
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
      const raw = localStorage.getItem('proJetOrders');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(entry =>
          String(entry.orderId) !== initialId &&
          String(entry.orderId) !== targetId &&
          String(entry._docId) !== initialId &&
          String(entry._docId) !== targetId
        );
        localStorage.setItem('proJetOrders', JSON.stringify(filtered));
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
      localStorage.removeItem('proJetOrders');
    } catch (err) {
      console.warn('Order cache clear skipped:', err);
    }
  }
  return deletions.length;
}

// Auth helpers
async function signIn(email, password){ await init(); if(!_state.auth) throw new Error('Auth not configured'); return _state.signInWithEmailAndPassword(_state.auth, email, password); }
async function signOut(){ await init(); if(!_state.auth) throw new Error('Auth not configured'); return _state.signOut(_state.auth); }
function onAuthStateChanged(callback){ if(!_state.onAuthStateChanged) return ()=>{}; return _state.onAuthStateChanged(_state.auth, callback); }
async function getCurrentUser(){ await init(); return _state.auth ? _state.auth.currentUser : null; }

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
      if (err && err.code === 'permission-denied') {
        throw new Error('Permission denied: you must sign in as admin to update products.');
      }
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
      if (err && err.code === 'permission-denied') {
        throw new Error('Permission denied: you must sign in as admin to delete products.');
      }
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

const firebaseAdapter = {
  init,
  getProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
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
      const local = JSON.parse(localStorage.getItem('products') || '[]');
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
    try {
      const local = JSON.parse(localStorage.getItem('proJetOrders') || '[]');
      callback(Array.isArray(local) ? local : []);
    } catch (err) {
      console.warn('Local orders read failed', err);
      callback([]);
    }
    return ()=>{};
  },
  // auth
  signIn,
  signOut,
  onAuthStateChanged,
  getCurrentUser
};

// Export for both ES modules and global scope
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS
  module.exports = firebaseAdapter;
} else if (typeof define === 'function' && define.amd) {
  // AMD
  define([], function() { return firebaseAdapter; });
} else if (typeof window !== 'undefined') {
  // Browser global
  window.FirebaseAdapter = firebaseAdapter;
}

// ES module export
export default firebaseAdapter;