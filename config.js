// এই ফাইলটিতে আপনার সমস্ত গোপন API Key থাকবে।
// export শব্দটি এই ফাইলটিকে একটি মডিউলে পরিণত করে, যা লোডিং সমস্যা সমাধান করে।

export const CONFIG = {

    // আপনার Firebase প্রজেক্টের কনফিগারেশন অবজেক্ট
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyA9tQ9a8buiWOMCy8m5ZA7M07WVo5lPigI",
        authDomain: "doctor-web-test-ca38e.firebaseapp.com",
        projectId: "doctor-web-test-ca38e",
        storageBucket: "doctor-web-test-ca38e.appspot.com", // .firebasestorage পরিবর্তন করে .appspot হবে
        messagingSenderId: "167806498685",
        appId: "1:167806498685:web:177aee8141ae4edb44fe14"
    },

    // আপনার ImgBB API Key
    IMGBB_API_KEY: "5090ec8c335078581b53f917f9657083",

    // 🔴 গুরুত্বপূর্ণ: শুধুমাত্র এই লাইনটি আপনার আসল Razorpay Key ID দিয়ে পরিবর্তন করুন
    RAZORPAY_KEY_ID: "YOUR_RAZORPAY_KEY_ID"
};
