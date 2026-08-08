// auth.js
// Handles the login form on index.html: submitting credentials, saving the
// logged-in user, and redirecting to the facilities page on success.

const loginForm = document.getElementById("loginForm"); // grab the <form> element from the page
const errorMessage = document.getElementById("errorMessage"); // grab the empty <p> we'll use to show errors

// Runs whenever the login form is submitted (button click or pressing Enter)
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault(); // stop the browser's default full-page-reload form submission

  const email = document.getElementById("email").value; // read what the user typed in the email field
  const password = document.getElementById("password").value; // read the password field

  await attemptLogin(email, password); // reuse the same login logic as the quick-login buttons
});

// Called by the "Quick demo login" buttons in index.html
async function quickLogin(email, password) {
  await attemptLogin(email, password); // just fill in the credentials and log in immediately
}

// Shared logic: send credentials to the backend, and handle the result
async function attemptLogin(email, password) {
  errorMessage.textContent = ""; // clear any previous error message before trying again

  const result = await apiRequest("/auth/login", "POST", { email, password }); // call our shared API helper from api.js

  if (result.success) {
    // Login worked — save the user info so other pages know who's logged in
    localStorage.setItem("currentUser", JSON.stringify(result.user)); // localStorage only stores strings, so we convert the object to JSON text
    window.location.href = "facilities.html"; // send them to the main app page
  } else {
    // Login failed — show the error message returned by the backend
    errorMessage.textContent = result.message; // display it on the page
  }
}
