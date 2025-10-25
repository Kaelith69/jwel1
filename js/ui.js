// UI Components and Interactions
// Manages UI components for VastraVeda Jewelleries

class UIManager {
    constructor() {
        this.cartSidebar = document.getElementById('cart-sidebar');
        this.cartToggle = document.getElementById('cart-toggle');
        this.cartCloseBtn = document.getElementById('cart-close-btn');
        this.sidebarOverlay = document.getElementById('sidebar-overlay');
        
        this.initializeUI();
    }

    // Initialize UI components
    initializeUI() {
        this.setupCartSidebar();
        this.setupLoadingStates();
        this.setupAccessibility();
    }

    // Setup cart sidebar functionality
    setupCartSidebar() {
        // Avoid binding cart toggle handlers here to prevent duplication with main.js
        // We only ensure ARIA attributes are set in setupAccessibility().
    }

    // Toggle cart sidebar
    toggleCart() {
        if (!this.cartSidebar) return;
        
        const isOpen = this.cartSidebar.classList.contains('open');
        
        if (isOpen) {
            this.closeCart();
        } else {
            this.openCart();
        }
    }

    // Open cart sidebar
    openCart() {
        if (!this.cartSidebar) return;
        
        this.cartSidebar.classList.add('open');
        this.cartSidebar.setAttribute('aria-hidden', 'false');
        
        if (this.cartToggle) {
            this.cartToggle.setAttribute('aria-expanded', 'true');
        }
        
        document.body.style.overflow = 'hidden';
        
        // Focus management
        setTimeout(() => {
            if (this.cartCloseBtn) {
                this.cartCloseBtn.focus();
            }
        }, 100);
    }

    // Close cart sidebar
    closeCart() {
        if (!this.cartSidebar) return;
        
        this.cartSidebar.classList.remove('open');
        this.cartSidebar.setAttribute('aria-hidden', 'true');
        
        if (this.cartToggle) {
            this.cartToggle.setAttribute('aria-expanded', 'false');
            this.cartToggle.focus();
        }
        
        document.body.style.overflow = '';
    }

    // Show loading state for an element
    showLoading(element, text = 'Loading...') {
        if (!element) return;
        
        element.classList.add('loading');
        element.disabled = true;
        
        const originalText = element.textContent;
        element.textContent = text;
        
        return () => {
            element.classList.remove('loading');
            element.disabled = false;
            element.textContent = originalText;
        };
    }

    // Show success message
    showSuccess(message, duration = 3000) {
        this.showNotification(message, 'success', duration);
    }

    // Show error message
    showError(message, duration = 5000) {
        this.showNotification(message, 'error', duration);
    }

    // Show notification
    showNotification(message, type = 'info', duration = 3000) {
        // Remove existing notifications
        const existing = document.querySelectorAll('.notification');
        existing.forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        
        // Styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            fontSize: '14px',
            zIndex: '10000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });
        
        // Type-specific styling
        const colors = {
            success: '#9dbb52',
            error: '#3e632a',
            info: '#3e632a',
            warning: '#6b8e23'
        };
        
        notification.style.background = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    // Setup loading states
    setupLoadingStates() {
        // Add loading state utility to all buttons
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-loading]');
            if (button && !button.disabled) {
                const hideLoading = this.showLoading(button, button.dataset.loading);
                
                // Auto-hide after 5 seconds if not manually hidden
                setTimeout(hideLoading, 5000);
            }
        });
    }

    // Setup accessibility features
    setupAccessibility() {
        // Setup cart sidebar ARIA
        if (this.cartSidebar) {
            this.cartSidebar.setAttribute('role', 'dialog');
            this.cartSidebar.setAttribute('aria-hidden', 'true');
            this.cartSidebar.setAttribute('aria-modal', 'true');
            this.cartSidebar.setAttribute('aria-label', 'Shopping cart');
        }
        
        if (this.cartToggle) {
            this.cartToggle.setAttribute('aria-controls', 'cart-sidebar');
            this.cartToggle.setAttribute('aria-expanded', 'false');
        }
        
        // Setup skip links
        this.setupSkipLinks();
        
        // Setup focus indicators
        this.setupFocusIndicators();
    }

    // Setup skip navigation links
    setupSkipLinks() {
        // If a skip link already exists in the DOM, don't add another
        const existing = document.querySelector('a.skip-link');
        if (existing) return;
        
        const skipLink = document.createElement('a');
        skipLink.className = 'skip-link';
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        
        Object.assign(skipLink.style, {
            position: 'absolute',
            left: '-9999px',
            top: '0',
            zIndex: '10001',
            padding: '8px 12px',
            background: 'var(--accent-color)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '0 0 4px 0'
        });
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.left = '0';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.left = '-9999px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    // Setup enhanced focus indicators
    setupFocusIndicators() {
        const style = document.createElement('style');
        style.textContent = `
            .enhanced-focus:focus-visible {
                outline: 3px solid var(--accent-color, #3e632a);
                outline-offset: 2px;
                box-shadow: 0 0 0 6px rgba(62, 99, 42, 0.12);
            }
        `;
        document.head.appendChild(style);
        
        // Add enhanced focus class to interactive elements
        const interactiveElements = document.querySelectorAll(
            'button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        
        interactiveElements.forEach(el => {
            el.classList.add('enhanced-focus');
        });
    }

    // Smooth scroll to element
    scrollToElement(elementId, offset = 0) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }

    // Animate element entrance
    animateEntrance(element, animationType = 'fadeInUp') {
        if (!element) return;
        
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 10);
    }
}

// Export for use in main.js
window.UIManager = UIManager;
