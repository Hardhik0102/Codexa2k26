// calendar.js
// Loads one facility's details and its current bookings, handles submitting
// a new booking, and lets a user request an adjustment on someone else's slot.

const currentUser = requireLogin(); // from api.js — ensures somebody is logged in

if (currentUser.role === "admin") {
  document.getElementById("adminLink").style.display = "inline"; // show Admin nav link if applicable
}

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

// Read the facilityId out of the URL, e.g. calendar.html?facilityId=abc123
const urlParams = new URLSearchParams(window.location.search); // built-in browser API for parsing "?key=value" pairs
const facilityId = urlParams.get("facilityId"); // extract just the facilityId value

// Loads the facility's name into the page heading
async function loadFacilityInfo() {
  const result = await apiRequest(`/facilities/${facilityId}`); // GET a single facility
  if (result.success) {
    document.getElementById("facilityName").textContent = `${result.facility.name} — Calendar`; // update the page heading
  }
}

// Loads and renders every current (pending/approved) booking for this facility
async function loadBookings() {
  const result = await apiRequest(`/bookings?facilityId=${facilityId}`); // GET filtered by facility
  const list = document.getElementById("bookingsList"); // container to fill
  list.innerHTML = ""; // clear previous content

  if (!result.success || result.bookings.length === 0) {
    list.innerHTML = "<p>No bookings yet for this facility — it's wide open!</p>";
    return;
  }

  result.bookings.forEach((booking) => {
    // Loop over every booking and build a card showing its details

    const isMine = booking.requester.id === currentUser.id; // check if I own this booking (compare ids as strings implicitly)

    const card = document.createElement("div"); // new card element
    card.className = "card";

    const start = new Date(booking.startDateTime).toLocaleString(); // format the raw date into a readable local string
    const end = new Date(booking.endDateTime).toLocaleString();

    card.innerHTML = `
      <p><strong>${booking.eventName || "Untitled Event"}</strong> <span class="badge ${booking.status}">${booking.status}</span></p>
      <p>${start} → ${end}</p>
      <p>Owner: ${isMine ? "You" : booking.requester.name}</p>
      ${!isMine ? `<button onclick="requestAdjustment('${booking.id}')">Request Adjustment / Relinquish</button>` : ""}
    `; // only show the "Request Adjustment" button on bookings that belong to someone else

    list.appendChild(card); // add it to the page
  });
}

// Handles submitting the "Book This Slot" form
document.getElementById("bookingForm").addEventListener("submit", async (event) => {
  event.preventDefault(); // stop the default page reload on form submit

  const payload = {
    // Gather every field from the form into one object matching what the backend expects
    facilityId,
    requesterId: currentUser.id,
    eventName: document.getElementById("eventName").value,
    purpose: document.getElementById("purpose").value,
    attendeeCount: Number(document.getElementById("attendeeCount").value), // convert the string input value to a number
    startDateTime: document.getElementById("startDateTime").value,
    endDateTime: document.getElementById("endDateTime").value,
  };

  const result = await apiRequest("/bookings", "POST", payload); // send the booking request to the backend

  const messageEl = document.getElementById("bookingMessage"); // where we'll show the outcome

  if (result.success) {
    messageEl.style.color = "green"; // green text for success
    messageEl.textContent = `Booking ${result.booking.status === "PENDING" ? "submitted, awaiting admin approval" : "confirmed"}!`;
    document.getElementById("bookingForm").reset(); // clear the form fields
    loadBookings(); // refresh the list so the new booking appears immediately
  } else {
    messageEl.style.color = "red"; // red text for errors, e.g. the conflict message from the backend
    messageEl.textContent = result.message; // show exactly what the backend said went wrong
  }
});

// Sends an adjustment request against someone else's booking
async function requestAdjustment(bookingId) {
  const type = confirm("Click OK to request a SWAP, or Cancel to request a plain RELINQUISH.") ? "SWAP" : "RELINQUISH"; // simple browser confirm dialog to pick a type
  const message = prompt("Add a short message explaining why you need this slot:"); // simple browser prompt for the note

  if (message === null) return; // user clicked Cancel on the prompt — abort, do nothing

  const result = await apiRequest("/adjustments", "POST", {
    requesterId: currentUser.id, // who is asking
    targetBookingId: bookingId, // which booking they want
    requestType: type,
    message,
  });

  if (result.success) {
    alert("Adjustment request sent! The owner will see it in their Requests inbox."); // simple confirmation popup
  } else {
    alert(`Could not send request: ${result.message}`); // show the backend's error message
  }
}

// Run both loaders as soon as the page loads
loadFacilityInfo();
loadBookings();
