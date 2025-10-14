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
  ref: null,
  uploadBytes: null,
  getDownloadURL: null
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
        // re-import to pick up any exports that were populated during init
        cfg = await import('./firebase-config.js');
      } catch (e) {
        // ignore init errors and continue with fallback behavior
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
  _state.onSnapshot = cfg.onSnapshot;
  _state.query = cfg.query;
  _state.orderBy = cfg.orderBy;
      _state.ref = cfg.ref;
      _state.uploadBytes = cfg.uploadBytes;
      _state.getDownloadURL = cfg.getDownloadURL;
      // try to import auth helpers if present in cfg
      if(cfg.auth){
        try{ const authMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');
              _state.signInWithEmailAndPassword = authMod.signInWithEmailAndPassword;
              _state.signOut = authMod.signOut;
              _state.onAuthStateChanged = authMod.onAuthStateChanged;
        }catch(e){ /* ignore */ }
      }
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
        out.push({ ...data, _docId: d.id });
      });
      return out;
    } catch (err) {
      console.warn('Failed to read products from Firestore:', err);
      // fallthrough to localStorage
    }
  }
  // fallback: localStorage key 'products'
  try {
    const raw = localStorage.getItem('products') || '[]';
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

async function addProduct(product) {
  await init();
  if (_state.useFirestore) {
    try {
      const ref = await _state.addDoc(_state.collection(_state.db, 'products'), product);
      return ref.id;
    } catch (err) {
      console.warn('Failed to add product to Firestore:', err);
    }
  }
  // fallback to localStorage
  const cur = JSON.parse(localStorage.getItem('products') || '[]');
  const id = Date.now();
  const item = { ...product, id };
  cur.push(item);
  localStorage.setItem('products', JSON.stringify(cur));
  return id;
}

// Orders API
async function getOrders(){
  await init();
  if(_state.useFirestore){
    try{
      const qsnap = await _state.getDocs(_state.collection(_state.db, 'orders'));
      const out=[];
      qsnap.forEach(d=>{ out.push({ ...d.data(), _docId: d.id }); });
      return out;
    }catch(err){ console.warn('Failed to read orders from Firestore', err); }
  }
  try{ return JSON.parse(localStorage.getItem('proJetOrders')||'[]'); }catch(e){ return []; }
}

async function addOrder(order){
  await init();
  if(_state.useFirestore){
    try{ const ref = await _state.addDoc(_state.collection(_state.db,'orders'), order); return ref.id; }catch(err){ console.warn('Failed to add order to Firestore', err); }
  }
  const cur = JSON.parse(localStorage.getItem('proJetOrders')||'[]'); cur.push(order); localStorage.setItem('proJetOrders', JSON.stringify(cur)); return null;
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
      return true;
    } catch (err) {
      console.warn('Failed to update product in Firestore:', err);
    }
  }
  // fallback: localStorage - match numeric id or _docId if present in items
  try {
    const cur = JSON.parse(localStorage.getItem('products') || '[]');
    const idx = cur.findIndex(p => String(p.id) === String(docIdOrLocalId) || String(p._docId) === String(docIdOrLocalId));
    if (idx > -1) {
      cur[idx] = { ...cur[idx], ...product };
      localStorage.setItem('products', JSON.stringify(cur));
      return true;
    }
  } catch (err) {
    console.warn('Failed to update local product', err);
  }
  return false;
}

async function deleteProduct(docIdOrLocalId) {
  await init();
  if (_state.useFirestore) {
    try {
      await _state.deleteDoc(_state.doc(_state.db, 'products', docIdOrLocalId));
      return true;
    } catch (err) {
      console.warn('Failed to delete product from Firestore:', err);
    }
  }
  try {
    let cur = JSON.parse(localStorage.getItem('products') || '[]');
    cur = cur.filter(p => !(String(p.id) === String(docIdOrLocalId) || String(p._docId) === String(docIdOrLocalId)));
    localStorage.setItem('products', JSON.stringify(cur));
    return true;
  } catch (err) {
    console.warn('Failed to delete local product', err);
    return false;
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
    // fallback: poll localStorage immediately
    callback(await getProducts());
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
    callback(await getOrders());
    return ()=>{};
  },
  // auth
  signIn,
  signOut,
  onAuthStateChanged
};
