import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, serverTimestamp, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
        el.innerText = translations[key];
    });
    document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
        const key = el.getAttribute('data-lang-placeholder');
        el.placeholder = translations[key];
    });
    document.documentElement.lang = getLang();
}

document.getElementById('lang-bn').addEventListener('click', () => {
    localStorage.setItem('lang', 'bn');
    loadTranslations();
});
document.getElementById('lang-en').addEventListener('click', () => {
    localStorage.setItem('lang', 'en');
    loadTranslations();
});

// --- Main App Logic ---
const leadPopup = document.getElementById('lead-popup');
const otpModal = document.getElementById('otp-modal');
const productsContainer = document.getElementById('products-container');
let productToBuy = null;

document.addEventListener('DOMContentLoaded', () => {
    loadTranslations().then(() => {
        onAuthStateChanged(auth, user => {
            const navLinks = document.getElementById('nav-links');
            const profileLink = navLinks.querySelector('#profile-link');
            if (user) {
                if (!profileLink) {
                    const li = document.createElement('li');
                    li.innerHTML = `<a href="profile.html" id="profile-link" data-lang="nav_profile">${translations.nav_profile}</a>`;
                    navLinks.appendChild(li);
                }
            } else {
                if (profileLink) profileLink.parentElement.remove();
            }
        });

        if (!localStorage.getItem('leadCaptured')) {
            leadPopup.style.display = 'flex';
        }
        loadProducts();
    });
});

document.getElementById('submit-lead').addEventListener('click', async () => {
    const name = document.getElementById('lead-name').value.trim();
    const phone = document.getElementById('lead-phone').value.trim();
    
    // Updated Regex for Indian Numbers
    if (!name || !/^\+91[6-9]\d{9}$/.test(phone)) {
        alert(translations.alert_invalid_details);
        return;
    }
    
    await addDoc(collection(db, "leads"), { name, phone, timestamp: serverTimestamp() });
    localStorage.setItem('leadInfo', JSON.stringify({ name, phone }));
    localStorage.setItem('leadCaptured', 'true');
    leadPopup.style.display = 'none';
});

async function loadProducts() {
    const productSnapshot = await getDocs(collection(db, 'products'));
    productsContainer.innerHTML = '';
    productSnapshot.forEach(doc => {
        const product = { id: doc.id, ...doc.data() };
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.name}">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="price">₹${product.sellingPrice} <span>₹${product.mrp}</span></p>
                <button class="buy-now-btn" data-product-id="${product.id}" data-product-name="${product.name}" data-price="${product.sellingPrice}">${translations.buy_now}</button>
            </div>
        `;
        productsContainer.appendChild(card);
    });

    document.querySelectorAll('.buy-now-btn').forEach(button => button.addEventListener('click', handleBuyNow));
}

function handleBuyNow(event) {
    productToBuy = {
        id: event.target.dataset.productId,
        name: event.target.dataset.productName,
        price: event.target.dataset.price
    };
    onAuthStateChanged(auth, user => user ? placeOrder(user) : initiateAuth());
}

function initiateAuth() {
    const leadInfo = JSON.parse(localStorage.getItem('leadInfo'));
    if (!leadInfo) {
        leadPopup.style.display = 'flex';
        return;
    }
    
    const phoneNumber = leadInfo.phone;
    otpModal.style.display = 'flex';
    document.getElementById('otp-message').innerText = translations.otp_sent_message.replace('{phone}', phoneNumber);

    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });

    document.getElementById('send-otp-btn').onclick = () => {
        signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier)
            .then(confirmationResult => {
                window.confirmationResult = confirmationResult;
                alert(translations.alert_otp_sent);
                document.getElementById('send-otp-btn').style.display = 'none';
                document.getElementById('otp-input').style.display = 'block';
                document.getElementById('verify-otp-btn').style.display = 'block';
            }).catch(() => {
                alert(translations.alert_otp_failed);
                window.location.reload();
            });
    };
}

document.getElementById('verify-otp-btn').onclick = () => {
    const code = document.getElementById('otp-input').value;
    window.confirmationResult.confirm(code).then(async result => {
        const user = result.user;
        const leadInfo = JSON.parse(localStorage.getItem('leadInfo'));
        await setDoc(doc(db, "users", user.uid), {
            name: leadInfo.name,
            phone: user.phoneNumber,
            createdAt: serverTimestamp()
        }, { merge: true });

        alert(translations.alert_verification_success);
        otpModal.style.display = 'none';
        placeOrder(user);
    }).catch(() => alert(translations.alert_invalid_otp));
};

async function placeOrder(user) {
    if (!productToBuy) return;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();

    await addDoc(collection(db, "orders"), {
        userId: user.uid,
        customerInfo: { name: userData.name, phone: user.phoneNumber, address: userData.address || "N/A" },
        items: [productToBuy],
        totalAmount: Number(productToBuy.price),
        status: "Placed",
        paymentMethod: "COD",
        orderDate: serverTimestamp(),
    });
    alert(translations.alert_order_success);
    productToBuy = null;
}
