// api.js
// A small shared helper so every page talks to the backend the same way,
// instead of repeating fetch() boilerplate everywhere.

const API_BASE = "http://localhost:5000/api"; // the root URL of our backend API — change this if you deploy the backend elsewhere

// Generic request function — every other function in this file calls this one
async function apiRequest(endpoint, method = "GET", body = null) {
  // endpoint: the path after /api, e.g. "/bookings"
  // method: HTTP verb, defaults to GET if not specified
  // body: JavaScript object to send as JSON, or null for GET requests

  const options = {
    method, // GET, POST, etc.
    headers: { "Content-Type": "application/json" }, // tells the server we're sending JSON
  };

  if (body) {
    options.body = JSON.stringify(body); // convert the JS object into a JSON string for the request body
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options); // actually make the HTTP request
  const data = await response.json(); // parse the JSON response body

  return data; // return the parsed data (has a "success" field plus whatever else the route returns)
}

// Reads the currently logged-in user from localStorage (saved there at login time)
function getCurrentUser() {
  const raw = localStorage.getItem("currentUser"); // localStorage only stores strings, so we saved it as JSON text
  return raw ? JSON.parse(raw) : null; // convert back into a JS object, or return null if nobody is logged in
}

// Redirects to the login page if nobody is logged in — call this at the top of every protected page
function requireLogin() {
  const user = getCurrentUser(); // check localStorage
  if (!user) {
    window.location.href = "index.html"; // send them back to the login page
  }
  return user; // return the user object so the calling page can use it right away
}
