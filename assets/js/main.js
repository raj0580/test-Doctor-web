import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from './firebase-config.js';
import { showAuthModal, closeAuthModal, setupAuthListeners } from './auth.js';
import { loadTranslations, updatePersonalizedGreeting, loadCategories, loadProducts } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    onAuthStateChanged(auth, user => {
        loadTranslations().then(() => {
            updatePersonalizedGreeting(user);
            
            // If user is not logged in and not on profile page, maybe show login
            // For now, we only trigger login on protected actions.
        });
    });
    
    // Load initial UI components
    loadCategories();
    loadProducts();
    
    // Setup listeners for UI elements
    setupEventListeners();
});

function setupEventListeners() {
    // Example: Make profile link require login
    const profileNav = document.querySelector('.nav-item[href="/profile.html"]');
    if (profileNav) {
        profileNav.addEventListener('click', (e) => {
            if (!auth.currentUser) {
                e.preventDefault(); // Stop navigation
                showAuthModal();
            }
        });
    }

    const closeModalBtn = document.querySelector('.close-modal-btn');
    if(closeModalBtn) closeModalBtn.addEventListener('click', closeAuthModal);

    setupAuthListeners();
}


// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}
