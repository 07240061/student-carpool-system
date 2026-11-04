
import { auth } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// REGISTRATION
document.getElementById("registerForm")
.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;

    const message = document.getElementById("registerMessage");

    try {

        // Create user account
        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        // Send verification email
        await sendEmailVerification(userCredential.user);

        message.textContent =
            "Registration successful! Please check your email to verify your account.";

        message.style.color = "green";

        // Sign out until verification
        await signOut(auth);

    } catch (error) {

        message.textContent = error.message;
        message.style.color = "red";

    }

});


import {
    signInWithEmailAndPassword,
    signOut,
    reload
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// LOGIN
document.getElementById("loginForm")
.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const message = document.getElementById("loginMessage");

    try {

        // Check email and password
        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

        const user = userCredential.user;

        // Refresh user information
        await reload(user);

        // Check email verification
        if (user.emailVerified) {

            message.textContent = "Login successful!";
            message.style.color = "green";

            window.location.href = "dashboard.html";

        } else {

            message.textContent =
                "Please verify your email before logging in.";

            message.style.color = "red";

            await signOut(auth);

        }

    } catch (error) {

        if (error.code === "auth/invalid-credential") {

            message.textContent =
                "Incorrect email or password.";

        } else {

            message.textContent =
                "Login failed. Please try again.";

        }

        message.style.color = "red";

    }

});
