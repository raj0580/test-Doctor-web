javascript
let translations = {};

export async function loadTranslations() {
    const lang = localStorage.getItem('lang') || 'bn';
    const response = await fetch(`assets/lang/${lang}.json`);
    translations = await response.json();
    document.documentElement.lang = lang;
    
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[key]) el.innerText = translations[key];
    });
}

export function updatePersonalizedGreeting(user) {
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) {
        if (user) {
            // In a real app, you'd fetch the user's name from Firestore
            greetingEl.innerText = `Welcome back!`;
        } else {
            greetingEl.innerText = translations.welcome_guest || 'Welcome!';
        }
    }
}

export function loadCategories() {
    const container = document.getElementById('category-tabs');
    if (!container) return;

    // Dummy categories - replace with Firestore data
    const categories = ['Vitamins', 'Pain Relief', 'Cold & Flu', 'Digestion', 'Skin Care', 'Baby Care'];
    container.innerHTML = `<button class="category-tab active">All</button>`;
    categories.forEach(cat => {
        container.innerHTML += `<button class="category-tab">${cat}</button>`;
    });
}

export function loadProducts() {
    const container = document.getElementById('product-grid');
    if (!container) return;

    // Dummy products - replace with Firestore data
    const products = [
        { name: 'Multivitamin Gold', price: 250, image: 'https://via.placeholder.com/150', badge: 'Limited' },
        { name: 'Pain Relief Gel', price: 120, image: 'https://via.placeholder.com/150' },
        { name: 'Cough Syrup', price: 90, image: 'https://via.placeholder.com/150', badge: 'Sale' },
        { name: 'Antacid Tablets', price: 60, image: 'https://via.placeholder.com/150' },
    ];

    container.innerHTML = '';
    products.forEach(p => {
        const badgeHTML = p.badge ? `<div class="badge">${p.badge}</div>` : '';
        container.innerHTML += `
            <div class="product-card">
                ${badgeHTML}
                <button class="wishlist-btn"><i class="icon-heart"></i></button>
                <div class="img-container">
                    <img src="${p.image}" alt="${p.name}">
                </div>
                <div class="product-info">
                    <h3 class="product-name">${p.name}</h3>
                    <p class="product-price">₹${p.price}</p>
                </div>
            </div>
        `;
    });
}
