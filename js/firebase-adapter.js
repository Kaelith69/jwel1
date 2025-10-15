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
  signInWithEmailAndPassword: null,
  signOut: null,
  onAuthStateChanged: null
};

async function init() {
  if (_state.initialized) return _state;
  _state.initialized = true;
  try {
    // dynamic import so the file doesn't throw when firebase-config is not set up
    let cfg = await import('./firebase-config.js');
    // If firebase-config provides an init helper, call it so SDKs load and exported
    // references (db/auth/storage) become available.
    if (cfg && typeof cfg.initFirebaseIfNeeded === 'function') {
      try {
        await cfg.initFirebaseIfNeeded();
      } catch (e) {
        console.warn('firebase-config init failed', e && e.message ? e.message : e);
      }
    }
    // If firebase-config.js exported db/storage then use Firestore/Storage
    if (cfg && cfg.db) {
      _state.useFirestore = true;
      _state.db = cfg.db;
      _state.auth = cfg.auth || null;
      _state.storage = cfg.storage;
      // also copy helpers if present
      _state.collection = cfg.collection;
      _state.getDocs = cfg.getDocs;
      _state.addDoc = cfg.addDoc;
      _state.updateDoc = cfg.updateDoc;
      _state.deleteDoc = cfg.deleteDoc;
      _state.doc = cfg.doc;
      _state.setDoc = cfg.setDoc;
      _state.onSnapshot = cfg.onSnapshot;
      _state.query = cfg.query;
      _state.orderBy = cfg.orderBy;
      _state.ref = cfg.ref;
      _state.uploadBytes = cfg.uploadBytes;
      _state.getDownloadURL = cfg.getDownloadURL;
      _state.signInWithEmailAndPassword = cfg.signInWithEmailAndPassword || null;
      _state.signOut = cfg.signOut || null;
      _state.onAuthStateChanged = cfg.onAuthStateChanged || null;
    }
  } catch (err) {
    console.warn('Firebase not available or not configured:', err && err.message ? err.message : err);
    _state.useFirestore = false;
  }
  return _state;
}

async function getProducts() {
  await init();
  if (_state.useFirestore) {
    try {
      const qsnap = await _state.getDocs(_state.collection(_state.db, 'products'));
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

async function addProduct(product) {
  await init();
  if (_state.useFirestore) {
    try {
      const colRef = _state.collection(_state.db, 'products');
      const payload = { ...product };
      if (!payload.id) {
        payload.id = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
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
      console.error('Error details:', err.code, err.message);
      console.error('Product data:', product);
      throw new Error(`Failed to add product: ${err.message}`);
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
  if(_state.useFirestore){
    try{ 
      const ref = await _state.addDoc(_state.collection(_state.db,'orders'), order);
      console.log('[Firebase] Order added with ID:', ref.id);
      return ref.id;
    }catch(err){ 
      console.error('Failed to add order to Firestore', err);
      throw new Error('Firebase is required. Order could not be saved.');
    }
  } else {
    throw new Error('Firebase is not initialized. Cannot save order.');
  }
}

// Auth helpers
async function signIn(email, password){ await init(); if(!_state.auth) throw new Error('Auth not configured'); return _state.signInWithEmailAndPassword(_state.auth, email, password); }
async function signOut(){ await init(); if(!_state.auth) throw new Error('Auth not configured'); return _state.signOut(_state.auth); }
function onAuthStateChanged(callback){ if(!_state.onAuthStateChanged) return ()=>{}; return _state.onAuthStateChanged(_state.auth, callback); }

async function updateProduct(docIdOrLocalId, product) {
  await init();
  if (_state.useFirestore) {
    try {
      const dref = _state.doc(_state.db, 'products', docIdOrLocalId);
      await _state.updateDoc(dref, product);
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
        return { whatsappNumber: '919876543210' };
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
      return { whatsappNumber: '919876543210' };
    }
  } else {
    console.warn('Firebase is not initialized. Returning default settings.');
    return { whatsappNumber: '919876543210' };
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

export default {
  init,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
  // orders
  getOrders,
  addOrder,
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
  onAuthStateChanged
};
