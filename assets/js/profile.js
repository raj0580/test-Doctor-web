import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let translations = {};
const getLang = () => localStorage.getItem('lang') || 'bn';

async function loadTranslations() {
    const lang = getLang();
    try {
        const response = await fetch(`assets/lang/${lang}.json`);
        translations = await response.json();
        translatePage();
    } catch (error) {
        console.error("Failed to load translations:", error);
    }
}

function translatePage() {
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[key]) el.innerText = translations[key];
    });
    document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
        const key = el.getAttribute('data-lang-placeholder');
        if (translations[key]) el.placeholder = translations[key];
    });
    document.documentElement.lang = getLang();
}

const langBnBtn = document.getElementById('lang-bn');
const langEnBtn = document.getElementById('lang-en');
if (langBnBtn && langEnBtn) {
    langBnBtn.addEventListener('click', () => { localStorage.setItem('lang', 'bn'); window.location.reload(); });
    langEnBtn.addEventListener('click', () => { localStorage.setItem('lang', 'en'); window.location.reload(); });
}

const userNameEl = document.getElementById('user-name');
const userPhoneEl = document.getElementById('user-phone');
const userAddressInput = document.getElementById('user-address');
const ordersContainer = document.getElementById('orders-history-container');
const updateProfileBtn = document.getElementById('update-profile-btn');
const logoutBtn = document.getElementById('logout-btn');
let currentUserId = null;

onAuthStateChanged(auth, user => {
    if (user) {
        currentUserId = user.uid;
        loadTranslations().then(() => {
            loadUserProfile(user.uid);
            loadUserOrders(user.uid);
        });
    } else {
        window.location.href = 'index.html';
    }
});

async function loadUserProfile(userId) {
    const docSnap = await getDoc(doc(db, "users", userId));
    if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userNameEl) userNameEl.textContent = userData.name || 'N/A';
        if (userPhoneEl) userPhoneEl.textContent = userData.phone || 'N/A';
        if (userAddressInput) userAddressInput.value = userData.address || '';
    }
}

if (updateProfileBtn) {
    updateProfileBtn.addEventListener('click', async () => {
        if (!currentUserId || !userAddressInput) return;
        const address = userAddressInput.value.trim();
        await updateDoc(doc(db, "users", currentUserId), { address });
        alert(translations.address_updated_success);
    });
}

async function loadUserOrders(userId) {
    if (!ordersContainer) return; // ✅ Defensive check
    const q = query(collection(db, "orders"), where("userId", "==", userId), orderBy("orderDate", "desc"));
    const querySnapshot = await getDocs(q);
    
    ordersContainer.innerHTML = '';
    if (querySnapshot.empty) {
        ordersContainer.innerHTML = `<p>${translations.no_orders_yet || "You haven't placed any orders yet."}</p>`;
        return;
    }

    querySnapshot.forEach(docSnap => {
        const order = docSnap.data();
        const orderDate = new Date(order.orderDate.seconds * 1000).toLocaleDateString(getLang() === 'bn' ? 'bn-BD' : 'en-IN');
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-item';
        orderDiv.innerHTML = `
            <p><strong>${translations.order_id || 'Order ID:'}</strong> ${docSnap.id}</p>
            <p><strong>${translations.order_date || 'Date:'}</strong> ${orderDate}</p>
            <p><strong>${translations.order_total || 'Total Amount:'}</strong> ₹${order.totalAmount}</p>
            <p><strong>${translations.order_status || 'Status:'}</strong> ${order.status}</p>
        `;
        ordersContainer.appendChild(orderDiv);
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = 'index.html';
        });
    });
}

// Hamburger Menu Logic
const hamburger = document.querySelector(".hamburger");
const navLinksContainer = document.querySelector(".nav-links-container");
if (hamburger && navLinksContainer) { // ✅ Defensive check
    hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("active");
        navLinksContainer.classList.toggle("active");
    });
}
