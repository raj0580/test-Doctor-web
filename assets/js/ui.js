import { collection, getDocs, query, where, orderBy, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, auth } from "./firebase-config.js";
import { showAuthModal } from "./auth.js";

// A variable to hold translations, though not used in this file.
let translations = {};

/**
 * Updates the welcome message based on the user's login state and name.
 * @param {object|null} user - The Firebase auth user object, or null if logged out.
 */
export async function updatePersonalizedGreeting(user) {
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) {
        if (user) {
            // If user is logged in, fetch their name from Firestore.
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userName = userDoc.exists() && userDoc.data().name ? userDoc.data().name.split(' ')[0] : 'Back'; // Show first name or 'Back'
            greetingEl.innerText = `Welcome ${userName}!`;
        } else {
            // If user is logged out.
            greetingEl.innerText = "Welcome Guest!";
        }
    }
}

/**
 * Fetches and displays the promotional banner content from Firestore.
 */
export async function loadBanner() {
    const bannerEl = document.getElementById('promo-banner');
    const titleEl = document.getElementById('promo-title');
    const subtitleEl = document.getElementById('promo-subtitle');
    
    if (!bannerEl || !titleEl || !subtitleEl) return;

    try {
        const bannerSnap = await getDoc(doc(db, 'settings', 'promoBanner'));
        if (bannerSnap.exists()) {
            const data = bannerSnap.data();
            // Set background image only if a URL is provided in the admin panel
            if (data.imageUrl) {
                bannerEl.style.backgroundImage = `url(${data.imageUrl})`;
            }
            // Set title and subtitle
            titleEl.textContent = data.title || '';
            subtitleEl.textContent = data.subtitle || '';
        }
    } catch (error) {
        console.error("Error loading banner:", error);
    }
}

/**
 * Fetches categories from Firestore and renders them as clickable tabs.
 */
export async function loadCategories() {
    const container = document.getElementById('category-tabs');
    if (!container) return;

    try {
        const categorySnapshot = await getDocs(query(collection(db, 'categories'), orderBy('name')));
        container.innerHTML = `<button class="category-tab active" data-category="all">All</button>`;
        categorySnapshot.forEach(doc => {
            const category = doc.data();
            container.innerHTML += `<button class="category-tab" data-category="${doc.id}">${category.name}</button>`;
        });

        // Add event listeners to each tab to filter products on click.
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Visually update the active tab
                const currentActive = document.querySelector('.category-tab.active');
                if (currentActive) currentActive.classList.remove('active');
                tab.classList.add('active');
                
                // Reload products for the selected category
                loadProducts(tab.dataset.category);
            });
        });
    } catch (error) {
        console.error("Error loading categories:", error);
        container.innerHTML = "<p>Could not load categories.</p>";
    }
}

/**
 * Fetches products from Firestore and renders them in the product grid.
 * @param {string} categoryId - The ID of the category to filter by, or 'all'.
 */
export async function loadProducts(categoryId = 'all') {
    const container = document.getElementById('product-grid');
    if (!container) return;
    container.innerHTML = "<p>Loading products...</p>";

    try {
        let productQuery;
        const productsRef = collection(db, 'products');

        if (categoryId === 'all') {
            // On the "All" tab, show products marked as "New Arrival"
            productQuery = query(productsRef, where("isNewArrival", "==", true), orderBy("createdAt", "desc"));
        } else {
            // For other tabs, filter by the category ID
            productQuery = query(productsRef, where("category", "==", categoryId), orderBy("createdAt", "desc"));
        }
        
        const productSnapshot = await getDocs(productQuery);

        if (productSnapshot.empty) {
            container.innerHTML = "<p>No products found in this category.</p>";
            return;
        }

        container.innerHTML = '';
        productSnapshot.forEach(doc => {
            const p = doc.data();
            const pWithId = { id: doc.id, ...p }; // Include document ID for cart functionality
            const badgeHTML = p.badge ? `<div class="badge">${p.badge}</div>` : '';

            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                ${badgeHTML}
                <button class="wishlist-btn"><i class="icon-heart"></i></button>
                <div class="img-container"><img src="${p.imageUrl}" alt="${p.name}"></div>
                <div class="product-info">
                    <h3 class="product-name">${p.name}</h3>
                    <div class="price-add-row">
                        <p class="product-price">₹${p.sellingPrice}</p>
                        <button class="add-to-cart-btn" data-product='${JSON.stringify(pWithId)}'>+</button>
                    </div>
                </div>`;
            container.appendChild(card);
        });

        // Add event listeners for the new "Add to Cart" buttons
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', handleAddToCart);
        });
    } catch (error) {
        console.error("Error loading products:", error);
        container.innerHTML = `<p>Error loading products. Please check the Firestore console for required indexes.</p>`;
    }
}

/**
 * Handles the "Add to Cart" button click.
 * @param {Event} event - The click event from the button.
 */
async function handleAddToCart(event) {
    const user = auth.currentUser;
    // If the user is not logged in, show the login modal.
    if (!user) {
        showAuthModal();
        return;
    }

    const product = JSON.parse(event.target.dataset.product);
    const cartItemRef = doc(db, `users/${user.uid}/cart`, product.id);

    try {
        // Use setDoc with merge to either create or update the item, setting quantity to 1.
        // A more advanced implementation would increment the quantity.
        await setDoc(cartItemRef, {
            name: product.name,
            price: product.sellingPrice,
            imageUrl: product.imageUrl,
            quantity: 1, // Defaulting to 1 for simplicity
            addedAt: serverTimestamp()
        }, { merge: true });

        alert(`${product.name} has been added to your cart!`);
        updateCartCount(); // Update the visual cart counter
    } catch (error) {
        console.error("Error adding to cart: ", error);
        alert("Could not add item to cart.");
    }
}

/**
 * Fetches the number of items in the user's cart and updates the badge in the nav bar.
 */
export async function updateCartCount() {
    const user = auth.currentUser;
    const badges = document.querySelectorAll('#cart-count-badge');
    
    if (!user) {
        badges.forEach(b => b.classList.add('hidden'));
        return;
    }

    try {
        const cartSnapshot = await getDocs(collection(db, `users/${user.uid}/cart`));
        const count = cartSnapshot.size;

        badges.forEach(b => {
            if (count > 0) {
                b.textContent = count;
                b.classList.remove('hidden');
            } else {
                b.classList.add('hidden');
            }
        });
    } catch (error) {
        console.error("Error updating cart count:", error);
    }
}
