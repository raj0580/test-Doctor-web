import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, serverTimestamp, doc, setDoc, getDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

document.getElementById('lang-bn').addEventListener('click', () => { localStorage.setItem('lang', 'bn'); window.location.reload(); });
document.getElementById('lang-en').addEventListener('click', () => { localStorage.setItem('lang', 'en'); window.location.reload(); });

const leadPopup = document.getElementById('lead-popup');
const otpModal = document.getElementById('otp-modal');
const productsContainer = document.getElementById('products-container');

async function loadHeroBanner() {
    const heroSection = document.getElementById('hero-section');
    try {
        const docSnap = await getDoc(doc(db, "settings", "heroBanner"));
        if (docSnap.exists() && docSnap.data().imageUrl) {
            heroSection.style.backgroundImage = `url(${docSnap.data().imageUrl})`;
        } else {
            heroSection.innerHTML = `<div class="hero-content"><h1 data-lang="hero_title"></h1><p data-lang="hero_subtitle"></p></div>`;
            translatePage(); // To translate the fallback text
        }
    } catch (e) {
        console.error("Error loading banner:", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadTranslations().then(() => {
        onAuthStateChanged(auth, user => {
            const navLinksContainer = document.querySelector(".nav-links-container ul");
            let profileLink = navLinksContainer.querySelector('#profile-link');
            if (user) {
                if (!profileLink) {
                    const li = document.createElement('li');
                    li.innerHTML = `<a href="profile.html" id="profile-link" data-lang="nav_profile">${translations.nav_profile}</a>`;
                    navLinksContainer.appendChild(li);
                }
            } else {
                if (profileLink) profileLink.parentElement.remove();
            }
        });

        // ✅ সংশোধিত লজিক: Local Storage চেক করা হচ্ছে
        if (!localStorage.getItem('leadInfo')) {
            leadPopup.style.display = 'flex';
        }
        loadHeroBanner();
        loadProducts();
    });
});

document.getElementById('submit-lead').addEventListener('click', async () => {
    const name = document.getElementById('lead-name').value.trim();
    const phone = document.getElementById('lead-phone').value.trim();
    if (!name || !/^\+91[6-9]\d{9}$/.test(phone)) {
        alert(translations.alert_invalid_details);
        return;
    }

    // ✅ সংশোধিত লজিক: লিড যোগ করার আগে চেক করা হচ্ছে
    const leadsRef = collection(db, "leads");
    const q = query(leadsRef, where("phone", "==", phone));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        // যদি এই ফোন নম্বর আগে না থাকে, তবেই লিড যোগ করা হবে
        await addDoc(leadsRef, { name, phone, timestamp: serverTimestamp() });
    }
    
    // ✅ Local Storage-এ তথ্য সেভ করা হচ্ছে
    localStorage.setItem('leadInfo', JSON.stringify({ name, phone }));
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
                <button class="buy-now-btn" data-product-id="${product.id}" data-product-name="${product.name}" data-price="${product.sellingPrice}" data-mrp="${product.mrp}">${translations.buy_now}</button>
            </div>`;
        productsContainer.appendChild(card);
    });
    document.querySelectorAll('.buy-now-btn').forEach(button => button.addEventListener('click', handleBuyNow));
}

function handleBuyNow(event) {
    const button = event.target;
    const card = button.closest('.product-card');
    const productToBuy = {
        id: button.dataset.productId,
        name: button.dataset.productName,
        price: button.dataset.price,
        mrp: button.dataset.mrp,
        imageUrl: card.querySelector('img').src
    };
    sessionStorage.setItem('productToCheckout', JSON.stringify(productToBuy));
    onAuthStateChanged(auth, user => user ? (window.location.href = 'checkout.html') : initiateAuth());
}

function initiateAuth() {
    const leadInfo = JSON.parse(localStorage.getItem('leadInfo'));
    if (!leadInfo) { leadPopup.style.display = 'flex'; return; }
    
    otpModal.style.display = 'flex';
    document.getElementById('otp-message').innerText = translations.otp_sent_message.replace('{phone}', leadInfo.phone);

    // Ensure reCAPTCHA container is visible and ready
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
    }
    
    const sendOtpBtn = document.getElementById('send-otp-btn');
    sendOtpBtn.onclick = () => {
        signInWithPhoneNumber(auth, leadInfo.phone, window.recaptchaVerifier)
            .then(confirmationResult => {
                window.confirmationResult = confirmationResult;
                alert(translations.alert_otp_sent);
                sendOtpBtn.style.display = 'none';
                document.getElementById('otp-input').style.display = 'block';
                document.getElementById('verify-otp-btn').style.display = 'block';
            }).catch((error) => {
                 console.error("OTP Error:", error);
                 alert(translations.alert_otp_failed); 
                 window.recaptchaVerifier.render().then(widgetId => grecaptcha.reset(widgetId));
            });
    };
}

document.getElementById('verify-otp-btn').onclick = () => {
    const code = document.getElementById('otp-input').value;
    window.confirmationResult.confirm(code).then(async result => {
        const leadInfo = JSON.parse(localStorage.getItem('leadInfo'));
        // ✅ Local Storage থেকে পাওয়া নাম এখানে ব্যবহার করা হচ্ছে
        await setDoc(doc(db, "users", result.user.uid), { name: leadInfo.name, phone: result.user.phoneNumber, createdAt: serverTimestamp() }, { merge: true });
        alert(translations.alert_verification_success);
        otpModal.style.display = 'none';
        window.location.href = 'checkout.html';
    }).catch(() => alert(translations.alert_invalid_otp));
};

// Hamburger Menu Logic
const hamburger = document.querySelector(".hamburger");
const navLinksContainer = document.querySelector(".nav-links-container");

hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navLinksContainer.classList.toggle("active");
});
