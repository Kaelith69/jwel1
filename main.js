document.addEventListener('DOMContentLoaded', () => {
    // --- DATA ---
    // Initialize products from localStorage or use default data
    const initializeProducts = () => {
        const productsInStorage = localStorage.getItem('products');
        if (!productsInStorage) {
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
                { id: 13, name: 'Vintage Ruby Brooch', price: 39000, description: 'A vintage brooch with a central ruby and gold filigree.', imageUrl: 'assets/IMG-20250812-WA0013.jpg', category: 'Brooch' },
                { id: 14, name: 'Diamond Tennis Bracelet', price: 125000, description: 'A sparkling tennis bracelet with round-cut diamonds.', imageUrl: 'assets/IMG-20250812-WA0001.jpg', category: 'Bracelet' },
                { id: 15, name: 'Sapphire Halo Pendant', price: 61000, description: 'A sapphire pendant surrounded by a halo of diamonds.', imageUrl: 'assets/IMG-20250812-WA0002.jpg', category: 'Pendant' },
                { id: 16, name: 'Pearl Drop Earrings', price: 27000, description: 'Classic pearl drop earrings with gold hooks.', imageUrl: 'assets/IMG-20250812-WA0003.jpg', category: 'Earrings' },
                { id: 17, name: 'Gold Leaf Anklet', price: 18000, description: 'A dainty gold anklet with leaf charms.', imageUrl: 'assets/IMG-20250812-WA0004.jpg', category: 'Anklet' },
                { id: 18, name: 'Emerald Cluster Ring', price: 73000, description: 'A cluster ring with emeralds and diamonds.', imageUrl: 'assets/IMG-20250812-WA0005.jpg', category: 'Ring' },
                { id: 19, name: 'Ruby Bead Necklace', price: 56000, description: 'A necklace of ruby beads with gold spacers.', imageUrl: 'assets/IMG-20250812-WA0006.jpg', category: 'Necklace' },
                { id: 20, name: 'Diamond Stud Earrings', price: 47000, description: 'Simple and elegant diamond stud earrings.', imageUrl: 'assets/IMG-20250812-WA0007.jpg', category: 'Studs' },
                { id: 21, name: 'Gold Filigree Pendant', price: 25000, description: 'A gold pendant with intricate filigree work.', imageUrl: 'assets/IMG-20250812-WA0008.jpg', category: 'Pendant' },
                { id: 22, name: 'Sapphire and Pearl Maang Tikka', price: 39000, description: 'A traditional maang tikka with sapphires and pearls.', imageUrl: 'assets/IMG-20250812-WA0009.jpg', category: 'Maang Tikka' },
                { id: 23, name: 'Antique Gold Kada', price: 68000, description: 'A bold antique gold kada with engraved motifs.', imageUrl: 'assets/IMG-20250812-WA0010.jpg', category: 'Kada' },
                { id: 24, name: 'Diamond Nose Pin', price: 12000, description: 'A tiny nose pin with a single sparkling diamond.', imageUrl: 'assets/IMG-20250812-WA0011.jpg', category: 'Nose Pin' }
            ];
            localStorage.setItem('products', JSON.stringify(defaultProducts));
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

    // --- RENDER FUNCTIONS ---

    // Render products on the products page
    const renderProducts = () => {
        if (!productGrid) return;
        productGrid.innerHTML = products.map(product => `
            <div class="product-card">
                <div class="glass-card">
                    <div class="product-image-container">
                        <img src="${product.imageUrl}" alt="${product.name}" class="product-image" onerror="this.src='assets/IMG-20250812-WA0001.jpg'">
                    </div>
                    <div class="product-bottom">
                        <div class="product-info">
                            <h3 class="product-name">${product.name}</h3>
                            <p class="product-description">${product.description}</p>
                            <p class="product-price">₹${product.price.toLocaleString('en-IN')}</p>
                        </div>
                        <button class="add-to-cart-btn" data-id="${product.id}" title="Add to Cart">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    };

    // Render items in the cart sidebar
    const renderCart = () => {
        if (!cartItemsContainer) return;
        cartItemsContainer.innerHTML = '';
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<div class="cart-empty">Your bag is empty.</div>';
        } else {
            cart.forEach(item => {
                const cartItemEl = document.createElement('div');
                cartItemEl.className = 'cart-item';
                cartItemEl.innerHTML = `
                    <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-img" onerror="this.src='assets/IMG-20250812-WA0001.jpg'">
                    <div class="cart-item-info">
                        <p class="cart-item-name">${item.name}</p>
                        <p class="cart-item-price">₹${item.price.toLocaleString('en-IN')}</p>
                        <div class="cart-item-quantity">
                            <button class="quantity-btn" data-id="${item.id}" data-action="decrease">-</button>
                            <span class="quantity-display">${item.quantity}</span>
                            <button class="quantity-btn" data-id="${item.id}" data-action="increase">+</button>
                        </div>
                    </div>
                    <button class="remove-item-btn" data-id="${item.id}">&times;</button>
                `;
                cartItemsContainer.appendChild(cartItemEl);
            });
        }
        updateCartSummary();
    };

    // Update cart count and total price
    const updateCartSummary = () => {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

        if (cartCountEl) {
            cartCountEl.textContent = totalItems;
            cartCountEl.style.display = totalItems > 0 ? 'flex' : 'none';
            cartCountEl.classList.toggle('show-as-main', totalItems > 0);
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
        const isOpen = cartSidebar.classList.contains('open');
        
        if (isOpen) {
            cartSidebar.classList.remove('open');
            document.body.style.overflow = ''; // Restore scrolling
            // Remove focus trap for accessibility
            document.removeEventListener('keydown', handleCartKeydown);
        } else {
            cartSidebar.classList.add('open');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
            // Add focus trap for accessibility
            document.addEventListener('keydown', handleCartKeydown);
            // Focus on close button for accessibility
            setTimeout(() => {
                cartCloseBtn?.focus();
            }, 100);
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
        const productToAdd = products.find(p => p.id === productId);
        const existingItem = cart.find(item => item.id === productId);

        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ ...productToAdd, quantity: 1 });
        }
        saveCart();
        renderCart();
        // Don't auto-open cart - let user open it manually with cart button
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

    // WhatsApp order logic (dynamic from admin settings)
    function getWhatsAppNumber(){
        try { const cfg=JSON.parse(localStorage.getItem('adminSettings')||'{}'); if(cfg.whatsappNumber && /^[0-9]{10,15}$/.test(cfg.whatsappNumber)) return cfg.whatsappNumber; } catch {}
        return '919876543210'; // fallback default
    }

    function validateEmail(email) {
        // Simple email regex
        return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    }

    function validateMobile(mobile) {
        // Validate 10-digit mobile number
        return /^[0-9]{10}$/.test(mobile);
    }

    function validatePincode(pincode) {
        // Validate 6-digit PIN code
        return /^[0-9]{6}$/.test(pincode);
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
                checkoutError.textContent = 'Please fill in all required fields: Name, Mobile Number, Address, and PIN Code.';
                checkoutError.style.display = 'block';
            }
            return;
        }
        
        // Validate mobile number
        if (!validateMobile(mobile)) {
            if (checkoutError) {
                checkoutError.textContent = 'Please enter a valid 10-digit mobile number.';
                checkoutError.style.display = 'block';
            }
            return;
        }
        
        // Validate PIN code
        if (!validatePincode(pincode)) {
            if (checkoutError) {
                checkoutError.textContent = 'Please enter a valid 6-digit PIN code.';
                checkoutError.style.display = 'block';
            }
            return;
        }
        
        // Validate email only if provided (optional field)
        if (email && !validateEmail(email)) {
            if (checkoutError) {
                checkoutError.textContent = 'Please enter a valid email address (example: name@example.com).';
                checkoutError.style.display = 'block';
            }
            return;
        }
        
        if (name.length < 2) {
            if (checkoutError) {
                checkoutError.textContent = 'Please enter a valid name (at least 2 characters).';
                checkoutError.style.display = 'block';
            }
            return;
        }
        
        if (address.length < 10) {
            if (checkoutError) {
                checkoutError.textContent = 'Please enter a complete address (at least 10 characters).';
                checkoutError.style.display = 'block';
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

    if (cartToggle) cartToggle.addEventListener('click', toggleCart);
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', toggleCart);
    
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
                alert('Your bag is empty.');
            }
        });
    }

    if (customerDetailsForm) {
        customerDetailsForm.addEventListener('submit', handleWhatsAppOrder);
    }
    
    // --- INITIAL LOAD ---
    renderProducts();
    renderCart();
    renderCheckoutSummary();

    // Hide 'Proceed to Checkout' button on checkout page
    if (checkoutBtn && window.location.pathname.endsWith('checkout.html')) {
        checkoutBtn.style.display = 'none';
    }
});