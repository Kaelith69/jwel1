document.addEventListener('DOMContentLoaded', () => {
    const ADMIN_AUTH_KEY = 'vastravedajewlleries-admin-auth';
    
    // --- AUTHENTICATION ---
    const checkAuth = () => {
        // If we are not on the dashboard page, we don't need to check auth
        if (!window.location.pathname.includes('dashboard.html')) {
            return;
        }
        
        const isAuthenticated = localStorage.getItem(ADMIN_AUTH_KEY);
        if (!isAuthenticated) {
            window.location.href = 'index.html'; // Redirect to login
        }
    };
    
    const login = (password) => {
        const errorMessage = document.getElementById('error-message');
        // Simple password check for demo purposes
        if (password === 'admin123') {
            localStorage.setItem(ADMIN_AUTH_KEY, 'true');
            window.location.href = 'dashboard.html';
        } else {
            errorMessage.textContent = 'Incorrect password. Please try again.';
        }
    };
    
    const logout = () => {
        localStorage.removeItem(ADMIN_AUTH_KEY);
        window.location.href = 'index.html';
    };

    // --- PRODUCT MANAGEMENT (CRUD) ---
    // Reuse storefront seed if present to avoid divergence
    let products = JSON.parse(localStorage.getItem('products')) || [];

    if (!products.length) {
        // Minimal seed (first few) - full seed lives in main.js
        products = [
            { id: 1, name: 'Ethereal Diamond Necklace', price: 120000, description: 'Pear-cut diamond with halo setting.', imageUrl: 'assets/IMG-20250812-WA0001.jpg', category: 'Necklace' },
            { id: 2, name: 'Sapphire Dream Ring', price: 95000, description: 'Blue sapphire in white gold band.', imageUrl: 'assets/IMG-20250812-WA0002.jpg', category: 'Ring' }
        ];
        localStorage.setItem('products', JSON.stringify(products));
    }

    const productForm = document.getElementById('product-form');
    const productList = document.getElementById('product-list');
    const formTitle = document.getElementById('form-title');
    const submitBtn = document.getElementById('submit-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    const saveProducts = () => {
        localStorage.setItem('products', JSON.stringify(products));
    };

    const renderProductList = () => {
        if (!productList) return;
        productList.innerHTML = products.map(product => {
            let imgTag = '';
            if (product.imageUrl && product.imageUrl.trim() !== '') {
                imgTag = `<img src="${product.imageUrl}" alt="${product.name}" class="product-list-img" style="width:48px;height:48px;object-fit:cover;border-radius:8px;margin-right:16px;">`;
            } else {
                imgTag = `<span style="display:inline-block;width:48px;height:48px;background:#222;border-radius:8px;margin-right:16px;display:flex;align-items:center;justify-content:center;font-size:24px;">🖼️</span>`;
            }
            return `
            <div class="product-list-item">
                ${imgTag}
                <div class="product-list-details">
                    <h4>${product.name}</h4>
                    <p><strong>Category:</strong> ${product.category || ''}</p>
                    <p><strong>Price:</strong> Rs ${product.price.toLocaleString('en-IN')}</p>
                </div>
                <div class="product-list-actions">
                    <button class="admin-button secondary edit-btn" data-id="${product.id}">Edit</button>
                    <button class="admin-button danger delete-btn" data-id="${product.id}">Delete</button>
                </div>
            </div>
            `;
        }).join('');
    };
        const resetForm = () => {
            productForm.reset();
            document.getElementById('product-id').value = '';
            formTitle.textContent = 'Add New Product';
            submitBtn.textContent = 'Add Product';
            cancelBtn.style.display = 'none';
        };
        
    const handleFormSubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('product-id').value;
        const name = document.getElementById('name').value.trim();
        const priceRaw = document.getElementById('price').value.trim();
        const price = parseInt(priceRaw, 10);
        const description = document.getElementById('description').value.trim();
        const category = document.getElementById('category').value;
        let imageUrl = document.getElementById('imageUrl').value.trim();
        const imageAsset = document.getElementById('imageAsset').value;
        if (!imageUrl && imageAsset) imageUrl = imageAsset;

        if (!name || name.length < 2) {
            alert('Name must be at least 2 characters.');
            return;
        }
        if (isNaN(price) || price < 0) {
            alert('Enter a valid non-negative price.');
            return;
        }
        if (!description || description.length < 5) {
            alert('Description must be at least 5 characters.');
            return;
        }
        if (!category) {
            alert('Select a category.');
            return;
        }

        const newProductData = { name, price, description, category, imageUrl };
        if (id) { // Editing existing product
            const index = products.findIndex(p => p.id == id);
            if (index !== -1 && products[index]) {
                products[index] = { ...products[index], ...newProductData };
            }
        } else { // Adding new product
            newProductData.id = Date.now(); // Simple unique ID
            products.push(newProductData);
        }
        saveProducts();
        renderProductList();
        resetForm();
    };

    const populateFormForEdit = (productId) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        
        document.getElementById('product-id').value = product.id;
        document.getElementById('name').value = product.name;
        document.getElementById('price').value = product.price;
        document.getElementById('description').value = product.description;
            document.getElementById('category').value = product.category || '';
            document.getElementById('imageUrl').value = product.imageUrl;
            if (document.getElementById('imageAsset')) {
                document.getElementById('imageAsset').value = product.imageUrl.startsWith('assets/') ? product.imageUrl : '';
            }
        
        formTitle.textContent = 'Edit Product';
        submitBtn.textContent = 'Update Product';
        cancelBtn.style.display = 'inline-block';
        window.scrollTo(0, 0); // Scroll to top to see the form
    };

    // Removed duplicate handleFormSubmit
    
    const handleDelete = (productId) => {
        if (confirm('Are you sure you want to delete this product?')) {
            products = products.filter(p => p.id !== productId);
            saveProducts();
            renderProductList();
        }
    };
    
    // --- EVENT LISTENERS ---
    
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            login(password);
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Product form submission
    if (productForm) {
        productForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Edit and Delete buttons (using event delegation)
    if (productList) {
        productList.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-btn');
            const deleteBtn = e.target.closest('.delete-btn');
            if (editBtn) {
                const id = parseInt(editBtn.dataset.id, 10);
                if (!isNaN(id)) populateFormForEdit(id);
            } else if (deleteBtn) {
                const id = parseInt(deleteBtn.dataset.id, 10);
                if (!isNaN(id)) handleDelete(id);
            }
        });
    }
    
    // Cancel Edit button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetForm);
    }
    
    // --- INITIAL LOAD ---
    checkAuth();
    renderProductList();
});