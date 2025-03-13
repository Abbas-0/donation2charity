// auth.js
export async function checkSession() {
  try {
    const response = await fetch("/check_session");
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error checking session:", error);
    return { logged_in: false };
  }
}

export async function fetchUserDetails(username) {
  try {
    const response = await fetch(`/get_user_details?username=${username}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user details:", error);
    return null;
  }
}
