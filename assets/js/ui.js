import { collection, getDocs, query, where, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, auth } from "./firebase-config.js";
import { showAuthModal } from "./auth.js";
function getCart() {
return JSON.parse(localStorage.getItem('cart')) || [];
}
function saveCart(cart) {
localStorage.setItem('cart', JSON.stringify(cart));
updateCartCount();
}
export function updateCartCount() {
const cart = getCart();
const countEl = document.querySelectorAll('.cart-count');
countEl.forEach(el => {
if (cart.length > 0) {
el.textContent = cart.length;
el.classList.remove('hidden');
} else {
el.classList.add('hidden');
}
});
}
function addToCart(product) {
if (!auth.currentUser) {
showAuthModal();
return;
}
let cart = getCart();
// Prevent duplicates
if (!cart.find(item => item.id === product.id)) {
cart.push(product);
saveCart(cart);
alert(${product.name} added to cart!);
} else {
alert(${product.name} is already in your cart.);
}
}
export async function updatePersonalizedGreeting(user) {
const greetingEl = document.getElementById('user-greeting');
if (greetingEl) {
if (user) {
const userDoc = await getDoc(doc(db, 'users', user.uid));
const userName = userDoc.exists() && userDoc.data().name ? userDoc.data().name.split(' ')[0] : 'Back';
greetingEl.innerText = Welcome ${userName}!;
} else {
greetingEl.innerText = "Welcome Guest!";
}
}
}
export async function loadBanner() {
const bannerEl = document.getElementById('promo-banner');
const titleEl = document.getElementById('promo-title');
const subtitleEl = document.getElementById('promo-subtitle');
if (!bannerEl) return;
try {
const bannerSnap = await getDoc(doc(db, 'settings', 'promoBanner'));
if (bannerSnap.exists()) {
const data = bannerSnap.data();
if (data.imageUrl) bannerEl.style.backgroundImage = url(${data.imageUrl});
if (data.title && titleEl) titleEl.textContent = data.title;
if (data.subtitle && subtitleEl) subtitleEl.textContent = data.subtitle;
}
} catch (e) { console.error("Error loading banner", e); }
}
export async function loadCategories() {
const container = document.getElementById('category-tabs');
if (!container) return;
try {
const categorySnapshot = await getDocs(query(collection(db, 'categories'), orderBy('name')));
container.innerHTML = <button class="category-tab active" data-category="all">All</button>;
categorySnapshot.forEach(doc => {
const category = doc.data();
container.innerHTML += <button class="category-tab" data-category="${doc.id}">${category.name}</button>;
});
document.querySelectorAll('.category-tab').forEach(tab => {
tab.addEventListener('click', () => {
document.querySelector('.category-tab.active').classList.remove('active');
tab.classList.add('active');
loadProducts(tab.dataset.category);
});
});
} catch(e) { console.error("Error loading categories", e); }
}
export async function loadProducts(categoryId = 'all') {
const container = document.getElementById('product-grid');
if (!container) return;
container.innerHTML = "<p>Loading products...</p>";
    
