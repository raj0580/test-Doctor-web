import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, serverTimestamp, doc, setDoc, getDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

// ✅ Defensive check for language buttons
const langBnBtn = document.getElementById('lang-bn');
const langEnBtn = document.getElementById('lang-en');
if (langBnBtn && langEnBtn) {
    langBnBtn.addEventListener('click', () => { localStorage.setItem('lang', 'bn'); window.location.reload(); });
    langEnBtn.addEventListener('click', () => { localStorage.setItem('lang', 'en'); window.location.reload(); });
}

const leadPopup = document.getElementById('lead-popup');
const otpModal = document.getElementById('otp-modal');
const productsContainer = document.getElementById('products-container');

async function loadHeroBanner() {
    const heroSection = document.getElementById('hero-section');
    if (!heroSection) return; // ✅ Defensive check
    try {
        const docSnap = await getDoc(doc(db, "settings", "heroBanner"));
        if (docSnap.exists() && docSnap.data().imageUrl) {
            heroSection.style.backgroundImage = `url(${docSnap.data().imageUrl})`;
            heroSection.innerHTML = `<div class="hero-content"><h1 data-lang="hero_title"></h1><p data-lang="hero_subtitle"></p></div>`;
        } else {
            heroSection.innerHTML = `<div class="hero-content"><h1 data-lang="hero_title"></h1><p data-lang="hero_subtitle"></p></div>`;
        }
        translatePage();
    } catch (e) {
        console.error("Error loading banner:", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadTranslations().then(() => {
        onAuthStateChanged(auth, user => {
            const navLinksContainer = document.querySelector("#nav-links");
            if (!navLinksContainer) return; // ✅ Defensive check
            
            let profileLink = navLinksContainer.querySelector('#profile-link');
            if (user) {
                if (!profileLink) {
                    const li = document.createElement('li');
                    li.innerHTML = `<a href="profile.html" id="profile-link" data-lang="nav_profile">${translations.nav_profile || 'My Profile'}</a>`;
                    navLinksContainer.appendChild(li);
                }
            } else {
                if (profileLink) profileLink.parentElement.remove();
            }
        });

        if (leadPopup && !localStorage.getItem('leadInfo')) {
            leadPopup.style.display = 'flex';
        }
        loadHeroBanner();
        if (productsContainer) {
            loadProducts();
        }
    });
});

const submitLeadBtn = document.getElementById('submit-lead');
if (submitLeadBtn) {
    submitLeadBtn.addEventListener('click', async () => {
        const name = document.getElementById('lead-name').value.trim();
        const phone = document.getElementById('lead-phone').value.trim();
        if (!name || !/^\+91[6-9]\d{9}$/.test(phone)) {
            alert(translations.alert_invalid_details);
            return;
        }

        const leadsRef = collection(db, "leads");
        const q = query(leadsRef, where("phone", "==", phone));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            await addDoc(leadsRef, { name, phone, timestamp: serverTimestamp() });
        }
        
        localStorage.setItem('leadInfo', JSON.stringify({ name, phone }));
        if (leadPopup) leadPopup.style.display = 'none';
    });
}

async function loadProducts() {
    if (!productsContainer) return; // ✅ Defensive check
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
                <button class="buy-now-btn" data-product-id="${product.id}" data-product-name="${product.name}" data-price="${product.sellingPrice}" data-mrp="${product.mrp}">${translations.buy_now || 'Buy Now'}</button>
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
    if (!leadInfo) { if(leadPopup) leadPopup.style.display = 'flex'; return; }
    
    if (otpModal) otpModal.style.display = 'flex';
    document.getElementById('otp-message').innerText = (translations.otp_sent_message || "An OTP will be sent to your number {phone}.").replace('{phone}', leadInfo.phone);

    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
    }
    
    const sendOtpBtn = document.getElementById('send-otp-btn');
    if (sendOtpBtn) {
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
                     if (window.recaptchaVerifier) {
                        window.recaptchaVerifier.render().then(widgetId => grecaptcha.reset(widgetId));
                     }
                });
        };
    }
}

const verifyOtpBtn = document.getElementById('verify-otp-btn');
if (verifyOtpBtn) {
    verifyOtpBtn.onclick = () => {
        const code = document.getElementById('otp-input').value;
        if (!code || !window.confirmationResult) return;
        
        window.confirmationResult.confirm(code).then(async result => {
            const leadInfo = JSON.parse(localStorage.getItem('leadInfo'));
            await setDoc(doc(db, "users", result.user.uid), { name: leadInfo.name, phone: result.user.phoneNumber, createdAt: serverTimestamp() }, { merge: true });
            alert(translations.alert_verification_success);
            if (otpModal) otpModal.style.display = 'none';
            window.location.href = 'checkout.html';
        }).catch(() => alert(translations.alert_invalid_otp));
    };
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
