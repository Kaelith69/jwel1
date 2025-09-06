// Form Validation Utilities
// Comprehensive form validation for VastraVeda Jewelleries

class FormValidator {
    constructor() {
        this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        this.mobileRegex = /^[0-9]{10}$/;
        this.pincodeRegex = /^[0-9]{6}$/;
    }

    // Validate email format
    validateEmail(email) {
        return this.emailRegex.test(email);
    }

    // Validate mobile number (10 digits)
    validateMobile(mobile) {
        return this.mobileRegex.test(mobile);
    }

    // Validate PIN code (6 digits)
    validatePincode(pincode) {
        return this.pincodeRegex.test(pincode);
    }

    // Validate name (minimum 2 characters)
    validateName(name) {
        return name && name.trim().length >= 2;
    }

    // Validate address (minimum 10 characters)
    validateAddress(address) {
        return address && address.trim().length >= 10;
    }

    // Show field error
    showFieldError(field, message) {
        if (!field) return;
        
        field.style.borderColor = '#e53935';
        field.setAttribute('aria-invalid', 'true');
        
        // Remove existing error message
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add error message
        const errorEl = document.createElement('div');
        errorEl.className = 'field-error error-message';
        errorEl.textContent = message;
        errorEl.setAttribute('role', 'alert');
        field.parentNode.appendChild(errorEl);
        
        // Clear error on input
        const clearError = () => {
            field.style.borderColor = '';
            field.setAttribute('aria-invalid', 'false');
            const errorMsg = field.parentNode.querySelector('.field-error');
            if (errorMsg) errorMsg.remove();
            field.removeEventListener('input', clearError);
        };
        
        field.addEventListener('input', clearError);
    }

    // Clear all field errors
    clearAllErrors(form) {
        if (!form) return;
        
        const fields = form.querySelectorAll('input, textarea, select');
        fields.forEach(field => {
            field.style.borderColor = '';
            field.setAttribute('aria-invalid', 'false');
        });
        
        const errors = form.querySelectorAll('.field-error');
        errors.forEach(error => error.remove());
    }

    // Validate checkout form
    validateCheckoutForm(formData) {
        const errors = [];
        
        if (!this.validateName(formData.name)) {
            errors.push({
                field: 'customer-name',
                message: 'Please enter a valid name (at least 2 characters)'
            });
        }
        
        if (!this.validateMobile(formData.mobile)) {
            errors.push({
                field: 'customer-mobile',
                message: 'Please enter a valid 10-digit mobile number'
            });
        }
        
        if (formData.email && !this.validateEmail(formData.email)) {
            errors.push({
                field: 'customer-email',
                message: 'Please enter a valid email address'
            });
        }
        
        if (!this.validateAddress(formData.address)) {
            errors.push({
                field: 'customer-address',
                message: 'Please enter a complete address (at least 10 characters)'
            });
        }
        
        if (!this.validatePincode(formData.pincode)) {
            errors.push({
                field: 'customer-pincode',
                message: 'Please enter a valid 6-digit PIN code'
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Display validation errors
    displayErrors(errors, errorContainer) {
        if (!errorContainer) return;
        
        if (errors.length === 0) {
            errorContainer.style.display = 'none';
            return;
        }
        
        errors.forEach(error => {
            const field = document.getElementById(error.field);
            this.showFieldError(field, error.message);
        });
        
        // Show general error message
        errorContainer.textContent = 'Please correct the highlighted fields above';
        errorContainer.style.display = 'block';
        errorContainer.style.color = '#e53935';
        
        // Focus first error field
        if (errors.length > 0) {
            const firstErrorField = document.getElementById(errors[0].field);
            if (firstErrorField) {
                firstErrorField.focus();
            }
        }
    }

    // Real-time validation for a field
    setupRealTimeValidation(fieldId, validator, errorMessage) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        field.addEventListener('blur', () => {
            const value = field.value.trim();
            if (value && !validator(value)) {
                this.showFieldError(field, errorMessage);
            }
        });
    }

    // Initialize real-time validation for checkout form
    initializeCheckoutValidation() {
        this.setupRealTimeValidation(
            'customer-mobile',
            (value) => this.validateMobile(value),
            'Please enter a valid 10-digit mobile number'
        );
        
        this.setupRealTimeValidation(
            'customer-email',
            (value) => this.validateEmail(value),
            'Please enter a valid email address'
        );
        
        this.setupRealTimeValidation(
            'customer-pincode',
            (value) => this.validatePincode(value),
            'Please enter a valid 6-digit PIN code'
        );
    }
}

// Export for use in main.js
window.FormValidator = FormValidator;
