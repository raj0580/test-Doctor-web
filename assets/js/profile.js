javascript
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, user => {
        if (user) {
            displayUserProfile(user);
        } else {
            window.location.href = '/index.html';
        }
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                window.location.href = '/index.html';
            });
        });
    }
});

async function displayUserProfile(user) {
    const profileNameEl = document.getElementById('profile-name');
    const profileEmailEl = document.getElementById('profile-email');
    const profileAvatarEl = document.getElementById('profile-avatar');

    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    let userName = "User";
    if (userDocSnap.exists() && userDocSnap.data().name) {
        userName = userDocSnap.data().name;
    }

    if (profileNameEl) profileNameEl.textContent = userName;
    if (profileEmailEl) profileEmailEl.textContent = user.email;
    if (profileAvatarEl) profileAvatarEl.textContent = userName.charAt(0).toUpperCase();
}
