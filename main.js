document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI manager for accessibility, skip links, and cart sidebar behavior
    if (window.UIManager) {
        try { new window.UIManager(); } catch (e) { console.warn('UIManager init failed', e); }
    }
    // --- DATA ---
    // Initialize products from localStorage or use default data
    const initializeProducts = () => {
        const productsInStorage = localStorage.getItem('products');
        const dataVersion = localStorage.getItem('productsDataVersion');
        const currentVersion = '2.0'; // Updated version to force refresh
        
        // If no products or old version, use new default data
        if (!productsInStorage || dataVersion !== currentVersion) {
            const defaultProducts = [
                { id: 1, name: 'Ethereal Diamond Necklace', price: 120000, description: 'A stunning necklace featuring a pear-cut diamond, surrounded by a halo of smaller gems.', imageUrl: 'assets/IMG-20250812-WA0001.jpg', category: 'Necklace' },
                { id: 2, name: 'Sapphire Dream Ring', price: 95000, description: 'An elegant ring with a central blue sapphire, set in a white gold band.', imageUrl: 'assets/IMG-20250812-WA0002.jpg', category: 'Ring' },
                { id: 3, name: 'Ruby Radiance Earrings', price: 78000, description: 'Exquisite drop earrings with vibrant rubies that catch the light beautifully.', imageUrl: 'assets/IMG-20250812-WA0003.jpg', category: 'Earrings' },
                { id: 4, name: 'Emerald Isle Bracelet', price: 150000, description: 'A timeless bracelet adorned with square-cut emeralds and diamonds.', imageUrl: 'assets/IMG-20250812-WA0004.jpg', category: 'Bracelet' },
                { id: 5, name: 'Golden Grace Bangles', price: 67000, description: 'Classic gold bangles with intricate filigree work.', imageUrl: 'assets/IMG-20250812-WA0005.jpg', category: 'Bangles' },
                { id: 6, name: 'Pearl Elegance Necklace', price: 54000, description: 'A string of lustrous pearls with a diamond-studded clasp.', imageUrl: 'assets/IMG-20250812-WA0006.jpg', category: 'Necklace' },
                { id: 7, name: 'Opulent Choker Set', price: 112000, description: 'A regal choker set with emeralds and pearls.', imageUrl: 'assets/IMG-20250812-WA0007.jpg', category: 'Set' },
                { id: 8, name: 'Classic Solitaire Ring', price: 89000, description: 'A timeless solitaire diamond ring in platinum.', imageUrl: 'assets/IMG-20250812-WA0008.jpg', category: 'Ring' },
                { id: 9, name: 'Rose Gold Heart Pendant', price: 32000, description: 'A delicate heart pendant in rose gold with a tiny diamond.', imageUrl: 'assets/IMG-20250812-WA0009.jpg', category: 'Pendant' },
                { id: 10, name: 'Majestic Kundan Set', price: 135000, description: 'Traditional kundan necklace set with matching earrings.', imageUrl: 'assets/IMG-20250812-WA0010.jpg', category: 'Set' },
                { id: 11, name: 'Blue Topaz Studs', price: 21000, description: 'Elegant blue topaz stud earrings in silver.', imageUrl: 'assets/IMG-20250812-WA0011.jpg', category: 'Studs' },
                { id: 12, name: 'Emerald Drop Earrings', price: 48000, description: 'Emerald drop earrings with diamond accents.', imageUrl: 'assets/IMG-20250812-WA0012.jpg', category: 'Earrings' },
                { id: 13, name: 'Vintage Ruby Brooch', price: 39000, description: 'A vintage brooch with a central ruby and gold filigree.', imageUrl: 'assets/IMG-20250812-WA0013.jpg', category: 'Brooch' }
            ];
            localStorage.setItem('products', JSON.stringify(defaultProducts));
            localStorage.setItem('productsDataVersion', currentVersion);
            return defaultProducts;
        }
        return JSON.parse(productsInStorage);
    };

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

    const products = initializeProducts().map(p => ({ ...p, category: normalizeCategory(p.category) }));
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // --- DOM Elements ---
    const productGrid = document.getElementById('product-grid');
    const cartToggle = document.getElementById('cart-toggle');
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartCloseBtn = document.getElementById('cart-close-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartCountEl = document.getElementById('cart-count');
    const cartTotalPriceEl = document.getElementById('cart-total-price');
    const checkoutBtn = document.getElementById('checkout-btn');
    const checkoutSummaryContainer = document.getElementById('bill-items');
    const whatsappOrderBtn = document.getElementById('whatsapp-order-btn');
    const customerDetailsForm = document.getElementById('customer-details-form');
    const checkoutError = document.getElementById('checkout-error');
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
        productGrid.innerHTML = list.map(product => `
            <div class="product-card" data-product-id="${product.id}">
                <!-- Clean Image Section -->
                <div class="product-image-section">
                    <div class="product-image-container">
                        <img src="${product.imageUrl}" alt="${product.name}" class="product-image" loading="lazy" decoding="async" width="600" height="600" onerror="this.src='assets/IMG-20250812-WA0001.jpg'">
                    </div>
                </div>
                
                <!-- Text Section Below Image -->
                <div class="product-text-section">
                    <div class="product-info">
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-price">₹${product.price.toLocaleString('en-IN')}</p>
                        <p class="product-description">${product.description}</p>
                        <p class="product-description-secondary" style="display: none;">${product.category} • Premium Quality</p>
                    </div>
                    
                    <!-- Full-width Cart Button -->
                    <button class="add-to-cart-btn" data-id="${product.id}" title="Add to Cart" aria-label="Add ${product.name} to cart">
                        <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i>
                        <span class="btn-text">Add to Cart</span>
                    </button>
                </div>
            </div>
        `).join('');
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

    // Render items in the cart sidebar
    const renderCart = () => {
        if (!cartItemsContainer) return;
        
        // Clear existing content
        cartItemsContainer.innerHTML = '';
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<div class="cart-empty">Your bag is empty.</div>';
        } else {
            // Use DocumentFragment for better performance
            const fragment = document.createDocumentFragment();
            
            cart.forEach(item => {
                const cartItemEl = document.createElement('div');
                cartItemEl.className = 'cart-item';
                cartItemEl.innerHTML = `
                    <img src="${item.imageUrl || 'assets/IMG-20250812-WA0001.jpg'}" alt="${item.name}" class="cart-item-img" loading="lazy" decoding="async" width="80" height="80" onerror="this.src='assets/IMG-20250812-WA0001.jpg'">
                    <div class="cart-item-info">
                        <p class="cart-item-name">${item.name}</p>
                        <p class="cart-item-price">₹${item.price.toLocaleString('en-IN')}</p>
                        <div class="cart-item-quantity">
                            <button class="quantity-btn" data-id="${item.id}" data-action="decrease" aria-label="Decrease quantity">-</button>
                            <span class="quantity-display">${item.quantity}</span>
                            <button class="quantity-btn" data-id="${item.id}" data-action="increase" aria-label="Increase quantity">+</button>
                        </div>
                    </div>
                    <button class="remove-item-btn" data-id="${item.id}" aria-label="Remove item">&times;</button>
                `;
                fragment.appendChild(cartItemEl);
            });
            
            cartItemsContainer.appendChild(fragment);
        }
        
        updateCartSummary();
    };

    // Update cart count and total price
    const updateCartSummary = () => {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

        if (cartCountEl) {
            cartCountEl.textContent = totalItems;
            if (totalItems > 0) {
                cartCountEl.style.display = 'flex';
                cartCountEl.classList.add('show-as-main');
            } else {
                cartCountEl.style.display = 'none';
                cartCountEl.classList.remove('show-as-main');
            }
        }
        if (cartTotalPriceEl) cartTotalPriceEl.textContent = `₹${totalPrice.toLocaleString('en-IN')}`;
        saveCart();
    };

    // Render checkout page summary
    const renderCheckoutSummary = () => {
        if (!checkoutSummaryContainer) return;

        checkoutSummaryContainer.innerHTML = cart.map(item => `
            <div class="bill-item">
                <span>${item.name} (x${item.quantity})</span>
                <span>₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
            </div>
        `).join('');

        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const shipping = subtotal > 0 ? 500 : 0; // Rs 500 shipping if subtotal > 0
        const grandTotal = subtotal + shipping;
        
        const billSubtotal = document.getElementById('bill-subtotal');
        const billShipping = document.getElementById('bill-shipping');
        const billGrandTotal = document.getElementById('bill-grand-total');
        if (billSubtotal) billSubtotal.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
        if (billShipping) billShipping.textContent = `₹${shipping.toLocaleString('en-IN')}`;
        if (billGrandTotal) billGrandTotal.textContent = `₹${grandTotal.toLocaleString('en-IN')}`;
    };

    // --- EVENT HANDLERS ---
    
    // Toggle cart sidebar
    const toggleCart = () => {
        if (!cartSidebar) return;
        const isOpen = cartSidebar.classList.contains('open');
        if (isOpen) {
            cartSidebar.classList.remove('open');
            cartSidebar.setAttribute('aria-hidden', 'true');
            cartToggle?.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleCartKeydown);
            cartToggle?.focus();
        } else {
            cartSidebar.classList.add('open');
            cartSidebar.setAttribute('aria-hidden', 'false');
            cartToggle?.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            document.addEventListener('keydown', handleCartKeydown);
            setTimeout(() => { cartCloseBtn?.focus(); }, 60);
        }
    };

    // Handle keyboard navigation in cart
    const handleCartKeydown = (e) => {
        if (e.key === 'Escape') {
            toggleCart();
        }
    };

    // Add product to cart
    const addToCart = (productId) => {
        try {
            const productToAdd = products.find(p => p.id === productId);
            if (!productToAdd) {
                console.error('Product not found:', productId);
                return;
            }
            
            const existingItem = cart.find(item => item.id === productId);

            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.push({ ...productToAdd, quantity: 1 });
            }
            
            saveCart();
            renderCart();
            
            // Show brief success feedback
            const addButton = document.querySelector(`[data-id="${productId}"]`);
            if (addButton) {
                const originalText = addButton.innerHTML;
                addButton.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i>';
                addButton.style.background = '#2e7d32';
                setTimeout(() => {
                    addButton.innerHTML = originalText;
                    addButton.style.background = '';
                }, 800);
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
        }
    };

    // Update item quantity in cart
    const updateQuantity = (productId, action) => {
        const item = cart.find(item => item.id === productId);
        if (!item) return;

        if (action === 'increase') {
            item.quantity++;
        } else if (action === 'decrease') {
            item.quantity--;
            if (item.quantity <= 0) {
                removeFromCart(productId);
                return;
            }
        }
        saveCart();
        renderCart();
    };
    
    // Remove item from cart
    const removeFromCart = (productId) => {
        cart = cart.filter(item => item.id !== productId);
        saveCart();
        renderCart();
    };
    
    // Save cart to localStorage
    const saveCart = () => {
        localStorage.setItem('cart', JSON.stringify(cart));
    };

    // Clear entire cart
    const clearCart = () => {
        if (cart.length === 0) return;
        
        confirmAction('Are you sure you want to clear your entire cart?').then(ok => {
            if (!ok) return;
            cart = [];
            saveCart();
            renderCart();
            notify('Cart cleared', 'success');
        });
    };

    // --- PRODUCT DETAIL MODAL FUNCTIONS ---
    
    // Open product detail modal
    const openProductModal = (productId) => {
        const product = products.find(p => p.id === productId);
        if (!product || !productDetailModal) return;

        // Populate modal with product data
        if (modalProductImage) {
            modalProductImage.loading = 'lazy';
            modalProductImage.decoding = 'async';
            modalProductImage.src = product.imageUrl;
            modalProductImage.alt = product.name;
        }
        if (modalProductName) modalProductName.textContent = product.name;
        if (modalProductCategory) modalProductCategory.textContent = product.category;
        if (modalProductDescription) modalProductDescription.textContent = product.description;
        if (modalProductPrice) modalProductPrice.textContent = `₹${product.price.toLocaleString('en-IN')}`;
        
        // Set up the modal add to cart button
        if (modalAddToCartBtn) {
            modalAddToCartBtn.onclick = () => {
                addToCart(productId);
                closeProductModal();
            };
        }

        // Show modal
        productDetailModal.style.display = 'flex';
        setTimeout(() => {
            productDetailModal.classList.add('active');
        }, 10);
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    };

    // Close product detail modal
    const closeProductModal = () => {
        if (!productDetailModal) return;
        
        productDetailModal.classList.remove('active');
        setTimeout(() => {
            productDetailModal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    };

    // WhatsApp order logic (dynamic from admin settings)
    function getWhatsAppNumber(){
        try { const cfg=JSON.parse(localStorage.getItem('adminSettings')||'{}'); if(cfg.whatsappNumber && /^[0-9]{10,15}$/.test(cfg.whatsappNumber)) return cfg.whatsappNumber; } catch {}
        return '919876543210'; // fallback default
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

    function handleWhatsAppOrder(e) {
        if (e) e.preventDefault();
        
        // Clear any previous errors
        if (checkoutError) {
            checkoutError.style.display = 'none';
            checkoutError.textContent = '';
        }
        
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
        
        if (name.length < 2) {
            if (checkoutError) {
                checkoutError.textContent = 'Please enter a valid name (at least 2 characters).';
                checkoutError.style.display = 'block';
            }
            const f = document.getElementById('customer-name');
            if (f) {
                f.setAttribute('aria-invalid', 'true');
                f.style.borderColor = '#e53935';
                f.addEventListener('input', function handler(){ f.removeAttribute('aria-invalid'); f.style.borderColor=''; f.removeEventListener('input', handler); });
            }
            return;
        }
        
        if (address.length < 10) {
            if (checkoutError) {
                checkoutError.textContent = 'Please enter a complete address (at least 10 characters).';
                checkoutError.style.display = 'block';
            }
            const f = document.getElementById('customer-address');
            if (f) {
                f.setAttribute('aria-invalid', 'true');
                f.style.borderColor = '#e53935';
                f.addEventListener('input', function handler(){ f.removeAttribute('aria-invalid'); f.style.borderColor=''; f.removeEventListener('input', handler); });
            }
            return;
        }
        if (checkoutError) checkoutError.style.display = 'none';

        // Show loading state
        const submitButton = document.getElementById('whatsapp-order-btn');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Processing Order...';
        }

        try {
            // Prepare order summary
            const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const shipping = subtotal > 0 ? 500 : 0;
            const grandTotal = subtotal + shipping;
            let orderSummary = cart.map(item => `- ${item.name} (Qty: ${item.quantity}) - ₹${(item.price * item.quantity).toLocaleString('en-IN')}`).join('\n');

            const message =
`Hello! I would like to place the following order from VastraVeda Jewelleries:\n\n*Customer Details:*\nName: ${name}\nMobile: ${mobile}\nEmail: ${email || 'Not provided'}\nAddress: ${address}\nPIN Code: ${pincode}\n\n*Order Summary:*\n${orderSummary}\n\n*Total Price: ₹${grandTotal.toLocaleString('en-IN')}*\n\nPlease confirm the order and delivery details.`;

            // Save order to localStorage
            const order = {
                orderId: 'ORD-' + Date.now(),
                customer: { name, mobile, email, address, pincode },
                items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
                total: grandTotal,
                date: new Date().toISOString()
            };
            let orders = JSON.parse(localStorage.getItem('proJetOrders') || '[]');
            orders.push(order);
            localStorage.setItem('proJetOrders', JSON.stringify(orders));

                        // Best-effort push to Firestore (non-blocking)
                        try{
                                import('./js/firebase-adapter.js')
                                    .then(mod=>mod.default.init().then(()=>{
                                        if(mod.default.addOrder){ mod.default.addOrder(order).catch(()=>{}); }
                                    }))
                                    .catch(()=>{});
                        }catch(e){ /* ignore if not configured */ }

            // Show confirmation message
            if (checkoutError) {
                checkoutError.textContent = 'Order placed! Please complete your order in WhatsApp.';
                checkoutError.style.display = 'block';
                checkoutError.style.color = '#080';
            }

            // WhatsApp redirect with small delay for better UX
            setTimeout(() => {
                const encodedMsg = encodeURIComponent(message);
                window.location.href = `https://wa.me/${getWhatsAppNumber()}?text=${encodedMsg}`;
                // Clear cart after redirect
                cart = [];
                saveCart();
                updateCartSummary();
                renderCheckoutSummary();
            }, 1000);
            
        } catch (error) {
            console.error('Error processing order:', error);
            if (checkoutError) {
                checkoutError.textContent = 'An error occurred while processing your order. Please try again.';
                checkoutError.style.display = 'block';
            }
        } finally {
            // Reset button state
            if (submitButton) {
                setTimeout(() => {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Place Order on WhatsApp';
                }, 2000);
            }
        }
    }

    // --- EVENT LISTENERS ---

    // Mobile nav toggle
    const navToggle = document.getElementById('nav-toggle');
    const mainNav = document.getElementById('site-main-nav');
    if (navToggle && mainNav) {
        navToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = mainNav.classList.toggle('open');
            navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            
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
                document.body.style.overflow = '';
            }
        });
        
        // Close nav with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mainNav.classList.contains('open')) {
                mainNav.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            }
        });
    }

    if (cartToggle) cartToggle.addEventListener('click', toggleCart);
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', toggleCart);
    
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
            const productId = parseInt(productCard.dataset.productId, 10);
            if (!isNaN(productId)) {
                openProductModal(productId);
                return;
            }
        }

        // Use closest() so clicks on child elements (like icons) still work
        const addBtn = e.target.closest('.add-to-cart-btn');
        if (addBtn) {
            const id = parseInt(addBtn.dataset.id, 10);
            if (!isNaN(id)) addToCart(id);
            return; // Prevent falling through to other handlers
        }

        const qtyBtn = e.target.closest('.quantity-btn');
        if (qtyBtn) {
            const id = parseInt(qtyBtn.dataset.id, 10);
            const action = qtyBtn.dataset.action;
            if (!isNaN(id) && action) updateQuantity(id, action);
            return;
        }

        const removeBtn = e.target.closest('.remove-item-btn');
        if (removeBtn) {
            const id = parseInt(removeBtn.dataset.id, 10);
            if (!isNaN(id)) removeFromCart(id);
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