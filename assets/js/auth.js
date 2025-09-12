import { RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';
const authModal = document.getElementById('auth-modal');
const otpContainer = document.getElementById('otp-container');
export function showAuthModal() {
if (authModal) authModal.classList.remove('hidden');
}
export function closeAuthModal() {
if (authModal) authModal.classList.add('hidden');
}
export function setupAuthListeners() {
const sendOtpBtn = document.getElementById('send-otp-btn');
const verifyOtpBtn = document.getElementById('verify-otp-btn');
if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', () => {
        const phoneNumber = document.getElementById('phone-input').value;
        if (!/^\+91[6-9]\d{9}$/.test(phoneNumber)) {
            alert('Please enter a valid Indian phone number.');
            return;
        }

        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
        }
        
        signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier)
            .then(confirmationResult => {
                window.confirmationResult = confirmationResult;
                otpContainer.classList.remove('hidden');
                alert('OTP Sent!');
            }).catch(error => {
                console.error("OTP Error:", error);
                alert("Failed to send OTP. Please try again.");
            });
    });
}

if(verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', () => {
        const code = document.getElementById('otp-input').value;
        window.confirmationResult.confirm(code).then(result => {
            const user = result.user;
            // Create a document for the user if they are new
            setDoc(doc(db, "users", user.uid), {
                phone: user.phoneNumber,
                createdAt: serverTimestamp()
            }, { merge: true }).then(() => {
                closeAuthModal();
                window.location.reload(); // Reload to update greeting and UI
            });
        }).catch(error => {
            alert("Invalid OTP. Please try again.");
        });
    });
}
