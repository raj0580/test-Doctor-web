import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from './firebase-config.js';
import { showAuthModal, closeAuthModal, setupAuthListeners, handleEmailLinkSignIn } from './auth.js';
import { updatePersonalizedGreeting, loadCategories, loadProducts, loadBanner, updateCartCount } from './ui.js';

/**
 * Main function that runs when the DOM is fully loaded.
 * This is the starting point of the application on the client side.
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Check if the user is returning from an email sign-in link.
    // This function from auth.js handles the complex email verification logic.
    // It needs to run first to complete the sign-in process if necessary.
    handleEmailLinkSignIn();

    // 2. Set up a listener for real-time authentication state changes.
    // This function runs once on page load and then again any time a user
    // successfully logs in or logs out.
    onAuthStateChanged(auth, user => {
        updatePersonalizedGreeting(user); // Update "Welcome User!" message in the header.
        updateCartCount(); // Update the cart count badge in the navigation bar.
    });
    
    // 3. Load all the dynamic content required for the homepage from Firestore.
    // These functions are imported from ui.js.
    loadBanner();
    loadCategories();
    loadProducts();

    // 4. Set up all necessary event listeners for the page's interactive elements.
    setupEventListeners();
});

/**
 * A central function to set up all event listeners for the application shell.
 * This keeps the DOMContentLoaded function clean.
 */
function setupEventListeners() {
    
    // Find the profile link in the bottom navigation bar.
    const profileNav = document.querySelector('.nav-item[href="/profile.html"]');
    
    // If the profile link exists, add a click listener to protect it.
    if (profileNav) {
        profileNav.addEventListener('click', e => {
            // Check if a user is currently logged in.
            if (!auth.currentUser) {
                // If no user is logged in, prevent the link from navigating to profile.html.
                e.preventDefault();
                // Show the login/signup modal instead.
                showAuthModal();
            }
        });
    }

    // Find the button to close the authentication modal.
    const closeModalBtn = document.querySelector('.close-modal-btn');
    
    // If the close button exists, add a click listener to hide the modal.
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeAuthModal);
    }

    // Call the function from auth.js to set up the internal listeners 
    // for the authentication modal itself (e.g., for login/register/OTP buttons).
    setupAuthListeners();
}

/**
 * Register the Progressive Web App (PWA) service worker if the browser supports it.
 * This enables offline capabilities.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => console.log('ServiceWorker registration successful.'))
      .catch(err => console.error('ServiceWorker registration failed:', err));
  });
}
