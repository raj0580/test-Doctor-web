// এই ফাইলটিতে আপনার সমস্ত গোপন API Key থাকবে।
// export শব্দটি এই ফাইলটিকে একটি মডিউলে পরিণত করে, যা লোডিং সমস্যা সমাধান করে।

// নির্দেশিকা:
// 1. Firebase থেকে আপনার কনফিগারেশন কোডটি কপি করুন।
//    সেটি দেখতে অনেকটা এইরকম হবে:
//    const firebaseConfig = {
//      apiKey: "AIza...",
//      authDomain: "...",
//      ...
//    };
// 2. উপরের কোড থেকে শুধুমাত্র { } এবং এর ভিতরের অংশটুকু কপি করুন।
// 3. নিচের FIREBASE_CONFIG-এর জায়গায় সেই অংশটুকু পেস্ট করুন।

export const CONFIG = {
    // আপনার Firebase প্রজেক্টের কনফিগারেশন অবজেক্ট
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyA9tQ9a8buiWOMCy8m5ZA7M07WVo5lPigI",
  authDomain: "doctor-web-test-ca38e.firebaseapp.com",
  projectId: "doctor-web-test-ca38e",
  storageBucket: "doctor-web-test-ca38e.firebasestorage.app",
  messagingSenderId: "167806498685",
  appId: "1:167806498685:web:177aee8141ae4edb44fe14"
};
    // আপনার ImgBB API Key (শুধুমাত্র " " এর ভিতরের অংশ পরিবর্তন করুন)
    IMGBB_API_KEY: "481ddf84f658aa00b91e406589457d11",

    // আপনার Razorpay Key ID (শুধুমাত্র " " এর ভিতরের অংশ পরিবর্তন করুন)
    RAZORPAY_KEY_ID: "YOUR_RAZORPAY_KEY_ID"
};
