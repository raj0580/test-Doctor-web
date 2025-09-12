import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';
import { updateCartCount } from './ui.js';
import { showAuthModal } from "./auth.js";

let currentProduct = null;

/**
 * Main function that runs when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Get the product ID from the URL query string (e.g., ?id=PRODUCT_ID)
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (productId) {
        loadProductDetails(productId);
    } else {
        // If no ID is provided, show an error message.
        const container = document.getElementById('product-detail-container');
        if(container) container.innerHTML = '<p class="error-text">Product not found. Please go back and try again.</p>';
    }

    // Update cart count for the nav bar
    onAuthStateChanged(auth, user => {
        updateCartCount();
    });
});

/**
 * Fetches and displays the details for a single product from Firestore.
 * @param {string} productId - The ID of the document to fetch from the 'products' collection.
 */
async function loadProductDetails(productId) {
    const container = document.getElementById('product-detail-container');
    if (!container) return;

    try {
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
            const productData = { id: productSnap.id, ...productSnap.data() };
            currentProduct = productData; // Store product data globally for this page
            
            // Render the product details HTML
            container.innerHTML = `
                <div class="product-image-gallery">
                    <img src="${productData.imageUrl}" alt="${productData.name}">
                </div>
                <div class="product-info-main">
                    <h2 class="product-title">${productData.name}</h2>
                    <div class="price-container">
                        <span class="current-price">₹${productData.sellingPrice}</span>
                        <span class="original-price">MRP ₹${productData.mrp}</span>
                    </div>
                    <p class="product-description">${productData.description || 'No description available.'}</p>
                    
                    <button class="cta-btn add-to-cart-detail-btn">Add to Cart</button>
                </div>
            `;

            // Add an event listener to the new "Add to Cart" button
            const addToCartBtn = container.querySelector('.add-to-cart-detail-btn');
            if(addToCartBtn) {
                addToCartBtn.addEventListener('click', handleAddToCartDetail);
            }
        } else {
            container.innerHTML = '<p class="error-text">Sorry, this product could not be found.</p>';
        }
    } catch (error) {
        console.error("Error fetching product details:", error);
        container.innerHTML = '<p class="error-text">There was an error loading the product.</p>';
    }
}

/**
 * Handles the "Add to Cart" button click on the product detail page.
 */
async function handleAddToCartDetail() {
    const user = auth.currentUser;
    if (!user) {
        showAuthModal(); // This function is not available here, ideally main.js should handle modals
        alert("Please log in to add items to your cart.");
        return;
    }

    if (!currentProduct) return;

    const cartItemRef = doc(db, `users/${user.uid}/cart`, currentProduct.id);

    try {
        await setDoc(cartItemRef, {
            name: currentProduct.name,
            price: currentProduct.sellingPrice,
            imageUrl: currentProduct.imageUrl,
            quantity: 1,
            addedAt: serverTimestamp()
        }, { merge: true });

        alert(`${currentProduct.name} has been added to your cart!`);
        updateCartCount();
    } catch (error) {
        console.error("Error adding to cart: ", error);
        alert("Could not add item to cart.");
    }
}
