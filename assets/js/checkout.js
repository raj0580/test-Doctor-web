import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, addDoc, collection, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { CONFIG } from '../../config.js';

const RAZORPAY_KEY_ID = CONFIG.RAZORPAY_KEY_ID;
let currentUser = null;
let productToCheckout = null;
let translations = {};

document.addEventListener('DOMContentLoaded', () => {
    productToCheckout = JSON.parse(sessionStorage.getItem('productToCheckout'));
    if (!productToCheckout) {
        window.location.href = 'index.html';
        return;
    }
    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            loadPage();
        } else {
            // যদি কোনো কারণে ইউজার লগড আউট হয়ে যায়, তাকে হোমপেজে পাঠানো হবে
            window.location.href = 'index.html';
        }
    });
});

async function loadPage() {
    await loadTranslations();
    displayProductSummary();
    loadUserProfile();
}

async function loadTranslations() {
    const lang = localStorage.getItem('lang') || 'bn';
    try {
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
    } catch (error) {
        console.error("Failed to load translations:", error);
    }
}

function displayProductSummary() {
    const summaryCard = document.getElementById('product-summary-card');
    if (summaryCard) {
        summaryCard.innerHTML = `
            <img src="${productToCheckout.imageUrl}" alt="${productToCheckout.name}" style="width: 100px; border-radius: 5px;">
            <div>
                <h4>${productToCheckout.name}</h4>
                <p><strong>Price:</strong> ₹${productToCheckout.price}</p>
            </div>
        `;
    }
}

async function loadUserProfile() {
    const userDocRef = doc(db, "users", currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    let userData = {};

    if (userDocSnap.exists()) {
        userData = userDocSnap.data();
    }
    
    // Local Storage থেকে তথ্য নিয়ে আসা হচ্ছে fallback হিসেবে
    const leadInfo = JSON.parse(localStorage.getItem('leadInfo')) || {};
    
    const displayName = userData.name || leadInfo.name || "Guest";
    const displayPhone = userData.phone || currentUser.phoneNumber || leadInfo.phone;

    const nameDisplay = document.getElementById('user-name-display');
    const phoneDisplay = document.getElementById('user-phone-display');
    const addressInput = document.getElementById('shipping-address-input');

    if (nameDisplay) nameDisplay.textContent = displayName;
    if (phoneDisplay) phoneDisplay.textContent = displayPhone;
    if (addressInput) addressInput.value = userData.address || '';
}

const payNowBtn = document.getElementById('pay-now-btn');
if (payNowBtn) {
    payNowBtn.addEventListener('click', async () => {
        const shippingAddressInput = document.getElementById('shipping-address-input');
        if (!shippingAddressInput) return;

        const shippingAddress = shippingAddressInput.value.trim();
        if (!shippingAddress) {
            alert('Please provide a shipping address.');
            return;
        }

        // ✅=============== মূল সমাধান এখানে ===============✅
        // updateDoc এর পরিবর্তে setDoc({ merge: true }) ব্যবহার করা হচ্ছে।
        // যদি ডকুমেন্ট না থাকে, এটি নতুন ডকুমেন্ট তৈরি করবে।
        // যদি ডকুমেন্ট থাকে, এটি শুধুমাত্র ঠিকানা ফিল্ডটি আপডেট করবে, বাকি ডেটা ঠিক থাকবে।
        const userDocRef = doc(db, "users", currentUser.uid);
        await setDoc(userDocRef, { address: shippingAddress }, { merge: true });
        
        const userData = (await getDoc(userDocRef)).data();
        const leadInfo = JSON.parse(localStorage.getItem('leadInfo')) || {};

        const options = {
            key: RAZORPAY_KEY_ID,
            amount: Number(productToCheckout.price) * 100,
            currency: "INR",
            name: translations.site_title,
            description: `Payment for ${productToCheckout.name}`,
            handler: async (response) => {
                const orderData = {
                    userId: currentUser.uid,
                    customerInfo: {
                        name: userData.name || leadInfo.name,
                        phone: currentUser.phoneNumber,
                        address: shippingAddress
                    },
                    items: [productToCheckout],
                    totalAmount: Number(productToCheckout.price),
                    status: "Placed",
                    paymentMethod: "Online",
                    paymentDetails: { razorpay_payment_id: response.razorpay_payment_id },
                    orderDate: serverTimestamp(),
                };
                try {
                    const docRef = await addDoc(collection(db, "orders"), orderData);
                    sessionStorage.removeItem('productToCheckout');
                    window.location.href = `order-success.html?orderId=${docRef.id}`;
                } catch (e) {
                    console.error("Error saving order: ", e);
                    alert("Order could not be saved. Please contact support.");
                }
            },
            prefill: {
                name: userData.name || leadInfo.name,
                contact: currentUser.phoneNumber
            },
            theme: {
                color: "#2a9d8f"
            }
        };

        const rzp1 = new Razorpay(options);
        rzp1.on('payment.failed', (response) => {
            alert(`Payment failed: ${response.error.description}`);
        });
        rzp1.open();
    });
}
