import { db, auth } from '../assets/js/firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, query, orderBy, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { CONFIG } from '../config.js';

const IMGBB_API_KEY = CONFIG.IMGBB_API_KEY;

// Security check: Verify the user is an admin before initializing the dashboard.
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const adminRef = doc(db, 'admins', user.uid);
        const adminSnap = await getDoc(adminRef);
        if (adminSnap.exists() && adminSnap.data().isAdmin) {
            initializeDashboard();
        } else {
            // If a non-admin user somehow lands here, deny access and redirect.
            alert('Access Denied. You are not an admin.');
            window.location.href = '/index.html';
        }
    } else {
        // If no user is logged in, redirect to the admin login page.
        window.location.href = 'index.html';
    }
});

function initializeDashboard() {
    // DOM Element Query Selectors
    const logoutBtn = document.getElementById('logout-btn');
    const bannerForm = document.getElementById('banner-form');
    const categoryForm = document.getElementById('category-form');
    const addProductForm = document.getElementById('add-product-form');
    const categoryListDiv = document.getElementById('category-list');
    const productCategorySelect = document.getElementById('product-category');
    const ordersContainer = document.getElementById('orders-container');
    const usersContainer = document.getElementById('users-container');

    // --- Core Event Listeners ---
    
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = 'index.html';
        });
    });

    bannerForm.addEventListener('submit', handleBannerUpdate);
    categoryForm.addEventListener('submit', handleAddCategory);
    addProductForm.addEventListener('submit', handleAddProduct);

    // Tab switching logic
    document.querySelectorAll('.tab-link').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelector('.tab-link.active').classList.remove('active');
            document.querySelector('.tab-content.active').classList.remove('active');
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // --- Form Handlers ---

    async function handleBannerUpdate(e) {
        e.preventDefault();
        const updateBannerBtn = document.getElementById('update-banner-btn');
        updateBannerBtn.disabled = true;
        updateBannerBtn.textContent = 'Updating...';
        try {
            const imageFile = document.getElementById('banner-image').files[0];
            let imageUrl = document.getElementById('current-banner-img').src;
            if (imageFile) {
                const formData = new FormData();
                formData.append('image', imageFile);
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                const result = await response.json();
                if (!result.success) throw new Error('Banner Image upload failed to ImgBB');
                imageUrl = result.data.url;
            }
            const bannerData = {
                title: document.getElementById('banner-title').value,
                subtitle: document.getElementById('banner-subtitle').value,
                imageUrl: imageUrl
            };
            await setDoc(doc(db, 'settings', 'promoBanner'), bannerData);
            alert('Banner updated successfully!');
            loadBannerData();
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            updateBannerBtn.disabled = false;
            updateBannerBtn.textContent = 'Update Banner';
        }
    }

    async function handleAddCategory(e) {
        e.preventDefault();
        const categoryNameInput = document.getElementById('category-name');
        const categoryName = categoryNameInput.value.trim();
        if (categoryName) {
            await addDoc(collection(db, 'categories'), { name: categoryName });
            categoryNameInput.value = '';
            loadCategories();
        }
    }

    async function handleAddProduct(e) {
        e.preventDefault();
        const addProductBtn = document.getElementById('add-product-btn');
        addProductBtn.disabled = true;
        addProductBtn.textContent = 'Uploading...';
        try {
            const imageFile = document.getElementById('product-image').files[0];
            if (!imageFile) throw new Error('Please select a product image.');
            const formData = new FormData();
            formData.append('image', imageFile);
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
            const result = await response.json();
            if (!result.success) throw new Error('Image upload failed to ImgBB.');
            
            const productData = {
                name: document.getElementById('product-name').value,
                mrp: Number(document.getElementById('product-mrp').value),
                sellingPrice: Number(document.getElementById('product-price').value),
                category: document.getElementById('product-category').value,
                isNewArrival: document.getElementById('is-new-arrival').checked,
                badge: document.getElementById('product-badge').value.trim(),
                imageUrl: result.data.url,
                createdAt: serverTimestamp()
            };
            await addDoc(collection(db, 'products'), productData);
            alert('Product added successfully!');
            addProductForm.reset();
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            addProductBtn.disabled = false;
            addProductBtn.textContent = 'Add Product';
        }
    }

    // --- Data Loading Functions ---

    async function loadBannerData() {
        const bannerSnap = await getDoc(doc(db, 'settings', 'promoBanner'));
        if (bannerSnap.exists()) {
            document.getElementById('current-banner-img').src = bannerSnap.data().imageUrl || '';
            document.getElementById('banner-title').value = bannerSnap.data().title || '';
            document.getElementById('banner-subtitle').value = bannerSnap.data().subtitle || '';
        }
    }

    async function loadCategories() {
        const categorySnapshot = await getDocs(query(collection(db, 'categories'), orderBy('name')));
        let listHtml = '';
        let selectHtml = '<option value="">Select Category</option>';
        categorySnapshot.forEach(doc => {
            listHtml += `<div class="category-item"><span>${doc.data().name}</span><button class="delete-btn" data-id="${doc.id}">Delete</button></div>`;
            selectHtml += `<option value="${doc.id}">${doc.data().name}</option>`;
        });
        categoryListDiv.innerHTML = listHtml;
        productCategorySelect.innerHTML = selectHtml;

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                if(confirm('Are you sure you want to delete this category?')) {
                    await deleteDoc(doc(db, 'categories', e.target.dataset.id));
                    loadCategories();
                }
            });
        });
    }
    
    async function loadOrders() {
        const q = query(collection(db, "orders"), orderBy("orderDate", "desc"));
        const orderSnapshot = await getDocs(q);
        let html = '<table class="data-table"><thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Action</th></tr></thead><tbody>';
        if (orderSnapshot.empty) {
            html += '<tr><td colspan="5">No orders found.</td></tr>';
        } else {
            orderSnapshot.forEach(doc => {
                const order = doc.data();
                html += `
                    <tr>
                        <td>${doc.id}</td>
                        <td>${order.customerInfo.name}<br>${order.customerInfo.phone || order.customerInfo.email}</td>
                        <td>₹${order.totalAmount}</td>
                        <td>${order.status}</td>
                        <td>
                            <select class="order-status-select" data-id="${doc.id}">
                                <option value="Placed" ${order.status === 'Placed' ? 'selected' : ''}>Placed</option>
                                <option value="Dispatched" ${order.status === 'Dispatched' ? 'selected' : ''}>Dispatched</option>
                                <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                                <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </td>
                    </tr>`;
            });
        }
        ordersContainer.innerHTML = html + '</tbody></table>';

        document.querySelectorAll('.order-status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                await updateDoc(doc(db, "orders", e.target.dataset.id), { status: e.target.value });
                alert(`Order status updated.`);
            });
        });
    }

    async function loadUsers() {
        const usersSnapshot = await getDocs(collection(db, "users"));
        let html = '<table class="data-table"><thead><tr><th>Name</th><th>Contact</th><th>Joined On</th></tr></thead><tbody>';
        if (usersSnapshot.empty) {
            html += '<tr><td colspan="3">No users found.</td></tr>';
        } else {
            usersSnapshot.forEach(doc => {
                const user = doc.data();
                const joinedDate = user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
                html += `<tr><td>${user.name}</td><td>${user.email || user.phone}</td><td>${joinedDate}</td></tr>`;
            });
        }
        usersContainer.innerHTML = html + '</tbody></table>';
    }

    // Initial Load for All Dashboard Data
    loadBannerData();
    loadCategories();
    loadOrders();
    loadUsers();
}
