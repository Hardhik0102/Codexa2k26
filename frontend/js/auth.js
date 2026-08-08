// auth.js
// Handles login on index.html

const loginForm = document.getElementById("loginForm");
const errorMessage = document.getElementById("errorMessage");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const portal = typeof currentPortal !== "undefined" ? currentPortal : "booking";

  if (errorMessage) {
    errorMessage.style.color = "#dc2626";
    errorMessage.textContent = "";
  }

  const result = await apiRequest("/auth/login", "POST", { email, password, portal });

  if (result.success) {
    localStorage.setItem("currentUser", JSON.stringify(result.user));

    if (result.user.role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "facilities.html";
    }
  } else {
    if (errorMessage) {
      errorMessage.textContent = result.message;
    }
  }
});
