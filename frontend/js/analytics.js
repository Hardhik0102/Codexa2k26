// analytics.js
// Loads the aggregate stats from the backend and drops each number into its
// matching stat card on the page.

const currentUser = requireLogin(); // from api.js

if (currentUser.role === "admin") {
  document.getElementById("adminLink").style.display = "inline";
}

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

// Fetches the overview numbers and fills in each stat card
async function loadAnalytics() {
  const result = await apiRequest("/analytics/overview"); // GET the aggregate stats

  if (!result.success) {
    alert("Could not load analytics: " + result.message); // simple error handling
    return;
  }

  const overview = result.overview; // shorthand reference to the returned object

  // Set the text content of each stat card's number element by its id
  document.getElementById("totalBookings").textContent = overview.totalBookings;
  document.getElementById("totalBookedHours").textContent = overview.totalBookedHours;
  document.getElementById("cancellationRate").textContent = overview.cancellationRate;
  document.getElementById("pendingApprovals").textContent = overview.pendingApprovals;
  document.getElementById("peakDemandTime").textContent = overview.peakDemandTime;
}

loadAnalytics(); // run as soon as the page loads
