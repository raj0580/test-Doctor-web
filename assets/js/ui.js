import { collection, getDocs, query, where, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";

let translations = {};
export async function loadTranslations() { /* Unchanged */ }

export async function updatePersonalizedGreeting(user) {
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) {
        if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userName = userDoc.exists() && userDoc.data().name ? userDoc.data().name.split(' ')[0] : 'Back';
            greetingEl.innerText = `Welcome ${userName}!`;
        } else {
            greetingEl.innerText = "Welcome Guest!";
        }
    }
}

export async function loadBanner() {
    const bannerEl = document.getElementById('promo-banner');
    if (!bannerEl) return;
    const bannerSnap = await getDoc(doc(db, 'settings', 'promoBanner'));
    if (bannerSnap.exists()) {
        const data = bannerSnap.data();
        bannerEl.innerHTML = `
            <h2>${data.title}</h2>
            <p>${data.subtitle}</p>`;
    }
}

export async function loadCategories() {
    const container = document.getElementById('category-tabs');
    if (!container) return;
    const categorySnapshot = await getDocs(query(collection(db, 'categories'), orderBy('name')));
    container.innerHTML = `<button class="category-tab active" data-category="all">All</button>`;
    categorySnapshot.forEach(doc => {
        const category = doc.data();
        container.innerHTML += `<button class="category-tab" data-category="${doc.id}">${category.name}</button>`;
    });
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelector('.category-tab.active').classList.remove('active');
            tab.classList.add('active');
            loadProducts(tab.dataset.category);
        });
    });
}

export async function loadProducts(categoryId = 'all') {
    const container = document.getElementById('product-grid');
    if (!container) return;
    container.innerHTML = "<p>Loading products...</p>";

    let productQuery;
    const productsRef = collection(db, 'products');

    if (categoryId === 'all') {
        productQuery = query(productsRef, where("isNewArrival", "==", true), orderBy("createdAt", "desc"));
    } else {
        productQuery = query(productsRef, where("category", "==", categoryId), orderBy("createdAt", "desc"));
    }
    const productSnapshot = await getDocs(productQuery);
    if (productSnapshot.empty) { container.innerHTML = "<p>No products found.</p>"; return; }

    container.innerHTML = '';
    productSnapshot.forEach(doc => {
        const p = doc.data();
        const badgeHTML = p.badge ? `<div class="badge">${p.badge}</div>` : '';
        container.innerHTML += `
            <div class="product-card">
                ${badgeHTML}
                <button class="wishlist-btn"><i class="icon-heart"></i></button>
                <div class="img-container"><img src="${p.imageUrl}" alt="${p.name}"></div>
                <div class="product-info">
                    <h3 class="product-name">${p.name}</h3>
                    <p class="product-price">₹${p.sellingPrice}</p>
                </div>
            </div>`;
    });
}
