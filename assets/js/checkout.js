import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { CONFIG } from '../../config.js';

const RAZORPAY_KEY_ID = CONFIG.RAZORPAY_KEY_ID;
let currentUser = null;
let productToCheckout = null;
let translations = {};

document.addEventListener('DOMContentLoaded', () => {
    productToCheckout = JSON.parse(sessionStorage.getItem('productToCheckout'));
    if (!productToCheckout) { window.location.href = 'index.html'; return; }
    onAuthStateChanged(auth, user => user ? (currentUser = user, loadPage()) : (window.location.href = 'index.html'));
});

async function loadPage() {
    await loadTranslations();
    displayProductSummary();
    loadUserProfile();
}

async function loadTranslations() {
    const lang = localStorage.getItem('lang') || 'bn';
    const response = await fetch(`assets/lang/${lang}.json`);
    translations = await response.json();
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[key]) el.innerText = translations[key];
    });
    document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
        const key = el.getAttribute('data-lang-placeholder');
        if (translations[key]) el.placeholder = translations[key];
    });
}

function displayProductSummary() {
    document.getElementById('product-summary-card').innerHTML = `
        <img src="${productToCheckout.imageUrl}" alt="${productToCheckout.name}" style="width: 100px; border-radius: 5px;">
        <div>
            <h4>${productToCheckout.name}</h4>
            <p><strong>Price:</strong> ₹${productToCheckout.price}</p>
        </div>
    `;
}

async function loadUserProfile() {
    const userDocRef = doc(db, "users", currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    let userData = {};

    if (userDocSnap.exists()) {
        userData = userDocSnap.data();
    }

    // ✅ সংশোধিত লজিক: Local Storage থেকে তথ্য নিয়ে আসা হচ্ছে
    const leadInfo = JSON.parse(localStorage.getItem('leadInfo'));
    
    // Firestore-এর ডেটার চেয়ে Local Storage-এর নামকে অগ্রাধিকার দেওয়া হচ্ছে (যদি থাকে)
    const displayName = userData.name || leadInfo.name;
    const displayPhone = userData.phone || leadInfo.phone;

    document.getElementById('user-name-display').textContent = displayName;
    document.getElementById('user-phone-display').textContent = displayPhone;
    document.getElementById('shipping-address-input').value = userData.address || '';
}

document.getElementById('pay-now-btn').addEventListener('click', async () => {
    const shippingAddress = document.getElementById('shipping-address-input').value.trim();
    if (!shippingAddress) {
        alert('Please provide a shipping address.');
        return;
    }

    // ✅ ঠিকানাটি ইউজার প্রোফাইলে সেভ করা হচ্ছে ভবিষ্যতের জন্য
    const userDocRef = doc(db, "users", currentUser.uid);
    await updateDoc(userDocRef, { address: shippingAddress });
    
    const userData = (await getDoc(userDocRef)).data();

    const options = {
        key: RAZORPAY_KEY_ID,
        amount: Number(productToCheckout.price) * 100,
        currency: "INR",
        name: translations.site_title,
        description: `Payment for ${productToCheckout.name}`,
        handler: async (response) => {
            const orderData = {
                userId: currentUser.uid,
                customerInfo: { name: userData.name, phone: currentUser.phoneNumber, address: shippingAddress },
                items: [productToCheckout],
                totalAmount: Number(productToCheckout.price),
                status: "Placed",
                paymentMethod: "Online",
                paymentDetails: { razorpay_payment_id: response.razorpay_payment_id },
                orderDate: serverTimestamp(),
            };
            const docRef = await addDoc(collection(db, "orders"), orderData);
            sessionStorage.removeItem('productToCheckout');
            window.location.href = `order-success.html?orderId=${docRef.id}`;
        },
        prefill: { name: userData.name, contact: currentUser.phoneNumber },
        theme: { color: "#2a9d8f" }
    };

    const rzp1 = new Razorpay(options);
    rzp1.on('payment.failed', (response) => alert(`Payment failed: ${response.error.description}`));
    rzp1.open();
});
