// Clean reimplementation of admin logic
(function(){
    const ADMIN_AUTH_KEY='vastravedajewlleries-admin-auth';
    const path=window.location.pathname;
    const isLogin=/\/admin\/(index\.html)?$/.test(path)||path.endsWith('/admin')||path.endsWith('/admin/');
    if(!isLogin && path.includes('/admin/')){
        if(!localStorage.getItem(ADMIN_AUTH_KEY)) { window.location.href='index.html'; return; }
    }
    // Auth
    const loginForm=document.getElementById('login-form');
    if(loginForm){loginForm.addEventListener('submit',e=>{e.preventDefault();const pw=document.getElementById('password').value;if(pw==='admin123'){localStorage.setItem(ADMIN_AUTH_KEY,'true');window.location.href='dashboard.html';}else{const em=document.getElementById('error-message'); if(em) em.textContent='Incorrect password.';}});}  
    const logoutBtn=document.getElementById('logout-btn'); if(logoutBtn) logoutBtn.addEventListener('click',()=>{localStorage.removeItem(ADMIN_AUTH_KEY); window.location.href='index.html';});

    // Data
    let products=JSON.parse(localStorage.getItem('products')||'[]');
    if(!products.length){products=[{id:1,name:'Ethereal Diamond Necklace',price:120000,description:'Pear-cut diamond with halo setting.',imageUrl:'assets/IMG-20250812-WA0001.jpg',category:'Necklace'},{id:2,name:'Sapphire Dream Ring',price:95000,description:'Blue sapphire in white gold band.',imageUrl:'assets/IMG-20250812-WA0002.jpg',category:'Ring'}];localStorage.setItem('products',JSON.stringify(products));}
    const saveProducts=()=>localStorage.setItem('products',JSON.stringify(products));

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
    const renderCards=()=>{ if(!productList) return; const f=filterProducts(); if(productCountEl) productCountEl.textContent=`${f.length} / ${products.length} products`; if(liveStatus) liveStatus.textContent=`Showing ${f.length} of ${products.length} products`; if(!f.length){productList.innerHTML='<p style="opacity:.7;margin:0;">No products match your filters.</p>';return;} productList.innerHTML=f.map(p=>{const img=p.imageUrl?`<img src="${p.imageUrl}" alt="${p.name}" class="pl-img">`:'<div class="pl-img placeholder">🖼️</div>'; return `<article class="product-card" data-id="${p.id}">${img}<div class="pc-main"><header class="pc-head"><h4>${p.name}</h4><span class="pc-price">₹${p.price.toLocaleString('en-IN')}</span></header><div class="pc-meta"><span>${p.category||''}</span></div><footer class="pc-actions"><a class="admin-button secondary" href="add-product.html?edit=${p.id}">Edit</a><button class="admin-button danger delete-btn" data-id="${p.id}">Delete</button></footer></div></article>`;}).join(''); };
    const renderTable=()=>{ if(!productsTableBody) return; const f=filterProducts(); if(productCountEl) productCountEl.textContent=`${f.length} / ${products.length} products`; if(liveStatus) liveStatus.textContent=`Showing ${f.length} of ${products.length} products`; if(!f.length){productsTableBody.innerHTML='<tr><td colspan="7" style="opacity:.7;">No products match your filters.</td></tr>';return;} productsTableBody.innerHTML=f.map(p=>{const img=p.imageUrl?`<img src="${p.imageUrl}" alt="${p.name}">`:'<div style="width:60px;height:60px;display:flex;align-items:center;justify-content:center;background:#222;border-radius:8px;">🖼️</div>'; return `<tr data-id="${p.id}"><td class="nowrap">${p.id}</td><td>${img}</td><td><strong>${p.name}</strong><div class="muted" style="font-size:.7rem;margin-top:2px;">${p.category||''}</div></td><td class="nowrap"><span class="badge">${p.category||''}</span></td><td class="nowrap">${p.price.toLocaleString('en-IN')}</td><td class="clamp">${p.description}</td><td class="actions-cell"><a class="admin-button secondary" href="add-product.html?edit=${p.id}">Edit</a><button class="admin-button danger delete-btn" data-id="${p.id}">Delete</button></td></tr>`;}).join(''); };

    const resetForm=()=>{ if(!productForm) return; productForm.reset(); const idEl=document.getElementById('product-id'); if(idEl) idEl.value=''; if(formTitle) formTitle.textContent='Add New Product'; if(submitBtn) submitBtn.textContent='Add Product'; if(cancelBtn) cancelBtn.style.display='none'; };
    const handleFormSubmit=e=>{ e.preventDefault(); const id=document.getElementById('product-id').value; const name=document.getElementById('name').value.trim(); const price=parseInt(document.getElementById('price').value.trim(),10); const description=document.getElementById('description').value.trim(); const category=document.getElementById('category').value; let imageUrl=(document.getElementById('imageUrl')?.value||'').trim(); const asset=document.getElementById('imageAsset')?.value||''; if(!imageUrl && asset) imageUrl=asset; if(!name||name.length<2) return alert('Name must be at least 2 characters.'); if(isNaN(price)||price<0) return alert('Invalid price'); if(!description||description.length<5) return alert('Description too short'); if(!category) return alert('Select category'); const data={name,price,description,category,imageUrl}; if(id){const idx=products.findIndex(p=>p.id==id); if(idx!==-1) products[idx]={...products[idx],...data}; if(liveStatus) liveStatus.textContent=`Updated product ${name}`;} else {data.id=Date.now(); products.push(data); if(liveStatus) liveStatus.textContent=`Added product ${name}`;} saveProducts(); renderCards(); renderTable(); if(window.location.pathname.endsWith('add-product.html')){ setTimeout(()=>location.href='products.html',300); return; } resetForm(); if(toggleFormBtn && productFormWrapper && !productFormWrapper.classList.contains('collapsed')){ productFormWrapper.classList.add('collapsed'); toggleFormBtn.textContent='➕ Add Product'; toggleFormBtn.setAttribute('aria-expanded','false'); toggleFormBtn.focus(); }};
    const handleDelete=id=>{ if(!confirm('Delete this product?')) return; products=products.filter(p=>p.id!==id); saveProducts(); renderCards(); renderTable(); };

    if(productForm) productForm.addEventListener('submit',handleFormSubmit);
    if(cancelBtn) cancelBtn.addEventListener('click',resetForm);
    if(toggleFormBtn && productFormWrapper) toggleFormBtn.addEventListener('click',()=>{const c=productFormWrapper.classList.toggle('collapsed'); toggleFormBtn.textContent=c?'➕ Add Product':'✖ Close Form'; toggleFormBtn.setAttribute('aria-expanded',c?'false':'true'); if(!c) document.getElementById('name')?.focus();});
    if(clearFiltersBtn) clearFiltersBtn.addEventListener('click',()=>{ if(productSearch) productSearch.value=''; if(categoryFilter) categoryFilter.value=''; renderCards(); renderTable(); if(liveStatus) liveStatus.textContent='Filters cleared'; });
    if(productSearch) productSearch.addEventListener('input',()=>{renderCards();renderTable();});
    if(categoryFilter) categoryFilter.addEventListener('change',()=>{renderCards();renderTable();});
    if(productList) productList.addEventListener('click',e=>{const del=e.target.closest('.delete-btn'); if(del){const id=parseInt(del.dataset.id,10); if(!isNaN(id)) handleDelete(id);} });
    if(productsTableBody) productsTableBody.addEventListener('click',e=>{const del=e.target.closest('.delete-btn'); if(del){const id=parseInt(del.dataset.id,10); if(!isNaN(id)) handleDelete(id);} });

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
    const fetchOrders=()=>JSON.parse(localStorage.getItem('proJetOrders')||'[]');
    const saveOrders=(o)=>localStorage.setItem('proJetOrders',JSON.stringify(o));
    const renderOrdersList=()=>{ if(!ordersContainer) return; const orders=fetchOrders().sort((a,b)=>new Date(b.date)-new Date(a.date)); if(!orders.length){ordersContainer.innerHTML='<p style="opacity:.7">No orders yet.</p>';return;} ordersContainer.innerHTML=orders.map(o=>`<div class="order-item" data-id="${o.orderId}"><div class="order-meta"><strong>${o.orderId}</strong> <span>${new Date(o.date).toLocaleString()}</span></div><div class="order-items">${o.items.map(i=>`${i.name} x${i.quantity}`).join(', ')}</div><div class="order-total">Total: ₹${o.total.toLocaleString('en-IN')}</div><button class="admin-button danger order-delete-btn" data-id="${o.orderId}">Delete</button></div>`).join(''); };
    const filterOrders=o=>{ let f=[...o]; const s=orderDateStart?.value; const e=orderDateEnd?.value; if(s){const sd=new Date(s+'T00:00:00'); f=f.filter(x=>new Date(x.date)>=sd);} if(e){const ed=new Date(e+'T23:59:59'); f=f.filter(x=>new Date(x.date)<=ed);} const dir=orderSort?.value||'newest'; f.sort((a,b)=>dir==='newest'?new Date(b.date)-new Date(a.date):new Date(a.date)-new Date(b.date)); return f; };
    const renderOrdersTable=()=>{ if(!ordersTableBody) return; const filtered=filterOrders(fetchOrders()); if(!filtered.length){ ordersTableBody.innerHTML=''; if(ordersEmpty) ordersEmpty.style.display='block'; return;} if(ordersEmpty) ordersEmpty.style.display='none'; ordersTableBody.innerHTML=filtered.map(o=>{const c=o.customer||{}; const items=o.items.map(i=>`<li>${i.name} x${i.quantity} <span class="muted">(₹${(i.price*i.quantity).toLocaleString('en-IN')})</span></li>`).join(''); return `<tr data-id="${o.orderId}"><td class="nowrap">${o.orderId}</td><td class="nowrap">${new Date(o.date).toLocaleString()}</td><td><div class="customer-block"><strong>${c.name||''}</strong><br>${c.mobile||''}<br>${c.email||''}<br>${(c.address||'').slice(0,60)}${(c.address||'').length>60?'…':''}<br>PIN: ${c.pincode||''}</div></td><td><ul class="order-items-list">${items}</ul></td><td class="nowrap">${o.total.toLocaleString('en-IN')}</td><td class="actions-cell"><button class="admin-button danger order-delete-btn" data-id="${o.orderId}">Delete</button></td></tr>`;}).join(''); };
    const deleteOrder=id=>{ const remaining=fetchOrders().filter(o=>o.orderId!==id); saveOrders(remaining); renderOrdersList(); renderOrdersTable(); };
    if(ordersContainer) ordersContainer.addEventListener('click',e=>{const d=e.target.closest('.order-delete-btn'); if(d && confirm('Delete order '+d.dataset.id+'?')) deleteOrder(d.dataset.id);});
    if(ordersTableBody) ordersTableBody.addEventListener('click',e=>{const d=e.target.closest('.order-delete-btn'); if(d && confirm('Delete order '+d.dataset.id+'?')) deleteOrder(d.dataset.id);});
    if(clearOrdersBtn) clearOrdersBtn.addEventListener('click',()=>{ if(confirm('Clear ALL orders?')){ saveOrders([]); renderOrdersList(); renderOrdersTable(); }});
    if(orderFiltersReset) orderFiltersReset.addEventListener('click',()=>{ if(orderDateStart) orderDateStart.value=''; if(orderDateEnd) orderDateEnd.value=''; if(orderSort) orderSort.value='newest'; renderOrdersTable(); if(liveStatus) liveStatus.textContent='Order filters cleared'; });
    if(orderDateStart) orderDateStart.addEventListener('change',renderOrdersTable);
    if(orderDateEnd) orderDateEnd.addEventListener('change',renderOrdersTable);
    if(orderSort) orderSort.addEventListener('change',renderOrdersTable);
    if(exportOrdersBtn) exportOrdersBtn.addEventListener('click',()=>{ const orders=filterOrders(fetchOrders()); if(!orders.length){alert('No orders to export.'); return;} const header=['Order ID','Date','Customer Name','Mobile','Email','Address','PIN','Items','Total']; const rows=orders.map(o=>{const c=o.customer||{}; const items=o.items.map(i=>`${i.name} x${i.quantity} (₹${i.price*i.quantity})`).join('; '); return [o.orderId,new Date(o.date).toLocaleString(),c.name||'',c.mobile||'',c.email||'',(c.address||'').replace(/\n/g,' '),c.pincode||'',items,o.total];}); const csv=[header,...rows].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='orders.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); });

    // Image preview
    const imageUrlInput=document.getElementById('imageUrl'); const imageAssetSelect=document.getElementById('imageAsset'); const imagePreview=document.getElementById('image-preview'); const imagePreviewPlaceholder=document.getElementById('image-preview-placeholder');
    const imageFileInput=document.getElementById('imageFile'); const imageDropzone=document.getElementById('image-dropzone');
    const MAX_FILE_SIZE=2*1024*1024; // 2MB
    const updatePreview=()=>{ if(!imagePreview||!imagePreviewPlaceholder) return; let src=imageUrlInput?.value.trim(); if(!src && imageAssetSelect?.value) src=imageAssetSelect.value; if(src){ imagePreview.src=src; imagePreview.style.display='block'; imagePreviewPlaceholder.style.display='none'; } else { imagePreview.src=''; imagePreview.style.display='none'; imagePreviewPlaceholder.style.display='inline'; } };
    const fileToDataURL=(file)=>new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=()=>rej(fr.error); fr.readAsDataURL(file); });
    const handleFile=async(file)=>{ if(!file) return; if(!file.type.startsWith('image/')){ alert('Only image files allowed.'); return; } if(file.size>MAX_FILE_SIZE){ alert('Image too large (max 2MB).'); return; } try { const dataUrl=await fileToDataURL(file); if(imageAssetSelect) imageAssetSelect.value=''; if(imageUrlInput){ imageUrlInput.value=dataUrl; } updatePreview(); } catch(err){ console.error(err); alert('Failed to read file.'); } };
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

    // Populate edit form (add-product page)
    const params=new URLSearchParams(window.location.search); const edit=params.get('edit'); if(edit && productForm){ const id=parseInt(edit,10); if(!isNaN(id)){ const p=products.find(pp=>pp.id===id); if(p){ document.getElementById('product-id').value=p.id; document.getElementById('name').value=p.name; document.getElementById('price').value=p.price; document.getElementById('description').value=p.description; document.getElementById('category').value=p.category||''; const iu=document.getElementById('imageUrl'); if(iu) iu.value=p.imageUrl||''; const ia=document.getElementById('imageAsset'); if(ia && p.imageUrl?.startsWith('assets/')) ia.value=p.imageUrl; if(formTitle) formTitle.textContent='Edit Product'; if(submitBtn) submitBtn.textContent='Update Product'; updatePreview(); } }}

    // Initial renders
    renderCards();
    renderTable();
    renderOrdersList();
    renderOrdersTable();
    updatePreview();
})();