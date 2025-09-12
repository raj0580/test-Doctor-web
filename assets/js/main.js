import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from './firebase-config.js';
import { showAuthModal, closeAuthModal, setupAuthListeners } from './auth.js';
import { loadTranslations, updatePersonalizedGreeting, loadCategories, loadProducts, loadBanner } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, user => {
        loadTranslations().then(() => {
            updatePersonalizedGreeting(user);
        });
    });
    
    loadBanner();
    loadCategories();
    loadProducts();
    setupEventListeners();
});

function setupEventListeners() {
    const profileNav = document.querySelector('.nav-item[href="/profile.html"]');
    if (profileNav) {
        profileNav.addEventListener('click', (e) => {
            if (!auth.currentUser) {
                e.preventDefault();
                showAuthModal();
            }
        });
    }
    const closeModalBtn = document.querySelector('.close-modal-btn');
    if(closeModalBtn) closeModalBtn.addEventListener('click', closeAuthModal);
    setupAuthListeners();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
