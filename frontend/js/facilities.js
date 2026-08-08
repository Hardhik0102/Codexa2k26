// facilities.js
// Loads facility cards on facilities.html, applies category filtering,
// and handles the shared navbar logic (showing the Admin link, logout).

const currentUser = requireLogin(); // from api.js — redirects to login if nobody is signed in, otherwise gives us the user object

if (currentUser.role === "admin") {
  document.getElementById("adminLink").style.display = "inline"; // reveal the Admin nav link only for admin users
}

// Runs the logout flow — clears the saved user and sends them back to the login page
function logout() {
  localStorage.removeItem("currentUser"); // forget who was logged in
  window.location.href = "index.html"; // go back to the login screen
}

// Fetches facilities from the backend (optionally filtered) and renders them as cards
async function loadFacilities() {
  const category = document.getElementById("categoryFilter").value; // read the currently selected filter
  const query = category ? `?category=${encodeURIComponent(category)}` : ""; // build a query string only if a filter is chosen; encodeURIComponent makes it URL-safe

  const result = await apiRequest(`/facilities${query}`); // GET request via our shared helper

  const grid = document.getElementById("facilityGrid"); // the container we'll fill with cards
  grid.innerHTML = ""; // clear out any previously rendered cards before adding new ones

  if (!result.success || result.facilities.length === 0) {
    grid.innerHTML = "<p>No facilities found.</p>"; // friendly empty state
    return; // stop here, nothing more to render
  }

  result.facilities.forEach((facility) => {
    // Loop over every facility returned and build a card for each one

    const card = document.createElement("div"); // create a new empty <div> element in memory
    card.className = "card"; // give it our shared card styling

    // Build the inner HTML of the card using a template literal (backticks let us insert variables with ${})
    card.innerHTML = `
      <h3>${facility.name}</h3>
      <p><strong>Category:</strong> ${facility.category}</p>
      <p><strong>Capacity:</strong> ${facility.capacity}</p>
      <p><strong>Location:</strong> ${facility.location}</p>
      <p><strong>Approval:</strong> ${facility.restricted ? "Requires Admin Approval" : "Auto-Approved"}</p>
      <button onclick="viewCalendar('${facility.id}')">View Calendar & Book</button>
    `; // facility.id is MongoDB's unique id, passed into the calendar page via the URL

    grid.appendChild(card); // add the finished card into the page
  });
}

// Navigates to the calendar page for a specific facility, passing its id in the URL
function viewCalendar(facilityId) {
  window.location.href = `calendar.html?facilityId=${facilityId}`; // calendar.js will read this from the URL
}

loadFacilities(); // run immediately when the page loads, so cards appear without needing a click
