document.addEventListener('DOMContentLoaded', async () => {
    // Initialize UI manager for accessibility, skip links, and cart sidebar behavior
    if (window.UIManager) {
        try { new window.UIManager(); } catch (e) { console.warn('UIManager init failed', e); }
    }

    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
    
    // --- FIREBASE INTEGRATION ---
    // Show loading indicator
    const ensureLoadingStyles = () => {
        if (document.getElementById('loading-gem-styles')) return;
        const style = document.createElement('style');
        style.id = 'loading-gem-styles';
        style.textContent = `
            .loading-state { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 60px 20px; color: #666; text-align: center; font-size: 1rem; }
            .loading-state .loading-gem { display: inline-flex; align-items: center; justify-content: center; gap: 12px; transform: translateZ(0); perspective: 500px; }
            .loading-state .loading-gem span { display: inline-block; width: clamp(24px, 3vw, 32px); height: clamp(24px, 3vw, 32px); background: linear-gradient(135deg, #4f46e5 0%, #60a5fa 50%, #facc15 100%); border-radius: 18% 18% 42% 42%; transform: rotate(45deg) scale(0.88); box-shadow: 0 6px 14px rgba(79, 70, 229, 0.28); animation: gemPulse 1.2s ease-in-out infinite; opacity: 0.95; position: relative; overflow: hidden; will-change: transform, box-shadow, filter; }
            .loading-state .loading-gem span::after { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7), transparent 55%); opacity: 0.75; }
            .loading-state .loading-gem span:nth-child(2) { animation-delay: 0.18s; }
            .loading-state .loading-gem span:nth-child(3) { animation-delay: 0.36s; }
            @keyframes gemPulse { 0%, 100% { transform: rotate(45deg) scale(0.82) translateY(0); box-shadow: 0 6px 14px rgba(79, 70, 229, 0.18); filter: brightness(0.92); } 45% { transform: rotate(45deg) scale(1.08) translateY(-8px); box-shadow: 0 18px 30px rgba(250, 204, 21, 0.4); filter: brightness(1.12); } 55% { transform: rotate(45deg) scale(1.05) translateY(-5px); box-shadow: 0 12px 26px rgba(96, 165, 250, 0.35); filter: brightness(1.05); } }
        `;
        document.head.appendChild(style);
    };

    const showLoading = () => {
        const grid = document.getElementById('product-grid');
        if (!grid) return;
        ensureLoadingStyles();
        grid.innerHTML = `
            <div class="loading-state" role="status" aria-live="polite" aria-label="Loading products">
                <span class="loading-gem" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
            </div>
        `.trim();
    };
    
    const showError = (message) => {
        if (document.getElementById('product-grid')) {
            document.getElementById('product-grid').innerHTML = `<div style="text-align:center;padding:40px;color:#dc3545;"><p style="font-size:18px;">❌ ${message}</p><p style="margin-top:10px;"><a href="migrate-to-firebase.html" style="color:#3B82F6;">Go to Migration Tool</a></p></div>`;
        }
    };
    
    // Load Firebase Adapter
    let FirebaseAdapter;
    try {
        const FirebaseAdapterModule = await import('./js/firebase-adapter.js');
        FirebaseAdapter = FirebaseAdapterModule.default || FirebaseAdapterModule;
    } catch (err) {
        console.error('Failed to load Firebase adapter:', err);
        showError('Failed to load Firebase adapter. Please check your setup.');
        return;
    }
    
    // --- DATA ---
    // Load products from Firebase (NO localStorage fallback)
    let products = [];
    showLoading();
    
    try {
        products = await FirebaseAdapter.getProducts();
        console.log('✅ Loaded', products.length, 'products from Firebase');
        
        if (products.length === 0) {
            showError('No products found in Firebase. Please use the migration tool to upload products.');
            return;
        }
    } catch (err) {
        console.error('Failed to load products from Firebase:', err);
        showError('Failed to load products from Firebase: ' + err.message);
        return;
    }

    // Category normalization mapping (canonical categories)
    const CATEGORY_MAP = {
        'earring': 'Earrings', 'earrings': 'Earrings',
        'stud': 'Studs', 'studs': 'Studs',
        'ring': 'Ring', 'rings': 'Ring',
        'necklace': 'Necklace', 'necklaces': 'Necklace',
        'bracelet': 'Bracelet', 'bracelets': 'Bracelet',
        'bangle': 'Bangles', 'bangles': 'Bangles',
        'pendant': 'Pendant', 'pendants': 'Pendant',
        'brooch': 'Brooch', 'brooches': 'Brooch',
        'set': 'Set', 'sets': 'Set',
        'maang tikka': 'Maang Tikka', 'tikha': 'Maang Tikka',
        'kada': 'Kada', 'nose pin': 'Nose Pin', 'anklet': 'Anklet'
    };

    const normalizeCategory = (cat) => {
        if (!cat) return 'Other';
        const key = cat.toLowerCase().trim();
        return CATEGORY_MAP[key] || cat; // keep original if not mapped so we don't lose intent
    };

    // Normalize categories from Firebase data
    products = products.map(p => {
        const fallbackId = `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const normalizedId = p.id != null
            ? String(p.id)
            : (p._docId != null ? String(p._docId) : fallbackId);
        return {
            ...p,
            category: normalizeCategory(p.category),
            id: normalizedId
        };
    });
    
    // Use CartManager for all cart operations
    const cartManager = new window.CartManager();

    // --- DOM Elements ---
    const productGrid = document.getElementById('product-grid');
    const cartToggle = document.getElementById('cart-toggle');
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartCloseBtn = document.getElementById('cart-close-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const checkoutBtn = document.getElementById('checkout-btn');
    const checkoutSummaryContainer = document.getElementById('bill-items');
    const whatsappOrderBtn = document.getElementById('whatsapp-order-btn');
    const whatsappQrWrapper = document.getElementById('whatsapp-qr-wrapper');
    const whatsappQrProgress = document.getElementById('whatsapp-qr-progress');
    const customerDetailsForm = document.getElementById('customer-details-form');
    const checkoutError = document.getElementById('checkout-error');
    // New floating cart button
    const floatingCartBtn = document.getElementById('floating-cart-btn');
    // Floating cart count badge removed
    // Product filter UI (only present on products page)
    const filterCategorySelect = document.getElementById('filter-category');
    const filterClearBtn = document.getElementById('filter-clear');
    const filterSearchInput = document.getElementById('filter-search');
    // Product detail modal elements
    const productDetailModal = document.getElementById('product-detail-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalProductImage = document.getElementById('modal-product-image');
    const modalProductName = document.getElementById('modal-product-name');
    const modalProductCategory = document.getElementById('modal-product-category');
    const modalProductDescription = document.getElementById('modal-product-description');
    const modalProductPrice = document.getElementById('modal-product-price');
    const modalAddToCartBtn = document.getElementById('modal-add-to-cart');

    let currentFilters = { category: '', search: '' };
    const SHIPPING_CHARGE = 0;

    // --- RENDER FUNCTIONS ---

    // Render products on the products page
    const getFilteredProducts = () => {
        const q = (currentFilters.search || '').toLowerCase().trim();
        return products.filter(p => {
            const okCategory = !currentFilters.category || p.category === currentFilters.category;
            const okSearch = !q || p.name.toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q);
            return okCategory && okSearch;
        });
    };

    const populateCategoryFilter = () => {
        if (!filterCategorySelect) return;
        // Collect unique categories from products (sorted alpha, stable)
        const cats = Array.from(new Set(products.map(p => p.category))).sort((a,b)=>a.localeCompare(b));
        const prev = filterCategorySelect.value;
        filterCategorySelect.innerHTML = '<option value="">All</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
        if (cats.includes(prev)) filterCategorySelect.value = prev; else filterCategorySelect.value = '';
    };

    const renderProducts = () => {
        if (!productGrid) return;
        const list = getFilteredProducts();
        if (!list.length) {
            productGrid.innerHTML = '<div class="no-products-message">No products match your filters.</div>';
            return;
        }
        productGrid.innerHTML = list.map(product => {
            // Fallback for image property (imageUrl or image)
            const imgSrc = product.imageUrl || product.image || '/logo/logo.png';
            // Fallback for price formatting
            const price = typeof product.price === 'number' ? `₹${product.price.toLocaleString('en-IN')}` : product.price;
            // Compose data-product attribute for SSR/JS parity
            const dataProduct = JSON.stringify({
                name: product.name,
                price: price,
                image: imgSrc,
                category: product.category,
                description: product.description
            });
            return `
<article class="product-card" tabindex="0" data-product='${dataProduct}' data-product-id="${String(product.id)}">
    <div class="product-image-container" aria-hidden="true">
        <img class="product-image" src="${imgSrc}" alt="${product.name}" loading="lazy" decoding="async" onerror="this.src='/logo/logo.png'">
    </div>
    <div class="product-info">
        <div class="product-name">${product.name}</div>
        <div class="product-price">${price}</div>
        <div class="product-category">${product.category || ''}</div>
        <div class="product-actions">
            <button class="add-to-cart-btn" type="button" data-id="${String(product.id)}" aria-label="Add to cart">
                <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i>
            </button>
            <button class="view-details-btn" type="button" aria-label="View details" data-id="${String(product.id)}">View</button>
        </div>
    </div>
</article>
            `;
        }).join('');
    };

    // Show skeletons helper
    const showSkeletons = (count = 6) => {
        if (!productGrid) return;
        const skeletons = Array.from({ length: count }).map(() => `
            <div class="skeleton-card">
                <div class="skeleton-img"></div>
                <div class="skeleton-text medium"></div>
                <div class="skeleton-text small"></div>
            </div>
        `).join('');
        productGrid.innerHTML = `<div class="skeleton-grid">${skeletons}</div>`;
    };

    // Use CartManager's render for cart sidebar
    const renderCart = () => {
        cartManager.render();
    };

    // Update floating cart button count using CartManager
    const updateCartSummary = () => {
        const { itemCount } = cartManager.getTotals();
        if (floatingCartBtn) {
            const cartSidebarOpen = cartSidebar && cartSidebar.classList.contains('open');
            if (itemCount > 0 && !cartSidebarOpen) {
                floatingCartBtn.removeAttribute('hidden');
            } else {
                floatingCartBtn.setAttribute('hidden', '');
            }
        }
    };

    // Render checkout page summary
    const renderCheckoutSummary = () => {
        if (!checkoutSummaryContainer) return;
        const progress = document.getElementById('checkout-progress');
        if (progress) { progress.style.display = 'block'; progress.setAttribute('aria-hidden','false'); }

        checkoutSummaryContainer.innerHTML = cart.map(item => `
            <div class="bill-item">
                <span>${item.name} (x${item.quantity})</span>
                <span>₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
            </div>
        `).join('');

        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = SHIPPING_CHARGE;
    const grandTotal = subtotal + shipping;
        
        const billSubtotal = document.getElementById('bill-subtotal');
        const billShipping = document.getElementById('bill-shipping');
        const billGrandTotal = document.getElementById('bill-grand-total');
        if (billSubtotal) billSubtotal.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
        if (billShipping) billShipping.textContent = `₹${shipping.toLocaleString('en-IN')}`;
        if (billGrandTotal) billGrandTotal.textContent = `₹${grandTotal.toLocaleString('en-IN')}`;
        if (progress) { setTimeout(() => { progress.style.display = 'none'; progress.setAttribute('aria-hidden','true'); }, 300); }
    };

    // --- EVENT HANDLERS ---

    // Product card click/tap opens modal with details
    if (productGrid) {
        productGrid.addEventListener('click', function(e) {
            // If 'View' button is clicked, open modal with full details
            const viewBtn = e.target.closest('.view-details-btn');
            if (viewBtn) {
                const card = viewBtn.closest('.product-card');
                if (!card) return;
                const productId = card.getAttribute('data-product-id');
                if (productId) openProductModal(productId, true);
                return;
            }
            // Only open modal if the click is on the card but not on add-to-cart or view button
            const card = e.target.closest('.product-card');
            if (!card) return;
            if (e.target.classList && (e.target.classList.contains('add-to-cart-btn') || e.target.closest('.add-to-cart-btn'))) return;
            const productId = card.getAttribute('data-product-id');
            if (productId) openProductModal(productId);
        });
        // Keyboard accessibility: open modal on Enter/Space
        productGrid.addEventListener('keydown', function(e) {
            if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('product-card')) {
                e.preventDefault();
                const productId = e.target.getAttribute('data-product-id');
                if (productId) openProductModal(productId);
            }
        });
    }
    
    // Toggle cart sidebar with overlay and ESC key support
    // sidebarOverlay is now declared at top scope
    const toggleCart = () => {
        if (!cartSidebar) return;
        const isOpen = cartSidebar.classList.contains('open');
        if (isOpen) {
            cartSidebar.classList.remove('open');
            cartSidebar.setAttribute('aria-hidden', 'true');
            cartToggle?.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            if (sidebarOverlay) sidebarOverlay.style.display = 'none';
            document.removeEventListener('keydown', handleCartKeydown);
            cartToggle?.focus();
        } else {
            cartSidebar.classList.add('open');
            cartSidebar.setAttribute('aria-hidden', 'false');
            cartToggle?.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            if (sidebarOverlay) sidebarOverlay.style.display = 'block';
            document.addEventListener('keydown', handleCartKeydown);
            setTimeout(() => { cartCloseBtn?.focus(); }, 60);
        }
        updateCartSummary();
    };

    // Overlay click closes cart (moved to after DOMContentLoaded)

    // Handle keyboard navigation in cart
    const handleCartKeydown = (e) => {
        if (e.key === 'Escape') {
            toggleCart();
        }
    };

    // Add product to cart using CartManager
    const addToCart = (productId) => {
        const productToAdd = products.find(p => String(p.id) === String(productId));
        if (!productToAdd) {
            console.error('Product not found:', productId);
            return;
        }
        cartManager.addItem(productToAdd);
        updateCartSummary();
    };

    // Update item quantity in cart using CartManager
    const updateQuantity = (productId, action) => {
        const item = cartManager.cart.find(item => String(item.id) === String(productId));
        if (!item) return;
        if (action === 'increase') {
            cartManager.updateQuantity(productId, item.quantity + 1);
        } else if (action === 'decrease') {
            cartManager.updateQuantity(productId, item.quantity - 1);
        }
        updateCartSummary();
    };
    
    // Remove item from cart using CartManager
    const removeFromCart = (productId) => {
        cartManager.removeItem(productId);
        updateCartSummary();
    };
    
    // Save cart to localStorage (now handled by CartManager)
    const saveCart = () => {
        cartManager.saveCart();
    };

    // Clear entire cart using CartManager
    const clearCart = () => {
        cartManager.clear();
        updateCartSummary();
    };

    // --- PRODUCT DETAIL MODAL FUNCTIONS ---
    
    // Open product detail modal
    const openProductModal = (productId, floating = false) => {
        const lookupId = String(productId);
        const product = products.find(p => String(p.id) === lookupId);
        if (!product || !productDetailModal) return;

        // Fallback for image property (imageUrl or image)
        const imgSrc = product.imageUrl || product.image || '/logo/logo.png';
        // Fallback for price formatting
        const price = typeof product.price === 'number' ? `₹${product.price.toLocaleString('en-IN')}` : product.price;

        // Populate modal with product data
        if (modalProductImage) {
            modalProductImage.loading = 'lazy';
            modalProductImage.decoding = 'async';
            modalProductImage.src = imgSrc;
            modalProductImage.alt = product.name;
        }
        if (modalProductName) modalProductName.textContent = product.name;
        if (modalProductCategory) modalProductCategory.textContent = product.category;
        if (modalProductDescription) modalProductDescription.textContent = product.description || '';
        if (modalProductPrice) modalProductPrice.textContent = price;

        // Set up the modal add to cart button
        if (modalAddToCartBtn) {
            modalAddToCartBtn.onclick = () => {
                addToCart(lookupId);
                closeProductModal();
            };
        }

        // Show modal (floating style always for this site)
        productDetailModal.style.display = 'flex';
        setTimeout(() => {
            productDetailModal.classList.add('active');
            modalCloseBtn && modalCloseBtn.focus();
        }, 10);

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    };

    // Modal close logic
    if (typeof modalCloseBtn !== 'undefined' && modalCloseBtn) {
        modalCloseBtn.onclick = closeProductModal;
    }
    if (typeof productDetailModal !== 'undefined' && productDetailModal) {
        productDetailModal.addEventListener('click', (e) => {
            if (e.target === productDetailModal) closeProductModal();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (productDetailModal && productDetailModal.style.display !== 'none' && (e.key === 'Escape' || e.key === 'Esc')) {
            closeProductModal();
        }
    });

    function closeProductModal() {
        if (!productDetailModal) return;
        productDetailModal.classList.remove('active');
        setTimeout(() => {
            productDetailModal.style.display = 'none';
            document.body.style.overflow = '';
        }, 180);
    }

    // WhatsApp order logic (dynamic from Firebase settings)
    async function getWhatsAppNumber(){
        try {
            const settings = await FirebaseAdapter.getSettings();
            if (settings?.whatsappNumber) {
                const sanitized = String(settings.whatsappNumber).replace(/[^0-9]/g, '');
                if (sanitized.length >= 10 && sanitized.length <= 15) {
                    return sanitized;
                }
                console.warn('WhatsApp number from settings is invalid after sanitizing:', settings.whatsappNumber);
            }
        } catch (err) {
            console.warn('Failed to load WhatsApp number from Firebase:', err);
        }
        return '919961165503'; // fallback default
    }

    const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Windows Phone|Opera Mini/i.test((navigator.userAgent || '').toLowerCase());

    function setWhatsAppButtonText(text, ariaLabel) {
        if (!whatsappOrderBtn) return;
        whatsappOrderBtn.textContent = text;
        whatsappOrderBtn.setAttribute('aria-label', ariaLabel || text);
    }

    if (whatsappOrderBtn) {
        if (isMobileDevice()) {
            setWhatsAppButtonText('Place Order on WhatsApp');
        } else {
            setWhatsAppButtonText('Generate WhatsApp QR', 'Generate WhatsApp QR for WhatsApp order');
        }
    }

    function buildWhatsAppUrl(phone, encodedMessage, { target = 'auto' } = {}) {
        const baseParams = `phone=${phone}&text=${encodedMessage}`;
        const resolvedTarget = target === 'auto'
            ? (isMobileDevice() ? 'mobile' : 'web')
            : target;
        if (resolvedTarget === 'mobile') {
            return `https://wa.me/${phone}?text=${encodedMessage}`;
        }
        return `https://web.whatsapp.com/send?${baseParams}`;
    }

    function renderWhatsAppQr(mobileUrl, desktopUrl) {
        if (!whatsappQrWrapper) return;
        const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(mobileUrl)}`;
        whatsappQrWrapper.innerHTML = `
            <p class="qr-instructions">Scan this QR code with WhatsApp on your phone to continue your order.</p>
            <img src="${qrSrc}" alt="WhatsApp order QR code" class="whatsapp-qr-image" loading="lazy" decoding="async">
            <a href="${desktopUrl}" target="_blank" rel="noopener" class="qr-fallback-link">Open on WhatsApp Web instead</a>
        `;
        // Hide the QR progress bar once image loads or fails
        try {
            const img = whatsappQrWrapper.querySelector('.whatsapp-qr-image');
            if (img) {
                const hideProgress = () => { if (whatsappQrProgress) { whatsappQrProgress.style.display='none'; whatsappQrProgress.setAttribute('aria-hidden','true'); } };
                img.addEventListener('load', hideProgress, { once: true });
                img.addEventListener('error', hideProgress, { once: true });
            }
        } catch(_) {}
        whatsappQrWrapper.hidden = false;
        whatsappQrWrapper.classList.add('visible');
    }

    function validateEmail(email) {
        // Simple email regex with null check
        if (!email || typeof email !== 'string') return false;
        return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
    }

    function validateMobile(mobile) {
        // Validate 10-digit mobile number with null check
        if (!mobile || typeof mobile !== 'string') return false;
        return /^[0-9]{10}$/.test(mobile.trim());
    }

    function validatePincode(pincode) {
        // Validate 6-digit PIN code with null check
        if (!pincode || typeof pincode !== 'string') return false;
        return /^[0-9]{6}$/.test(pincode.trim());
    }

    async function handleWhatsAppOrder(e) {
        if (e) e.preventDefault();
        
        // Clear any previous errors
        if (checkoutError) {
            checkoutError.style.display = 'none';
            checkoutError.style.color = '';
            checkoutError.textContent = '';
        }
        if (whatsappQrWrapper) {
            whatsappQrWrapper.hidden = true;
            whatsappQrWrapper.classList.remove('visible');
            whatsappQrWrapper.innerHTML = '';
        }
        if (whatsappQrProgress) { whatsappQrProgress.style.display='none'; whatsappQrProgress.setAttribute('aria-hidden','true'); }
        
        if (!cart || cart.length === 0) {
            if (checkoutError) {
                checkoutError.textContent = 'Your cart is empty. Please add some items before checkout.';
                checkoutError.style.display = 'block';
            }
            return;
        }
        
        const name = document.getElementById('customer-name')?.value.trim();
        const mobile = document.getElementById('customer-mobile')?.value.trim();
        const email = document.getElementById('customer-email')?.value.trim();
        const address = document.getElementById('customer-address')?.value.trim();
        const pincode = document.getElementById('customer-pincode')?.value.trim();
        
        // Validate required fields (email is optional)
        if (!name || !mobile || !address || !pincode) {
            if (checkoutError) {
                checkoutError.textContent = 'Please fill in all required fields marked with *';
                checkoutError.style.display = 'block';
                checkoutError.style.color = '#e53935';
                
                // Highlight empty required fields
                [
                    {field: document.getElementById('customer-name'), value: name},
                    {field: document.getElementById('customer-mobile'), value: mobile},
                    {field: document.getElementById('customer-address'), value: address},
                    {field: document.getElementById('customer-pincode'), value: pincode}
                ].forEach(({field, value}) => {
                    if (field && !value) {
                        field.setAttribute('aria-invalid', 'true');
                        field.style.borderColor = '#e53935';
                        field.addEventListener('input', function handler() {
                            field.removeAttribute('aria-invalid');
                            field.style.borderColor = '';
                            field.removeEventListener('input', handler);
                        });
                    }
                });
            }
            return;
        }
        
        // Validate mobile number
        if (!validateMobile(mobile)) {
            if (checkoutError) {
                checkoutError.textContent = 'Please enter a valid 10-digit mobile number.';
                checkoutError.style.display = 'block';
            }
            const f = document.getElementById('customer-mobile');
            if (f) {
                f.setAttribute('aria-invalid', 'true');
                f.style.borderColor = '#e53935';
                f.addEventListener('input', function handler(){ f.removeAttribute('aria-invalid'); f.style.borderColor=''; f.removeEventListener('input', handler); });
            }
            return;
        }
        
        // Validate PIN code
        if (!validatePincode(pincode)) {
            if (checkoutError) {
                checkoutError.textContent = 'Please enter a valid 6-digit PIN code.';
                checkoutError.style.display = 'block';
            }
            const f = document.getElementById('customer-pincode');
            if (f) {
                f.setAttribute('aria-invalid', 'true');
                f.style.borderColor = '#e53935';
                f.addEventListener('input', function handler(){ f.removeAttribute('aria-invalid'); f.style.borderColor=''; f.removeEventListener('input', handler); });
            }
            return;
        }
        
        // Validate email only if provided (optional field)
        if (email && !validateEmail(email)) {
            if (checkoutError) {
                checkoutError.textContent = 'Please enter a valid email address (example: name@example.com).';
                checkoutError.style.display = 'block';
            }
            const f = document.getElementById('customer-email');
            if (f) {
                f.setAttribute('aria-invalid', 'true');
                f.style.borderColor = '#e53935';
                f.addEventListener('input', function handler(){ f.removeAttribute('aria-invalid'); f.style.borderColor=''; f.removeEventListener('input', handler); });
            }
            return;
        }
        const submitButton = whatsappOrderBtn;
        if (submitButton) {
            submitButton.disabled = true;
            if (isMobileDevice()) {
                setWhatsAppButtonText('Processing...');
            } else {
                setWhatsAppButtonText('Generating WhatsApp QR...', 'Generating WhatsApp QR for WhatsApp order');
            }
        }
        if (!isMobileDevice() && whatsappQrProgress) { whatsappQrProgress.style.display='block'; whatsappQrProgress.setAttribute('aria-hidden','false'); }
        
        try {
            const whatsappNumber = await getWhatsAppNumber();
            if (!whatsappNumber) {
                if (checkoutError) {
                    checkoutError.textContent = 'WhatsApp number is not configured. Please update it in settings.';
                    checkoutError.style.display = 'block';
                    checkoutError.style.color = '#dc3545';
                }
                if (whatsappQrProgress) { whatsappQrProgress.style.display='none'; whatsappQrProgress.setAttribute('aria-hidden','true'); }
                return;
            }

            // Prepare order summary
            const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const shipping = SHIPPING_CHARGE;
            const grandTotal = subtotal + shipping;
            const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
            const placedAt = new Date();
            const orderReference = `ORD-${placedAt.getTime()}`;
            const orderTimestampIso = placedAt.toISOString();
            const orderSummary = cart.map(item => `- ${item.name} (Qty: ${item.quantity}) - ₹${(item.price * item.quantity).toLocaleString('en-IN')}`).join('\n');

            const message =
`Hello! I would like to place the following order from VastraVeda Jewelleries:\n\n*Order ID:* ${orderReference}\n\n*Customer Details:*\nName: ${name}\nMobile: ${mobile}\nEmail: ${email || 'Not provided'}\nAddress: ${address}\nPIN Code: ${pincode}\n\n*Order Summary:*\n${orderSummary}\n\n*Total Price: ₹${grandTotal.toLocaleString('en-IN')}*\n\nPlease confirm the order and delivery details.`;

            // Save order to Firebase (required)
            const order = {
                orderId: orderReference,
                status: 'Pending',
                source: 'storefront-checkout',
                channel: 'whatsapp',
                currency: 'INR',
                subtotal,
                shipping,
                total: grandTotal,
                itemCount,
                date: orderTimestampIso,
                createdAt: orderTimestampIso,
                updatedAt: orderTimestampIso,
                customer: {
                    name,
                    mobile,
                    email: email || null,
                    address,
                    pincode
                },
                items: cart.map(item => ({
                    id: item.id || item._docId,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    lineTotal: item.price * item.quantity
                })),
                statusHistory: [
                    { status: 'Pending', changedAt: orderTimestampIso, changedBy: 'customer' }
                ],
                whatsappMessage: message,
                notes: 'Order initiated via checkout form and shared over WhatsApp.'
            };

            try {
                const firestoreDocId = await FirebaseAdapter.addOrder(order);
                console.log('\u2705 Order saved to Firebase:', firestoreDocId);
            } catch (err) {
                console.error('Failed to save order to Firebase:', err);
                if (checkoutError) {
                    checkoutError.textContent = 'Failed to save order: ' + err.message;
                    checkoutError.style.display = 'block';
                    checkoutError.style.color = '#dc3545';
                }
                return; // Don't proceed if order can't be saved
            }

            // Show confirmation message briefly before redirecting
            const encodedMsg = encodeURIComponent(message);
            const whatsappMobileUrl = buildWhatsAppUrl(whatsappNumber, encodedMsg, { target: 'mobile' });
            const whatsappWebUrl = buildWhatsAppUrl(whatsappNumber, encodedMsg, { target: 'web' });

            if (isMobileDevice()) {
                if (checkoutError) {
                    checkoutError.textContent = 'Order placed! Redirecting you to WhatsApp...';
                    checkoutError.style.display = 'block';
                    checkoutError.style.color = '#080';
                }
                const newWindow = window.open(whatsappMobileUrl, '_blank', 'noopener');
                if (!newWindow) {
                    window.location.href = whatsappMobileUrl;
                }
            } else {
                if (checkoutError) {
                    checkoutError.textContent = 'Order placed! Scan the QR code below with your phone to continue on WhatsApp.';
                    checkoutError.style.display = 'block';
                    checkoutError.style.color = '#080';
                }
                renderWhatsAppQr(whatsappMobileUrl, whatsappWebUrl);
                setWhatsAppButtonText('Regenerate WhatsApp QR', 'Regenerate WhatsApp QR for WhatsApp order');
            }

            cart = [];
            saveCart();
            updateCartSummary();
            renderCheckoutSummary();
        } catch (error) {
            console.error('Error processing order:', error);
            if (checkoutError) {
                checkoutError.textContent = 'An error occurred while processing your order. Please try again.';
                checkoutError.style.display = 'block';
            }
            if (whatsappQrProgress) { whatsappQrProgress.style.display='none'; whatsappQrProgress.setAttribute('aria-hidden','true'); }
        } finally {
            if (submitButton) {
                setTimeout(() => {
                    submitButton.disabled = false;
                    if (isMobileDevice()) {
                        setWhatsAppButtonText('Place Order on WhatsApp');
                    } else if (whatsappQrWrapper && whatsappQrWrapper.classList.contains('visible')) {
                        setWhatsAppButtonText('Regenerate WhatsApp QR', 'Regenerate WhatsApp QR for WhatsApp order');
                    } else {
                        setWhatsAppButtonText('Generate WhatsApp QR', 'Generate WhatsApp QR for WhatsApp order');
                    }
                }, 2000);
            }
            if (!whatsappQrWrapper || !whatsappQrWrapper.classList.contains('visible')) {
                if (whatsappQrProgress) { whatsappQrProgress.style.display='none'; whatsappQrProgress.setAttribute('aria-hidden','true'); }
            }
        }
    }

    // --- EVENT LISTENERS ---

    // Mobile nav toggle
    const navToggle = document.getElementById('nav-toggle');
    const mainNav = document.getElementById('site-main-nav');
    if (navToggle && mainNav) {
        const navIcon = navToggle.querySelector('i');
        const setNavIcon = (open) => {
            if (!navIcon) return;
            navIcon.classList.remove('fa-bars', 'fa-xmark');
            navIcon.classList.add('fa-solid', open ? 'fa-xmark' : 'fa-bars');
            navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        };
        // Ensure initial state
        setNavIcon(false);

        navToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = mainNav.classList.toggle('open');
            navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            setNavIcon(isOpen);
            
            // Handle body scroll
            if (isOpen) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
        
        // Close nav when clicking outside
        document.addEventListener('click', (e) => {
            if (mainNav.classList.contains('open') && 
                !mainNav.contains(e.target) && 
                !navToggle.contains(e.target)) {
                mainNav.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
                setNavIcon(false);
                document.body.style.overflow = '';
            }
        });
        
        // Close nav with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mainNav.classList.contains('open')) {
                mainNav.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
                setNavIcon(false);
                document.body.style.overflow = '';
            }
        });
    }

    if (cartToggle) cartToggle.addEventListener('click', toggleCart);
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', toggleCart);
    // Floating cart button click opens cart sidebar
    if (floatingCartBtn) {
        floatingCartBtn.addEventListener('click', function() {
            if (cartSidebar && !cartSidebar.classList.contains('open')) {
                cartSidebar.classList.add('open');
                cartSidebar.setAttribute('aria-hidden', 'false');
                updateCartSummary();
            }
        });
    }
    
    // Product detail modal event listeners
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeProductModal);
    if (productDetailModal) {
        productDetailModal.addEventListener('click', (e) => {
            // Close modal when clicking on the overlay (not the modal content)
            if (e.target === productDetailModal || e.target.classList.contains('modal-overlay')) {
                closeProductModal();
            }
        });
    }
    
    // Keyboard event handling for modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && productDetailModal && productDetailModal.classList.contains('active')) {
            closeProductModal();
        }
    });
    
    // Improved overlay click handling
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function(e) {
            // Only close if click is directly on the overlay, not inside the sidebar
            if (e.target === sidebarOverlay) {
                toggleCart();
            }
        });
    }

    // Event delegation for dynamically created buttons
    document.body.addEventListener('click', (e) => {
        // Product card click to open modal (but not for add-to-cart button)
        const productCard = e.target.closest('.product-card');
        if (productCard && !e.target.closest('.add-to-cart-btn')) {
            const productId = productCard.dataset.productId;
            if (productId) {
                openProductModal(productId);
                return;
            }
        }

        // Use closest() so clicks on child elements (like icons) still work
        const addBtn = e.target.closest('.add-to-cart-btn');
        if (addBtn) {
            const id = addBtn.dataset.id;
            if (id) addToCart(id);
            return; // Prevent falling through to other handlers
        }

        const qtyBtn = e.target.closest('.quantity-btn');
        if (qtyBtn) {
            const id = qtyBtn.dataset.id;
            const action = qtyBtn.dataset.action;
            if (id && action) updateQuantity(id, action);
            return;
        }

        const removeBtn = e.target.closest('.remove-item-btn');
        if (removeBtn) {
            const id = removeBtn.dataset.id;
            if (id) removeFromCart(id);
        }
    });

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length > 0) {
                window.location.href = 'checkout.html';
            } else {
                notify('Your bag is empty.', 'error');
            }
        });
    }

    // Clear cart button
    const clearCartBtn = document.getElementById('clear-cart-btn');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', clearCart);
    }

    if (customerDetailsForm) {
        customerDetailsForm.addEventListener('submit', handleWhatsAppOrder);
    }
    
    // Filter listeners (only on products page)
    if (filterCategorySelect) {
        filterCategorySelect.addEventListener('change', () => {
            currentFilters.category = filterCategorySelect.value;
            showSkeletons(6);
            setTimeout(renderProducts, 250);
        });
    }
    if (filterClearBtn) {
        filterClearBtn.addEventListener('click', () => {
            currentFilters = { category: '', search: '' };
            if (filterCategorySelect) filterCategorySelect.value = '';
            if (filterSearchInput) filterSearchInput.value = '';
            showSkeletons(6);
            setTimeout(renderProducts, 250);
        });
    }

    if (filterSearchInput) {
        const doSearch = () => {
            currentFilters.search = filterSearchInput.value || '';
            showSkeletons(6);
            setTimeout(renderProducts, 250);
        };
        filterSearchInput.addEventListener('input', () => {
            // Debounce lightweight: wait a tick
            clearTimeout(filterSearchInput._t);
            filterSearchInput._t = setTimeout(doSearch, 200);
        });
        filterSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
        });
    }

    // --- INITIAL LOAD ---
    populateCategoryFilter();
    showSkeletons(6);
    setTimeout(renderProducts, 250);
    renderCart();
    renderCheckoutSummary();

    // Initial ARIA state for cart
    if (cartSidebar) {
        cartSidebar.setAttribute('role', 'dialog');
        cartSidebar.setAttribute('aria-hidden', 'true');
        cartSidebar.setAttribute('aria-modal', 'true');
    }
    if (cartToggle) {
        cartToggle.setAttribute('aria-controls', 'cart-sidebar');
        cartToggle.setAttribute('aria-expanded', 'false');
    }

    // Hide 'Proceed to Checkout' button on checkout page
    if (checkoutBtn && window.location.pathname.endsWith('checkout.html')) {
        checkoutBtn.style.display = 'none';
    }

    // Make functions globally accessible for onclick handlers
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.updateQuantity = updateQuantity;
    window.openProductDetail = openProductModal; // Map to the correct function name
});