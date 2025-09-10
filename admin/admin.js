import { db, auth } from '../assets/js/firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, query, orderBy, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { CONFIG } from '../config.js';

const IMGBB_API_KEY = CONFIG.IMGBB_API_KEY;

onAuthStateChanged(auth, (user) => {
    if (user) {
        initializeDashboard();
    } else {
        window.location.href = 'index.html';
    }
});

function initializeDashboard() {
    const logoutBtn = document.getElementById('logout-btn');
    const bannerForm = document.getElementById('banner-form');
    const updateBannerBtn = document.getElementById('update-banner-btn');
    const currentBannerImg = document.getElementById('current-banner-img');
    const addProductForm = document.getElementById('add-product-form');
    const addProductBtn = document.getElementById('add-product-btn');
    const leadsContainer = document.getElementById('leads-container');
    const ordersContainer = document.getElementById('orders-container');

    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => window.location.href = 'index.html');
    });

    async function loadCurrentBanner() {
        const docSnap = await getDoc(doc(db, "settings", "heroBanner"));
        if (docSnap.exists() && docSnap.data().imageUrl) {
            currentBannerImg.src = docSnap.data().imageUrl;
        } else {
            currentBannerImg.alt = "কোনো ব্যানার সেট করা নেই";
        }
    }

    bannerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const imageFile = document.getElementById('banner-image').files[0];
        if (!imageFile) return alert('অনুগ্রহ করে একটি ব্যানার ইমেজ নির্বাচন করুন।');
        
        updateBannerBtn.disabled = true;
        updateBannerBtn.textContent = 'আপলোড হচ্ছে...';
        try {
            const formData = new FormData();
            formData.append('image', imageFile);
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
            const result = await response.json();
            if (!result.success) throw new Error('ImgBB-তে ছবি আপলোড করা যায়নি।');
            await setDoc(doc(db, "settings", "heroBanner"), { imageUrl: result.data.url });
            alert('হিরো ব্যানার সফলভাবে আপডেট করা হয়েছে!');
            currentBannerImg.src = result.data.url;
        } catch (error) { alert('একটি সমস্যা হয়েছে: ' + error.message);
        } finally { updateBannerBtn.disabled = false; updateBannerBtn.textContent = 'ব্যানার আপডেট করুন'; }
    });

    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        addProductBtn.disabled = true;
        addProductBtn.textContent = 'আপলোড হচ্ছে...';
        try {
            const imageFile = document.getElementById('product-image').files[0];
            const formData = new FormData();
            formData.append('image', imageFile);
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
            const result = await response.json();
            if (!result.success) throw new Error('ImgBB-তে ছবি আপলোড করা যায়নি।');
            
            await addDoc(collection(db, "products"), {
                name: document.getElementById('product-name').value,
                description: document.getElementById('product-desc').value,
                mrp: Number(document.getElementById('product-mrp').value),
                sellingPrice: Number(document.getElementById('product-price').value),
                imageUrl: result.data.url,
                createdAt: serverTimestamp()
            });
            alert('প্রোডাক্ট সফলভাবে যোগ করা হয়েছে!');
            addProductForm.reset();
        } catch (error) { alert('একটি সমস্যা হয়েছে: ' + error.message);
        } finally { addProductBtn.disabled = false; addProductBtn.textContent = 'প্রোডাক্ট যোগ করুন'; }
    });

    async function loadLeads() {
        const q = query(collection(db, "leads"), orderBy("timestamp", "desc"));
        const leadSnapshot = await getDocs(q);
        let html = '<table class="data-table"><tr><th>নাম</th><th>ফোন</th><th>সময়</th></tr>';
        leadSnapshot.forEach(doc => {
            const lead = doc.data();
            const date = new Date(lead.timestamp.seconds * 1000).toLocaleString("bn-BD");
            html += `<tr><td>${lead.name}</td><td>${lead.phone}</td><td>${date}</td></tr>`;
        });
        leadsContainer.innerHTML = html + '</table>';
    }

    async function loadOrders() {
        const q = query(collection(db, "orders"), orderBy("orderDate", "desc"));
        const orderSnapshot = await getDocs(q);
        let html = '<table class="data-table"><tr><th>অর্ডার আইডি</th><th>গ্রাহকের তথ্য</th><th>স্ট্যাটাস</th><th>অ্যাকশন</th></tr>';
        orderSnapshot.forEach(doc => {
            const order = doc.data();
            html += `<tr><td>${doc.id}</td><td>${order.customerInfo.name}<br>${order.customerInfo.phone}</td><td>${order.status}</td><td><select class="order-status-select" data-id="${doc.id}"><option value="Placed" ${order.status === 'Placed' ? 'selected' : ''}>Placed</option><option value="Dispatched" ${order.status === 'Dispatched' ? 'selected' : ''}>Dispatched</option><option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option><option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option></select></td></tr>`;
        });
        ordersContainer.innerHTML = html + '</table>';
        document.querySelectorAll('.order-status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                await updateDoc(doc(db, "orders", e.target.dataset.id), { status: e.target.value });
                alert(`অর্ডারের স্ট্যাটাস আপডেট করা হয়েছে।`);
            });
        });
    }

    loadCurrentBanner();
    loadLeads();
    loadOrders();
}
