import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from './firebase-config.js';
import { showAuthModal, closeAuthModal, setupAuthListeners, handleEmailLinkSignIn } from './auth.js';
import { updatePersonalizedGreeting, loadCategories, loadProducts, loadBanner, updateCartCount } from './ui.js';

/**
 * Main function that runs when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Check if the user is returning from an email sign-in link.
    // This needs to be handled first.
    handleEmailLinkSignIn();

    // 2. Set up a listener for authentication state changes.
    // This will run immediately and whenever a user logs in or out.
    onAuthStateChanged(auth, user => {
        updatePersonalizedGreeting(user); // Update "Welcome User!" message
        updateCartCount(); // Update the cart count badge in the nav bar
    });
    
    // 3. Load all the dynamic content for the homepage.
    loadBanner();
    loadCategories();
    loadProducts();

    // 4. Set up all necessary event listeners for the page.
    setupEventListeners();
});

/**
 * A central function to set up all event listeners for the application shell.
 */
function setupEventListeners() {
    
    // Find the profile link in the bottom navigation bar.
    const profileNav = document.querySelector('.nav-item[href="/profile.html"]');
    
    // If the profile link exists, add a click listener.
    if (profileNav) {
        profileNav.addEventListener('click', e => {
            // Check if a user is currently logged in.
            if (!auth.currentUser) {
                // If no user is logged in, prevent the link from navigating.
                e.preventDefault();
                // Show the login/signup modal instead.
                showAuthModal();
            }
        });
    }

    // Find the button to close the authentication modal.
    const closeModalBtn = document.querySelector('.close-modal-btn');
    
    // If the close button exists, add a click listener to it.
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeAuthModal);
    }

    // Set up the internal listeners for the authentication modal itself (e.g., for login/register buttons).
    setupAuthListeners();
}

/**
 * Register the Progressive Web App (PWA) service worker if the browser supports it.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => console.log('ServiceWorker registration successful.'))
      .catch(err => console.error('ServiceWorker registration failed:', err));
  });
}
