javascript
import { db, auth } from '../assets/js/firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, query, orderBy, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { CONFIG } from '../config.js';

const IMGBB_API_KEY = CONFIG.IMGBB_API_KEY;

onAuthStateChanged(auth, user => user ? initializeDashboard() : (window.location.href = 'index.html'));

function initializeDashboard() {
    const logoutBtn = document.getElementById('logout-btn');
    const bannerForm = document.getElementById('banner-form');
    const categoryForm = document.getElementById('category-form');
    const categoryListDiv = document.getElementById('category-list');
    const productCategorySelect = document.getElementById('product-category');
    const addProductForm = document.getElementById('add-product-form');

    logoutBtn.addEventListener('click', () => signOut(auth).then(() => window.location.href = 'index.html'));

    bannerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bannerData = {
            title: document.getElementById('banner-title').value,
            subtitle: document.getElementById('banner-subtitle').value
        };
        await setDoc(doc(db, 'settings', 'promoBanner'), bannerData);
        alert('Banner updated successfully!');
    });

    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryNameInput = document.getElementById('category-name');
        const categoryName = categoryNameInput.value.trim();
        if (categoryName) {
            await addDoc(collection(db, 'categories'), { name: categoryName });
            categoryNameInput.value = '';
            loadCategories();
        }
    });

    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const addProductBtn = document.getElementById('add-product-btn');
        addProductBtn.disabled = true;
        addProductBtn.textContent = 'Uploading...';
        
        try {
            const imageFile = document.getElementById('product-image').files[0];
            if (!imageFile) throw new Error('Please select an image.');

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
    });

    async function loadBannerData() {
        const bannerSnap = await getDoc(doc(db, 'settings', 'promoBanner'));
        if (bannerSnap.exists()) {
            document.getElementById('banner-title').value = bannerSnap.data().title;
            document.getElementById('banner-subtitle').value = bannerSnap.data().subtitle;
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

    // Load other data like leads and orders...
    // ...

    loadBannerData();
    loadCategories();
}
