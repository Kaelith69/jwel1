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
    let products = JSON.parse(localStorage.getItem('products')) || [
        { id: 1, name: 'Ethereal Diamond Necklace', price: 120000, description: 'A stunning necklace featuring a pear-cut diamond, surrounded by a halo of smaller gems.', imageUrl: 'assets/IMG-20250812-WA0001.jpg' },
        { id: 2, name: 'Sapphire Dream Ring', price: 95000, description: 'An elegant ring with a central blue sapphire, set in a white gold band.', imageUrl: 'assets/IMG-20250812-WA0002.jpg' },
        { id: 3, name: 'Ruby Radiance Earrings', price: 78000, description: 'Exquisite drop earrings with vibrant rubies that catch the light beautifully.', imageUrl: 'assets/IMG-20250812-WA0003.jpg' },
        { id: 4, name: 'Emerald Isle Bracelet', price: 150000, description: 'A timeless bracelet adorned with square-cut emeralds and diamonds.', imageUrl: 'assets/IMG-20250812-WA0004.jpg' },
        { id: 5, name: 'Golden Grace Bangles', price: 67000, description: 'Classic gold bangles with intricate filigree work.', imageUrl: 'assets/IMG-20250812-WA0005.jpg' },
        { id: 6, name: 'Pearl Elegance Necklace', price: 54000, description: 'A string of lustrous pearls with a diamond-studded clasp.', imageUrl: 'assets/IMG-20250812-WA0006.jpg' },
        { id: 7, name: 'Opulent Choker Set', price: 112000, description: 'A regal choker set with emeralds and pearls.', imageUrl: 'assets/IMG-20250812-WA0007.jpg' },
        { id: 8, name: 'Classic Solitaire Ring', price: 89000, description: 'A timeless solitaire diamond ring in platinum.', imageUrl: 'assets/IMG-20250812-WA0008.jpg' },
        { id: 9, name: 'Rose Gold Heart Pendant', price: 32000, description: 'A delicate heart pendant in rose gold with a tiny diamond.', imageUrl: 'assets/IMG-20250812-WA0009.jpg' },
        { id: 10, name: 'Majestic Kundan Set', price: 135000, description: 'Traditional kundan necklace set with matching earrings.', imageUrl: 'assets/IMG-20250812-WA0010.jpg' },
        { id: 11, name: 'Blue Topaz Studs', price: 21000, description: 'Elegant blue topaz stud earrings in silver.', imageUrl: 'assets/IMG-20250812-WA0011.jpg' },
        { id: 12, name: 'Emerald Drop Earrings', price: 48000, description: 'Emerald drop earrings with diamond accents.', imageUrl: 'assets/IMG-20250812-WA0012.jpg' },
        { id: 13, name: 'Vintage Ruby Brooch', price: 39000, description: 'A vintage brooch with a central ruby and gold filigree.', imageUrl: 'assets/IMG-20250812-WA0013.jpg' }
    ];

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
        const name = document.getElementById('name').value;
        const price = parseInt(document.getElementById('price').value, 10);
        const description = document.getElementById('description').value;
        const category = document.getElementById('category').value;
        let imageUrl = document.getElementById('imageUrl').value;
        const imageAsset = document.getElementById('imageAsset').value;
        if (!imageUrl && imageAsset) imageUrl = imageAsset;
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
            const id = parseInt(e.target.dataset.id);
            if (e.target.classList.contains('edit-btn')) {
                populateFormForEdit(id);
            } else if (e.target.classList.contains('delete-btn')) {
                handleDelete(id);
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