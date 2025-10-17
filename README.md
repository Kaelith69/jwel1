# VastraVeda Jewelleries - Firebase-First E-Commerce Platform

**Version 3.0 - Firebase Migration Complete** 🔥

This is a modern jewelry e-commerce platform built with vanilla JavaScript and Firebase Firestore as the primary database. All product and order data now lives in Firebase, with no localStorage fallback.

---

## 🚀 Quick Start

### **1. Start the Development Server**

```powershell
node server.js
```

Open: http://localhost:8000

---

### **2. Migrate Existing Data (First Time Only)**

If you have existing localStorage data, migrate it to Firebase:

**Visit:** http://localhost:8000/migrate-to-firebase.html

1. Click **"Check Firebase Connection"**
2. Click **"✨ Migrate Everything"**
3. Verify migration success in the log

---

### **3. Verify Setup**

**Health Check:** http://localhost:8000/health.html

Shows:
- ✅ Firebase connection status
- 📦 Product count in Firestore
- 📋 Order count in Firestore

---

## 📋 What's New in v3.0

### **Firebase-First Architecture**

| Data Type | Storage | Fallback |
|-----------|---------|----------|
| **Products** | Firebase Firestore | ❌ None (required) |
| **Orders** | Firebase Firestore | ❌ None (required) |
| **Settings** | Firebase Firestore | ✅ Default number |
| **Cart** | localStorage | ✅ Works offline |

**Breaking Changes:**
- Site requires Firebase connection to load products
- Orders must be saved to Firebase (no offline queue)
- No default hardcoded products

---

## 🔥 Firebase Integration

### **Configuration**

Your Firebase config is already set in `js/firebase-config.js`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDSYKNGXQTY-Zr3NkgLVIfRd0md9eTaNVE",
  authDomain: "jwel369.firebaseapp.com",
  projectId: "jwel369",
  storageBucket: "jwel369.firebasestorage.app",
  messagingSenderId: "483619642721",
  appId: "1:483619642721:web:59d579d8410bd9d08ab920",
  measurementId: "G-SNECGK387P"
};
```

### **Collections Used**

- **`products`** - Product catalog (public read, admin write)
- **`orders`** - Customer orders (admin read, public create)
- **`admins`** - Admin user IDs (admin only)

### **Security Rules**

Updated `firestore.rules` to allow:
- ✅ Public product reads
- ✅ Public order creation (checkout flow)
- ✅ Admin-only product management
- ✅ Admin-only order viewing

**Deploy rules:**
```powershell
.\deploy-rules.ps1
# or manually:
firebase deploy --only firestore:rules
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `js/firebase-config.js` | Firebase SDK initialization |
| `js/firebase-adapter.js` | Firestore CRUD operations (Firebase-only, no localStorage fallback) |
| `main.js` | Product loading & checkout logic |
| `admin/admin.js` | Admin panel product/order management |
| `migrate-to-firebase.html` | One-click data migration tool |
| `health.html` | Firebase connection diagnostics |
| `firestore.rules` | Security rules for Firestore |

---

## 🛒 User Flow

### **Shopping Experience**

1. Visit http://localhost:8000/products.html
2. Browse products loaded from Firebase
3. Add items to cart (localStorage)
4. Go to checkout
5. Fill customer details
6. Submit order → saves to Firebase → redirects to WhatsApp

### **Admin Experience**

1. Visit http://localhost:8000/admin/
2. Login (Firebase Auth or demo password: `admin123`)
3. Add/Edit/Delete products → saves to Firebase
4. View orders from Firebase
5. Configure WhatsApp number in Settings

---

## 🧪 Testing

### **Automated Tests**

```powershell
node test-smoke.js
```

Tests:
- All page routes (15 endpoints)
- Image assets
- JavaScript files

### **Manual Testing**

1. ✅ Load products from Firebase
2. ✅ Add to cart
3. ✅ Checkout & save order to Firebase
4. ✅ Admin login
5. ✅ Add product via admin
6. ✅ View orders in admin panel

---

## 🚢 Deployment

### **Option 1: Firebase Hosting (Recommended)**

```powershell
# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only rules
firebase deploy --only firestore:rules
```

### **Option 2: Netlify / Vercel**

1. Push to GitHub
2. Connect repository to hosting platform
3. Deploy (no build step needed - static site)

### **Option 3: Traditional Hosting**

Upload all files to your web server. Ensure:
- Firebase config is correct
- Firestore rules are deployed
- HTTPS is enabled

---

## 🐛 Troubleshooting

### **"Firebase is not initialized"**

**Fix:**
1. Check `js/firebase-config.js` has valid config
2. Visit http://localhost:8000/health.html
3. Check browser console for errors

### **"No products found in Firebase"**

**Fix:**
1. Visit http://localhost:8000/migrate-to-firebase.html
2. Migrate existing data, or
3. Add products manually via admin panel

### **"Failed to save order"**

**Fix:**
1. Deploy updated Firestore rules:
   ```powershell
   firebase deploy --only firestore:rules
   ```
2. Check Firebase Console for rule errors

---

## 📚 Documentation

- **[FIREBASE_MIGRATION_GUIDE.md](./FIREBASE_MIGRATION_GUIDE.md)** - Complete migration guide
- **[RUN_INSTRUCTIONS.md](./RUN_INSTRUCTIONS.md)** - Development setup
- **[ISSUES_FOUND.md](./ISSUES_FOUND.md)** - Known issues & fixes

### 💠 Neuromorphic Buttons

- A lightweight neuromorphic layer was added in `neumorphic.css` and linked across all pages (public + admin).
- Applies soft depth to common buttons: `.cta-button`, `.admin-button`, `.checkout-button`, `.cart-button`, `.close-btn`, `.nav-toggle`, quantity/remove buttons and generic `.button`.
- Accessibility: retains clear focus ring; hover and active states preserve depth cues.
- Opt out on any element by adding class `no-neu`.


---

## 🎯 Future Enhancements

- [ ] Real-time product updates with `onSnapshot()`
- [ ] User authentication for order tracking
- [ ] Image upload to Firebase Storage
- [ ] Server-side order notifications (Cloud Functions)
- [ ] Cart persistence in Firebase (cross-device sync)
- [ ] Product search with Algolia
- [ ] Analytics integration
- [ ] Offline support with Firestore caching

---

## 📞 Support

- **Project ID:** `jwel369`
- **Firebase Console:** https://console.firebase.google.com/project/jwel369
- **Health Check:** http://localhost:8000/health.html
- **Migration Tool:** http://localhost:8000/migrate-to-firebase.html

---

**Last Updated:** October 15, 2025  
**Version:** 3.0 (Firebase-First Architecture)

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

Quick bootstrap from this repo:
```powershell
# once per machine
npm install firebase-admin

# download your Firebase service account JSON to service-account.json at repo root

# grant admin claim, add admins/<uid> doc
node scripts/grant-admin-claim.mjs <UID> --add-doc

# revoke later if needed
node scripts/grant-admin-claim.mjs <UID> --revoke --remove-doc
```
The script also accepts `--key path/to/key.json` if you store the credential elsewhere.

### Validation Summary
Products: name (2–120 chars), description (5–5000), category (1–60), imageUrl (<=2000), price (0–100,000,000).
Orders: orderId, customer (name/mobile required), items list (>0, ≤500), total numeric range, ISO-ish date string length guard.

Adjust limits based on business needs (e.g., tighten public reads, allow anonymous order writes if you later move order submission directly to Firestore with server-side verification).

## License
Add a license file if you plan to open source.
