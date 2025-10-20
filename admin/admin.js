// Clean reimplementation of admin logic (now an ES module)
import FirebaseAdapter from '../js/firebase-adapter.js';

let __useFirestore = false;
const __createLocalId=(()=>{let seq=0;return ()=>`local_${Date.now()}_${seq++}`;})();
// UI helpers: connection indicator + auth gating
function setConnState(connected){
    const el = document.getElementById('conn-indicator');
    if(!el) return;
    const isConn = !!connected;
    el.classList.toggle('state-connected', isConn);
    el.classList.toggle('state-offline', !isConn);
    const lbl = document.getElementById('conn-label');
    if(lbl) lbl.textContent = isConn ? 'Connected' : 'Offline';
}
function applyAuthGate(isAuthed){
    const enabled = !!isAuthed;
    document.querySelectorAll('.requires-auth').forEach(el=>{
        if(enabled){
            el.classList.remove('requires-auth-disabled');
            el.removeAttribute('aria-disabled');
            try{ if('disabled' in el) el.disabled = false; }catch(_){}
        } else {
            el.classList.add('requires-auth-disabled');
            el.setAttribute('aria-disabled','true');
            try{ if('disabled' in el) el.disabled = true; }catch(_){}
        }
    });
}
// Block clicks/activations on disabled auth-gated controls (capture phase)
document.addEventListener('click', (e)=>{
    const t = e.target.closest?.('.requires-auth');
    if(t && t.getAttribute('aria-disabled') === 'true'){
        e.preventDefault();
        e.stopPropagation();
        try{ if(typeof notify === 'function') notify('Sign in to enable this action','warn'); }catch(_){/* noop */}
    }
}, true);
const __dedupeProducts=list=>{
    if(!Array.isArray(list)) return [];
    const order=[];
    const map=new Map();
    list.forEach(item=>{
        if(!item||typeof item!=='object') return;
        const next={...item};
        if(next._docId&&!next.id) next.id=next._docId;
        let key='';
        if(next._docId) key=String(next._docId);
        else if(next.id) key=String(next.id);
        if(!key){
            key=__createLocalId();
            next.id=key;
        }
        if(map.has(key)){
            const existing=map.get(key);
            const merged={...existing,...next};
            if(existing._docId&&!merged._docId) merged._docId=existing._docId;
            if(next._docId) merged._docId=next._docId;
            if(merged._docId&&!merged.id) merged.id=merged._docId;
            if(!merged.id) merged.id=key;
            map.set(key,merged);
        } else {
            if(!next.id) next.id=key;
            map.set(key,next);
            order.push(key);
        }
    });
    return order.map(k=>map.get(k));
};
// initialize Firebase adapter (best-effort)
(async function initFirebase(){
    try{
        const st = await FirebaseAdapter.init();
        __useFirestore = !!st.useFirestore;
        // Update connection indicator once Firebase init resolves
        setConnState(__useFirestore);
        // If already signed in, immediately enable gated actions
        try{ const user = await FirebaseAdapter.getCurrentUser?.(); applyAuthGate(!!user); }catch(_){ /* ignore */ }
    }catch(err){ console.warn('Firebase init skipped', err); }
})();

const path=window.location.pathname;
    const isLogin=/\/admin\/(index\.html)?$/.test(path)||path.endsWith('/admin')||path.endsWith('/admin/');
    // Use Firebase auth to enforce sign-in
    (async function enforceAuth(){
        try{
            await FirebaseAdapter.init();
            if(FirebaseAdapter.onAuthStateChanged){
                FirebaseAdapter.onAuthStateChanged(user=>{
                    if(!user){
                        if(!isLogin && path.includes('/admin/')) window.location.href='index.html';
                        applyAuthGate(false);
                    } else {
                        // user signed in — allow
                        applyAuthGate(true);
                    }
                });
                return;
            }
        }catch(err){ /* ignore */ }
        // If Firebase auth is not available, redirect to login
        if(!isLogin && path.includes('/admin/')){
            window.location.href='index.html';
        }
    })();
    // Auth
    const loginForm=document.getElementById('login-form');
    if(loginForm){loginForm.addEventListener('submit',async e=>{e.preventDefault();
        const email=document.getElementById('email')?.value?.trim();
        const pw=document.getElementById('password')?.value;
        const em=document.getElementById('error-message');
        try{
            await FirebaseAdapter.init();
            if(FirebaseAdapter.signIn){ await FirebaseAdapter.signIn(email, pw); window.location.href='dashboard.html'; return; }
            if(em) em.textContent='Auth not configured.';
        }catch(err){ if(em) em.textContent='Login failed.'; }
    });}
    const logoutBtn=document.getElementById('logout-btn'); if(logoutBtn) logoutBtn.addEventListener('click',()=>{ window.location.href='index.html';});

    // Show signed-in user email and wire sign out when possible
    const userEmailDisplay = document.createElement('div'); userEmailDisplay.id='user-email-display'; userEmailDisplay.style.opacity='.85';
    const headerActions = document.querySelector('.admin-header-actions');
    if(headerActions){ headerActions.insertBefore(userEmailDisplay, headerActions.firstChild); }
    if(logoutBtn) logoutBtn.addEventListener('click', async ()=>{
        try{
            await FirebaseAdapter.init();
            if(FirebaseAdapter.signOut){ await FirebaseAdapter.signOut(); }
        }catch(err){ /* ignore */ }
        window.location.href='index.html';
    });
    // update current user email when auth changes
    try{ FirebaseAdapter.onAuthStateChanged?.((user)=>{
        if(user){
            userEmailDisplay.textContent = user.email || 'Admin';
            applyAuthGate(true);
        } else {
            userEmailDisplay.textContent='';
            applyAuthGate(false);
        }
        try{
            window.dispatchEvent(new CustomEvent('admin-auth-state', { detail:{ user }}));
        }catch(_){ /* ignore */ }
    }); }catch(e){ /* ignore */ }

    // Data
    let products = [];
    try {
        const st = await FirebaseAdapter.init();
        if (st.useFirestore) {
            const remote = await FirebaseAdapter.getProducts();
            products = __dedupeProducts(remote || []);
        } else {
            // No Firestore, use empty array
            products = [];
        }
    } catch (err) {
        console.warn('Initial product fetch failed', err);
        products = [];
    }
    const saveProducts=()=>{products=__dedupeProducts(products);};
    const BASE_CATEGORIES=['Necklace','Ring','Earrings','Bracelet','Bangles','Pendant','Brooch','Set','Studs'];
    const refreshCategoryOptions=()=>{
        const unique=new Set(BASE_CATEGORIES);
        products.forEach(p=>{ if(p.category) unique.add(p.category); });
        const cats=[...unique];
        // Filter select(s)
        const filterSel=document.getElementById('category-filter');
        if(filterSel){
            const current=filterSel.value;
            filterSel.innerHTML='<option value="">All Categories</option>'+cats.map(c=>`<option value="${c}">${c}</option>`).join('');
            if(cats.includes(current)) filterSel.value=current; else filterSel.value='';
        }
        // Form selects (could be multiple on different pages)
        document.querySelectorAll('select#category').forEach(sel=>{
            const current=sel.value;
            sel.innerHTML=cats.map(c=>`<option value="${c}">${c}</option>`).join('');
            if(current && cats.includes(current)) sel.value=current;
        });
    };

    // Elements
    const productSearch=document.getElementById('product-search');
    const categoryFilter=document.getElementById('category-filter');
    const productCountEl=document.getElementById('product-count');
    const liveStatus=document.getElementById('live-status');
    const productList=document.getElementById('product-list');
    const productsTableBody=document.getElementById('products-table-body');
    const clearFiltersBtn=document.getElementById('clear-filters');
    const productForm=document.getElementById('product-form');
    const formTitle=document.getElementById('form-title');
    const submitBtn=document.getElementById('submit-btn');
    const cancelBtn=document.getElementById('cancel-btn');
    const productFormWrapper=document.getElementById('product-form-wrapper');
    const toggleFormBtn=document.getElementById('toggle-form-btn');

    const filterProducts=()=>{const term=(productSearch?.value||'').toLowerCase(); const cat=categoryFilter?.value||''; return products.filter(p=>{const t=!term||p.name.toLowerCase().includes(term)||p.description.toLowerCase().includes(term); const c=!cat||p.category===cat; return t&&c;});};
    const renderCards=()=>{ if(!productList) return; const f=filterProducts(); if(productCountEl) productCountEl.textContent=`${f.length} / ${products.length} products`; if(liveStatus) liveStatus.textContent=`Showing ${f.length} of ${products.length} products`; if(!f.length){productList.innerHTML='<p style="opacity:.7;margin:0;">No products match your filters.</p>';return;} productList.innerHTML=f.map(p=>{const img=p.imageUrl?`<img src="${p.imageUrl}" alt="${p.name}" class="pl-img">`:'<div class="pl-img placeholder">🖼️</div>'; const editHref = `add-product.html?docId=${p._docId||p.id}`; const docAttr = p._docId? `data-docid="${p._docId}"` : ''; const statusLabel = (!p._docId && __useFirestore) ? `<span class="muted" style="font-size:.7rem;margin-left:6px;">Unsynced</span>` : ''; const syncBtn = (!p._docId && __useFirestore) ? `<button class="admin-button secondary sync-btn" data-id="${p.id}">Sync</button>` : '';
        return `<article class="product-card" data-id="${p.id}" ${docAttr}>${img}<div class="pc-main"><header class="pc-head"><h4>${p.name}</h4><span class="pc-price">₹${p.price.toLocaleString('en-IN')}</span></header><div class="pc-meta"><span>${p.category||''}</span>${statusLabel}</div><footer class="pc-actions"><a class="admin-button secondary" href="${editHref}">Edit</a>${syncBtn}<button class="admin-button danger delete-btn" data-id="${p.id}" ${docAttr}>Delete</button></footer></div></article>`;}).join(''); };
    const renderTable=()=>{ if(!productsTableBody) return; const f=filterProducts(); if(productCountEl) productCountEl.textContent=`${f.length} / ${products.length} products`; if(liveStatus) liveStatus.textContent=`Showing ${f.length} of ${products.length} products`; if(!f.length){productsTableBody.innerHTML='<tr><td colspan="7" style="opacity:.7;">No products match your filters.</td></tr>';return;} productsTableBody.innerHTML=f.map(p=>{const img=p.imageUrl?`<img src="${p.imageUrl}" alt="${p.name}">`:'<div style="width:60px;height:60px;display:flex;align-items:center;justify-content:center;background:#222;border-radius:8px;">🖼️</div>'; const editHref = `add-product.html?docId=${p._docId||p.id}`; const docAttr = p._docId? `data-docid="${p._docId}"` : ''; const syncBtn = (!p._docId && __useFirestore) ? `<button class="admin-button secondary sync-btn" data-id="${p.id}">Sync</button>` : ''; const categoryMeta = (!p._docId && __useFirestore) ? `${p.category||''} · Unsynced` : (p.category||'');
        return `<tr data-id="${p.id}" ${docAttr}><td class="nowrap">${p.id}</td><td>${img}</td><td><strong>${p.name}</strong><div class="muted" style="font-size:.7rem;margin-top:2px;">${categoryMeta}</div></td><td class="nowrap"><span class="badge">${p.category||''}</span></td><td class="nowrap">${p.price.toLocaleString('en-IN')}</td><td class="clamp">${p.description}</td><td class="actions-cell"><a class="admin-button secondary" href="${editHref}">Edit</a>${syncBtn}<button class="admin-button danger delete-btn" data-id="${p.id}" ${docAttr}>Delete</button></td></tr>`;}).join(''); };

    const resetForm=()=>{ if(!productForm) return; productForm.reset(); productForm.dataset.docid=''; const idEl=document.getElementById('product-id'); if(idEl) idEl.value=''; if(formTitle) formTitle.textContent='Add New Product'; if(submitBtn) submitBtn.textContent='Add Product'; if(cancelBtn) cancelBtn.style.display='none'; };
    const handleFormSubmit=async (e) =>{
        e.preventDefault();
        const id=document.getElementById('product-id').value;
        const docId=document.getElementById('product-form')?.dataset?.docid||'';
        const name=document.getElementById('name').value.trim();
        const price=parseInt(document.getElementById('price').value.trim(),10);
        const description=document.getElementById('description').value.trim();
        const category=document.getElementById('category').value;
        let imageUrl=(document.getElementById('imageUrl')?.value||'').trim();
        const asset=document.getElementById('imageAsset')?.value||'';
        if(!imageUrl && asset) imageUrl=asset;
        if(!name||name.length<2) { notify('Name must be at least 2 characters.', 'error'); return; }
        if(isNaN(price)||price<0) { notify('Invalid price', 'error'); return; }
        if(!description||description.length<5) { notify('Description too short', 'error'); return; }
        if(!category) { notify('Select category', 'error'); return; }
        const baseData={name,price,description,category,imageUrl};
        const nowIso=new Date().toISOString();
        let statusMsg='';
        let createdLocalId='';
        if(docId){
            const idx = products.findIndex(p=> String(p._docId)===String(docId) || String(p.id)===String(id));
            if(idx===-1){ notify('Product not found. Please refresh.', 'error'); return; }
            products[idx]={...products[idx],...baseData, updatedAt:nowIso};
            try{
                const st = await FirebaseAdapter.init();
                if(st.useFirestore){ await FirebaseAdapter.updateProduct(docId, { ...baseData }); }
            }catch(err){ console.warn('Firestore update failed', err); notify('Firestore update failed. Local copy updated.', 'warn'); }
            statusMsg=`Updated product ${name}`;
        } else if(id){
            const idx=products.findIndex(p=>String(p.id)===String(id));
            if(idx===-1){ notify('Product not found. Please refresh.', 'error'); return; }
            products[idx]={...products[idx],...baseData, updatedAt:nowIso};
            statusMsg=`Updated product ${name}`;
        } else {
            const localId=`local_${Date.now()}_${Math.floor(Math.random()*1000)}`;
            const newItem={...baseData, id:localId, createdAt:nowIso, updatedAt:nowIso};
            products.push(newItem);
            statusMsg=__useFirestore?`Syncing ${name} to Firestore...`:`${name} saved locally. Sync to Firestore when ready.`;
            createdLocalId=localId;
        }

        saveProducts();
        refreshCategoryOptions();
        renderCards();
        renderTable();
        if(liveStatus) liveStatus.textContent=statusMsg;

        if(!docId && !id && createdLocalId){
            // attempt automatic sync so storefront receives the product
            try{
                const st = await FirebaseAdapter.init();
                if(st.useFirestore){ await syncProductToFirestore(createdLocalId); }
            }catch(err){ /* sync function already notifies on failure */ }
        }

        if(window.location.pathname.endsWith('add-product.html')){
            setTimeout(()=>location.href='products.html',300);
            return;
        }

        resetForm();
        if(toggleFormBtn && productFormWrapper && !productFormWrapper.classList.contains('collapsed')){
            productFormWrapper.classList.add('collapsed');
            toggleFormBtn.textContent='➕ Add Product';
            toggleFormBtn.setAttribute('aria-expanded','false');
            toggleFormBtn.focus();
        }
    };
    const handleDelete=async idOrDoc=>{ confirmAction('Delete this product?').then(async ok=>{ if(!ok) return; try{
            // try to find matching product
            const idx = products.findIndex(p=> String(p.id)===String(idOrDoc) || String(p._docId)===String(idOrDoc));
            const docId = (idx>-1 && products[idx]._docId)? products[idx]._docId : null;
            if(__useFirestore && docId){ await FirebaseAdapter.deleteProduct(docId); }
            // remove local copy by matching either id or _docId
            products = products.filter(p=> !(String(p.id)===String(idOrDoc) || String(p._docId)===String(idOrDoc)) );
            saveProducts(); renderCards(); renderTable(); notify('Product deleted', 'info');
        }catch(err){ console.warn('Delete failed, removing locally', err); products = products.filter(p=> !(String(p.id)===String(idOrDoc) || String(p._docId)===String(idOrDoc)) ); saveProducts(); renderCards(); renderTable(); notify('Product deleted (local)', 'info'); } }); };

    const syncProductToFirestore=async idOrDoc=>{
        if(!__useFirestore){ notify('Firestore not configured.', 'warn'); return; }
        try{ await FirebaseAdapter.init(); }catch(err){ notify('Firestore not available.', 'error'); return; }
        const idx = products.findIndex(p=> String(p.id)===String(idOrDoc) || String(p._docId)===String(idOrDoc));
        if(idx===-1){ notify('Product not found. Please refresh.', 'error'); return; }
        const product = products[idx];
        if(product._docId){ notify('Product is already synced.', 'info'); return; }
        let imageUrl = product.imageUrl || '';
        if(typeof imageUrl === 'string' && imageUrl.startsWith('data:')){
            try{
                imageUrl = await FirebaseAdapter.uploadImage(imageUrl);
                if(!imageUrl || imageUrl.startsWith('data:')){
                    throw new Error('No download URL returned');
                }
            }catch(err){
                console.warn('Image upload failed', err);
                notify('Image upload failed; cannot sync until the image is stored in Firebase Storage.', 'error');
                return;
            }
        }
        const nowIso=new Date().toISOString();
        const payload={
            name: product.name,
            price: product.price,
            description: product.description,
            category: product.category,
            imageUrl,
            createdAt: product.createdAt || nowIso,
            updatedAt: nowIso
        };
        try{
            const docId = await FirebaseAdapter.addProduct(payload);
            product._docId = docId;
            product.id = docId;
            product.createdAt = payload.createdAt;
            product.updatedAt = payload.updatedAt;
            product.syncedAt = nowIso;
            saveProducts();
            refreshCategoryOptions();
            renderCards();
            renderTable();
            notify('Product synced to Firestore.', 'success');
            if(liveStatus) liveStatus.textContent=`Synced ${product.name} to Firestore`;
        }catch(err){
            console.warn('Sync failed', err);
            notify('Failed to sync product: '+(err && err.message ? err.message : err), 'error');
            if(liveStatus) liveStatus.textContent='Sync failed; product saved locally.';
        }
    };

    if(productForm) productForm.addEventListener('submit',handleFormSubmit);
    if(cancelBtn) cancelBtn.addEventListener('click',resetForm);
    if(toggleFormBtn && productFormWrapper) toggleFormBtn.addEventListener('click',()=>{const c=productFormWrapper.classList.toggle('collapsed'); toggleFormBtn.textContent=c?'➕ Add Product':'✖ Close Form'; toggleFormBtn.setAttribute('aria-expanded',c?'false':'true'); if(!c) document.getElementById('name')?.focus();});
    if(clearFiltersBtn) clearFiltersBtn.addEventListener('click',()=>{ if(productSearch) productSearch.value=''; if(categoryFilter) categoryFilter.value=''; renderCards(); renderTable(); if(liveStatus) liveStatus.textContent='Filters cleared'; });
    if(productSearch) productSearch.addEventListener('input',()=>{renderCards();renderTable();});
    if(categoryFilter) categoryFilter.addEventListener('change',()=>{renderCards();renderTable();});
    if(productList) productList.addEventListener('click',e=>{const sync=e.target.closest('.sync-btn'); if(sync){ const id = sync.dataset.docid || sync.dataset.id; syncProductToFirestore(id); return; } const del=e.target.closest('.delete-btn'); if(del){ const docid = del.dataset.docid; const id = docid || del.dataset.id; handleDelete(id); } });
    if(productsTableBody) productsTableBody.addEventListener('click',e=>{const sync=e.target.closest('.sync-btn'); if(sync){ const id = sync.dataset.docid || sync.dataset.id; syncProductToFirestore(id); return; } const del=e.target.closest('.delete-btn'); if(del){ const docid = del.dataset.docid; const id = docid || del.dataset.id; handleDelete(id); } });

    // Orders (simple table / list)
    const ordersContainer=document.getElementById('orders-list');
    const ordersTableBody=document.getElementById('orders-table-body');
    const ordersEmpty=document.getElementById('orders-empty');
    const orderDateStart=document.getElementById('order-date-start');
    const orderDateEnd=document.getElementById('order-date-end');
    const orderSort=document.getElementById('order-sort');
    const orderFiltersReset=document.getElementById('order-filters-reset');
    const exportOrdersBtn=document.getElementById('export-orders');
    const clearOrdersBtn=document.getElementById('clear-orders-btn');
    const syncOrdersBtn=document.getElementById('sync-orders-firestore');
    const orderSearch=document.getElementById('order-search');
    const orderStatusFilter=document.getElementById('order-status-filter');
    // Track expanded rows (persist across re-renders in this session)
    const expandedOrders=new Set();
    let ordersCache=[];
    let autoSyncedOrdersAfterLogin=false;
    let pendingOrdersSync=null;
    let pendingDashboardSync=null;
    const asDateObject=(value)=>{
        if(!value) return null;
        if(value instanceof Date) return value;
        if(typeof value.toDate==='function'){
            try{ return value.toDate(); }catch(_){ return null; }
        }
        if(typeof value==='number'){ const fromNumber=new Date(value); return isNaN(fromNumber.getTime())?null:fromNumber; }
        if(typeof value==='string'){ const fromString=new Date(value); return isNaN(fromString.getTime())?null:fromString; }
        if(typeof value==='object'){ // Firestore Timestamp in object form
            const seconds=Number(value.seconds);
            const nanoseconds=Number(value.nanoseconds||0);
            if(!isNaN(seconds)){ return new Date(seconds*1000 + Math.floor(nanoseconds/1e6)); }
        }
        return null;
    };
    const normalizeOrderRecord=(raw, index=0)=>{
        if(!raw || typeof raw!=='object') return null;
    const base={ ...raw };
    const fallbackId = base._docId || base.id || base.orderId || `order_${index}`;
        base.orderId = String(base.orderId || base.id || base._docId || fallbackId);
        base._docId = base._docId || base.id || base.orderId || fallbackId;
        const primaryDate = asDateObject(base.date || base.createdAt || base.updatedAt || Date.now()) || new Date();
        base.date = primaryDate.toISOString();
        if(base.createdAt){
            const createdObj=asDateObject(base.createdAt);
            base.createdAt = createdObj ? createdObj.toISOString() : base.date;
        } else {
            base.createdAt = base.date;
        }
        if(base.updatedAt){
            const updatedObj=asDateObject(base.updatedAt);
            base.updatedAt = updatedObj ? updatedObj.toISOString() : base.date;
        } else {
            base.updatedAt = base.date;
        }
        base.status = base.status || 'Pending';
        base.items = Array.isArray(base.items) ? base.items.map(item=>{
            const detail = { ...(item||{}) };
            detail.name = detail.name || 'Item';
            detail.quantity = Number(detail.quantity)||0;
            detail.price = Number(detail.price)||0;
            return detail;
        }) : [];
        const totalValue = Number(base.total);
        base.total = Number.isFinite(totalValue) ? totalValue : 0;
        base.customer = typeof base.customer==='object' && base.customer ? { ...base.customer } : {};
        return base;
    };
    const setOrdersCache=(list)=>{
        const normalized = Array.isArray(list) ? list.map((entry, idx)=>normalizeOrderRecord(entry, idx)).filter(Boolean) : [];
        ordersCache = normalized;
        return ordersCache;
    };
    // KPI elements
    const kpiToday=document.getElementById('kpi-today');
    const kpiWeek=document.getElementById('kpi-week');
    const kpiMonth=document.getElementById('kpi-month');
    const kpiTotal=document.getElementById('kpi-total');
    const kpiTodayCount=document.getElementById('kpi-today-count');
    const kpiWeekCount=document.getElementById('kpi-week-count');
    const kpiMonthCount=document.getElementById('kpi-month-count');
    const kpiTotalCount=document.getElementById('kpi-total-count');
    const fetchOrders=async (force=false)=>{
        if(!force && Array.isArray(ordersCache) && ordersCache.length){
            return [...ordersCache];
        }
        try{
            await FirebaseAdapter.init();
            const arr = await FirebaseAdapter.getOrders();
            if(Array.isArray(arr)){
                const normalized = setOrdersCache(arr);
                return [...normalized];
            }
        }catch(err){
            console.warn('Failed to fetch orders', err);
            if(force && typeof notify==='function'){
                notify('Failed to load orders from Firestore. Retrying...', 'warn');
            }
        }
        ordersCache = [];
        return [];
    };
    const refreshOrdersUI=async(force=false, dataOverride=null)=>{
        if(!(ordersTableBody||ordersContainer)) return;
        let data;
        if(Array.isArray(dataOverride)){
            data = [...setOrdersCache(dataOverride)];
        } else {
            data = await fetchOrders(force);
        }
        renderOrdersList(data);
        renderOrdersTable(data);
    };
    const syncOrdersFromFirestore=async({showSuccessToast=false}={})=>{
        if(!(ordersTableBody||ordersContainer)) return false;
        try{
            await FirebaseAdapter.init();
            const arr = await FirebaseAdapter.getOrders();
            if(Array.isArray(arr)){
                await refreshOrdersUI(false, arr);
                if(showSuccessToast){
                    notify('Orders synced from Firestore.', 'info');
                }
                return true;
            }
            await refreshOrdersUI(false, []);
            if(showSuccessToast){
                notify('No orders found in Firestore.', 'info');
            }
            return true;
        }catch(err){
            console.warn('Orders sync from Firestore failed', err);
            if(showSuccessToast){
                notify('Failed to sync orders from Firestore.', 'error');
            }
            return false;
        }
    };
    window.addEventListener('admin-auth-state', async (evt)=>{
        const user = evt?.detail?.user;
        if(!user) return;
        if(!(ordersTableBody||ordersContainer)) return;
        if(autoSyncedOrdersAfterLogin) return;
        if(pendingOrdersSync) return;
        try{
            pendingOrdersSync = syncOrdersFromFirestore();
            const success = await pendingOrdersSync;
            if(success){
                autoSyncedOrdersAfterLogin = true;
            }
        }catch(err){
            console.warn('Automatic orders sync after login failed', err);
        }finally{
            pendingOrdersSync = null;
        }
    });
    const renderOrdersList=(data=null)=>{
        if(!ordersContainer) return;
        const base = Array.isArray(data) ? data : (Array.isArray(ordersCache) ? ordersCache : []);
        const orders=[...base].sort((a,b)=>new Date(b.date)-new Date(a.date));
        if(!orders.length){ordersContainer.innerHTML='<p style="opacity:.7">No orders yet.</p>';return;}
        ordersContainer.innerHTML=orders.map(o=>{
            const items=(Array.isArray(o.items)?o.items:[]).map(i=>`${i.name} x${i.quantity}`).join(', ');
            const orderTotal=isNaN(o.total)?0:o.total;
            const docAttr = o._docId ? ` data-docid="${o._docId}"` : '';
            return `<div class="order-item" data-id="${o.orderId}"${docAttr}><div class="order-meta"><strong>${o.orderId}</strong> <span>${new Date(o.date).toLocaleString()}</span></div><div class="order-items">${items}</div><div class="order-total">Total: ₹${orderTotal.toLocaleString('en-IN')}</div><div><span class="status-badge status-${o.status.toLowerCase()}">${o.status}</span></div><button class="admin-button danger order-delete-btn" data-id="${o.orderId}"${docAttr}>Delete</button></div>`;
        }).join('');
    };
    const filterOrders=o=>{ let f=[...o];
        const term=(orderSearch?.value||'').toLowerCase();
        if(term) f=f.filter(or=> (or.orderId||'').toLowerCase().includes(term) || (or.customer?.name||'').toLowerCase().includes(term));
        const statusVal=orderStatusFilter?.value||''; if(statusVal) f=f.filter(or=>or.status===statusVal);
        const s=orderDateStart?.value; const e=orderDateEnd?.value; if(s){const sd=new Date(s+'T00:00:00'); f=f.filter(x=>new Date(x.date)>=sd);} if(e){const ed=new Date(e+'T23:59:59'); f=f.filter(x=>new Date(x.date)<=ed);} const dir=orderSort?.value||'newest'; f.sort((a,b)=>dir==='newest'?new Date(b.date)-new Date(a.date):new Date(a.date)-new Date(b.date)); return f; };
    const statusCycle=['Pending','Processing','Shipped','Delivered','Cancelled'];
    const computeKPIs=(orders)=>{ if(!(kpiToday&&kpiWeek&&kpiMonth&&kpiTotal)) return; const now=new Date(); const startOfDay=new Date(now.getFullYear(),now.getMonth(),now.getDate()); const startOfWeek=new Date(now); startOfWeek.setDate(now.getDate()-6); startOfWeek.setHours(0,0,0,0); const startOfMonth=new Date(now.getFullYear(),now.getMonth(),1); let todayT=0,weekT=0,monthT=0,totalT=0,todayC=0,weekC=0,monthC=0,totalC=0,deliveredC=0,cancelledC=0; orders.forEach(o=>{ const d=new Date(o.date); const amt=o.total||0; totalT+=amt; totalC++; if(o.status==='Delivered') deliveredC++; if(o.status==='Cancelled') cancelledC++; if(d>=startOfMonth){monthT+=amt; monthC++;} if(d>=startOfWeek){weekT+=amt; weekC++;} if(d>=startOfDay){todayT+=amt; todayC++;} }); kpiToday.querySelector('.kpi-value').textContent='₹'+todayT.toLocaleString('en-IN'); kpiWeek.querySelector('.kpi-value').textContent='₹'+weekT.toLocaleString('en-IN'); kpiMonth.querySelector('.kpi-value').textContent='₹'+monthT.toLocaleString('en-IN'); kpiTotal.querySelector('.kpi-value').textContent='₹'+totalT.toLocaleString('en-IN'); kpiTodayCount.textContent=`${todayC} ${todayC===1?'order':'orders'}`; kpiWeekCount.textContent=`${weekC} ${weekC===1?'order':'orders'}`; kpiMonthCount.textContent=`${monthC} ${monthC===1?'order':'orders'}`; kpiTotalCount.innerHTML=`${totalC} ${totalC===1?'order':'orders'} <span class="kpi-delivered">(${deliveredC} delivered</span> / <span class="kpi-cancelled">${cancelledC} cancelled)</span>`; };
    const buildStatusSelect=o=>`<select class="status-select" data-id="${o.orderId}"${o._docId?` data-docid="${o._docId}"`:''}>${statusCycle.map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${s}</option>`).join('')}</select>`;
    const buildRow=o=>{ const dateStr=new Date(o.date).toLocaleString(); const status=buildStatusSelect(o)+` <span class="status-badge status-${o.status.toLowerCase()}">${o.status}</span>`; const expanded=expandedOrders.has(o.orderId); const summary=`<strong>${o.customer?.name||''}</strong> • ${o.items.length} item(s)<span class="toggle-indicator">${expanded?'▲':'▼'}</span>`; const docAttr=o._docId?` data-docid="${o._docId}"`:''; return `<tr class="data-row" data-id="${o.orderId}"${docAttr} aria-expanded="${expanded?'true':'false'}"><td class="nowrap">${o.orderId}</td><td class="nowrap">${dateStr}</td><td>${status}</td><td>${summary}</td><td class="nowrap">${o.total.toLocaleString('en-IN')}</td><td class="actions-cell"><button class="admin-button danger order-delete-btn" data-id="${o.orderId}"${docAttr}>Delete</button></td></tr>`; };
    const buildDetailRow=o=>{ const c=o.customer||{}; const itemsHtml=o.items.map(i=>`<li>${i.name} x${i.quantity} <span class="muted">(₹${(i.price*i.quantity).toLocaleString('en-IN')})</span></li>`).join(''); const meta=`<div>Order ID: <strong>${o.orderId}</strong></div><div>Status: ${o.status}</div><div>Date: ${new Date(o.date).toLocaleString()}</div>`; const customer=`${c.name||''}<br>${c.mobile||''}<br>${c.email||''}<br>${(c.address||'').replace(/\n/g,'<br>')}<br>PIN: ${c.pincode||''}`; return `<tr class="order-detail-row" data-detail-for="${o.orderId}"><td colspan="6"><div class="order-detail"><div class="od-section"><h4>Customer</h4><div class="od-customer">${customer}</div></div><div class="od-section"><h4>Items</h4><ul class="od-items">${itemsHtml}</ul></div><div class="od-section"><h4>Meta</h4><div class="od-meta">${meta}</div></div></div></td></tr>`; };
    const renderOrdersTable=(data=null)=>{
        if(!ordersTableBody) return;
        const source = Array.isArray(data) ? data : (Array.isArray(ordersCache) ? ordersCache : []);
        const all=[...source];
        const filtered=filterOrders(all);
        computeKPIs(all);
        if(!filtered.length){ ordersTableBody.innerHTML=''; if(ordersEmpty) ordersEmpty.style.display='block'; return;}
        if(ordersEmpty) ordersEmpty.style.display='none';
        const rows=[];
        filtered.forEach(o=>{ rows.push(buildRow(o)); if(expandedOrders.has(o.orderId)) rows.push(buildDetailRow(o)); });
        ordersTableBody.innerHTML=rows.join('');
    };
    const deleteOrder=async (orderId, docId)=>{
        expandedOrders.delete(orderId);
        const remaining = Array.isArray(ordersCache) ? ordersCache.filter(o=>o.orderId!==orderId) : [];
        await refreshOrdersUI(false, remaining);
        if(!__useFirestore){ notify('Order removed.', 'info'); return; }
        try{
            await FirebaseAdapter.deleteOrder(docId||orderId);
            notify('Order deleted.', 'info');
            await syncOrdersFromFirestore();
        }catch(err){
            console.warn('Order delete failed', err);
            await syncOrdersFromFirestore();
            notify('Failed to delete order from Firestore.', 'error');
        }
    };
    if(ordersContainer) ordersContainer.addEventListener('click',e=>{const d=e.target.closest('.order-delete-btn'); if(d) { const orderId=d.dataset.id; const docId=d.dataset.docid||orderId; confirmAction('Delete order '+orderId+'?').then(async ok=>{ if(ok) await deleteOrder(orderId, docId); }); }});
    if(ordersTableBody) ordersTableBody.addEventListener('click',e=>{
        const del=e.target.closest('.order-delete-btn'); if(del){ const orderId=del.dataset.id; const docId=del.dataset.docid||orderId; confirmAction('Delete order '+orderId+'?').then(async ok=>{ if(ok){ await deleteOrder(orderId, docId); } }); return; }
        const row=e.target.closest('tr.data-row');
        if(row && !e.target.closest('select.status-select') && !e.target.closest('.actions-cell')){
            const id=row.dataset.id;
            if(expandedOrders.has(id)) expandedOrders.delete(id); else expandedOrders.add(id);
            renderOrdersTable(ordersCache);
        }
    });
    if(ordersTableBody) ordersTableBody.addEventListener('change',async e=>{
        const sel=e.target.closest('select.status-select');
        if(sel){
            const orderId=sel.dataset.id;
            const docId=sel.dataset.docid||orderId;
            await fetchOrders();
            const idx=ordersCache.findIndex(o=>o.orderId===orderId);
            if(idx>-1){
                const previous=ordersCache[idx].status;
                const nextStatus=sel.value;
                if(previous===nextStatus) return;
                const changedAt=new Date().toISOString();
                const statusHistory = Array.isArray(ordersCache[idx].statusHistory) ? ordersCache[idx].statusHistory : [];
                statusHistory.push({ status: nextStatus, changedAt, changedBy: 'admin-panel' });
                
                if(!__useFirestore){ 
                    ordersCache[idx].status = nextStatus;
                    ordersCache[idx].updatedAt = changedAt;
                    ordersCache[idx].statusHistory = statusHistory;
                    await refreshOrdersUI(false, ordersCache);
                    notify('Order status updated.', 'success'); 
                    return; 
                }
                try{
                    await FirebaseAdapter.updateOrder(docId, { status: nextStatus, updatedAt: changedAt, statusHistory });
                    ordersCache[idx].status = nextStatus;
                    ordersCache[idx].updatedAt = changedAt;
                    ordersCache[idx].statusHistory = statusHistory;
                    // Refresh after successful Firestore update
                    await refreshOrdersUI(false, ordersCache);
                    notify('Order status updated.', 'success');
                }catch(err){
                    console.warn('Order status update failed', err);
                    await syncOrdersFromFirestore();
                    notify('Failed to update status in Firestore.', 'error');
                }
            }
        }
    });
    if(clearOrdersBtn) clearOrdersBtn.addEventListener('click',()=>{ confirmAction('Clear ALL orders?').then(async ok=>{ if(!ok) return; expandedOrders.clear(); await refreshOrdersUI(false, []); if(!__useFirestore){ notify('All orders cleared.', 'info'); return; } try{ const removed=await FirebaseAdapter.clearOrders(); notify(`Cleared ${removed} order${removed===1?'':'s'}.`, 'info'); await syncOrdersFromFirestore(); }catch(err){ console.warn('Order clear failed', err); await syncOrdersFromFirestore(); notify('Failed to clear orders from Firestore.', 'error'); } }); });
    if(syncOrdersBtn) syncOrdersBtn.addEventListener('click', ()=>{
        if(pendingOrdersSync) return;
        pendingOrdersSync = syncOrdersFromFirestore({ showSuccessToast:true });
        pendingOrdersSync.finally(()=>{ pendingOrdersSync = null; });
    });
    if(orderFiltersReset) orderFiltersReset.addEventListener('click',()=>{ if(orderDateStart) orderDateStart.value=''; if(orderDateEnd) orderDateEnd.value=''; if(orderSort) orderSort.value='newest'; if(orderSearch) orderSearch.value=''; if(orderStatusFilter) orderStatusFilter.value=''; renderOrdersTable(ordersCache); if(liveStatus) liveStatus.textContent='Order filters cleared'; });
    if(orderSearch) orderSearch.addEventListener('input',()=>renderOrdersTable(ordersCache));
    if(orderStatusFilter) orderStatusFilter.addEventListener('change',()=>renderOrdersTable(ordersCache));
    if(orderDateStart) orderDateStart.addEventListener('change',()=>renderOrdersTable(ordersCache));
    if(orderDateEnd) orderDateEnd.addEventListener('change',()=>renderOrdersTable(ordersCache));
    if(orderSort) orderSort.addEventListener('change',()=>renderOrdersTable(ordersCache));
    if(exportOrdersBtn) exportOrdersBtn.addEventListener('click',async()=>{ const orders=filterOrders(await fetchOrders()); if(!orders.length){ notify('No orders to export.', 'info'); return;} const header=['Order ID','Date','Status','Customer Name','Mobile','Email','Address','PIN','Items','Total']; const rows=orders.map(o=>{const c=o.customer||{}; const items=o.items.map(i=>`${i.name} x${i.quantity} (₹${i.price*i.quantity})`).join('; '); return [o.orderId,new Date(o.date).toLocaleString(),o.status,c.name||'',c.mobile||'',c.email||'',(c.address||'').replace(/\n/g,' '),c.pincode||'',items,o.total];}); const csv=[header,...rows].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='orders.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); });

    // Image preview
    const imageUrlInput=document.getElementById('imageUrl'); const imageAssetSelect=document.getElementById('imageAsset'); const imagePreview=document.getElementById('image-preview'); const imagePreviewPlaceholder=document.getElementById('image-preview-placeholder');
    const imageFileInput=document.getElementById('imageFile'); const imageDropzone=document.getElementById('image-dropzone');
    const MAX_FILE_SIZE=2*1024*1024; // 2MB
    // Preview + draggable positioning
    const previewViewport=document.getElementById('preview-viewport');
    const resetImagePosBtn=document.getElementById('reset-image-pos');
    const zoomRange=document.getElementById('zoom-range');
    const zoomValue=document.getElementById('zoom-value');
    // track transform state for panning
    const state={ imgNaturalW:0, imgNaturalH:0, scale:1, x:0, y:0, dragging:false, startX:0, startY:0, origX:0, origY:0, baseScale:1, baseX:0, baseY:0, dirty:false };
    const updatePreview=()=>{ if(!imagePreview||!imagePreviewPlaceholder) return; let src=imageUrlInput?.value.trim(); if(!src && imageAssetSelect?.value) src=imageAssetSelect.value; if(src){ imagePreview.src=src; imagePreview.style.display='block'; imagePreviewPlaceholder.style.display='none'; // reset transform when new source loads
            // when image loads we'll compute fit
            imagePreview.onload = ()=>{
                state.imgNaturalW=imagePreview.naturalWidth||state.imgNaturalW;
                state.imgNaturalH=imagePreview.naturalHeight||state.imgNaturalH;
                // cover the viewport: scale so the smaller dimension fills
                const vw=previewViewport?.clientWidth||140; const vh=previewViewport?.clientHeight||140;
                const scale=Math.max(vw/state.imgNaturalW, vh/state.imgNaturalH);
                state.scale=scale; state.x=(vw - state.imgNaturalW*scale)/2; state.y=(vh - state.imgNaturalH*scale)/2;
                state.baseScale=state.scale; state.baseX=state.x; state.baseY=state.y; state.dirty=false;
                applyTransform();
                updateZoomDisplay();
            };
        } else { imagePreview.src=''; imagePreview.style.display='none'; imagePreviewPlaceholder.style.display='inline'; } };

    const applyTransform=()=>{ if(!imagePreview) return; imagePreview.style.transform=`translate(${state.x}px, ${state.y}px) scale(${state.scale})`; };

    // Pointer / drag handlers - support mouse & touch via pointer events if available
    const startDrag=(clientX,clientY)=>{ state.dragging=true; state.startX=clientX; state.startY=clientY; state.origX=state.x; state.origY=state.y; imagePreview.classList.add('dragging'); };
    const moveDrag=(clientX,clientY)=>{ if(!state.dragging) return; const dx=clientX-state.startX; const dy=clientY-state.startY; state.x=state.origX+dx; state.y=state.origY+dy; constrainPosition(); state.dirty=true; applyTransform(); };
    const endDrag=()=>{ state.dragging=false; imagePreview.classList.remove('dragging'); };
    const constrainPosition=()=>{ // keep image at least covering viewport
        if(!previewViewport) return; const vw=previewViewport.clientWidth; const vh=previewViewport.clientHeight; const iw=state.imgNaturalW*state.scale; const ih=state.imgNaturalH*state.scale; // min and max x/y
        const minX = Math.min(0, vw - iw); const maxX = Math.max(0, vw - iw) ? 0 : 0; // simplified
        const minY = Math.min(0, vh - ih); const maxY = 0;
        if(iw <= vw){ // center horizontally
            state.x = (vw - iw)/2;
        } else {
            if(state.x > 0) state.x = 0;
            if(state.x < vw - iw) state.x = vw - iw;
        }
        if(ih <= vh){ // center vertically
            state.y = (vh - ih)/2;
        } else {
            if(state.y > 0) state.y = 0;
            if(state.y < vh - ih) state.y = vh - ih;
        }
    };

    // Pointer events
    if(previewViewport && imagePreview){
        // Use pointer events when available
        previewViewport.addEventListener('pointerdown', (e)=>{ if(e.button && e.button!==0) return; e.preventDefault(); previewViewport.setPointerCapture?.(e.pointerId); startDrag(e.clientX, e.clientY); });
        window.addEventListener('pointermove', (e)=>{ if(!state.dragging) return; e.preventDefault(); moveDrag(e.clientX, e.clientY); });
        window.addEventListener('pointerup', (e)=>{ if(!state.dragging) return; endDrag(); });
        // touch pinch-to-zoom is out of scope; keep simple double-click to reset
    }

    if(resetImagePosBtn){ resetImagePosBtn.addEventListener('click', ()=>{ if(!previewViewport) return; const vw=previewViewport.clientWidth; const vh=previewViewport.clientHeight; const scale=Math.max(vw/state.imgNaturalW, vh/state.imgNaturalH); state.scale=scale; state.x=(vw - state.imgNaturalW*scale)/2; state.y=(vh - state.imgNaturalH*scale)/2; state.baseScale=state.scale; state.baseX=state.x; state.baseY=state.y; state.dirty=false; applyTransform(); updateZoomDisplay(); }); }

    // Zoom handling
    const setScale = (newScale, centerX=null, centerY=null)=>{
        if(!previewViewport) return;
        const vw=previewViewport.clientWidth; const vh=previewViewport.clientHeight;
        // If centerX/Y provided, convert to image-local coordinate and adjust x/y so point remains under cursor
        if(centerX!==null && centerY!==null){
            // position of cursor relative to viewport
            const rect=previewViewport.getBoundingClientRect();
            const cx=centerX-rect.left; const cy=centerY-rect.top;
            // image coordinate before scale change
            const imgX = (cx - state.x) / state.scale; const imgY = (cy - state.y) / state.scale;
            // new offsets so that imgX,imgY stays at same cx,cy
            const newX = cx - imgX * newScale; const newY = cy - imgY * newScale;
            state.scale = newScale; state.x = newX; state.y = newY;
        } else {
            state.scale = newScale;
            // re-center small images
            const iw = state.imgNaturalW*state.scale; const ih = state.imgNaturalH*state.scale;
            state.x = (vw - iw)/2; state.y = (vh - ih)/2;
        }
        constrainPosition(); state.dirty=true; applyTransform(); updateZoomDisplay();
    };

    const updateZoomDisplay = ()=>{ if(!zoomValue) return; zoomValue.textContent = Math.round(state.scale*100)+'%'; if(zoomRange){ const min=parseFloat(zoomRange.min||'0.5'); const max=parseFloat(zoomRange.max||'2.5'); const clamped=Math.min(max, Math.max(min, state.scale)); zoomRange.value = clamped; } };

    if(zoomRange){ zoomRange.addEventListener('input', (e)=>{ const v=parseFloat(e.target.value); // center around viewport center
            const rect=previewViewport.getBoundingClientRect(); setScale(v, rect.left+rect.width/2, rect.top+rect.height/2); }); }

    // wheel to zoom
    if(previewViewport){ previewViewport.addEventListener('wheel', (e)=>{ if(!imagePreview) return; e.preventDefault(); const delta = -e.deltaY; const speed = 0.0015; const factor = 1 + delta*speed; const newScale = Math.min(2.5, Math.max(0.5, state.scale * factor)); setScale(newScale, e.clientX, e.clientY); }, { passive:false }); }
    const fileToDataURL=(file)=>new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=()=>rej(fr.error); fr.readAsDataURL(file); });
    const handleFile=async(file)=>{ if(!file) return; if(!file.type.startsWith('image/')){ notify('Only image files allowed.', 'error'); return; } if(file.size>MAX_FILE_SIZE){ notify('Image too large (max 2MB).', 'error'); return; } try { const dataUrl=await fileToDataURL(file); if(imageAssetSelect) imageAssetSelect.value=''; if(imageUrlInput){ imageUrlInput.value=dataUrl; } updatePreview(); } catch(err){ console.error(err); notify('Failed to read file.', 'error'); } };
    if(imageFileInput) imageFileInput.addEventListener('change',e=>{ const f=e.target.files?.[0]; handleFile(f); });
    if(imageDropzone){
        const dz=imageDropzone;
        const setDrag=(on)=>{ dz.classList.toggle('drag-over',on); };
        ['dragenter','dragover'].forEach(evt=>dz.addEventListener(evt,e=>{e.preventDefault(); e.stopPropagation(); setDrag(true);}));
        ['dragleave','dragend','drop'].forEach(evt=>dz.addEventListener(evt,e=>{e.preventDefault(); e.stopPropagation(); if(evt!=='drop') setDrag(false);}));
        dz.addEventListener('drop',e=>{ setDrag(false); const file=e.dataTransfer.files?.[0]; handleFile(file); });
        dz.addEventListener('click',()=> imageFileInput?.click());
        dz.addEventListener('keydown',e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); imageFileInput?.click(); }});
    }
    if(imageUrlInput) imageUrlInput.addEventListener('input',()=>{ if(imageAssetSelect) imageAssetSelect.value=''; updatePreview(); });
    if(imageAssetSelect) imageAssetSelect.addEventListener('change',()=>{ if(imageUrlInput) imageUrlInput.value=imageAssetSelect.value; updatePreview(); });

    // Crop the visible area in the preview viewport to a dataURL
    const cropPreviewToDataURL=()=>{
        if(!previewViewport || !imagePreview) return null;
        const vw=previewViewport.clientWidth; const vh=previewViewport.clientHeight;
        // compute source rect in original image coordinates
        const sx = Math.max(0, -state.x) / state.scale;
        const sy = Math.max(0, -state.y) / state.scale;
        const sw = Math.min(state.imgNaturalW - sx, vw / state.scale);
        const sh = Math.min(state.imgNaturalH - sy, vh / state.scale);
        if(!sw || !sh) return Promise.resolve(null);
        const canvas=document.createElement('canvas');
        const targetW = Math.max(1, Math.round(sw));
        const targetH = Math.max(1, Math.round(sh));
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx=canvas.getContext('2d');
        if(ctx && ctx.imageSmoothingQuality){ ctx.imageSmoothingQuality = 'high'; }
        // draw portion of the original image scaled to fill viewport at higher resolution
        const img=new Image(); img.crossOrigin='anonymous'; img.src=imagePreview.src;
        return new Promise((res,rej)=>{
            img.onload=()=>{
                try{
                    ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
                    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
                    const out=canvas.toDataURL('image/jpeg',0.96);
                    res(out);
                }catch(err){ rej(err); }
            };
            img.onerror=()=> rej(new Error('Failed to load image for cropping'));
        });
    };

    // Hook form submit to ensure we crop the preview image (only if imageUrl is a data URL or user changed position)
    const originalHandleFormSubmit = handleFormSubmit;
    const wrapSubmit = async (e)=>{
        e.preventDefault(); // prevent double submit
        // Block when auth is required and disabled
        if(submitBtn && submitBtn.getAttribute('aria-disabled') === 'true'){
            try{ if(typeof notify==='function') notify('Sign in to add or update products.','warn'); }catch(_){}
            return;
        }
        // if there is an image shown in preview, and its src is either dataURL or asset but user moved it, crop it
        const currentVal = imageUrlInput?.value?.trim() || '';
        const shouldCrop = !!(imagePreview && imagePreview.src && (state.dirty || currentVal.startsWith('data:')));
        if(shouldCrop){
            try{
                const cropped = await cropPreviewToDataURL();
                if(cropped){ if(imageUrlInput) imageUrlInput.value = cropped; }
            }catch(err){ console.warn('Crop failed', err); }
        }
        // call original handler
        originalHandleFormSubmit(e);
    };
    if(productForm){ productForm.removeEventListener('submit',handleFormSubmit); productForm.addEventListener('submit',wrapSubmit); }

    // Populate edit form (add-product page). Support either ?docId=<firestoreId> or ?edit=<numericId>
    const params=new URLSearchParams(window.location.search);
    const docIdParam = params.get('docId');
    const editParam = params.get('edit');
    if((docIdParam || editParam) && productForm){
        const findKey = docIdParam || String(parseInt(editParam,10));
        try{
            const st = await FirebaseAdapter.init();
            let p = null;
            if(st.useFirestore){
                p = await FirebaseAdapter.getProductById(findKey);
            }
            if(!p){
                p = products.find(pp=> String(pp._docId)===String(findKey) || String(pp.id)===String(findKey));
            }
            if(p){
                document.getElementById('product-id').value=p.id;
                productForm.dataset.docid = p._docId||'';
                document.getElementById('name').value=p.name;
                document.getElementById('price').value=p.price;
                document.getElementById('description').value=p.description;
                document.getElementById('category').value=p.category||'';
                const iu=document.getElementById('imageUrl'); if(iu) iu.value=p.imageUrl||'';
                const ia=document.getElementById('imageAsset'); if(ia && p.imageUrl?.startsWith('assets/')) ia.value=p.imageUrl;
                if(formTitle) formTitle.textContent='Edit Product'; if(submitBtn) submitBtn.textContent='Update Product'; updatePreview();
            }
        }catch(err){ console.warn('Failed to load product for edit', err); }
    }

    const bootstrapApp = async ()=>{
        refreshCategoryOptions();
        renderCards();
        renderTable();
        if(ordersTableBody || ordersContainer){
            try{
                await FirebaseAdapter.init();
                const user = await FirebaseAdapter.getCurrentUser?.();
                if(user){
                    pendingOrdersSync = syncOrdersFromFirestore();
                    const success = await pendingOrdersSync;
                    if(success){
                        autoSyncedOrdersAfterLogin = true;
                    }
                } else {
                    await refreshOrdersUI(false, []);
                }
            }catch(err){
                console.warn('Initial orders sync skipped', err);
                await refreshOrdersUI(false, []);
            }finally{
                pendingOrdersSync = null;
            }
        }
        updatePreview();
        if((ordersTableBody || ordersContainer) && ordersCache.length){
            console.log('✅ Orders loaded from Firestore');
        }
    };

    if(document.readyState === 'loading'){
        window.addEventListener('DOMContentLoaded', ()=>{ bootstrapApp().catch(err=>console.error('Bootstrap failed', err)); });
    } else {
        bootstrapApp().catch(err=>console.error('Bootstrap failed', err));
    }

    // Ensure Firestore products are shown
    (async function ensureRemoteProducts(){
        try{
            const st = await FirebaseAdapter.init();
            if(!st.useFirestore) return;
            const loader = document.getElementById('products-loading');
            if(loader){ loader.hidden = false; }
            const remote = await FirebaseAdapter.getProducts();
            if(Array.isArray(remote) && remote.length){
                const mapped = remote.map(p=>({
                    id: p.id || p._docId || `prod_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                    name: p.name||'',
                    price: p.price||0,
                    description: p.description||'',
                    category: p.category||'',
                    imageUrl: p.imageUrl||'',
                    _docId: p._docId || p.id || null
                }));
                // Keep any local unsynced items (no _docId) and append remote
                const locals = Array.isArray(products)?products.filter(p=>!p._docId):[];
                products = __dedupeProducts([...locals, ...mapped]);
                refreshCategoryOptions();
                renderCards();
                renderTable();
                if(productCountEl) productCountEl.textContent = `${products.length} products`;
            }
            if(loader){ loader.hidden = true; }
        }catch(err){
            console.warn('Remote product refresh skipped', err);
            const loader = document.getElementById('products-loading');
            if(loader){ loader.hidden = true; }
        }
    })();

    // Real-time sync when Firestore is available
    try{
        FirebaseAdapter.onProductsSnapshot?.((arr)=>{
            const loader = document.getElementById('products-loading');
            if(loader){ loader.hidden = false; }
            const looksRemote=Array.isArray(arr)&&arr.some(p=>p&&p._docId);
            if(!looksRemote){
                products=__dedupeProducts(Array.isArray(arr)?arr:[]);
                refreshCategoryOptions();
                renderCards();
                renderTable();
                if(loader){ setTimeout(()=>{ loader.hidden = true; }, 240); }
                return;
            }
            const localList = Array.isArray(products)?products:[];
            const remote = (arr||[]).map(p=>{
                const fallbackId = p.id || p._docId || `prod_${Date.now()}_${Math.floor(Math.random()*1000)}`;
                const docKey = p._docId || fallbackId;
                const existing = localList.find(lp=> lp._docId && String(lp._docId)===String(docKey));
                const merged = existing ? { ...existing, ...p, id: fallbackId, _docId: p._docId || fallbackId } : { ...p, id: fallbackId, _docId: p._docId || fallbackId };
                return merged;
            });
            const remoteDocIds = new Set(remote.filter(p=>p._docId).map(p=>String(p._docId)));
            const leftoverLocals = localList
                .filter(p=>!p._docId || !remoteDocIds.has(String(p._docId)))
                .map(p=>{
                    if(!p._docId) return p;
                    const copy = { ...p };
                    delete copy._docId;
                    return copy;
                });
            products = [...leftoverLocals, ...remote];
            saveProducts();
            refreshCategoryOptions();
            renderCards();
            renderTable();
            if(loader){ setTimeout(()=>{ loader.hidden = true; }, 240); }
        });
        FirebaseAdapter.onOrdersSnapshot?.((arr)=>{
            if(Array.isArray(arr)){
                refreshOrdersUI(false, arr);
            }
        });
    }catch(e){ /* ignore if not configured */ }
    // Sync helper: push local-only products to Firestore and record returned _docId
    async function migrateToFirestore(){
        if(!__useFirestore){ notify('Firestore not configured.', 'warn'); return; }
        if(!confirm('Sync unsynced products to Firestore now?')) return;
        const modal = document.getElementById('migration-modal');
        const summary = document.getElementById('migration-summary');
        const prog = document.getElementById('migration-progress');
        const log = document.getElementById('migration-log');
        modal.setAttribute('aria-hidden','false'); modal.style.display='flex';
        try{
            await FirebaseAdapter.init();
            const localAll = Array.isArray(products)?products:[];
            const unsynced = localAll.filter(p=>!p._docId);
            if(!unsynced.length){
                summary.textContent = 'All products are already synced.';
                setTimeout(()=>{ modal.setAttribute('aria-hidden','true'); modal.style.display='none'; }, 1800);
                return;
            }
            const total = unsynced.length;
            let completed = 0;
            const safeLog = (s)=>{ log.innerText = s + '\n' + log.innerText; };
            summary.textContent = `Syncing ${total} product${total===1?'':'s'}...`;
            for(const p of unsynced){
                let finalImage = p.imageUrl || '';
                if(typeof finalImage === 'string' && finalImage.startsWith('data:')){
                    try{
                        finalImage = await FirebaseAdapter.uploadImage(finalImage);
                        if(!finalImage || finalImage.startsWith('data:')){
                            throw new Error('No download URL returned');
                        }
                        safeLog(`Uploaded image for ${p.name}`);
                    }catch(err){
                        safeLog(`Image upload failed for ${p.name}: ${(err && err.message)||err}. Skipping Firestore sync for this product until the image uploads.`);
                        continue;
                    }
                } else {
                    safeLog(`Keeping remote/image asset for ${p.name}`);
                }
                const nowIso = new Date().toISOString();
                const payload = {
                    name: p.name,
                    price: p.price,
                    description: p.description,
                    category: p.category,
                    imageUrl: finalImage,
                    createdAt: p.createdAt || nowIso,
                    updatedAt: nowIso
                };
                try{
                    const docId = await FirebaseAdapter.addProduct(payload);
                    p._docId = docId;
                    p.id = docId;
                    p.createdAt = payload.createdAt;
                    p.updatedAt = payload.updatedAt;
                    p.syncedAt = nowIso;
                    safeLog(`Synced ${p.name} -> ${docId}`);
                }catch(err){
                    safeLog(`Failed to sync ${p.name}: ${err.message||err}`);
                }
                completed++; prog.style.width = Math.round((completed/total)*100)+'%';
            }
            products = localAll;
            saveProducts(); refreshCategoryOptions(); renderCards(); renderTable();
            // Migration of orders no longer needed - they're already in Firestore
            summary.textContent = 'Sync finished'; safeLog('Sync finished.');
        }catch(err){ console.error('Migration failed', err); summary.textContent = 'Migration failed: '+(err && err.message || err); }
        const cancel = document.getElementById('migration-cancel'); cancel.addEventListener('click',()=>{ modal.setAttribute('aria-hidden','true'); modal.style.display='none'; });
    }
    const migrateBtn=document.getElementById('migrate-firestore'); if(migrateBtn) migrateBtn.addEventListener('click', migrateToFirestore);
    const refreshDashboardData=async ({showToast=false}={})=>{
        const kpiProducts=document.getElementById('db-kpi-products');
        if(!kpiProducts) return false;
        let firestoreEnabled=false;
        let fetchedFromFirestore=false;
        let productsRemote=null;
        let ordersRemote=null;
        try{
            const st = await FirebaseAdapter.init();
            firestoreEnabled = !!st.useFirestore;
            if(firestoreEnabled){
                const [productsResult, ordersResult] = await Promise.allSettled([
                    FirebaseAdapter.getProducts(),
                    FirebaseAdapter.getOrders()
                ]);
                if(productsResult.status==='fulfilled'){
                    productsRemote = Array.isArray(productsResult.value)?productsResult.value:[];
                    fetchedFromFirestore = true;
                } else {
                    console.warn('Dashboard products fetch failed', productsResult.reason);
                }
                if(ordersResult.status==='fulfilled'){
                    ordersRemote = Array.isArray(ordersResult.value)?ordersResult.value:[];
                    fetchedFromFirestore = true;
                } else {
                    console.warn('Dashboard orders fetch failed', ordersResult.reason);
                }
            }
        }catch(err){
            console.warn('Dashboard sync init failed', err);
        }

        if(Array.isArray(productsRemote)){
            products = __dedupeProducts(productsRemote);
            saveProducts();
            refreshCategoryOptions();
            renderCards();
            renderTable();
        }
        if(kpiProducts){
            kpiProducts.textContent = Array.isArray(products) ? products.length : 0;
        }

        let dashboardOrders=[];
        if(Array.isArray(ordersRemote)){
            dashboardOrders = setOrdersCache(ordersRemote);
        } else if(Array.isArray(ordersCache) && ordersCache.length){
            dashboardOrders = ordersCache.map((entry, idx)=>normalizeOrderRecord(entry, idx)).filter(Boolean);
        }

        const monthOrdersEl=document.getElementById('db-kpi-orders');
        const monthOrdersSub=document.getElementById('db-kpi-orders-sub');
        const pendingEl=document.getElementById('db-kpi-pending');
        const pendingSub=document.getElementById('db-kpi-pending-sub');
        const deliveredEl=document.getElementById('db-kpi-delivered');
        const deliveredSub=document.getElementById('db-kpi-delivered-sub');
        const ordersForMetrics=dashboardOrders;
        const now=new Date();
        const startOfMonth=new Date(now.getFullYear(),now.getMonth(),1);
        let monthCount=0,monthRevenue=0,pendingCount=0,deliveredCount=0;
        ordersForMetrics.forEach(o=>{
            const d=new Date(o.date);
            if(d>=startOfMonth){
                monthCount++;
                monthRevenue+=Number(o.total)||0;
                if(o.status==='Delivered') deliveredCount++;
                if(o.status==='Pending'||o.status==='Processing'||o.status==='Shipped') pendingCount++;
            }
        });
        if(monthOrdersEl) monthOrdersEl.textContent=monthCount;
        if(monthOrdersSub) monthOrdersSub.textContent='₹'+monthRevenue.toLocaleString('en-IN');
        if(pendingEl) pendingEl.textContent=pendingCount;
        if(pendingSub) pendingSub.textContent='Open';
        if(deliveredEl) deliveredEl.textContent=deliveredCount;
        if(deliveredSub) deliveredSub.textContent='This Month';

        const svg=document.getElementById('revenue-sparkline');
        if(svg){
            const nowM=new Date();
            const months=[];
            for(let i=11;i>=0;i--){
                const d=new Date(nowM.getFullYear(),nowM.getMonth()-i,1);
                const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
                months.push({ key, total:0 });
            }
            ordersForMetrics.forEach(o=>{
                const d=new Date(o.date);
                const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
                const bucket=months.find(m=>m.key===key);
                if(bucket) bucket.total+=Number(o.total)||0;
            });
            const w=160, h=38, padX=4, padY=4;
            svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
            svg.innerHTML='';
            const totals=months.map(m=>m.total);
            const max=Math.max(...totals,1);
            const min=Math.min(...totals);
            const xStep=months.length>1 ? (w-2*padX)/(months.length-1) : 0;
            const pts=months.map((m,i)=>{
                const x=padX+i*xStep;
                const y=h-padY-((m.total/max)*(h-2*padY));
                return {x,y,total:m.total};
            });
            if(pts.length){
                const lineD=pts.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2)).join(' ');
                const areaD=lineD+' L '+pts[pts.length-1].x.toFixed(2)+','+(h-padY)+' L '+pts[0].x.toFixed(2)+','+(h-padY)+' Z';
                const area=document.createElementNS('http://www.w3.org/2000/svg','path');
                area.setAttribute('class','area');
                area.setAttribute('d',areaD);
                svg.appendChild(area);
                const path=document.createElementNS('http://www.w3.org/2000/svg','path');
                path.setAttribute('class','line');
                path.setAttribute('d',lineD);
                svg.appendChild(path);
                pts.forEach((p,i)=>{
                    if(i===pts.length-1 || i===pts.length-2){
                        const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
                        c.setAttribute('class','dot');
                        c.setAttribute('cx',p.x);
                        c.setAttribute('cy',p.y);
                        c.setAttribute('r',2.4);
                        c.setAttribute('data-value',p.total);
                        svg.appendChild(c);
                    }
                });
                if(max!==min){
                    const minP=pts.reduce((a,b)=>b.total<a.total?b:a);
                    const maxP=pts.reduce((a,b)=>b.total>a.total?b:a);
                    const tMin=document.createElementNS('http://www.w3.org/2000/svg','text');
                    tMin.setAttribute('class','minimax');
                    tMin.setAttribute('x',minP.x+2);
                    tMin.setAttribute('y',Math.min(h-2, minP.y+7));
                    tMin.textContent='₹'+minP.total.toLocaleString('en-IN');
                    svg.appendChild(tMin);
                    const tMax=document.createElementNS('http://www.w3.org/2000/svg','text');
                    tMax.setAttribute('class','minimax');
                    tMax.setAttribute('x',maxP.x+2);
                    tMax.setAttribute('y',Math.max(7, maxP.y-2));
                    tMax.textContent='₹'+maxP.total.toLocaleString('en-IN');
                    svg.appendChild(tMax);
                }
            }
        }

        const recentBody=document.getElementById('recent-orders-body');
        const recentEmpty=document.getElementById('recent-orders-empty');
        if(recentBody){
            const recent=[...ordersForMetrics].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);
            if(!recent.length){
                recentBody.innerHTML='';
                if(recentEmpty) recentEmpty.style.display='block';
            } else {
                if(recentEmpty) recentEmpty.style.display='none';
                recentBody.innerHTML=recent.map(o=>{
                    const date=new Date(o.date);
                    const total=Number(o.total)||0;
                    return `<tr><td>${o.orderId}</td><td>${date.toLocaleDateString()}<br><span style="opacity:.6;font-size:.55rem;">${date.toLocaleTimeString()}</span></td><td><span class='status-badge status-${o.status.toLowerCase()}'>${o.status}</span></td><td>₹${total.toLocaleString('en-IN')}</td></tr>`;
                }).join('');
            }
        }

        if(showToast){
            if(fetchedFromFirestore){
                notify('Dashboard data synced from Firestore.', 'success');
            } else if(firestoreEnabled){
                notify('Showing cached dashboard data (Firestore sync failed).', 'warn');
            } else {
                notify('Firestore not configured; showing local dashboard data.', 'warn');
            }
        }
        return fetchedFromFirestore;
    };

    (async function initDashboard(){
        const kpiProducts=document.getElementById('db-kpi-products');
        if(!kpiProducts) return;
        await refreshDashboardData();
        const dashboardSyncBtn=document.getElementById('dashboard-sync-btn');
        if(dashboardSyncBtn){
            dashboardSyncBtn.addEventListener('click',()=>{
                if(pendingDashboardSync) return;
                pendingDashboardSync = refreshDashboardData({ showToast:true });
                pendingDashboardSync.finally(()=>{ pendingDashboardSync=null; });
            });
        }
    })();
    // Settings page logic (WhatsApp number) - FIREBASE VERSION
    (async function(){
        const settingsForm=document.getElementById('settings-form');
        if(!settingsForm) return;
        
        const waInput=document.getElementById('wa-number');
        const statusEl=document.getElementById('settings-status');
    const defaultSettings={ whatsappNumber:'919961165503' };
        
        // Load settings from Firebase
        let currentSettings = defaultSettings;
        try {
            currentSettings = await FirebaseAdapter.getSettings();
            if(waInput) waInput.value = currentSettings.whatsappNumber || '';
            console.log('✅ Settings loaded from Firebase');
        } catch (err) {
            console.error('Failed to load settings:', err);
            if(waInput) waInput.value = defaultSettings.whatsappNumber;
            notify('Failed to load settings from Firebase. Using defaults.', 'warn');
        }
        
        // Save settings to Firebase
        const saveBtn = document.getElementById('save-settings-btn');
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(saveBtn && saveBtn.getAttribute('aria-disabled') === 'true'){
                try{ if(typeof notify==='function') notify('Sign in to save settings.','warn'); }catch(_){}
                return;
            }
            const val = waInput.value.trim();
            
            if(!/^[0-9]{10,15}$/.test(val)){
                notify('Enter 10-15 digit number without + or spaces.', 'error');
                return;
            }
            
            try {
                await FirebaseAdapter.saveSettings({ whatsappNumber: val });
                currentSettings.whatsappNumber = val;
                notify('Settings saved successfully!', 'success');
                if(statusEl){
                    statusEl.textContent='Saved to Firebase ✓';
                    statusEl.style.color='#28a745';
                    setTimeout(()=>statusEl.textContent='', 2500);
                }
            } catch (err) {
                console.error('Failed to save settings:', err);
                notify('Failed to save settings: ' + err.message, 'error');
                if(statusEl){
                    statusEl.textContent='Save failed ✗';
                    statusEl.style.color='#dc3545';
                }
            }
        });
        
        // Reset button
        const resetBtn=document.getElementById('reset-settings-btn');
        if(resetBtn) {
            resetBtn.addEventListener('click', () => {
                waInput.value = currentSettings.whatsappNumber || '';
                if(statusEl) statusEl.textContent = '';
            });
        }
    })();
// module end