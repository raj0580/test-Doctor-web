javascript
import { db } from '../assets/js/firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔴 গুরুত্বপূর্ণ: এখানে আপনার নিজের ImgBB API Key দিন
const IMGBB_API_KEY = '5090ec8c335078581b53f917f9657083';

const leadsContainer = document.getElementById('leads-container');
const ordersContainer = document.getElementById('orders-container');
const addProductForm = document.getElementById('add-product-form');
const addProductBtn = document.getElementById('add-product-btn');

// --- 1. Add Product with ImgBB ---
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

// --- 2. Load Leads ---
async function loadLeads() {
    const q = query(collection(db, "leads"), orderBy("timestamp", "desc"));
    const leadSnapshot = await getDocs(q);
    let html = '<table class="data-table"><tr><th>নাম</th><th>ফোন</th><th>সময়</th></tr>';
    leadSnapshot.forEach(doc => {
        const lead = doc.data();
        const date = new Date(lead.timestamp.seconds * 1000).toLocaleString("bn-BD");
        html += `<tr><td>${lead.name}</td><td>${lead.phone}</td><td>${date}</td></tr>`;
    });
    html += '</table>';
    leadsContainer.innerHTML = html;
}

// --- 3. Load Orders ---
async function loadOrders() {
    const q = query(collection(db, "orders"), orderBy("orderDate", "desc"));
    const orderSnapshot = await getDocs(q);
    let html = '<table class="data-table"><tr><th>অর্ডার আইডি</th><th>গ্রাহকের তথ্য</th><th>স্ট্যাটাস</th><th>অ্যাকশন</th></tr>';
    orderSnapshot.forEach(doc => {
        const order = doc.data();
        html += `
            <tr>
                <td>${doc.id}</td>
                <td>${order.customerInfo.name} <br> ${order.customerInfo.phone}</td>
                <td>${order.status}</td>
                <td>
                    <select class="order-status-select" data-id="${doc.id}">
                        <option value="Placed" ${order.status === 'Placed' ? 'selected' : ''}>Placed</option>
                        <option value="Dispatched" ${order.status === 'Dispatched' ? 'selected' : ''}>Dispatched</option>
                        <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
            </tr>
        `;
    });
    html += '</table>';
    ordersContainer.innerHTML = html;

    document.querySelectorAll('.order-status-select').forEach(select => {
        select.addEventListener('change', updateOrderStatus);
    });
}

// --- 4. Update Order Status ---
async function updateOrderStatus(e) {
    const orderId = e.target.dataset.id;
    const newStatus = e.target.value;
    
    try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, { status: newStatus });
        alert(`অর্ডারের স্ট্যাটাস আপডেট করা হয়েছে।`);
    } catch (error) {
        console.error("স্ট্যাটাস আপডেট করতে সমস্যা:", error);
    }
}

// Initial Data Load
loadLeads();
loadOrders();
