javascript
import { db, auth } from '../assets/js/firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 🔴 গুরুত্বপূর্ণ: এখানে আপনার নিজের ImgBB API Key দিন
const IMGBB_API_KEY = '5090ec8c335078581b53f917f9657083';

// --- Auth Guard ---
// এই অংশটি প্রথমে চেক করবে ইউজার লগইন করা আছে কিনা
onAuthStateChanged(auth, (user) => {
    if (user) {
        // যদি ইউজার লগইন করা থাকে, তাহলে ড্যাশবোর্ডের সমস্ত কাজ শুরু হবে
        console.log("Admin logged in:", user.email);
        initializeDashboard();
    } else {
        // যদি ইউজার লগইন করা না থাকে, তাহলে তাকে লগইন পেজে পাঠিয়ে দেওয়া হবে
        console.log("No admin logged in. Redirecting to login page.");
        window.location.href = 'index.html';
    }
});

function initializeDashboard() {
    const leadsContainer = document.getElementById('leads-container');
    const ordersContainer = document.getElementById('orders-container');
    const addProductForm = document.getElementById('add-product-form');
    const addProductBtn = document.getElementById('add-product-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Logout Logic ---
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log('Admin signed out');
            // লগআউট সফল হলে লগইন পেজে পাঠিয়ে দেওয়া হবে
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('Sign out error', error);
        });
    });

    // --- Add Product with ImgBB ---
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        addProductBtn.disabled = true;
        addProductBtn.textContent = 'আপলোড হচ্ছে...';

        const imageFile = document.getElementById('product-image').files[0];
        if (!imageFile) return alert('অনুগ্রহ করে একটি ছবি নির্বাচন করুন।');

        const formData = new FormData();
        formData.append('image', imageFile);

        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
            const result = await response.json();
            if (!result.success) throw new Error('ImgBB-তে ছবি আপলোড করা যায়নি।');
            
            const imageUrl = result.data.url;
            const productData = {
                name: document.getElementById('product-name').value,
                description: document.getElementById('product-desc').value,
                mrp: Number(document.getElementById('product-mrp').value),
                sellingPrice: Number(document.getElementById('product-price').value),
                imageUrl: imageUrl,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, "products"), productData);
            alert('প্রোডাক্ট সফলভাবে যোগ করা হয়েছে!');
            addProductForm.reset();

        } catch (error) {
            console.error('প্রোডাক্ট যোগ করতে সমস্যা:', error);
            alert('একটি সমস্যা হয়েছে: ' + error.message);
        } finally {
            addProductBtn.disabled = false;
            addProductBtn.textContent = 'প্রোডাক্ট যোগ করুন';
        }
    });

    // --- Load Leads ---
    async function loadLeads() {
        // ... (আগের মতোই থাকবে)
    }

    // --- Load Orders ---
    async function loadOrders() {
        // ... (আগের মতোই থাকবে)
    }
    
    // Initial Data Load
    loadLeads();
    loadOrders();
}
