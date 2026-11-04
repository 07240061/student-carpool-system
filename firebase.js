
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBPpMKTA1R3Ky1zvTH_6dycf1zWx8Eco4I",
    authDomain: "carpool-system-35970.firebaseapp.com",
    projectId: "carpool-system-35970",
    storageBucket: "carpool-system-35970.appspot.com",
    messagingSenderId:"378317490915",
    appId: "1:378317490915:web:7b2a7da5070db3c884d3d6",
  measurementId: "G-DQBVJHWSZB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);
