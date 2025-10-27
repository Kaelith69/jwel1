// Reusable loading animation markup
const getLoadingMarkup = (label = 'Loading...') => `
    <div class="loading-state" role="status" aria-live="polite" aria-label="${label}">
        <span class="loading-gem" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
        </span>
    </div>
`;
// Utility functions for buffering and debouncing
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Declare cartManager globally
let cartManager;
let floatingCartBtn;
let cartSidebar;
let checkoutSummaryContainer;
let checkoutSummaryContainerMobile;

// Buffered UI updates to prevent excessive re-renders
const bufferedUIUpdates = {
    cartSummary: null,
    checkoutSummary: null,
    cartRender: null,

    init() {
        // Debounce cart summary updates (prevent excessive floating button updates)
        this.cartSummary = debounce(() => {
            const { itemCount } = cartManager.getTotals();
            if (floatingCartBtn) {
                const cartSidebarOpen = cartSidebar && cartSidebar.classList.contains('open');
                if (itemCount > 0 && !cartSidebarOpen) {
                    floatingCartBtn.removeAttribute('hidden');
                } else {
                    floatingCartBtn.setAttribute('hidden', '');
                }
            }
        }, 100);

        // Throttle checkout summary updates (limit to once per 200ms)
        this.checkoutSummary = throttle(() => {


            const updateSummary = (container, progressId, subtotalId, shippingId, grandTotalId, itemCountId) => {
                if (!container) return;
                // Always reload cart from localStorage before rendering summary
                let cartRaw = [];
                try {
                    cartRaw = (JSON.parse(localStorage.getItem('cart')) || []).map(item => {
                        const normalizedId = item.id != null ? String(item.id) : (item._docId != null ? String(item._docId) : null);
                        return normalizedId ? { ...item, id: normalizedId } : null;
                    }).filter(Boolean);
                } catch (e) { cartRaw = []; }

                // Use latest product details for each cart item
                const cartWithLatest = cartRaw.map(item => {
                    const latest = (typeof products !== 'undefined' && Array.isArray(products)) ? products.find(p => String(p.id) === String(item.id)) : null;
                    return latest ? { ...item, name: latest.name, price: latest.price } : item;
                });

                const progress = document.getElementById(progressId);
                if (progress) {
                    progress.innerHTML = getLoadingMarkup('Loading...');
                    progress.style.display = 'block';
                    progress.setAttribute('aria-hidden','false');
                }

                if (cartWithLatest.length === 0) {
                    // On checkout page, don't show empty cart message - just show empty summary
                    if (!window.location.pathname.endsWith('checkout.html')) {
                        container.innerHTML = '<div class="cart-empty" style="padding:1em;color:#b91c1c;text-align:center;">Your cart is empty. <a href="products.html">Add products</a> to continue.</div>';
                    } else {
                        container.innerHTML = '';
                    }
                    // Set all bill values to zero
                    const billSubtotal = document.getElementById(subtotalId);
                    const billShipping = document.getElementById(shippingId);
                    const billGrandTotal = document.getElementById(grandTotalId);
                    const itemCount = document.getElementById(itemCountId);
                    if (billSubtotal) billSubtotal.textContent = '₹0';
                    if (billShipping) billShipping.textContent = '₹0';
                    if (billGrandTotal) billGrandTotal.textContent = '₹0';
                    if (itemCount) itemCount.textContent = '0 items';
                    // Disable order button if present
                    const orderBtn = document.getElementById('whatsapp-order-btn');
                    if (orderBtn) orderBtn.disabled = true;
                    if (progress) { setTimeout(() => { progress.innerHTML = ''; progress.style.display = 'none'; progress.setAttribute('aria-hidden','true'); }, 300); }
                    return;
                } else {
                    // Enable order button if present
                    const orderBtn = document.getElementById('whatsapp-order-btn');
                    if (orderBtn) orderBtn.disabled = false;
                }

                container.innerHTML = cartWithLatest.map(item => `
                    <div class="order-item">
                        <div class="order-item-name">${item.name} <small>(x${item.quantity})</small></div>
                        <div class="order-item-price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</div>
                    </div>
                `).join('');

                const subtotal = cartWithLatest.reduce((sum, item) => sum + item.price * item.quantity, 0);
                // Calculate shipping: Free shipping above ₹5000, otherwise ₹200
                const shipping = 0;
                const grandTotal = subtotal + shipping;

                const billSubtotal = document.getElementById(subtotalId);
                const billShipping = document.getElementById(shippingId);
                const billGrandTotal = document.getElementById(grandTotalId);
                const itemCount = document.getElementById(itemCountId);

                if (billSubtotal) billSubtotal.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
                if (billShipping) billShipping.textContent = `₹${shipping.toLocaleString('en-IN')}`;
                if (billGrandTotal) billGrandTotal.textContent = `₹${grandTotal.toLocaleString('en-IN')}`;
                if (itemCount) itemCount.textContent = `${cartWithLatest.length} item${cartWithLatest.length !== 1 ? 's' : ''}`;

                // Hide checkout summary loaders
                const checkoutLoader = document.getElementById('checkout-summary-loader');
                const checkoutMobileLoader = document.getElementById('checkout-summary-mobile-loader');
                if (checkoutLoader) { 
                    checkoutLoader.style.display = 'none'; 
                    checkoutLoader.setAttribute('aria-hidden', 'true'); 
                }
                if (checkoutMobileLoader) { 
                    checkoutMobileLoader.style.display = 'none'; 
                    checkoutMobileLoader.setAttribute('aria-hidden', 'true'); 
                }

                if (progress) { setTimeout(() => { progress.innerHTML = ''; progress.style.display = 'none'; progress.setAttribute('aria-hidden','true'); }, 300); }
            };

            // Update mobile summary (only if mobile container exists)
            if (checkoutSummaryContainerMobile) {
                updateSummary(checkoutSummaryContainerMobile, 'checkout-progress-mobile', 'bill-subtotal-mobile', 'bill-shipping-mobile', 'bill-grand-total-mobile', 'item-count-mobile');
            }

            // Update desktop summary
            updateSummary(checkoutSummaryContainer, 'checkout-progress', 'bill-subtotal', 'bill-shipping', 'bill-grand-total', 'item-count');
        }, 200);

        // Throttle cart rendering (limit to once per 100ms)
        this.cartRender = throttle(() => {
            cartManager.render();
        }, 100);
    }
};


document.addEventListener('DOMContentLoaded', async () => {
    // Initialize UI manager for accessibility, skip links, and cart sidebar behavior
    if (window.UIManager) {
        try { window.ui = new window.UIManager(); } catch (e) { console.warn('UIManager init failed', e); }
    }

    // Declare UI elements
    const cartToggle = window.ui?.cartToggle;
    const cartCloseBtn = window.ui?.cartCloseBtn;
    cartSidebar = window.ui?.cartSidebar;
    const sidebarOverlay = window.ui?.sidebarOverlay;
    floatingCartBtn = document.getElementById('floating-cart-btn');

    // --- FORCE CHECKOUT SUMMARY RENDER ON CHECKOUT PAGE ---
    // (Moved to end of handler after all async/data init)

    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
    
    // --- FIREBASE INTEGRATION ---
    // Show loading indicator
    const showLoading = () => {
        const grid = document.getElementById('product-grid');
        if (!grid) return;
        grid.innerHTML = getLoadingMarkup('Loading products');
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
    cartManager = new window.CartManager();

    // --- RENDER FUNCTIONS (must be after cartManager/products are initialized) ---
    const getFilteredProducts = () => {
        const q = (currentFilters && currentFilters.search || '').toLowerCase().trim();
        return (products || []).filter(p => {
            const okCategory = !currentFilters || !currentFilters.category || p.category === currentFilters.category;
            const okSearch = !q || p.name.toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q);
            return okCategory && okSearch;
        });
    };

    const renderCart = () => {
        bufferedUIUpdates.cartRender();
    };

    const updateCartSummary = () => {
        bufferedUIUpdates.cartSummary();
    };

    const renderCheckoutSummary = () => {
        bufferedUIUpdates.checkoutSummary();
    };

    // Define checkout summary containers for bufferedUIUpdates
    checkoutSummaryContainer = document.getElementById('bill-items');
    checkoutSummaryContainerMobile = document.getElementById('bill-items-mobile');

    // Initialize buffered UI updates (after render functions are defined)
    bufferedUIUpdates.init();
    
    // Wire UIManager controls (if UIManager is available and instance stored on window.ui)
    if (window.ui) {
        try {
            const cartCloseBtn = window.ui.cartCloseBtn;
            const sidebarOverlay = window.ui.sidebarOverlay;
            if (cartCloseBtn) cartCloseBtn.addEventListener('click', () => window.ui.closeCart());
            if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => window.ui.closeCart());
            // Close cart on Escape
            document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') window.ui.closeCart(); });
        } catch (e) {
            console.warn('Failed to wire UIManager controls', e);
        }
    }
    // New floating cart button (declared earlier)
    // Floating cart count badge removed
    // Product grid (only present on products page)
    const productGrid = document.getElementById('product-grid');
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

    // WhatsApp order button (only present on checkout page)
    const whatsappOrderBtn = document.getElementById('whatsapp-order-btn');
    const whatsappQrWrapper = document.getElementById('whatsapp-qr-wrapper');
    const whatsappQrProgress = document.getElementById('whatsapp-qr-progress');
    const checkoutError = document.getElementById('checkout-error');
    const customerDetailsForm = document.getElementById('customer-details-form');
    const checkoutBtn = document.getElementById('checkout-btn');

    let currentFilters = { category: '', search: '' };
    const SHIPPING_CHARGE = 200;

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
        const isMobile = window.innerWidth <= 900;

        if (isOpen) {
            cartSidebar.classList.remove('open');
            cartSidebar.setAttribute('aria-hidden', 'true');
            cartToggle?.setAttribute('aria-expanded', 'false');
            cartToggle?.setAttribute('aria-label', 'Open shopping cart');
            document.body.style.overflow = '';
            if (sidebarOverlay) sidebarOverlay.style.display = 'none';
            document.removeEventListener('keydown', handleCartKeydown);
            // Remove focus trap
            document.removeEventListener('keydown', trapFocus);
            cartToggle?.focus();
            // Remove close mode on mobile when closing
            if (isMobile) {
                cartToggle?.classList.remove('cart-close-mode');
            }
            // Announce cart closed to screen readers
            announceToScreenReader('Shopping cart closed');
        } else {
            cartSidebar.classList.add('open');
            cartSidebar.setAttribute('aria-hidden', 'false');
            cartToggle?.setAttribute('aria-expanded', 'true');
            cartToggle?.setAttribute('aria-label', 'Close shopping cart');
            document.body.style.overflow = 'hidden';
            if (sidebarOverlay) sidebarOverlay.style.display = 'block';
            document.addEventListener('keydown', handleCartKeydown);
            // Add focus trap
            document.addEventListener('keydown', trapFocus);
            setTimeout(() => {
                const firstFocusable = cartSidebar.querySelector('button, [tabindex]:not([tabindex="-1"])');
                firstFocusable?.focus();
            }, 60);
            // Add close mode on mobile when opening
            if (isMobile) {
                cartToggle?.classList.add('cart-close-mode');
            }
            // Announce cart opened to screen readers
            announceToScreenReader('Shopping cart opened');
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

    // Focus trap for cart sidebar
    const trapFocus = (e) => {
        if (!cartSidebar?.classList.contains('open')) return;

        const focusableElements = cartSidebar.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        }
    };

    // Screen reader announcements
    const announceToScreenReader = (message) => {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);

        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
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

        const oldQuantity = item.quantity;
        let newQuantity;

        if (action === 'increase') {
            newQuantity = oldQuantity + 1;
            cartManager.updateQuantity(productId, newQuantity);
            announceToScreenReader(`Quantity of ${item.name} increased to ${newQuantity}`);
        } else if (action === 'decrease') {
            newQuantity = oldQuantity - 1;
            cartManager.updateQuantity(productId, newQuantity);
            if (newQuantity > 0) {
                announceToScreenReader(`Quantity of ${item.name} decreased to ${newQuantity}`);
            } else {
                announceToScreenReader(`${item.name} removed from cart`);
            }
        }
        updateCartSummary();
    };

    // Remove item from cart using CartManager
    const removeFromCart = (productId) => {
        const item = cartManager.cart.find(item => String(item.id) === String(productId));
        if (item) {
            announceToScreenReader(`${item.name} removed from cart`);
        }
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
        console.log('toggleCart called');
        if (!cartSidebar) return;
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
        
        if (!cartManager.cart || cartManager.cart.length === 0) {
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
        if (!isMobileDevice() && whatsappQrProgress) {
            whatsappQrProgress.innerHTML = getLoadingMarkup('Generating QR...');
            whatsappQrProgress.style.display='block';
            whatsappQrProgress.setAttribute('aria-hidden','false');
        }
        
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

            // Prepare order summary (use cartManager.cart)
            const subtotal = cartManager.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            // Calculate shipping: Free shipping above ₹5000, otherwise ₹200
            const shipping = 0;
            const grandTotal = subtotal + shipping;
            const itemCount = cartManager.cart.reduce((sum, item) => sum + item.quantity, 0);
            const placedAt = new Date();
            const orderReference = `ORD-${placedAt.getTime()}`;
            const orderTimestampIso = placedAt.toISOString();
            const orderSummary = cartManager.cart.map(item => `- ${item.name} (Qty: ${item.quantity}) - ₹${(item.price * item.quantity).toLocaleString('en-IN')}`).join('\n');

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
                items: cartManager.cart.map(item => ({
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

            let orderSavedLocally = false;
            try {
                const firestoreDocId = await FirebaseAdapter.addOrder(order);
                console.log('\u2705 Order saved to Firebase:', firestoreDocId);
            } catch (err) {
                console.error('Failed to save order to Firebase:', err);
                // Check if this is a local fallback (allow proceeding with WhatsApp)
                if (err.message && (err.message.includes('saved locally') || err.message.includes('connectivity issues'))) {
                    orderSavedLocally = true;
                    console.warn('Order saved locally due to connectivity issues, proceeding with WhatsApp');
                    if (checkoutError) {
                        checkoutError.textContent = 'Order saved locally. Proceeding with WhatsApp...';
                        checkoutError.style.display = 'block';
                        checkoutError.style.color = '#ff9800'; // Orange warning color
                    }
                } else {
                    if (checkoutError) {
                        checkoutError.textContent = 'Failed to save order: ' + err.message;
                        checkoutError.style.display = 'block';
                        checkoutError.style.color = '#dc3545';
                    }
                    return; // Don't proceed if order can't be saved at all
                }
            }

            // Show confirmation message briefly before redirecting
            const encodedMsg = encodeURIComponent(message);
            const whatsappMobileUrl = buildWhatsAppUrl(whatsappNumber, encodedMsg, { target: 'mobile' });
            const whatsappWebUrl = buildWhatsAppUrl(whatsappNumber, encodedMsg, { target: 'web' });

            if (isMobileDevice()) {
                if (checkoutError) {
                    const successMessage = orderSavedLocally 
                        ? 'Order saved locally! Redirecting you to WhatsApp...' 
                        : 'Order placed! Redirecting you to WhatsApp...';
                    checkoutError.textContent = successMessage;
                    checkoutError.style.display = 'block';
                    checkoutError.style.color = orderSavedLocally ? '#ff9800' : '#080';
                }
                const newWindow = window.open(whatsappMobileUrl, '_blank', 'noopener');
                if (!newWindow) {
                    window.location.href = whatsappMobileUrl;
                }
            } else {
                if (checkoutError) {
                    const successMessage = orderSavedLocally 
                        ? 'Order saved locally! Scan the QR code below with your phone to continue on WhatsApp.' 
                        : 'Order placed! Scan the QR code below with your phone to continue on WhatsApp.';
                    checkoutError.textContent = successMessage;
                    checkoutError.style.display = 'block';
                    checkoutError.style.color = orderSavedLocally ? '#ff9800' : '#080';
                }
                renderWhatsAppQr(whatsappMobileUrl, whatsappWebUrl);
                setWhatsAppButtonText('Regenerate WhatsApp QR', 'Regenerate WhatsApp QR for WhatsApp order');
            }

            cartManager.cart = [];
            cartManager.saveCart();
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
                (!navToggle || !navToggle.contains(e.target))) {
                mainNav.classList.remove('open');
                if (navToggle) {
                    navToggle.setAttribute('aria-expanded', 'false');
                    setNavIcon(false);
                }
                document.body.style.overflow = '';
            }
        });
        
        // Close nav with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mainNav.classList.contains('open')) {
                mainNav.classList.remove('open');
                if (navToggle) {
                    navToggle.setAttribute('aria-expanded', 'false');
                    setNavIcon(false);
                }
                document.body.style.overflow = '';
            }
        });
    }

    if (cartToggle) cartToggle.addEventListener('click', toggleCart);
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', toggleCart);
    
    // Handle window resize to update cart button state
    window.addEventListener('resize', () => {
        const isMobile = window.innerWidth <= 900;
        const isCartOpen = cartSidebar?.classList.contains('open');
        
        if (isMobile && isCartOpen) {
            cartToggle?.classList.add('cart-close-mode');
            cartToggle?.setAttribute('aria-label', 'Close shopping cart');
        } else {
            cartToggle?.classList.remove('cart-close-mode');
            cartToggle?.setAttribute('aria-label', 'Open shopping cart');
        }
    });
    
    // Floating cart button click opens cart sidebar
    if (floatingCartBtn) {
        floatingCartBtn.addEventListener('click', toggleCart);
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
            if (cartManager.cart.length > 0) {
                window.location.href = 'checkout.html';
            } else {
                notify('Your bag is empty.', 'error');
            }
        });
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
    // Check URL parameters for initial filter values
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam && filterCategorySelect) {
        currentFilters.category = normalizeCategory(categoryParam);
        // Don't set the select value yet, it will be set by populateCategoryFilter
    }
    
    populateCategoryFilter();
    // Now set the category filter if it was specified in URL
    if (categoryParam && filterCategorySelect) {
        const normalizedCategory = normalizeCategory(categoryParam);
        if (filterCategorySelect.querySelector(`option[value="${normalizedCategory}"]`)) {
            filterCategorySelect.value = normalizedCategory;
            currentFilters.category = normalizedCategory;
        }
    }
    showSkeletons(6);
    setTimeout(renderProducts, 250);
    renderCart();
    renderCheckoutSummary();

    // Ensure checkout summary is updated after everything loads
    setTimeout(() => {
        renderCheckoutSummary();
    }, 500);

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
        // Ensure checkout summary is updated on checkout page
        setTimeout(() => {
            renderCheckoutSummary();
        }, 100);
        // Additional delay to ensure everything is loaded
        setTimeout(() => {
            renderCheckoutSummary();
        }, 500);
    }

    // Make functions globally accessible for onclick handlers
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.updateQuantity = updateQuantity;
    window.openProductDetail = openProductModal; // Map to the correct function name

    // --- FORCE CHECKOUT SUMMARY RENDER ON CHECKOUT PAGE ---
    if (window.location.pathname.endsWith('checkout.html')) {
        // Render after all data is loaded and initialized
        renderCheckoutSummary();
        setTimeout(renderCheckoutSummary, 200);
        setTimeout(renderCheckoutSummary, 600);
    }
});