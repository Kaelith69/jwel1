// Utility script to grant or revoke the Firebase custom claim `admin` and optionally seed the admins collection.
// Usage:
//   node scripts/grant-admin-claim.mjs <uid> [--key path/to/service-account.json] [--revoke] [--add-doc] [--remove-doc]
// By default the script grants the claim; use --revoke to clear it. --add-doc writes /admins/<uid>.

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
	console.error('Usage: node scripts/grant-admin-claim.mjs <uid> [--key path] [--revoke] [--add-doc] [--remove-doc]');
	process.exit(1);
}

const uid = args[0];
if (!uid) {
	console.error('Missing UID argument.');
	process.exit(1);
}

const keyFlagIndex = args.indexOf('--key');
const defaultDir = resolve(dirname(fileURLToPath(new URL(import.meta.url))), '..');
const keyPath =
	(keyFlagIndex !== -1 && args[keyFlagIndex + 1])
		? resolve(args[keyFlagIndex + 1])
		: (process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS || resolve(defaultDir, 'service-account.json'));

let serviceAccount;
try {
	const raw = await readFile(keyPath, 'utf8');
	serviceAccount = JSON.parse(raw);
} catch (err) {
	console.error('Failed to load service account JSON from', keyPath);
	console.error(err.message || err);
	process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });

const revoke = args.includes('--revoke');
const addDoc = args.includes('--add-doc');
const removeDoc = args.includes('--remove-doc');

try {
	const auth = getAuth();
	await auth.setCustomUserClaims(uid, revoke ? {} : { admin: true });
	console.log(`${revoke ? 'Revoked' : 'Granted'} admin claim for UID ${uid}`);
} catch (err) {
	console.error('Failed updating custom claims:', err.message || err);
	process.exit(1);
}

if (addDoc || removeDoc) {
	try {
		const firestore = getFirestore();
		const docRef = firestore.doc(`admins/${uid}`);
		if (addDoc) {
			await docRef.set({
				createdAt: new Date().toISOString(),
				grantedBy: 'scripts/grant-admin-claim.mjs'
			}, { merge: true });
			console.log(`Upserted admins/${uid}`);
		}
		if (removeDoc) {
			await docRef.delete();
			console.log(`Deleted admins/${uid}`);
		}
	} catch (err) {
		console.error('Firestore admin operation failed:', err.message || err);
		process.exit(1);
	}
}
