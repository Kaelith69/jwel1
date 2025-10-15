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

        this.cartItemsContainer.innerHTML = this.cart.map(item => `
            <div class="cart-item">
             <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-img" loading="lazy" decoding="async"
                     onerror="this.src='assets/IMG-20250812-WA0001.jpg'">
                <div class="cart-item-info">
                    <p class="cart-item-name">${item.name}</p>
                    <p class="cart-item-price">₹${item.price.toLocaleString('en-IN')}</p>
                    <div class="cart-item-quantity">
            <button class="quantity-btn" data-id="${String(item.id)}" data-action="decrease" 
                                aria-label="Decrease quantity">-</button>
                        <span class="quantity-display">${item.quantity}</span>
            <button class="quantity-btn" data-id="${String(item.id)}" data-action="increase" 
                                aria-label="Increase quantity">+</button>
                    </div>
                </div>
        <button class="remove-item-btn" data-id="${String(item.id)}" 
                        aria-label="Remove ${item.name} from cart">&times;</button>
            </div>
        `).join('');
    }

    // Show feedback when item is added
    showAddFeedback(productId) {
        const lookupId = String(productId);
        const addButton = document.querySelector(`[data-id="${lookupId}"]`);
        if (addButton) {
            const originalHTML = addButton.innerHTML;
            addButton.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i>';
            addButton.style.background = '#2e7d32';
            addButton.disabled = true;
            
            setTimeout(() => {
                addButton.innerHTML = originalHTML;
                addButton.style.background = '';
                addButton.disabled = false;
            }, 1000);
        }
    }

    // Get cart data for checkout
    getCartForCheckout() {
        const { itemCount, totalPrice } = this.getTotals();
        const shipping = totalPrice > 0 ? 500 : 0;
        
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
