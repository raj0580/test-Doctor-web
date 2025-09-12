import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';
import { loadTranslations } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, user => {
        if (user) {
            loadTranslations();
            displayUserProfile(user);
        } else {
            window.location.href = '/index.html';
        }
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/index.html';
            });
        });
    }
});

async function displayUserProfile(user) {
    const profileNameEl = document.getElementById('profile-name');
    const profilePhoneEl = document.getElementById('profile-phone');
    const profileAvatarEl = document.getElementById('profile-avatar');

    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    let userName = "User";
    if (userDocSnap.exists() && userDocSnap.data().name) {
        userName = userDocSnap.data().name;
    }

    if (profileNameEl) profileNameEl.textContent = userName;
    if (profilePhoneEl) profilePhoneEl.textContent = user.phoneNumber;
    if (profileAvatarEl) profileAvatarEl.textContent = userName.charAt(0).toUpperCase();
}
