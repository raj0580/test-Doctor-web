import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, serverTimestamp, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const leadPopup = document.getElementById('lead-popup');
const otpModal = document.getElementById('otp-modal');
const productsContainer = document.getElementById('products-container');
const navLinks = document.getElementById('nav-links');
let productToBuy = null;

// --- 1. Initial Page Load ---
document.addEventListener('DOMContentLoaded', () => {
    // Check auth state to show/hide profile link
    onAuthStateChanged(auth, user => {
        const profileLink = navLinks.querySelector('#profile-link');
        if (user) {
            if (!profileLink) {
                const li = document.createElement('li');
                li.innerHTML = `<a href="profile.html" id="profile-link">আমার প্রোফাইল</a>`;
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

// --- 2. Lead Capture ---
document.getElementById('submit-lead').addEventListener('click', async () => {
    const name = document.getElementById('lead-name').value.trim();
    const phone = document.getElementById('lead-phone').value.trim();

    if (!name || !/^\+8801[3-9]\d{8}$/.test(phone)) {
        alert('অনুগ্রহ করে সঠিক নাম এবং ফোন নম্বর (+880 দিয়ে শুরু) দিন।');
        return;
    }

    try {
        await addDoc(collection(db, "leads"), { name, phone, timestamp: serverTimestamp() });
        localStorage.setItem('leadInfo', JSON.stringify({ name, phone }));
        localStorage.setItem('leadCaptured', 'true');
        leadPopup.style.display = 'none';
    } catch (e) {
        console.error("লিড যোগ করতে সমস্যা: ", e);
    }
});

// --- 3. Product Loading ---
async function loadProducts() {
    try {
        const productsCol = collection(db, 'products');
        const productSnapshot = await getDocs(productsCol);
        
        if (productSnapshot.empty) {
            productsContainer.innerHTML = '<p>এই মুহূর্তে কোনো প্রোডাক্ট নেই।</p>';
            return;
        }

        const productList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        productsContainer.innerHTML = '';
        productList.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${product.imageUrl}" alt="${product.name}">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="price">৳${product.sellingPrice} <span>৳${product.mrp}</span></p>
                    <button class="buy-now-btn" data-product-id="${product.id}" data-product-name="${product.name}" data-price="${product.sellingPrice}">এখনই কিনুন</button>
                </div>
            `;
            productsContainer.appendChild(card);
        });

        document.querySelectorAll('.buy-now-btn').forEach(button => {
            button.addEventListener('click', handleBuyNow);
        });
    } catch (error) {
        console.error("প্রোডাক্ট লোড করতে সমস্যা:", error);
        productsContainer.innerHTML = '<p>প্রোডাক্ট লোড করা সম্ভব হচ্ছে না।</p>';
    }
}

// --- 4. Authentication and Order ---
function handleBuyNow(event) {
    productToBuy = {
        id: event.target.dataset.productId,
        name: event.target.dataset.productName,
        price: event.target.dataset.price
    };
    onAuthStateChanged(auth, user => {
        if (user) {
            placeOrder(user);
        } else {
            initiateAuth();
        }
    });
}

function initiateAuth() {
    const leadInfo = JSON.parse(localStorage.getItem('leadInfo'));
    if (!leadInfo) {
        leadPopup.style.display = 'flex';
        return;
    }
    
    const phoneNumber = leadInfo.phone;
    otpModal.style.display = 'flex';
    document.getElementById('otp-message').innerText = `আপনার ${phoneNumber} নম্বরে একটি OTP পাঠানো হবে।`;

    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });

    document.getElementById('send-otp-btn').onclick = () => {
        signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier)
            .then((confirmationResult) => {
                window.confirmationResult = confirmationResult;
                alert('OTP পাঠানো হয়েছে!');
                document.getElementById('send-otp-btn').style.display = 'none';
                document.getElementById('otp-input').style.display = 'block';
                document.getElementById('verify-otp-btn').style.display = 'block';
            }).catch(() => {
                alert("OTP পাঠাতে সমস্যা হয়েছে। 페이지를 새로고침하고 다시 시도해 주세요.");
                window.location.reload();
            });
    };
}

document.getElementById('verify-otp-btn').onclick = () => {
    const code = document.getElementById('otp-input').value;
    window.confirmationResult.confirm(code).then(async (result) => {
        const user = result.user;
        const leadInfo = JSON.parse(localStorage.getItem('leadInfo'));
        const userRef = doc(db, "users", user.uid);
        
        await setDoc(userRef, {
            name: leadInfo.name,
            phone: user.phoneNumber,
            createdAt: serverTimestamp()
        }, { merge: true });

        alert('ভেরিফিকেশন সফল হয়েছে!');
        otpModal.style.display = 'none';
        
        placeOrder(user);

    }).catch(() => {
        alert('ভুল OTP। আবার চেষ্টা করুন।');
    });
};

async function placeOrder(user) {
    if (!productToBuy) return;
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        await addDoc(collection(db, "orders"), {
            userId: user.uid,
            customerInfo: {
                name: userData.name,
                phone: user.phoneNumber,
                address: userData.address || "N/A"
            },
            items: [productToBuy],
            totalAmount: Number(productToBuy.price),
            status: "Placed",
            paymentMethod: "COD",
            orderDate: serverTimestamp(),
        });
        alert('আপনার অর্ডারটি সফলভাবে প্লেস করা হয়েছে!');
        productToBuy = null;
    } catch (e) {
        console.error("অর্ডার করতে সমস্যা: ", e);
    }
}
