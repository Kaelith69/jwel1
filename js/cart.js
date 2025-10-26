// Cart Management Module
// Handles all cart-related operations for VastraVeda Jewelleries

class CartManager {
    constructor() {
        this.cart = (JSON.parse(localStorage.getItem('cart')) || []).map(item => {
            const normalizedId = item.id != null ? String(item.id) : (item._docId != null ? String(item._docId) : null);
            return normalizedId ? { ...item, id: normalizedId } : null;
        }).filter(Boolean);
        this.cartCountEl = document.getElementById('cart-count');
        this.cartTotalPriceEl = document.getElementById('cart-total-price');
        this.cartItemsContainer = document.getElementById('cart-items');
    }

    // Add item to cart
    addItem(product) {
        try {
            const lookupId = String(product.id);
            const existingItem = this.cart.find(item => String(item.id) === lookupId);
            
            if (existingItem) {
                existingItem.quantity++;
            } else {
                this.cart.push({ ...product, id: lookupId, quantity: 1 });
            }
            
            this.saveCart();
            this.render();
            this.showAddFeedback(product.id);
            
            return true;
        } catch (error) {
            console.error('Error adding item to cart:', error);
            notify('Failed to add item to cart', 'error');
            return false;
        }
    }

    // Remove item from cart
    removeItem(productId) {
        const lookupId = String(productId);
        this.cart = this.cart.filter(item => String(item.id) !== lookupId);
        this.saveCart();
        this.render();
    }

    // Update item quantity
    updateQuantity(productId, newQuantity) {
        const lookupId = String(productId);
        const item = this.cart.find(item => String(item.id) === lookupId);
        if (!item) return;

        if (newQuantity <= 0) {
            this.removeItem(lookupId);
        } else {
            item.quantity = newQuantity;
            this.saveCart();
            this.render();
        }
    }

    // Clear entire cart
    clear() {
        if (this.cart.length === 0) return false;

        // Use confirmAction wrapper (returns a Promise)
        // Keep method synchronous by returning a Promise
        return new Promise(resolve => {
            confirmAction('Are you sure you want to clear your entire cart?').then(ok => {
                if (!ok) return resolve(false);
                this.cart = [];
                this.saveCart();
                this.render();
                notify('Cart cleared', 'success');
                resolve(true);
            });
        });
    }

    // Get cart totals
    getTotals() {
        const itemCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        return { itemCount, totalPrice };
    }

    // Save cart to localStorage
    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
    }

    // Render cart UI
    render() {
        this.updateCartCount();
        this.renderCartItems();
    }

    // Update cart count badge
    updateCartCount() {
        const { itemCount } = this.getTotals();
        
        if (this.cartCountEl) {
            this.cartCountEl.textContent = itemCount;
            
            if (itemCount > 0) {
                this.cartCountEl.style.display = 'flex';
                this.cartCountEl.classList.add('show-as-main');
            } else {
                this.cartCountEl.style.display = 'none';
                this.cartCountEl.classList.remove('show-as-main');
            }
        }
    }

    // Render cart items in sidebar
    renderCartItems() {
        if (!this.cartItemsContainer) return;

        const { totalPrice } = this.getTotals();
        
        if (this.cartTotalPriceEl) {
            this.cartTotalPriceEl.textContent = `₹${totalPrice.toLocaleString('en-IN')}`;
        }

        if (this.cart.length === 0) {
            this.cartItemsContainer.innerHTML = '<div class="cart-empty">Your bag is empty.</div>';
            return;
        }

        this.cartItemsContainer.innerHTML = this.cart.map((item, index) => `
            <div class="cart-item" role="listitem" aria-label="${item.name}, quantity ${item.quantity}, price ₹${item.price.toLocaleString('en-IN')}">
                <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-img" loading="lazy" decoding="async"
                    onerror="this.src='/logo/logo.png'">
                <div class="cart-item-info">
                    <div class="cart-item-row">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-price" aria-label="Price: ₹${item.price.toLocaleString('en-IN')}">₹${item.price.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="cart-item-actions">
                        <div class="cart-item-quantity" role="group" aria-label="Quantity controls for ${item.name}">
                            <button class="quantity-btn liquidize" data-id="${String(item.id)}" data-action="decrease" 
                                aria-label="Decrease quantity of ${item.name} to ${Math.max(1, item.quantity - 1)}" 
                                ${item.quantity <= 1 ? 'disabled aria-disabled="true"' : ''}>-</button>
                            <span class="quantity-display" aria-label="${item.quantity} items" role="status" aria-live="polite">${item.quantity}</span>
                            <button class="quantity-btn liquidize" data-id="${String(item.id)}" data-action="increase" 
                                aria-label="Increase quantity of ${item.name} to ${item.quantity + 1}">+</button>
                        </div>
                        <button class="remove-item-btn liquidize" data-id="${String(item.id)}" 
                            aria-label="Remove ${item.name} from cart" aria-describedby="remove-item-${item.id}">&times;</button>
                        <div id="remove-item-${item.id}" class="sr-only">Remove this item from your shopping cart</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Show feedback when item is added
    showAddFeedback(productId) {
        const lookupId = String(productId);
        const addButton = document.querySelector(`[data-id="${lookupId}"]`);
        if (addButton) {
            const originalHTML = addButton.innerHTML;
            const originalAriaLabel = addButton.getAttribute('aria-label') || '';
            addButton.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i>';
            addButton.style.background = '#2e7d32';
            addButton.disabled = true;
            addButton.setAttribute('aria-label', 'Item added to cart');

            setTimeout(() => {
                addButton.innerHTML = originalHTML;
                addButton.style.background = '';
                addButton.disabled = false;
                addButton.setAttribute('aria-label', originalAriaLabel || 'Add to cart');
            }, 1000);
        }

        // Announce to screen readers
        const product = this.cart.find(item => String(item.id) === lookupId);
        if (product) {
            this.announceToScreenReader(`${product.name} added to cart. Cart now has ${this.cart.length} item${this.cart.length !== 1 ? 's' : ''}.`);
        }
    }

    // Screen reader announcements
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);

        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    // Get cart data for checkout
    getCartForCheckout() {
    const { itemCount, totalPrice } = this.getTotals();
    const shipping = 0;
        
        return {
            items: [...this.cart],
            subtotal: totalPrice,
            shipping: shipping,
            total: totalPrice + shipping,
            itemCount: itemCount
        };
    }
}

// Export for use in main.js
window.CartManager = CartManager;
