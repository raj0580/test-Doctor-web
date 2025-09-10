import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Language Switcher Logic ---
let translations = {};
const getLang = () => localStorage.getItem('lang') || 'bn';

async function loadTranslations() {
    const lang = getLang();
    const response = await fetch(`assets/lang/${lang}.json`);
    translations = await response.json();
    translatePage();
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

document.getElementById('lang-bn').addEventListener('click', () => {
    localStorage.setItem('lang', 'bn');
    loadTranslations();
    loadUserOrders(auth.currentUser.uid); // Re-render orders in new language
});
document.getElementById('lang-en').addEventListener('click', () => {
    localStorage.setItem('lang', 'en');
    loadTranslations();
    loadUserOrders(auth.currentUser.uid); // Re-render orders in new language
});

// --- Profile Page Logic ---
const userNameEl = document.getElementById('user-name');
const userPhoneEl = document.getElementById('user-phone');
const userAddressInput = document.getElementById('user-address');
const ordersContainer = document.getElementById('orders-history-container');
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
        userNameEl.textContent = userData.name || 'N/A';
        userPhoneEl.textContent = userData.phone || 'N/A';
        userAddressInput.value = userData.address || '';
    }
}

document.getElementById('update-profile-btn').addEventListener('click', async () => {
    const address = userAddressInput.value.trim();
    if (!currentUserId || !address) return;
    await updateDoc(doc(db, "users", currentUserId), { address });
    alert(translations.address_updated_success);
});

async function loadUserOrders(userId) {
    const q = query(collection(db, "orders"), where("userId", "==", userId), orderBy("orderDate", "desc"));
    const querySnapshot = await getDocs(q);
    
    ordersContainer.innerHTML = '';
    if (querySnapshot.empty) {
        ordersContainer.innerHTML = `<p>${translations.no_orders_yet}</p>`;
        return;
    }

    querySnapshot.forEach(docSnap => {
        const order = docSnap.data();
        const orderDate = new Date(order.orderDate.seconds * 1000).toLocaleDateString(getLang() === 'bn' ? 'bn-BD' : 'en-IN');
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-item';
        orderDiv.innerHTML = `
            <p><strong>${translations.order_id}</strong> ${docSnap.id}</p>
            <p><strong>${translations.order_date}</strong> ${orderDate}</p>
            <p><strong>${translations.order_total}</strong> ₹${order.totalAmount}</p>
            <p><strong>${translations.order_status}</strong> ${order.status}</p>
        `;
        ordersContainer.appendChild(orderDiv);
    });
}

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
});
