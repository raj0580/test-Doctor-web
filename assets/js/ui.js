import { collection, getDocs, query, where, orderBy, doc, getDoc, setDoc, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, auth } from "./firebase-config.js";
import { showAuthModal } from "./auth.js";

/**
 * Updates the welcome message in the header based on the user's login state.
 * @param {object|null} user - The Firebase auth user object, or null if logged out.
 */
export async function updatePersonalizedGreeting(user) {
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) {
        if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userName = userDoc.exists() && userDoc.data().name ? userDoc.data().name.split(' ')[0] : 'Back';
            greetingEl.innerText = `Welcome ${userName}!`;
        } else {
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
            if (data.imageUrl) {
                bannerEl.style.backgroundImage = `url(${data.imageUrl})`;
            }
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

        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const currentActive = document.querySelector('.category-tab.active');
                if (currentActive) currentActive.classList.remove('active');
                tab.classList.add('active');
                loadProducts(tab.dataset.category);
            });
        });
    } catch (error) {
        console.error("Error loading categories:", error);
        container.innerHTML = "<p>Could not load categories.</p>";
    }
}

/**
 * Fetches products from Firestore and renders them as clickable cards.
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
            productQuery = query(productsRef, where("isNewArrival", "==", true), orderBy("createdAt", "desc"));
        } else {
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
            const pWithId = { id: doc.id, ...p };
            const badgeHTML = p.badge ? `<div class="badge">${p.badge}</div>` : '';

            // Create an anchor tag (<a>) to wrap the card content for navigation
            const cardLink = document.createElement('a');
            cardLink.href = `/product-detail.html?id=${doc.id}`;
            cardLink.className = 'product-card-link';

            cardLink.innerHTML = `
                <div class="product-card">
                    ${badgeHTML}
                    <button class.bind="wishlist-btn"><i class="icon-heart"></i></button>
                    <div class="img-container"><img src="${p.imageUrl}" alt="${p.name}"></div>
                    <div class="product-info">
                        <h3 class="product-name">${p.name}</h3>
                        <div class="price-add-row">
                            <p class="product-price">₹${p.sellingPrice}</p>
                            <button class="add-to-cart-btn" data-product='${JSON.stringify(pWithId)}'>+</button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(cardLink);
        });

        // Add event listeners for the "Add to Cart" buttons
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                // Prevent the link from navigating when clicking the "+" button
                event.preventDefault();
                // Stop the event from bubbling up to the parent anchor tag
                event.stopPropagation();
                handleAddToCart(event);
            });
        });
    } catch (error) {
        console.error("Error loading products:", error);
        container.innerHTML = `<p>Error loading products. Please check the Firestore console for required indexes.</p>`;
    }
}

/**
 * Handles the "Add to Cart" button click. Adds or increments the item quantity.
 * @param {Event} event - The click event from the button.
 */
async function handleAddToCart(event) {
    const user = auth.currentUser;
    if (!user) {
        showAuthModal();
        return;
    }

    const button = event.target;
    const product = JSON.parse(button.dataset.product);
    const cartItemRef = doc(db, `users/${user.uid}/cart`, product.id);

    try {
        const docSnap = await getDoc(cartItemRef);
        
        if (docSnap.exists()) {
            // If item already in cart, increment quantity
            await updateDoc(cartItemRef, {
                quantity: increment(1)
            });
        } else {
            // If item is not in cart, add it with quantity 1
            await setDoc(cartItemRef, {
                name: product.name,
                price: product.sellingPrice,
                imageUrl: product.imageUrl,
                quantity: 1,
                addedAt: serverTimestamp()
            });
        }

        // Visual feedback
        button.textContent = '✓';
        setTimeout(() => { button.textContent = '+'; }, 1000);

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
