import {
    RecaptchaVerifier,
    signInWithPhoneNumber,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';

// DOM element references
const authModal = document.getElementById('auth-modal');
const authView = document.getElementById('auth-view');

// Firebase action code settings for email link verification
const actionCodeSettings = {
    url: `${window.location.origin}/index.html`, // URL to redirect back to
    handleCodeInApp: true
};

// --- VIEW RENDERERS: Dynamically build the HTML for the auth modal ---

/**
 * Renders the initial choice between Email and Phone sign-in.
 */
function renderOptionsView() {
    authView.innerHTML = `
        <h3>Sign in Options</h3>
        <div class="auth-options">
            <button id="show-email" class="cta-btn"><i class="icon-email"></i>Continue with Email</button>
            <button id="show-phone" class="cta-btn"><i class="icon-phone"></i>Continue with Phone OTP</button>
        </div>`;
    document.getElementById('show-email').addEventListener('click', renderEmailRegisterView);
    document.getElementById('show-phone').addEventListener('click', renderPhoneLoginView);
}

/**
 * Renders the form for Email registration/sign-in.
 */
function renderEmailRegisterView() {
    authView.innerHTML = `
        <h3>Create Account or Login</h3>
        <p class="error-message" id="auth-error"></p>
        <input type="text" id="register-name" placeholder="Full Name" required>
        <input type="tel" id="register-phone" placeholder="10-digit Phone Number" required>
        <input type="email" id="register-email" placeholder="Email Address" required>
        <button id="register-btn" class="cta-btn">Continue with Email</button>
        <p class="auth-toggle-link"><a href="#" id="show-options">See other options</a></p>`;
    document.getElementById('show-options').addEventListener('click', e => { e.preventDefault(); renderOptionsView(); });
    document.getElementById('register-btn').addEventListener('click', handleEmailRegister);
}

/**
 * Renders the form for Phone OTP sign-in.
 */
function renderPhoneLoginView() {
    authView.innerHTML = `
        <h3>Login with Phone OTP</h3>
        <p class="error-message" id="auth-error"></p>
        <div class="phone-input-container">
            <span class="country-code">+91</span>
            <input type="tel" id="phone-input" placeholder="10-digit number" maxlength="10">
        </div>
        <div id="recaptcha-container"></div>
        <button id="send-otp-btn" class="cta-btn">Send OTP</button>
        <div id="otp-container" class="hidden">
            <p>Enter OTP</p>
            <input type="text" id="otp-input" placeholder="6-digit OTP">
            <button id="verify-otp-btn" class="cta-btn">Verify OTP</button>
        </div>
        <p class="auth-toggle-link"><a href="#" id="show-options">See other options</a></p>`;
    document.getElementById('show-options').addEventListener('click', e => { e.preventDefault(); renderOptionsView(); });
    document.getElementById('send-otp-btn').addEventListener('click', handleSendOtp);
    document.getElementById('verify-otp-btn').addEventListener('click', handleVerifyOtp);

    // Render reCAPTCHA after the modal view is created.
    setTimeout(() => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'normal' });
            window.recaptchaVerifier.render();
        }
    }, 100);
}


// --- ACTION HANDLERS: Logic for button clicks ---

/**
 * Handles the "Continue with Email" button click.
 * Sends a sign-in link to the user's email.
 */
async function handleEmailRegister() {
    const name = document.getElementById('register-name').value;
    const phone = document.getElementById('register-phone').value;
    const email = document.getElementById('register-email').value;
    const errorEl = document.getElementById('auth-error');

    if (!name || !email || !/^[6-9]\d{9}$/.test(phone)) {
        errorEl.textContent = 'All fields are required and phone must be valid.';
        return;
    }
    
    try {
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        // Save user's details temporarily in local storage to use after they click the link
        window.localStorage.setItem('emailForSignIn', email);
        window.localStorage.setItem('newUserTempData', JSON.stringify({ name, phone }));
        authView.innerHTML = `<h3>Check your inbox</h3><p>A sign-in link has been sent to ${email}. Click the link to complete your registration or login.</p>`;
    } catch (error) {
        errorEl.textContent = getAuthErrorMessage(error);
    }
}

/**
 * Handles the "Send OTP" button click for phone authentication.
 */
function handleSendOtp() {
    const tenDigitNumber = document.getElementById('phone-input').value.trim();
    if (!/^[6-9]\d{9}$/.test(tenDigitNumber)) {
        alert('Please enter a valid 10-digit number.');
        return;
    }
    const phoneNumber = `+91${tenDigitNumber}`;
    const appVerifier = window.recaptchaVerifier;

    signInWithPhoneNumber(auth, phoneNumber, appVerifier)
        .then(confirmationResult => {
            window.confirmationResult = confirmationResult;
            document.getElementById('otp-container').classList.remove('hidden');
            alert('OTP Sent!');
        }).catch(error => {
            console.error("OTP Error:", error);
            alert("Failed to send OTP. Please solve reCAPTCHA and try again.");
        });
}

/**
 * Handles the "Verify OTP" button click.
 */
async function handleVerifyOtp() {
    const code = document.getElementById('otp-input').value;
    if (!code || code.length !== 6) {
        alert('Please enter the 6-digit OTP.');
        return;
    }
    try {
        const result = await window.confirmationResult.confirm(code);
        const user = result.user;
        const userDoc = await getDoc(doc(db, "users", user.uid));

        // If the user is new, prompt for additional details
        if (!userDoc.exists()) {
            const name = prompt("Welcome! Please enter your name.");
            const email = prompt("Please enter your email address for account recovery.");
            await setDoc(doc(db, "users", user.uid), {
                name: name || `User ${user.uid.substring(0,5)}`,
                phone: user.phoneNumber,
                email: email || '',
                createdAt: serverTimestamp()
            });
        }
        closeAuthModal();
        window.location.reload();
    } catch (error) {
        alert("Invalid OTP or error signing in.");
    }
}

/**
 * Checks if the current page load is a result of a user clicking an email sign-in link.
 * If so, completes the sign-in process.
 */
export async function handleEmailLinkSignIn() {
    if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            email = window.prompt('Please provide your email for confirmation');
        }
        if (!email) return; // User cancelled prompt

        try {
            const result = await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            
            const user = result.user;
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            // If this is a new registration, create their document in Firestore
            if (!userDoc.exists()) {
                const tempData = JSON.parse(window.localStorage.getItem('newUserTempData'));
                if (tempData) {
                    await setDoc(doc(db, "users", user.uid), {
                        name: tempData.name,
                        phone: `+91${tempData.phone}`,
                        email: user.email,
                        createdAt: serverTimestamp()
                    });
                    window.localStorage.removeItem('newUserTempData');
                }
            }
            
            // Clean the URL and reload the page
            window.history.pushState(null, '', window.location.pathname);
            window.location.reload();

        } catch (error) {
            console.error("Email link sign-in error:", error);
            alert("Error signing in with email link. It may be expired or invalid.");
        }
    }
}


// --- HELPER FUNCTIONS ---

/**
 * Displays the authentication modal with the initial options.
 */
export function showAuthModal() {
    renderOptionsView();
    if (authModal) authModal.classList.remove('hidden');
}

/**
 * Hides the authentication modal.
 */
export function closeAuthModal() {
    if (authModal) authModal.classList.add('hidden');
}

/**
 * Placeholder function, as listeners are now added within render functions.
 */
export function setupAuthListeners() {}

/**
 * Translates Firebase error codes into user-friendly messages.
 * @param {Error} error - The Firebase auth error object.
 * @returns {string} A user-friendly error message.
 */
function getAuthErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email': return 'Please enter a valid email address.';
        case 'auth/user-not-found':
        case 'auth/wrong-password': return 'Invalid email or password.';
        case 'auth/email-already-in-use': return 'This email is already registered.';
        case 'auth/weak-password': return 'Password should be at least 6 characters.';
        case 'auth/requires-recent-login': return 'This action is sensitive and requires recent authentication. Please log in again.';
        default: return 'An unknown error occurred. Please try again.';
    }
}
