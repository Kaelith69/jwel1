# 🚀 QUICK START - Firebase Migration

## ⚡ Get Running in 3 Steps

### **Step 1: Start Server**
```powershell
node server.js
```

### **Step 2: Migrate Data**
Open: http://localhost:8000/migrate-to-firebase.html

1. Click **"1️⃣ Check Firebase Connection"**
2. Click **"✨ Migrate Everything"**

### **Step 3: Verify**
Open: http://localhost:8000/products.html

---

## 📋 What Just Changed?

### ✅ **Everything is now in Firebase**

| Before | After |
|--------|-------|
| Products in localStorage | Products in Firebase Firestore |
| Orders in localStorage | Orders in Firebase Firestore |
| Works offline | Requires Firebase connection |

---

## 🔧 Deploy Firestore Rules

**Required before checkout will work:**

```powershell
.\deploy-rules.ps1
```

Or manually:
```powershell
firebase deploy --only firestore:rules
```

---

## 📚 Full Documentation

- **[MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)** - What changed & why
- **[FIREBASE_MIGRATION_GUIDE.md](./FIREBASE_MIGRATION_GUIDE.md)** - Complete guide
- **[README.md](./README.md)** - Project overview

---

## ⚠️ Important Notes

1. **First time?** Use migration tool to upload products
2. **No products?** Add manually via admin panel
3. **Checkout failing?** Deploy Firestore rules
4. **Need help?** Visit http://localhost:8000/health.html

---

## 🎯 Test Checklist

- [ ] Products load from Firebase
- [ ] Add product to cart
- [ ] Place order (saves to Firebase)
- [ ] Admin login works
- [ ] Add product via admin
- [ ] View orders in admin panel

---

**Ready?** Run `node server.js` and visit http://localhost:8000/migrate-to-firebase.html
