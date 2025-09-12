import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';
import { updateCartCount } from './ui.js';

/**
 * Main function that runs when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, user => {
        if (user) {
            // If a user is logged in, initialize all profile page functionality.
            displayUserProfile(user);
            setupAddressModal(user);
            setupOrdersModal(user);
            updateCartCount(); // Keep cart count updated
        } else {
            // If no user is logged in, they cannot see a profile. Redirect to home.
            window.location.href = '/index.html';
        }
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                // On sign out, redirect to the homepage.
                window.location.href = '/index.html';
            });
        });
    }
});

/**
 * Fetches and displays the current user's profile information.
 * @param {object} user - The Firebase auth user object.
 */
async function displayUserProfile(user) {
    const profileNameEl = document.getElementById('profile-name');
    const profileDetailsEl = document.getElementById('profile-details');
    const profileAvatarEl = document.getElementById('profile-avatar');
    
    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        let userName = "User"; // Default name
        
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            userName = userData.name || "User";
            // Display email if available, otherwise phone number.
            if (profileDetailsEl) profileDetailsEl.textContent = userData.email || user.phoneNumber;
        } else {
            if (profileDetailsEl) profileDetailsEl.textContent = user.email || user.phoneNumber;
        }

        if (profileNameEl) profileNameEl.textContent = userName;
        if (profileAvatarEl) profileAvatarEl.textContent = userName.charAt(0).toUpperCase();

    } catch (error) {
        console.error("Error fetching user profile:", error);
    }
}

/**
 * Sets up the event listeners and logic for the address management modal.
 * @param {object} user - The Firebase auth user object.
 */
function setupAddressModal(user) {
    const addressLink = document.getElementById('address-link');
    const addressModal = document.getElementById('address-modal');
    if (!addressLink || !addressModal) return;

    const closeModalBtn = addressModal.querySelector('.close-modal-btn');
    const addressForm = document.getElementById('address-form');

    // Show the modal when the "Shipping Address" link is clicked.
    addressLink.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Pre-fill the form with the user's currently saved address from Firestore.
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().address) {
            const addr = userDoc.data().address;
            addressForm.querySelector('#address-name').value = addr.name || '';
            addressForm.querySelector('#address-line1').value = addr.line1 || '';
            addressForm.querySelector('#address-city').value = addr.city || '';
            addressForm.querySelector('#address-pincode').value = addr.pincode || '';
            addressForm.querySelector('#address-phone').value = addr.phone || '';
        }
        
        addressModal.classList.remove('hidden');
    });

    // Hide the modal when the close button is clicked.
    closeModalBtn.addEventListener('click', () => addressModal.classList.add('hidden'));

    // Handle the form submission to save the address.
    addressForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const addressData = {
            name: addressForm.querySelector('#address-name').value,
            line1: addressForm.querySelector('#address-line1').value,
            city: addressForm.querySelector('#address-city').value,
            pincode: addressForm.querySelector('#address-pincode').value,
            phone: addressForm.querySelector('#address-phone').value,
        };

        try {
            // Use setDoc with { merge: true } to update or create the address field without overwriting other user data.
            await setDoc(doc(db, 'users', user.uid), { address: addressData }, { merge: true });
            alert('Address saved successfully!');
            addressModal.classList.add('hidden');
        } catch (error) {
            console.error("Error saving address: ", error);
            alert('Failed to save address.');
        }
    });
}

/**
 * Sets up the event listeners and data fetching for the order history modal.
 * @param {object} user - The Firebase auth user object.
 */
function setupOrdersModal(user) {
    const ordersLink = document.getElementById('orders-link');
    const ordersModal = document.getElementById('orders-modal');
    if (!ordersLink || !ordersModal) return;

    const closeModalBtn = ordersModal.querySelector('.close-modal-btn');
    const container = document.getElementById('orders-list-container');

    // Show the modal and fetch orders when the "My Orders" link is clicked.
    ordersLink.addEventListener('click', async (e) => {
        e.preventDefault();
        container.innerHTML = '<p>Loading your orders...</p>';
        ordersModal.classList.remove('hidden');

        try {
            const q = query(collection(db, "orders"), where("userId", "==", user.uid), orderBy("orderDate", "desc"));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                container.innerHTML = '<p>You have no past orders.</p>';
                return;
            }

            container.innerHTML = '';
            querySnapshot.forEach(doc => {
                const order = doc.data();
                const orderDate = new Date(order.orderDate.seconds * 1000).toLocaleDateString();
                const orderDiv = document.createElement('div');
                orderDiv.className = 'order-item';
                orderDiv.innerHTML = `
                    <p><strong>Order ID:</strong> ${doc.id}</p>
                    <p><strong>Date:</strong> ${orderDate}</p>
                    <p><strong>Total:</strong> ₹${order.totalAmount}</p>
                    <p><strong>Status:</strong> ${order.status}</p>
                `;
                container.appendChild(orderDiv);
});
        } catch (error) {
            console.error("Error fetching orders:", error);
            container.innerHTML = '<p>Could not load your orders.</p>';
        }
    });

    // Hide the modal when the close button is clicked.
    closeModalBtn.addEventListener('click', () => ordersModal.classList.add('hidden'));
}
