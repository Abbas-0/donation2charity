// user.js
import { fetchUserDetails } from "./auth.js";

export function attachAddUserForm() {
  const addUserForm = document.getElementById("add-user-form");
  if (addUserForm) {
    addUserForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("Add User form submitted!");
      const formData = new FormData(e.target);
      try {
        const response = await fetch("/add_user", {
          method: "POST",
          body: formData,
        });
        const result = await response.json();
        document.getElementById("message").textContent = result.message || result.error;
      } catch (error) {
        console.error("Error submitting Add User form:", error);
        document.getElementById("message").textContent = "An error occurred while adding the user.";
      }
    });
  }
}

export function attachRegisterForm() {
  const registerUserFormElem = document.getElementById("register-user-form");
  if (registerUserFormElem) {
    registerUserFormElem.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("register-username").value.trim();
      const password = document.getElementById("register-password").value.trim();
      const email = document.getElementById("register-email").value.trim();
      const wallet = document.getElementById("register-wallet").value.trim();
      const phone = document.getElementById("register-phone").value.trim();
      
      if (wallet.length < 26) {
        alert("Wallet code must be at least 26 characters long.");
        return;
      }
      
      try {
        const response = await fetch("/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, email, wallet, phone }),
        });
        const result = await response.json();
        if (result.success) {
          alert("Registration successful! Please login.");
          registerUserFormElem.classList.add("hidden");
          document.getElementById("login-form").classList.remove("hidden");
        } else {
          alert(result.message || "Registration failed. Please try again.");
        }
      } catch (error) {
        console.error("Error during registration:", error);
        alert("An error occurred. Please try again.");
      }
    });
  }
}

export function attachLoginForm() {
  const loginUserFormElem = document.getElementById("login-user-form");
  if (loginUserFormElem) {
    loginUserFormElem.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("login-username").value.trim();
      const password = document.getElementById("login-password").value.trim();
      try {
        const response = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const result = await response.json();
        if (result.success) {
          // Hide login form and login button; show user details and misc section
          document.getElementById("login-form").classList.add("hidden");
          document.getElementById("login-button").style.display = "none";
          document.getElementById("user-details").classList.remove("hidden");
          document.getElementById("misc").classList.remove("hidden");

          // Immediately fetch and update user details using the local 'username'
          const userData = await fetchUserDetails(username);
          console.log("Fetched user data:", userData);
          if (userData) {
            document.getElementById("user-name").textContent = username;
            document.getElementById("user-balance").textContent = `$${userData.balance}`;
            document.getElementById("account-limit").textContent = `$${userData.daily_limit - userData.donated_today}`;
            if (userData.latest_transfer && typeof userData.latest_transfer === "object") {
              const lt = userData.latest_transfer;
              document.getElementById("latest-transfer").textContent =
                `${lt.amount} from ${lt.sender} to ${lt.receiver} on ${new Date(lt.timestamp).toLocaleString()}`;
            } else {
              document.getElementById("latest-transfer").textContent = "No transfers yet";
            }
          } else {
            console.error("User data not fetched properly.");
          }
        } else {
          alert(result.message || "Login failed. Please try again.");
        }
      } catch (error) {
        console.error("Error during login:", error);
        alert("An error occurred. Please try again.");
      }
    });
  }
}
