# VastraVeda Jewelleries - Development Guide

## 🚀 Quick Start

### Running Locally (Windows PowerShell)

**Option 1: Node.js (Recommended)**
```powershell
node server.js
```
Then open: http://localhost:8000

**Option 2: Python (if Node unavailable)**
```powershell
py -m http.server 8000
```

**Option 3: Live Server Extension (VS Code)**
1. Install "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"

---

## 🧪 Testing

### Smoke Test (verify all routes work)
```powershell
node test-smoke.js
```

Expected output: `15 passed, 0 failed`

### Manual Testing Checklist

**Cart Flow:**
1. Open http://localhost:8000/products.html
2. Click "Add to Cart" on a product
3. Navigate to http://localhost:8000/checkout.html
4. Verify product appears in cart
5. Fill out checkout form
6. Click "Place Order on WhatsApp"

**Admin Flow:**
1. Open http://localhost:8000/admin/index.html
2. Login (Firebase auth or bypass via localStorage)
3. Navigate to Products
4. Add a new product
5. Verify it appears in product list

---

## 📁 Project Structure

```
jwel1-fresh/
├── index.html              # Home page
├── products.html           # Product catalog
├── checkout.html           # Checkout form
├── contact.html            # Contact page
├── health.html             # Firebase health check
├── main.js                 # Main app logic
├── server.js               # Dev server
├── test-smoke.js           # Automated tests
│
├── js/
│   ├── utils.js            # notify(), confirmAction()
│   ├── ui.js               # UI helpers
│   ├── cart.js             # Cart manager (unused in current setup)
│   ├── firebase-adapter.js # Firebase/localStorage adapter
│   ├── firebase-config.js  # Firebase SDK init
│   └── firebase-init.js    # (legacy, not used)
│
├── admin/
│   ├── index.html          # Login
│   ├── dashboard.html      # Overview
│   ├── products.html       # Product management
│   ├── add-product.html    # Add/edit product
│   ├── orders.html         # Order management
│   ├── settings.html       # WhatsApp config
│   ├── admin.js            # Admin logic
│   └── admin.css           # Admin styles
│
├── assets/                 # Product images (13 files)
├── logo/                   # Logo files
└── styles.css              # Main stylesheet
```

---

## 🔑 localStorage Keys

The app uses these localStorage keys:

- `cart` - Shopping cart items (array)
- `products` - Product catalog (array)
- `proJetOrders` - Order history (array)
- `productsDataVersion` - Cache version (string)
- `vastravedajewlleries-admin-auth` - Admin auth flag (boolean)
- `adminSettings` - WhatsApp number config (object)

---

## 🔧 Configuration

### Firebase (Optional)

1. Open `js/firebase-config.js`
2. Your Firebase config is already present
3. If you need to update it, replace the `firebaseConfig` object

**Health Check:**
- Visit http://localhost:8000/health.html to verify Firebase setup

### WhatsApp Number

1. Navigate to http://localhost:8000/admin/settings.html
2. Enter your WhatsApp number (10-15 digits, no +)
3. This number is used for order redirects

---

## 🐛 Known Issues & Fixes

See `ISSUES_FOUND.md` for comprehensive list.

**Recently Fixed:**
- ✅ Cart localStorage key mismatch (products.html vs main.js)
- ✅ Missing utils.js on add-product.html
- ✅ Image property name inconsistency (image vs imageUrl)

**Still TODO:**
- Make all logo paths absolute (`/logo/logo.png`)
- Add contact.html to navigation
- Add image fallback handlers

---

## 📦 Dependencies

**External CDN:**
- Font Awesome 6.5.1
- Google Fonts (Playfair Display, Poppins)
- Firebase SDK 11.0.1 (lazy-loaded)

**Runtime:**
- Node.js v22+ (for dev server)
- Modern browser (Chrome, Firefox, Edge, Safari)

**No npm install required** - pure static site with CDN dependencies

---

## 🔒 Security Notes

- Firebase config is public (expected for web apps)
- Review `firestore.rules` for production security
- No sensitive data in localStorage (all client-side)
- WhatsApp redirect safe (no backend processing)

---

## 🎨 Customization

### Change Theme Colors

Edit CSS variables in `styles.css`:
```css
:root {
  --primary-gold: #3B82F6;
  --dark-gold: #1E40AF;
  --text-dark: #2c3e50;
}
```

### Add Products

**Via UI:**
1. Go to http://localhost:8000/admin/add-product.html
2. Fill form and submit

**Via Code:**
Edit `main.js` `defaultProducts` array (lines 16-28)

---

## 📊 Browser Compatibility

**Tested:**
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+

**Features:**
- ES6 modules (type="module")
- localStorage
- CSS Grid & Flexbox
- Async/await

---

## 🚢 Deployment

**Static Hosting Options:**
1. **Firebase Hosting** (recommended)
   ```powershell
   firebase deploy
   ```

2. **Netlify**
   - Drag & drop the folder
   - Or connect GitHub repo

3. **Vercel**
   - Import from GitHub
   - Auto-deploys on push

4. **GitHub Pages**
   - Push to `gh-pages` branch
   - Enable in repo settings

**Build Process:**
None required - it's a static site!

---

## 💡 Tips

1. **Clear localStorage** to reset all data:
   ```javascript
   localStorage.clear()
   ```

2. **Enable Firebase** by verifying config in `firebase-config.js`

3. **Add products in bulk** via browser console:
   ```javascript
   const products = [...]; // your array
   localStorage.setItem('products', JSON.stringify(products));
   location.reload();
   ```

4. **Debug cart issues**:
   ```javascript
   console.log(JSON.parse(localStorage.getItem('cart')))
   ```

---

## 📞 Support

- **Issues**: Check `ISSUES_FOUND.md`
- **Health**: Visit http://localhost:8000/health.html
- **Test**: Run `node test-smoke.js`

---

**Last Updated**: October 15, 2025  
**Version**: 2.0 (clean branch)
