// checkout-fix.js
// Dedicated checkout controller that bypasses the legacy main.js handler
(function () {
    'use strict';

    const MOBILE_AGENT = /android|webos|iphone|ipad|ipod|blackberry|iemobile|windows phone|opera mini/i;
    const PHONE_REGEX = /^[0-9]{10}$/;
    const PIN_REGEX = /^[0-9]{6}$/;
    const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    const DEFAULT_WHATSAPP_NUMBER = '919961165503';
    const QR_API_ENDPOINT = 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=';

    const formatCurrency = (value) => {
        const numeric = Number.isFinite(value) ? value : 0;
        return `₹${Math.round(numeric).toLocaleString('en-IN')}`;
    };

    const detectMobile = () => {
        const agent = (window.navigator?.userAgent || '').toLowerCase();
        return MOBILE_AGENT.test(agent);
    };

    const sanitizeDigits = (value) => String(value || '').replace(/[^0-9]/g, '');

    const normalizePrice = (value) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        const parsed = parseFloat(String(value || '').replace(/[^0-9.]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    };

    class CheckoutController {
        constructor() {
            this.isMobile = detectMobile();
            this.cartManager = null;
            this.firebase = null;
            this.firebaseState = null;

            this.state = {
                submitting: false,
                whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
                realtimeUnsub: null
            };

            this.dom = {
                form: document.getElementById('customer-details-form'),
                submitBtn: document.getElementById('whatsapp-order-btn'),
                errorBox: document.getElementById('checkout-error'),
                qrWrapper: document.getElementById('whatsapp-qr-wrapper'),
                qrProgress: document.getElementById('whatsapp-qr-progress'),
                summaryDesktop: document.getElementById('bill-items'),
                summaryMobile: document.getElementById('bill-items-mobile'),
                subtotalDesktop: document.getElementById('bill-subtotal'),
                shippingDesktop: document.getElementById('bill-shipping'),
                totalDesktop: document.getElementById('bill-grand-total'),
                subtotalMobile: document.getElementById('bill-subtotal-mobile'),
                shippingMobile: document.getElementById('bill-shipping-mobile'),
                totalMobile: document.getElementById('bill-grand-total-mobile'),
                itemCountMobile: document.getElementById('item-count-mobile'),
                loaderDesktop: document.getElementById('checkout-summary-loader'),
                loaderMobile: document.getElementById('checkout-summary-mobile-loader')
            };

            this.inputs = {
                name: document.getElementById('customer-name'),
                mobile: document.getElementById('customer-mobile'),
                email: document.getElementById('customer-email'),
                address: document.getElementById('customer-address'),
                pincode: document.getElementById('customer-pincode')
            };

            this.handleSubmitCapture = this.handleSubmitCapture.bind(this);
            this.handleStorageChange = this.handleStorageChange.bind(this);
        }

        async init() {
            if (!this.dom.form || typeof window.CartManager !== 'function') {
                return;
            }

            this.cartManager = new window.CartManager();
            this.patchCartPersistence();

            await this.loadFirebaseAdapter();
            await this.prefetchWhatsAppNumber();

            this.updateSubmitButtonLabel();
            this.renderSummary();
            this.bindEvents();
        }

        patchCartPersistence() {
            if (!this.cartManager) return;
            const originalSave = this.cartManager.saveCart.bind(this.cartManager);
            this.cartManager.saveCart = (...args) => {
                const result = originalSave(...args);
                this.renderSummary();
                return result;
            };
        }

        async loadFirebaseAdapter() {
            try {
                const module = await import('./firebase-adapter.js');
                this.firebase = module.default || module;
                if (this.firebase?.init) {
                    this.firebaseState = await this.firebase.init();
                }
            } catch (err) {
                console.error('[checkout-fix] Failed to load Firebase adapter', err);
                this.showError('Unable to connect to the order service. Please refresh and try again.');
                throw err;
            }
        }

        async prefetchWhatsAppNumber() {
            if (!this.firebase?.getSettings) return;
            try {
                const settings = await this.firebase.getSettings();
                const sanitized = sanitizeDigits(settings?.whatsappNumber);
                if (sanitized.length >= 10 && sanitized.length <= 15) {
                    this.state.whatsappNumber = sanitized;
                }
            } catch (err) {
                console.warn('[checkout-fix] Falling back to default WhatsApp number', err);
            }
        }

        bindEvents() {
            if (this.dom.form) {
                this.dom.form.addEventListener('submit', this.handleSubmitCapture, true);
            }
            window.addEventListener('storage', this.handleStorageChange);
        }

        handleStorageChange(event) {
            if (event.key === 'cart') {
                this.renderSummary();
            }
        }

        async handleSubmitCapture(event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (this.state.submitting) {
                return;
            }
            this.state.submitting = true;
            try {
                await this.processCheckout();
            } finally {
                this.state.submitting = false;
            }
        }

        async processCheckout() {
            this.clearStatus();

            const cart = this.getCartSnapshot();
            if (!cart.items.length) {
                this.showError('Your cart is empty. Add items before placing the order.');
                return;
            }

            const formData = this.collectFormData();
            if (!formData.valid) {
                this.highlightInvalidFields(formData.errors);
                this.showError(formData.message);
                return;
            }

            this.setSubmittingState(true);

            const payload = this.buildOrderPayload(cart, formData.values);

            try {
                if (!this.firebase?.addOrder) {
                    throw new Error('Order service is unavailable.');
                }
                await this.firebase.addOrder(payload);

                this.showSuccess(`Order placed! Reference: ${payload.orderId}.`);
                this.startRealtimeWatcher(payload.orderId);
                this.launchWhatsAppFlow(payload);

                if (this.cartManager) {
                    this.cartManager.cart = [];
                    this.cartManager.saveCart();
                    if (typeof this.cartManager.render === 'function') {
                        this.cartManager.render();
                    }
                }
                this.renderSummary();
                if (this.dom.form) {
                    this.dom.form.reset();
                }
            } catch (err) {
                console.error('[checkout-fix] Failed to submit order', err);
                const message = err?.message || 'Unable to place your order right now.';
                this.showError(message);
            } finally {
                this.setSubmittingState(false);
            }
        }

        collectFormData() {
            const values = {
                name: this.inputs.name?.value.trim() || '',
                mobile: sanitizeDigits(this.inputs.mobile?.value),
                email: this.inputs.email?.value.trim() || '',
                address: this.inputs.address?.value.trim() || '',
                pincode: sanitizeDigits(this.inputs.pincode?.value)
            };

            const errors = [];
            if (!values.name) {
                errors.push({ field: this.inputs.name, message: 'Full name is required.' });
            }
            if (!PHONE_REGEX.test(values.mobile)) {
                errors.push({ field: this.inputs.mobile, message: 'Enter a valid 10-digit mobile number.' });
            }
            if (!values.address) {
                errors.push({ field: this.inputs.address, message: 'Shipping address is required.' });
            }
            if (!PIN_REGEX.test(values.pincode)) {
                errors.push({ field: this.inputs.pincode, message: 'Enter a valid 6-digit PIN code.' });
            }
            if (values.email && !EMAIL_REGEX.test(values.email)) {
                errors.push({ field: this.inputs.email, message: 'Enter a valid email address.' });
            }

            const valid = errors.length === 0;
            return {
                valid,
                values,
                errors,
                message: valid ? '' : errors[0].message
            };
        }

        highlightInvalidFields(errors) {
            errors.forEach(({ field }) => {
                if (!field) return;
                field.setAttribute('aria-invalid', 'true');
                field.style.borderColor = '#e53935';
                const reset = () => {
                    field.removeAttribute('aria-invalid');
                    field.style.borderColor = '';
                    field.removeEventListener('input', reset);
                };
                field.addEventListener('input', reset);
            });
        }

        buildOrderPayload(cart, values) {
            const now = new Date();
            const iso = now.toISOString();
            const orderId = `ORD-${now.getTime()}`;

            const customer = {
                name: values.name,
                mobile: values.mobile,
                address: values.address,
                pincode: values.pincode
            };
            if (values.email) {
                customer.email = values.email;
            }

            const items = cart.items.map((item) => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                lineTotal: item.price * item.quantity
            }));

            const summaryLines = items.map((item) => `- ${item.name} (Qty: ${item.quantity}) - ${formatCurrency(item.lineTotal)}`).join('\n');
            const message = [
                'Hello! I would like to place the following order from VastraVeda Jewelleries:',
                '',
                `*Order ID:* ${orderId}`,
                '',
                '*Customer Details:*',
                `Name: ${customer.name}`,
                `Mobile: ${customer.mobile}`,
                `Email: ${customer.email || 'Not provided'}`,
                `Address: ${customer.address}`,
                `PIN Code: ${customer.pincode}`,
                '',
                '*Order Summary:*',
                summaryLines,
                '',
                `Subtotal: ${formatCurrency(cart.subtotal)}`,
                `Shipping: ${formatCurrency(cart.shipping)}`,
                `Total: ${formatCurrency(cart.total)}`,
                '',
                'Please confirm the order and delivery details.'
            ].join('\n');

            return {
                orderId,
                status: 'Pending',
                source: 'storefront-checkout',
                channel: 'whatsapp',
                currency: 'INR',
                subtotal: cart.subtotal,
                shipping: cart.shipping,
                total: cart.total,
                itemCount: cart.itemCount,
                createdAt: iso,
                updatedAt: iso,
                date: iso,
                customer,
                items,
                statusHistory: [
                    { status: 'Pending', changedAt: iso, changedBy: 'customer' }
                ],
                whatsappMessage: message,
                notes: 'Order initiated via checkout form and shared over WhatsApp.'
            };
        }

        startRealtimeWatcher(orderId) {
            if (!this.firebase?.onOrdersSnapshot) {
                return;
            }
            if (this.state.realtimeUnsub) {
                try { this.state.realtimeUnsub(); } catch (_) { /* no-op */ }
                this.state.realtimeUnsub = null;
            }
            this.firebase.onOrdersSnapshot((orders) => {
                const match = Array.isArray(orders) && orders.find((order) => String(order.orderId) === String(orderId));
                if (match) {
                    this.appendStatus('Order synced with store backend.');
                    if (this.state.realtimeUnsub) {
                        try { this.state.realtimeUnsub(); } catch (_) { /* no-op */ }
                        this.state.realtimeUnsub = null;
                    }
                }
            }).then((unsub) => {
                if (typeof unsub === 'function') {
                    this.state.realtimeUnsub = unsub;
                }
            }).catch((err) => {
                console.warn('[checkout-fix] Real-time watcher unavailable', err);
            });
        }

        launchWhatsAppFlow(payload) {
            const messageEncoded = encodeURIComponent(payload.whatsappMessage);
            const mobileUrl = `https://wa.me/${this.state.whatsappNumber}?text=${messageEncoded}`;
            const desktopUrl = `https://web.whatsapp.com/send?phone=${this.state.whatsappNumber}&text=${messageEncoded}`;

            if (this.isMobile) {
                const win = window.open(mobileUrl, '_blank', 'noopener');
                if (!win) {
                    window.location.href = mobileUrl;
                }
                this.appendStatus('Opening WhatsApp on your device...');
            } else {
                this.renderQrCode(mobileUrl, desktopUrl);
                this.appendStatus('Scan the QR code with WhatsApp on your phone to continue.');
            }
        }

        renderQrCode(mobileUrl, desktopUrl) {
            if (!this.dom.qrWrapper) return;
            if (this.dom.qrProgress) {
                this.dom.qrProgress.innerHTML = `<div class="loading-state" role="status" aria-label="Generating QR code"><span class="loading-gem"><span></span><span></span><span></span></span></div>`;
                this.dom.qrProgress.style.display = 'block';
                this.dom.qrProgress.setAttribute('aria-hidden', 'false');
            }
            const qrSrc = `${QR_API_ENDPOINT}${encodeURIComponent(mobileUrl)}`;
            this.dom.qrWrapper.innerHTML = [
                '<p class="qr-instructions">Scan this code with the WhatsApp app on your phone.</p>',
                `<img src="${qrSrc}" alt="WhatsApp order QR code" class="whatsapp-qr-image" loading="lazy" decoding="async">`,
                `<a href="${desktopUrl}" target="_blank" rel="noopener" class="qr-fallback-link">Open WhatsApp Web instead</a>`
            ].join('');
            const image = this.dom.qrWrapper.querySelector('img');
            if (image) {
                const hideProgress = () => {
                    if (this.dom.qrProgress) {
                        this.dom.qrProgress.style.display = 'none';
                        this.dom.qrProgress.setAttribute('aria-hidden', 'true');
                        this.dom.qrProgress.innerHTML = '';
                    }
                };
                image.addEventListener('load', hideProgress, { once: true });
                image.addEventListener('error', hideProgress, { once: true });
            }
            this.dom.qrWrapper.hidden = false;
            this.dom.qrWrapper.classList.add('visible');
        }

        getCartSnapshot() {
            // Pull latest cart contents directly so we stay in sync with legacy cart updates.
            let rawItems = [];
            try {
                const stored = JSON.parse(window.localStorage.getItem('cart') || '[]');
                if (Array.isArray(stored) && stored.length) {
                    rawItems = stored;
                }
            } catch (_) {
                rawItems = [];
            }
            if (!rawItems.length && Array.isArray(this.cartManager?.cart)) {
                rawItems = this.cartManager.cart;
            }
            const items = rawItems.map((item) => {
                const quantity = Number(item.quantity) || 0;
                const price = normalizePrice(item.price);
                return {
                    id: item.id || item._docId || String(Date.now()),
                    name: item.name || 'Item',
                    price,
                    quantity,
                    lineTotal: price * quantity
                };
            }).filter((item) => item.quantity > 0 && item.price >= 0);

            const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
            const shipping = subtotal > 0 && subtotal < 5000 ? 200 : 0;
            const total = subtotal + shipping;
            const itemCount = items.reduce((count, item) => count + item.quantity, 0);

            return { items, subtotal, shipping, total, itemCount };
        }

        renderSummary() {
            const cart = this.getCartSnapshot();

            this.renderSummaryList(this.dom.summaryDesktop, cart.items);
            this.renderSummaryList(this.dom.summaryMobile, cart.items);

            if (this.dom.subtotalDesktop) this.dom.subtotalDesktop.textContent = formatCurrency(cart.subtotal);
            if (this.dom.shippingDesktop) this.dom.shippingDesktop.textContent = formatCurrency(cart.shipping);
            if (this.dom.totalDesktop) this.dom.totalDesktop.textContent = formatCurrency(cart.total);

            if (this.dom.subtotalMobile) this.dom.subtotalMobile.textContent = formatCurrency(cart.subtotal);
            if (this.dom.shippingMobile) this.dom.shippingMobile.textContent = formatCurrency(cart.shipping);
            if (this.dom.totalMobile) this.dom.totalMobile.textContent = formatCurrency(cart.total);
            if (this.dom.itemCountMobile) this.dom.itemCountMobile.textContent = cart.itemCount ? `${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'}` : '';

            if (this.dom.loaderDesktop) this.dom.loaderDesktop.style.display = 'none';
            if (this.dom.loaderMobile) this.dom.loaderMobile.style.display = 'none';
        }

        renderSummaryList(container, items) {
            if (!container) return;
            if (!items.length) {
                container.innerHTML = '<li class="empty-state">Your cart is empty.</li>';
                return;
            }
            container.innerHTML = items.map((item) => `
                <li class="bill-item">
                    <div class="bill-item__info">
                        <span class="bill-item__name">${item.name}</span>
                        <span class="bill-item__meta">Qty: ${item.quantity}</span>
                    </div>
                    <span class="bill-item__total">${formatCurrency(item.lineTotal)}</span>
                </li>
            `).join('');
        }

        updateSubmitButtonLabel() {
            if (!this.dom.submitBtn) return;
            if (this.isMobile) {
                this.dom.submitBtn.textContent = 'Place order on WhatsApp';
            } else {
                this.dom.submitBtn.textContent = 'Generate WhatsApp QR code';
            }
        }

        setSubmittingState(active) {
            if (this.dom.submitBtn) {
                this.dom.submitBtn.disabled = active;
                this.dom.submitBtn.classList.toggle('loading', active);
            }
        }

        clearStatus() {
            if (this.dom.errorBox) {
                this.dom.errorBox.textContent = '';
                this.dom.errorBox.className = 'checkout-status';
            }
            this.appendStatus('');
        }

        showError(message) {
            if (!this.dom.errorBox) return;
            this.dom.errorBox.textContent = message;
            this.dom.errorBox.className = 'checkout-status error';
        }

        showSuccess(message) {
            if (!this.dom.errorBox) return;
            this.dom.errorBox.textContent = message;
            this.dom.errorBox.className = 'checkout-status success';
        }

        appendStatus(message) {
            if (!this.dom.errorBox || !message) return;
            const current = this.dom.errorBox.textContent ? `${this.dom.errorBox.textContent}\n${message}` : message;
            this.dom.errorBox.textContent = current;
        }

        teardown() {
            if (this.dom.form) {
                this.dom.form.removeEventListener('submit', this.handleSubmitCapture, true);
            }
            window.removeEventListener('storage', this.handleStorageChange);
            if (this.state.realtimeUnsub) {
                try { this.state.realtimeUnsub(); } catch (_) { /* no-op */ }
                this.state.realtimeUnsub = null;
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const controller = new CheckoutController();
        controller.init();
        window.checkoutController = controller;
    });
})();
