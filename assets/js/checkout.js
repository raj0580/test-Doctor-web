import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';
import { CONFIG } from '../../config.js';

const RAZORPAY_KEY_ID = CONFIG.RAZORPAY_KEY_ID;
let currentUser = null;
let userProfile = {};
let cartItems = [];
let subtotal = 0;

/**
 * Main function that runs when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            loadCheckoutData();
        } else {
            // If a user is not logged in, they cannot checkout. Redirect to home.
            window.location.href = '/index.html';
        }
    });

    const payNowBtn = document.getElementById('pay-now-btn');
    if (payNowBtn) {
        payNowBtn.addEventListener('click', proceedToPayment);
    }
});

/**
 * Loads all necessary data for the checkout page: user profile and cart items.
 */
async function loadCheckoutData() {
    try {
        await loadUserProfile();
        await loadCartItems();
    } catch (error) {
        console.error("Error loading checkout data:", error);
        document.querySelector('.app-main').innerHTML = `<p>Error loading page. Please try again.</p>`;
    }
}

/**
 * Fetches the user's profile, including their saved address.
 */
async function loadUserProfile() {
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        userProfile = userDocSnap.data();
        displayUserAddress();
    } else {
        // This case should ideally not happen if user is logged in, but as a fallback:
        console.error("User document not found in Firestore!");
        document.getElementById('address-display').innerHTML = '<p class="error-text">Your profile is not set up. Please go back.</p>';
    }
}

/**
 * Displays the user's saved address on the page.
 */
function displayUserAddress() {
    const addressContainer = document.getElementById('address-display');
    if (userProfile.address && userProfile.address.line1) {
        const addr = userProfile.address;
        addressContainer.innerHTML = `
            <strong>${addr.name}</strong>
            <p>${addr.line1}</p>
            <p>${addr.city}, ${addr.pincode}</p>
            <p>Phone: ${addr.phone}</p>
        `;
    } else {
        addressContainer.innerHTML = '<p>No shipping address found. Please add one from your profile.</p>';
        document.getElementById('pay-now-btn').disabled = true; // Disable payment if no address
    }
}

/**
 * Fetches all items from the user's cart subcollection.
 */
async function loadCartItems() {
    const itemsContainer = document.getElementById('checkout-items-container');
    const cartRef = collection(db, `users/${currentUser.uid}/cart`);
    const cartSnapshot = await getDocs(cartRef);

    if (cartSnapshot.empty) {
        // If cart is empty, redirect user away from checkout.
        alert("Your cart is empty. Redirecting to homepage.");
        window.location.href = '/index.html';
        return;
    }

    cartItems = [];
    itemsContainer.innerHTML = '';
    subtotal = 0;

    cartSnapshot.forEach(doc => {
        const item = { id: doc.id, ...doc.data() };
        cartItems.push(item);

        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item-card-mini';
        itemDiv.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.name}">
            <div class="item-info">
                <h4>${item.name} (x${item.quantity})</h4>
                <p>₹${itemTotal.toFixed(2)}</p>
            </div>
        `;
        itemsContainer.appendChild(itemDiv);
    });

    updatePaymentSummary();
}

/**
 * Updates the payment summary section with the calculated totals.
 */
function updatePaymentSummary() {
    const deliveryFee = 0; // Assuming free delivery for now
    const total = subtotal + deliveryFee;

    document.getElementById('summary-subtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('summary-delivery').textContent = deliveryFee > 0 ? `₹${deliveryFee.toFixed(2)}` : 'FREE';
    document.getElementById('summary-total').textContent = `₹${total.toFixed(2)}`;
}

/**
 * Initializes the Razorpay payment process.
 */
function proceedToPayment() {
    if (!userProfile.address || !userProfile.address.line1) {
        alert("Please add a shipping address from your profile before proceeding.");
        return;
    }
    
    const totalAmount = subtotal; // Final amount in Rupees

    const options = {
        key: RAZORPAY_KEY_ID,
        amount: totalAmount * 100, // Amount in paise (smallest currency unit)
        currency: "INR",
        name: "Doctor's Store",
        description: "Payment for your order",
        // image: "URL_TO_YOUR_LOGO.png",
        
        handler: async (response) => {
            // This function is called when payment is successful
            const paymentId = response.razorpay_payment_id;
            await saveOrderToFirestore(paymentId);
        },
        prefill: {
            name: userProfile.address.name,
            email: userProfile.email,
            contact: userProfile.address.phone
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
}

/**
 * Saves the completed order details to Firestore after successful payment.
 * @param {string} paymentId - The successful payment ID from Razorpay.
 */
async function saveOrderToFirestore(paymentId) {
    try {
        const orderData = {
            userId: currentUser.uid,
            customerInfo: userProfile,
            items: cartItems,
            totalAmount: subtotal,
            status: "Placed",
            paymentMethod: "Online (Razorpay)",
            paymentDetails: {
                razorpay_payment_id: paymentId
            },
            orderDate: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "orders"), orderData);
        
        // After saving the order, you should clear the user's cart.
        // This part is crucial but can be implemented later.
        
        // Redirect to a success page
        window.location.href = `order-success.html?orderId=${docRef.id}`;

    } catch (error) {
        console.error("Error saving order to Firestore: ", error);
        alert("Your payment was successful, but we failed to save your order. Please contact support.");
    }
}
