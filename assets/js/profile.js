import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const userNameEl = document.getElementById('user-name');
const userPhoneEl = document.getElementById('user-phone');
const userAddressInput = document.getElementById('user-address');
const ordersContainer = document.getElementById('orders-history-container');
let currentUserId = null;

// Check user login status
onAuthStateChanged(auth, user => {
    if (user) {
        currentUserId = user.uid;
        loadUserProfile(user.uid);
        loadUserOrders(user.uid);
    } else {
        alert('এই পেজটি দেখার জন্য লগইন করা আবশ্যক।');
        window.location.href = 'index.html';
    }
});

// Load user profile data
async function loadUserProfile(userId) {
    try {
        const userRef = doc(db, "users", userId);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            userNameEl.textContent = userData.name || 'N/A';
            userPhoneEl.textContent = userData.phone || 'N/A';
            userAddressInput.value = userData.address || '';
        }
    } catch (error) {
        console.error("প্রোফাইল লোড করতে সমস্যা:", error);
    }
}

// Update user address
document.getElementById('update-profile-btn').addEventListener('click', async () => {
    const address = userAddressInput.value.trim();
    if (!currentUserId || !address) {
        alert('অনুগ্রহ করে ঠিকানা লিখুন।');
        return;
    }
    
    try {
        const userRef = doc(db, "users", currentUserId);
        await updateDoc(userRef, { address: address });
        alert('ঠিকানা সফলভাবে আপডেট করা হয়েছে!');
    } catch (error) {
        console.error("ঠিকানা আপডেট করতে সমস্যা:", error);
    }
});

// Load user's order history
async function loadUserOrders(userId) {
    try {
        const q = query(collection(db, "orders"), where("userId", "==", userId), orderBy("orderDate", "desc"));
        const querySnapshot = await getDocs(q);
        
        ordersContainer.innerHTML = '';
        if (querySnapshot.empty) {
            ordersContainer.innerHTML = '<p>আপনি এখনও কোনো অর্ডার করেননি।</p>';
            return;
        }

        querySnapshot.forEach(doc => {
            const order = doc.data();
            const orderDate = new Date(order.orderDate.seconds * 1000).toLocaleDateString("bn-BD");
            const orderDiv = document.createElement('div');
            orderDiv.className = 'order-item';
            orderDiv.innerHTML = `
                <p><strong>অর্ডার আইডি:</strong> ${doc.id}</p>
                <p><strong>তারিখ:</strong> ${orderDate}</p>
                <p><strong>সর্বমোট মূল্য:</strong> ৳${order.totalAmount}</p>
                <p><strong>স্ট্যাটাস:</strong> ${order.status}</p>
            `;
            ordersContainer.appendChild(orderDiv);
        });
    } catch (error) {
        console.error("অর্ডার লোড করতে সমস্যা:", error);
    }
}

// Handle logout
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        localStorage.removeItem('leadInfo');
        localStorage.removeItem('leadCaptured');
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error("লগআউট সমস্যা:", error);
    });
});
