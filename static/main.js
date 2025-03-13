// main.js
import { checkSession, fetchUserDetails } from "./auth.js";
import { attachAddUserForm, attachRegisterForm, attachLoginForm } from "./user.js";
import { fetchAndDisplayTransfers } from "./transfers.js";
import { fetchAndDisplayEvents } from "./events.js";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Main.js loaded");

  // === Session and User Data Update ===
  const sessionResult = await checkSession();
  const loginButton = document.getElementById("login-button");
  const userDetailsElem = document.getElementById("user-details");
  const miscElem = document.getElementById("misc");

  if (sessionResult.logged_in) {
    if (loginButton) loginButton.style.display = "none";
    if (userDetailsElem) userDetailsElem.classList.remove("hidden");
    if (miscElem) miscElem.classList.remove("hidden");
    const userData = await fetchUserDetails(sessionResult.username);
    if (userData) {
      document.getElementById("user-name").textContent = sessionResult.username;
      document.getElementById("user-balance").textContent = `$${userData.balance}`;
      document.getElementById("account-limit").textContent = `$${userData.daily_limit - userData.donated_today}`;
      if (userData.latest_transfer && typeof userData.latest_transfer === "object") {
        const lt = userData.latest_transfer;
        document.getElementById("latest-transfer").textContent =
          `${lt.amount} from ${lt.sender} to ${lt.receiver} on ${new Date(lt.timestamp).toLocaleString()}`;
      } else {
        document.getElementById("latest-transfer").textContent = "No transfers yet";
      }
    }
  } else {
    if (loginButton) loginButton.style.display = "block";
    if (miscElem) miscElem.classList.add("hidden");
  }

  // === Attach User Form Handlers ===
  attachAddUserForm();
  attachRegisterForm();
  attachLoginForm();

  // === Simplified Login/Register Toggle using Class Toggling ===
  const loginButtonElem = document.getElementById("login-button");
  const loginRegisterOptionsElem = document.getElementById("login-register-options");
  const loginFormElem = document.getElementById("login-form");
  const registerFormElem = document.getElementById("register-form");

  if (!loginButtonElem || !loginRegisterOptionsElem) {
    console.error("Missing login elements");
  } else {
    loginButtonElem.addEventListener("click", () => {
      console.log("Login button clicked");
      // Toggle the 'hidden' class on the options container
      loginRegisterOptionsElem.classList.toggle("hidden");
      console.log("Toggled login/register options; current state:", loginRegisterOptionsElem.classList);
    });
  }

  // When the user chooses to login, show the login form and hide the options
  const chooseLoginButtonElem = document.getElementById("choose-login");
  if (chooseLoginButtonElem) {
    chooseLoginButtonElem.addEventListener("click", () => {
      loginFormElem.classList.remove("hidden");
      registerFormElem.classList.add("hidden");
      // Hide the options container after a choice is made
      loginRegisterOptionsElem.classList.add("hidden");
      console.log("Login form displayed");
    });
  }

  // When the user chooses to register, show the register form and hide the options
  const chooseRegisterButtonElem = document.getElementById("choose-register");
  if (chooseRegisterButtonElem) {
    chooseRegisterButtonElem.addEventListener("click", () => {
      registerFormElem.classList.remove("hidden");
      loginFormElem.classList.add("hidden");
      // Hide the options container after a choice is made
      loginRegisterOptionsElem.classList.add("hidden");
      console.log("Register form displayed");
    });
  }

  // === Logout Functionality ===
  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      try {
        await fetch("/logout", { method: "POST" });
        window.location.reload();
      } catch (error) {
        console.error("Error logging out:", error);
      }
    });
  }

  // === Attach Filter Functionality for Events ===
  const applyFilterBtn = document.getElementById("apply-filter");
  const filterSelect = document.getElementById("filter-select");
  if (applyFilterBtn && filterSelect) {
    applyFilterBtn.addEventListener("click", () => {
      const filterValue = filterSelect.value;
      fetchAndDisplayEvents(filterValue, "events-list");
    });
  }
  const applyFilterAdminBtn = document.getElementById("apply-filter-admin");
  const filterSelectAdmin = document.getElementById("filter-select-admin");
  if (applyFilterAdminBtn && filterSelectAdmin) {
    applyFilterAdminBtn.addEventListener("click", () => {
      const filterValue = filterSelectAdmin.value;
      fetchAndDisplayEvents(filterValue, "events-list");
    });
  }

  // === Admin Dashboard Navigation Toggling ===
  const sections = {
    adjust: document.getElementById("adjust-balance-section"),
    transfers: document.getElementById("transfers-section"),
    removeUser: document.getElementById("remove-user-section"),
    editUser: document.getElementById("edit-user-section"),
    addEvent: document.getElementById("add-event-section"),
    events: document.getElementById("events-section")
  };

  const buttons = {
    adjust: document.getElementById("show-adjust-balance"),
    transfers: document.getElementById("show-transfers"),
    removeUser: document.getElementById("show-remove-user"),
    editUser: document.getElementById("show-edit-user"),
    addEvent: document.getElementById("show-add-event"),
    events: document.getElementById("show-events")
  };

  if (Object.values(sections).every(sec => sec) && Object.values(buttons).every(btn => btn)) {
    function clearActive() {
      Object.values(sections).forEach(sec => sec.classList.remove("active-section"));
      Object.values(buttons).forEach(btn => btn.classList.remove("active"));
    }
    buttons.adjust.addEventListener("click", () => {
      clearActive();
      sections.adjust.classList.add("active-section");
      buttons.adjust.classList.add("active");
      console.log("Adjust Balance section activated");
    });
    buttons.transfers.addEventListener("click", () => {
      clearActive();
      sections.transfers.classList.add("active-section");
      buttons.transfers.classList.add("active");
      console.log("Transfers section activated");
      fetchAndDisplayTransfers();
    });
    buttons.removeUser.addEventListener("click", () => {
      clearActive();
      sections.removeUser.classList.add("active-section");
      buttons.removeUser.classList.add("active");
      console.log("Remove User section activated");
    });
    buttons.editUser.addEventListener("click", () => {
      clearActive();
      sections.editUser.classList.add("active-section");
      buttons.editUser.classList.add("active");
      console.log("Edit User section activated");
    });
    buttons.addEvent.addEventListener("click", () => {
      clearActive();
      sections.addEvent.classList.add("active-section");
      buttons.addEvent.classList.add("active");
      console.log("Add Event section activated");
    });
    buttons.events.addEventListener("click", () => {
      clearActive();
      sections.events.classList.add("active-section");
      buttons.events.classList.add("active");
      console.log("View Events section activated");
      const filterValue = filterSelectAdmin ? filterSelectAdmin.value : "all";
      fetchAndDisplayEvents(filterValue, "events-list");
    });
  }

  // === Remove User Form Submission (Admin Dashboard) ===
  const removeUserForm = document.getElementById("remove-user-form");
  if (removeUserForm) {
    removeUserForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("remove-username").value.trim();
      try {
        const formData = new FormData();
        formData.append("username", username);
        const response = await fetch("/remove_user", {
          method: "POST",
          body: formData,
        });
        const result = await response.json();
        if (result.message) {
          alert(result.message);
        } else {
          alert(result.error || "An error occurred");
        }
      } catch (error) {
        console.error("Error removing user:", error);
        alert("An error occurred while removing the user.");
      }
    });
  }

  // === Edit User Form Submission (Admin Dashboard) ===
  const editUserForm = document.getElementById("edit-user-form");
  if (editUserForm) {
    editUserForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("edit-username").value.trim();
      const daily_limit = document.getElementById("edit-daily-limit").value.trim();
      const email = document.getElementById("edit-email").value.trim();
      const phone = document.getElementById("edit-phone").value.trim();
      const password = document.getElementById("edit-password").value.trim();
      if (!username) {
        document.getElementById("message").textContent = "Username is required";
        return;
      }
      try {
        const response = await fetch("/admin/edit_user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, daily_limit, email, phone, password }),
        });
        const result = await response.json();
        console.log("Edit user result:", result);
        document.getElementById("message").textContent = result.message || result.error || "Unknown error";
      } catch (error) {
        console.error("Error editing user:", error);
        document.getElementById("message").textContent = "An error occurred while updating user details.";
      }
    });
  }
});
