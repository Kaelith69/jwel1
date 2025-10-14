# VastraVeda Jewelleries (Admin + Store)

This project is a static front-end (HTML/CSS/JS) with an optional Firebase backend for authentication, product & order storage, and image uploads. When Firebase is not configured, the app automatically falls back to `localStorage` for a fully functional demo mode.

## Firebase Integration

1. Open `js/firebase-config.js` and paste your Firebase configuration object inside the `firebaseConfig` constant (ensure it includes at least `apiKey` and `projectId`).
2. The file now lazily initializes Firebase only if a valid config is present. No errors will occur if the config is left empty.
3. The adapter (`js/firebase-adapter.js`) calls the init helper and will enable Firestore + Storage + Auth automatically once configured.
4. Auth (email/password) is optional. Without Firebase configured, admin login uses the demo password: `admin123`.

### Collections Used
- `products` – Each product document: `{ name, price, description, category, imageUrl }` plus an auto ID.
- `orders` – Order documents matching the structure saved in localStorage (`proJetOrders`).

### Image Uploads
If Storage is configured and the selected image is a data URL or file, uploads are performed and a download URL is stored. Otherwise the original `data:` URL or asset path is kept.

## Migration Utility
From the admin Products page you can click "Migrate to Firestore" to push existing local products (and optionally orders) into Firestore. Each migrated product's Firestore ID is stored as `_docId` alongside the local copy to keep UI actions (edit/delete) in sync.

## Admin Auth Flow
- With Firebase Auth configured: email/password sign-in (form on `admin/index.html`).
- Without Firebase: falls back to password check (`admin123`). Session stored via `localStorage` key `vastravedajewlleries-admin-auth`.

## Local Development
A simple static server can be used (already tested with `http-server`).

```powershell
npx http-server -p 8000
```
Visit: `http://127.0.0.1:8000/` (store) and `http://127.0.0.1:8000/admin/` (admin login).

## Key Files
- `js/firebase-config.js` – Lazy Firebase config & init helper.
- `js/firebase-adapter.js` – Unified CRUD + auth + image upload abstraction with graceful fallback.
- `admin/admin.js` – Comprehensive admin dashboard logic (products, orders, settings, migration, image cropping UI).

## Adding Your Firebase Config
Example (replace with your values):
```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```
After saving, reload an admin page; the adapter will detect Firestore.

## Future Enhancements (Suggested)
- Firestore security rules: restrict `products` & `orders` writes to authenticated admins.
- Add server-side export or Cloud Functions for order notifications.
- Implement pagination & indexing for large product collections.
- Replace demo password fallback with an environment guard (disable in production).
- Add unit tests for adapter logic using a mock localStorage and mock Firebase.

## Security Rules Setup

The repo now includes baseline Firebase security rules:

Files:
- `firestore.rules` – Public read for `products`, admin-only read/write for `orders`, admin-only write for `products`, with field validation. Admin status determined either by a custom auth claim `admin == true` or presence of a document at `admins/{uid}`.
- `storage.rules` – Public read for `images/` objects, admin-only writes (<=2MB, image/* MIME).
- `firebase.json` – References both rulesets and provides a simple hosting config pointing to the project root.

Deploy (after installing Firebase CLI and running `firebase init` to select your project):
```powershell
firebase deploy --only firestore:rules,storage:rules
```

### Marking Admin Users
Two supported methods (you can use either or both):
1. Custom Claims: In a trusted server environment or using the Firebase Admin SDK:
  ```js
  admin.auth().setCustomUserClaims(uid, { admin: true });
  ```
  User must re-authenticate / refresh ID token to see updated claim.
2. Admins Collection: Create document `/admins/{uid}` (can be empty map). Only users with the custom claim `admin: true` can modify this collection (bootstrap your first admin via custom claim, then manage others by writing docs).

### Validation Summary
Products: name (2–120 chars), description (5–5000), category (1–60), imageUrl (<=2000), price (0–100,000,000).
Orders: orderId, customer (name/mobile required), items list (>0, ≤500), total numeric range, ISO-ish date string length guard.

Adjust limits based on business needs (e.g., tighten public reads, allow anonymous order writes if you later move order submission directly to Firestore with server-side verification).

## License
Add a license file if you plan to open source.
