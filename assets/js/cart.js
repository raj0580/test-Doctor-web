import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, doc, deleteDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';
import { updateCartCount } from './ui.js';

let currentUser;

/**
 * Main function that runs when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            loadCartItems(); // Load cart items for the logged-in user
            updateCartCount(); // Ensure the badge is up-to-date
        } else {
            // If no user is logged in, they cannot see a cart.
            // Show a clear message and a link to the homepage.
            document.body.innerHTML = `
                <div class="app-container">
                    <main class="app-main cart-page">
                        <div id="empty-cart-view">
                            <h3>Please Login</h3>
                            <p>You need to be logged in to view your cart.</p>
                            <a href="/index.html" class="cta-btn">Go to Home</a>
                        </div>
                    </main>
                </div>`;
        }
    });

    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            // Redirect to the checkout page
            window.location.href = '/checkout.html';
        });
    }
});

/**
 * Fetches, renders, and manages all items in the user's cart.
 */
async function loadCartItems() {
    if (!currentUser) return;

    const cartItemsContainer = document.getElementById('cart-items-container');
    const orderSummaryCard = document.getElementById('order-summary');
    const emptyCartView = document.getElementById('empty-cart-view');

    try {
        const cartRef = collection(db, `users/${currentUser.uid}/cart`);
        const cartSnapshot = await getDocs(cartRef);

        if (cartSnapshot.empty) {
            // If the cart has no items, show the empty view and hide the summary.
            orderSummaryCard.classList.add('hidden');
            emptyCartView.classList.remove('hidden');
            cartItemsContainer.innerHTML = '';
            return;
        }

        // If items exist, show the summary and hide the empty view.
        orderSummaryCard.classList.remove('hidden');
        emptyCartView.classList.add('hidden');
        cartItemsContainer.innerHTML = '';
        let subtotal = 0;

        // Loop through each document (item) in the cart
        cartSnapshot.forEach(doc => {
            const item = doc.data();
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            const card = document.createElement('div');
            card.className = 'cart-item-card';
            card.innerHTML = `
                <img src="${item.imageUrl}" alt="${item.name}">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>₹${item.price}</p>
                    <div class="cart-item-actions">
                        <div class="quantity-control">
                            <button class="quantity-btn" data-id="${doc.id}" data-change="-1">-</button>
                            <span>${item.quantity}</span>
                            <button class="quantity-btn" data-id="${doc.id}" data-change="1">+</button>
                        </div>
                        <button class="remove-btn" data-id="${doc.id}">Remove</button>
                    </div>
                </div>
            `;
            cartItemsContainer.appendChild(card);
        });

        updateOrderSummary(subtotal);
        addCartActionListeners();
    } catch (error) {
        console.error("Error loading cart items:", error);
        cartItemsContainer.innerHTML = "<p>Could not load your cart. Please try again.</p>";
    }
}

/**
 * Attaches event listeners to all quantity and remove buttons in the cart.
 */
function addCartActionListeners() {
    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const itemId = e.target.dataset.id;
            await deleteDoc(doc(db, `users/${currentUser.uid}/cart`, itemId));
            loadCartItems(); // Refresh the cart view
            updateCartCount(); // Update the nav badge
        });
    });

    document.querySelectorAll('.quantity-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const itemId = e.target.dataset.id;
            const change = parseInt(e.target.dataset.change);
            
            const itemRef = doc(db, `users/${currentUser.uid}/cart`, itemId);
            const itemDoc = await getDoc(itemRef);

            if (itemDoc.exists()) {
                const currentQuantity = itemDoc.data().quantity;
                const newQuantity = currentQuantity + change;

                if (newQuantity > 0) {
                    // If new quantity is 1 or more, update the document.
                    await updateDoc(itemRef, { quantity: newQuantity });
                } else {
                    // If quantity would become 0, remove the item instead.
                    await deleteDoc(itemRef);
                }
                loadCartItems(); // Refresh the cart view
                updateCartCount(); // Update the nav badge
            }
        });
    });
}

/**
 * Calculates and updates the total in the order summary card.
 * @param {number} subtotal - The calculated subtotal of all items.
 */
function updateOrderSummary(subtotal) {
    const deliveryFee = 0; // Set to 0 for "FREE" delivery
    const total = subtotal + deliveryFee;
    document.getElementById('summary-subtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('summary-total').textContent = `₹${total.toFixed(2)}`;
}
