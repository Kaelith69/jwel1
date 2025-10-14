// firebase-config.js
// This module lazily initializes Firebase SDK only when a valid config is provided.
// Purpose: avoid top-level errors when the developer hasn't pasted a Firebase config.

// Provide a place for the developer to add their config. If you paste your real
// config object here (with apiKey, authDomain, projectId, etc.), the module will
// initialize Firebase and export app/auth/db/storage and helper functions.
const firebaseConfig = {
	apiKey: "AIzaSyDSYKNGXQTY-Zr3NkgLVIfRd0md9eTaNVE",
	authDomain: "jwel369.firebaseapp.com",
	projectId: "jwel369",
		// Storage bucket should be the bucket name, not a URL domain
		// If your console shows a different bucket, update this value.
		storageBucket: "jwel369.appspot.com",
	messagingSenderId: "483619642721",
	appId: "1:483619642721:web:59d579d8410bd9d08ab920",
	measurementId: "G-SNECGK387P"
};

// Helper to check if firebaseConfig looks populated
function hasValidConfig(cfg){
	if(!cfg || typeof cfg !== 'object') return false;
	// most configs include apiKey and projectId
	return !!(cfg.apiKey && cfg.projectId);
}

// Default exports when Firebase is not configured
let app = null;
let auth = null;
let db = null;
let storage = null;
let collection = null;
let getDocs = null;
let addDoc = null;
let updateDoc = null;
let deleteDoc = null;
let doc = null;
let ref = null;
let uploadBytes = null;
let getDownloadURL = null;
// Realtime/query helpers must be declared before use to avoid TDZ errors
let onSnapshot = undefined;
let query = undefined;
let orderBy = undefined;

async function initFirebaseIfNeeded(){
	if(!hasValidConfig(firebaseConfig)) return { app:null, auth:null, db:null, storage:null };
	// Import SDKs dynamically to avoid network calls when not configured
	async function tryImport(version){
		const [appMod, authMod, fsMod, storageMod] = await Promise.all([
			import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
			import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
			import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`),
			import(`https://www.gstatic.com/firebasejs/${version}/firebase-storage.js`)
		]);
		return { initializeApp: appMod.initializeApp, authMod, fsMod, storageMod };
	}
	let mods;
	try {
		mods = await tryImport('11.0.1');
	} catch (e) {
		// fallback to a stable 10.x if 11.x not available
		mods = await tryImport('10.12.5');
	}
	const { initializeApp, authMod, fsMod, storageMod } = mods;
	app = initializeApp(firebaseConfig);
	auth = authMod.getAuth(app);
	db = fsMod.getFirestore(app);
	storage = storageMod.getStorage(app);
	// export commonly used helpers
		collection = fsMod.collection;
		getDocs = fsMod.getDocs;
	addDoc = fsMod.addDoc;
	updateDoc = fsMod.updateDoc;
	deleteDoc = fsMod.deleteDoc;
	doc = fsMod.doc;
		// real-time helpers
			if (fsMod.onSnapshot) {
			// Firestore v9 modular exposes onSnapshot, query, orderBy
			// Some CDNs may tree-shake; guard if missing
			// @ts-ignore
				onSnapshot = fsMod.onSnapshot;
		}
		if (fsMod.query) { query = fsMod.query; }
		if (fsMod.orderBy) { orderBy = fsMod.orderBy; }
	ref = storageMod.ref;
	uploadBytes = storageMod.uploadBytes;
	getDownloadURL = storageMod.getDownloadURL;
	return { app, auth, db, storage, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, ref, uploadBytes, getDownloadURL };
}

// Kick off initialization in the background if config looks valid, but do not throw
// on missing config. Consumers can import and call initFirebaseIfNeeded() to ensure
// the SDKs are loaded.
const _initPromise = hasValidConfig(firebaseConfig) ? initFirebaseIfNeeded() : Promise.resolve({ app:null, auth:null, db:null, storage:null });

// Export current references (may be null) and the init helper.
// Also export optional real-time/query helpers if present
export { app, auth, db, storage, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, ref, uploadBytes, getDownloadURL, initFirebaseIfNeeded, onSnapshot, query, orderBy };
