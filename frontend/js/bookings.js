// bookings.js
// Powers the "My Bookings" page: lists every booking the current user made
// (any status), and lets them cancel an approved one — this is what
// Acceptance Test 1 exercises.

const currentUser = requireLogin(); // from api.js — must be logged in to see this page

if (currentUser.role === "admin") {
  document.getElementById("adminLink").style.display = "inline";
}

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

// Fetches and renders every booking made by the logged-in user
async function loadMyBookings() {
  const result = await apiRequest(`/bookings/my/${currentUser.id}`); // GET all bookings for this user, any status

  const list = document.getElementById("bookingsList");
  list.innerHTML = ""; // clear previous content before re-rendering

  if (!result.success || result.bookings.length === 0) {
    list.innerHTML = "<p>You haven't made any bookings yet.</p>";
    return;
  }

  result.bookings.forEach((booking) => {
    // Build one card per booking

    const start = new Date(booking.startDateTime).toLocaleString(); // readable date format
    const end = new Date(booking.endDateTime).toLocaleString();

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <p><strong>${booking.eventName || "Untitled Event"}</strong> <span class="badge ${booking.status}">${booking.status}</span></p>
      <p>Facility: ${booking.facility ? booking.facility.name : "Unknown"}</p>
      <p>${start} → ${end}</p>
      ${booking.status === "CANCELLED" ? `<p style="color:#6b7280;">Cancelled: ${booking.cancellationReason}</p>` : ""}
      ${booking.status === "APPROVED" ? `<button class="danger" onclick="cancelBooking('${booking.id}')">Cancel Booking</button>` : ""}
    `; // only show the Cancel button on bookings that are currently APPROVED

    list.appendChild(card);
  });
}

// Cancels a booking — prompts for a reason, then calls the backend
async function cancelBooking(bookingId) {
  const reason = prompt("Why are you cancelling this booking?"); // simple browser prompt to collect the reason
  if (reason === null) return; // user clicked Cancel on the prompt — do nothing

  const result = await apiRequest(`/bookings/${bookingId}/cancel`, "POST", { reason }); // send the cancel request

  if (result.success) {
    alert("Booking cancelled — the slot is now free for others."); // confirm to the user
    loadMyBookings(); // refresh the list so the status change shows immediately
  } else {
    alert(`Could not cancel: ${result.message}`); // show the backend's error
  }
}

loadMyBookings(); // run as soon as the page loads
