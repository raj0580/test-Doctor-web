import { db, auth } from '../assets/js/firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, query, orderBy, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { CONFIG } from '../config.js';
const IMGBB_API_KEY = CONFIG.IMGBB_API_KEY;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const adminRef = doc(db, 'admins', user.uid);
        const adminSnap = await getDoc(adminRef);
        if (adminSnap.exists() && adminSnap.data().isAdmin) {
            initializeDashboard();
        } else {
            alert('Access Denied. You are not an admin.');
            window.location.href = '/index.html';
        }
    } else {
        window.location.href = 'index.html';
    }
});
function initializeDashboard() {
    const logoutBtn = document.getElementById('logout-btn');
    const bannerForm = document.getElementById('banner-form');
    const categoryForm = document.getElementById('category-form');
    const addProductForm = document.getElementById('add-product-form');
    
    logoutBtn.addEventListener('click', () => signOut(auth).then(() => window.location.href = 'index.html'));

    bannerForm.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = document.getElementById('update-banner-btn');
        btn.disabled = true; btn.textContent = 'Updating...';
        try {
            const imageFile = document.getElementById('banner-image').files[0];
            let imageUrl = document.getElementById('current-banner-img').src;
            if (imageFile) {
                const formData = new FormData();
                formData.append('image', imageFile);
                const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                const result = await res.json();
                if (!result.success) throw new Error('Banner Image upload failed');
                imageUrl = result.data.url;
            }
            await setDoc(doc(db, 'settings', 'promoBanner'), {
                title: document.getElementById('banner-title').value,
                subtitle: document.getElementById('banner-subtitle').value,
                imageUrl: imageUrl
            });
            alert('Banner updated!');
            loadBannerData();
        } catch (error) { alert(`Error: ${error.message}`);
        } finally { btn.disabled = false; btn.textContent = 'Update Banner'; }
    });

    categoryForm.addEventListener('submit', async e => {
        e.preventDefault();
        const input = document.getElementById('category-name');
        if (input.value.trim()) {
            await addDoc(collection(db, 'categories'), { name: input.value.trim() });
            input.value = '';
            loadCategories();
        }
    });

    addProductForm.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = document.getElementById('add-product-btn');
        btn.disabled = true; btn.textContent = 'Uploading...';
        try {
            const imageFile = document.getElementById('product-image').files[0];
            if (!imageFile) throw new Error('Please select a product image.');
            const formData = new FormData();
            formData.append('image', imageFile);
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
            const result = await res.json();
            if (!result.success) throw new Error('Image upload failed');
            await addDoc(collection(db, 'products'), {
                name: document.getElementById('product-name').value,
                mrp: Number(document.getElementById('product-mrp').value),
                sellingPrice: Number(document.getElementById('product-price').value),
                category: document.getElementById('product-category').value,
                isNewArrival: document.getElementById('is-new-arrival').checked,
                badge: document.getElementById('product-badge').value.trim(),
                imageUrl: result.data.url,
                createdAt: serverTimestamp()
            });
            alert('Product added!');
            addProductForm.reset();
        } catch (error) { alert(`Error: ${error.message}`);
        } finally { btn.disabled = false; btn.textContent = 'Add Product'; }
    });

    async function loadBannerData() {
        const snap = await getDoc(doc(db, 'settings', 'promoBanner'));
        if (snap.exists()) {
            document.getElementById('current-banner-img').src = snap.data().imageUrl || '';
            document.getElementById('banner-title').value = snap.data().title || '';
            document.getElementById('banner-subtitle').value = snap.data().subtitle || '';
        }
    }

    async function loadCategories() {
        const snap = await getDocs(query(collection(db, 'categories'), orderBy('name')));
        const listDiv = document.getElementById('category-list');
        const selectEl = document.getElementById('product-category');
        listDiv.innerHTML = '';
        selectEl.innerHTML = '<option value="">Select Category</option>';
        snap.forEach(doc => {
            listDiv.innerHTML += `<div class="category-item"><span>${doc.data().name}</span><button class="delete-btn" data-id="${doc.id}">Delete</button></div>`;
            selectEl.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
        });
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', async e => {
            if (confirm('Are you sure?')) {
                await deleteDoc(doc(db, 'categories', e.target.dataset.id));
                loadCategories();
            }
        }));
    }
    
    async function loadOrders() { /* ... */ }
    async function loadUsers() {
        const usersContainer = document.getElementById('users-container');
        const snap = await getDocs(collection(db, "users"));
        let html = '<table class="data-table"><tr><th>Name</th><th>Contact</th><th>Joined</th></tr>';
        snap.forEach(doc => {
            const user = doc.data();
            const date = user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
            html += `<tr><td>${user.name}</td><td>${user.email || user.phone}</td><td>${date}</td></tr>`;
        });
        usersContainer.innerHTML = html + '</table>';
    }

    // Tab switching logic
    document.querySelectorAll('.tab-link').forEach(tab => tab.addEventListener('click', () => {
        document.querySelector('.tab-link.active').classList.remove('active');
        document.querySelector('.tab-content.active').classList.remove('active');
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    }));

    loadBannerData();
    loadCategories();
    loadOrders();
    loadUsers();
}
