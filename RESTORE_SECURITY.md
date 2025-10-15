# ⚠️ SECURITY NOTICE - TEMPORARY RULES ACTIVE

## 🔓 Current Status: MIGRATION MODE

**Firestore rules have been temporarily relaxed to allow product migration.**

### **What Changed:**

**Products Collection:**
```javascript
// BEFORE (Secure):
allow create: if isAdmin() && validateNewProduct();

// CURRENT (Migration Mode):
allow create: if validateNewProduct(); // ⚠️ No auth required
```

**Why:** To allow the migration tool to add products without admin authentication.

---

## 🔒 RESTORE SECURITY AFTER MIGRATION

### **Step 1: Complete Migration**

Visit: http://localhost:8000/migrate-to-firebase.html
- Migrate all products
- Verify products appear in Firebase Console

### **Step 2: Restore Secure Rules**

Edit `firestore.rules` line 17:

**Change FROM:**
```javascript
allow create: if validateNewProduct();
```

**Change TO:**
```javascript
allow create: if isAdmin() && validateNewProduct();
```

### **Step 3: Deploy Secure Rules**

```powershell
firebase deploy --only firestore:rules
```

---

## ⏰ When to Restore

**Restore secure rules IMMEDIATELY after:**
- ✅ All products migrated successfully
- ✅ Products visible on website
- ✅ Admin panel working

**DO NOT leave migration rules active in production!**

---

## 🎯 Quick Restore Script

Run this after migration is complete:

```powershell
# 1. Edit firestore.rules (restore isAdmin() check)
# 2. Deploy:
firebase deploy --only firestore:rules
```

---

## ✅ Verification

After restoring rules, test:

1. **As unauthenticated user:**
   - Try to add product via browser console
   - Should get "Permission denied" ✅

2. **As admin:**
   - Login to admin panel
   - Add product via admin/add-product.html
   - Should work ✅

---

## 📋 Current Rules Status

| Collection | Read | Create | Update | Delete |
|------------|------|--------|--------|--------|
| **products** | Public | ⚠️ **PUBLIC** | Admin only | Admin only |
| **orders** | Admin | Public | Admin | Admin |
| **settings** | Public | Admin | Admin | Admin |

**⚠️ products.create is currently PUBLIC for migration!**

---

**REMEMBER: Restore admin-only rules after migration!**

---

**Last Updated:** October 15, 2025  
**Status:** 🟡 MIGRATION MODE ACTIVE
