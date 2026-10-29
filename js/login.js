
import { auth, authReady } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const title = document.getElementById("formTitle");
const subtitle = document.getElementById("formSubtitle");
const message = document.getElementById("accountMessage");
const forgotButton = document.getElementById("forgotPassword");

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

function showLogin() {
  loginForm.hidden = false;
  signupForm.hidden = true;
  loginTab.classList.add("active");
  signupTab.classList.remove("active");
  title.innerHTML = 'Welcome <span>Back</span>';
  subtitle.textContent = "Login to your FaceArena account.";
  showMessage("");
}

function showSignup() {
  loginForm.hidden = true;
  signupForm.hidden = false;
  loginTab.classList.remove("active");
  signupTab.classList.add("active");
  title.innerHTML = 'Create Your <span>Account</span>';
  subtitle.textContent = "Join FaceArena and track your submissions.";
  showMessage("");
}

function readableError(error) {
  const messages = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/email-already-in-use": "This email already has an account. Please login.",
    "auth/weak-password": "Choose a stronger password with at least 6 characters.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/user-not-found": "No account found with these login details.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your internet connection.",
    "auth/operation-not-allowed": "Email/Password sign-in is not enabled in Firebase."
  };

  return messages[error.code] ||
    "Something went wrong. Please try again.";
}

function setBusy(form, busy) {
  form.querySelectorAll('button[type="submit"]').forEach(button => {
    button.disabled = busy;
  });
}

loginTab.addEventListener("click", showLogin);
signupTab.addEventListener("click", showSignup);

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  setBusy(loginForm, true);
  showMessage("Logging in...");

  try {
    // Wait for the existing guest/auth session to initialize first.
    await authReady;

    await signInWithEmailAndPassword(auth, email, password);

    showMessage("Login successful. Opening your profile...");
    window.location.href = "profile.html";
  } catch (error) {
    console.error("FaceArena login error:", error);
    showMessage(readableError(error), true);
  } finally {
    setBusy(loginForm, false);
  }
});

signupForm.addEventListener("submit", async event => {
  event.preventDefault();

  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;

  if (!name) {
    showMessage("Please enter your name.", true);
    return;
  }

  setBusy(signupForm, true);
  showMessage("Creating your account...");

  try {
    // Avoid racing the existing anonymous authentication setup.
    await authReady;

    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await updateProfile(result.user, {
      displayName: name
    });

    showMessage("Account created successfully. Opening your profile...");
    window.location.href = "profile.html";
  } catch (error) {
    console.error("FaceArena registration error:", error);
    showMessage(readableError(error), true);
  } finally {
    setBusy(signupForm, false);
  }
});

forgotButton.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();

  if (!email) {
    showMessage("Enter your email address first, then click Forgot password.", true);
    document.getElementById("loginEmail").focus();
    return;
  }

  forgotButton.disabled = true;
  showMessage("Sending password reset email...");

  try {
    await authReady;
    await sendPasswordResetEmail(auth, email);
    showMessage("If this email is registered, a password reset email has been sent. Check your inbox and spam folder.");
  } catch (error) {
    console.error("FaceArena password reset error:", error);
    showMessage(readableError(error), true);
  } finally {
    forgotButton.disabled = false;
  }
});
