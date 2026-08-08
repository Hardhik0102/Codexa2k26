// admin.js
// Powers the admin dashboard: lists every PENDING booking and lets an admin
// approve or reject each one. Access is gated on the frontend by role — for
// a hackathon this is enough, but a production app would also check this
// server-side using an auth token.

const currentUser = requireLogin(); // from api.js — must be logged in at all

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

// Gate the whole page behind the admin role
if (currentUser.role !== "admin") {
  document.getElementById("accessDenied").style.display = "block"; // show the "admins only" message
} else {
  document.getElementById("pendingTable").style.display = "table"; // reveal the table only for admins
  loadPendingBookings(); // and load the data
}

// Fetches every booking currently waiting on admin approval
async function loadPendingBookings() {
  const result = await apiRequest("/admin/pending-bookings"); // GET request, no auth token in this simplified version

  const body = document.getElementById("pendingBody"); // the <tbody> we'll fill with rows
  body.innerHTML = ""; // clear any previous rows

  if (!result.success || result.bookings.length === 0) {
    body.innerHTML = `<tr><td colspan="6">No pending bookings right now.</td></tr>`; // colspan=6 spans across all table columns
    return;
  }

  result.bookings.forEach((booking) => {
    // Build one table row per pending booking

    const start = new Date(booking.startDateTime).toLocaleString();
    const end = new Date(booking.endDateTime).toLocaleString();

    const row = document.createElement("tr"); // create a new table row element

    row.innerHTML = `
      <td>${booking.requester.name}</td>
      <td>${booking.facility.name}</td>
      <td>${booking.eventName || "Untitled"}</td>
      <td>${start} → ${end}</td>
      <td>${booking.attendeeCount}</td>
      <td>
        <button onclick="approveBooking('${booking.id}')">Approve</button>
        <button class="danger" onclick="rejectBooking('${booking.id}')">Reject</button>
      </td>
    `; // two action buttons per row, each calling a different handler below

    body.appendChild(row); // add the row to the table
  });
}

// Approves a pending booking (backend re-checks for conflicts before allowing it)
async function approveBooking(bookingId) {
  const result = await apiRequest(`/admin/bookings/${bookingId}/approve`, "POST"); // no body needed

  if (result.success) {
    alert("Booking approved!"); // confirm to the admin
  } else {
    alert(`Could not approve: ${result.message}`); // e.g. "Slot no longer available"
  }
  loadPendingBookings(); // refresh the table either way, since the row should disappear
}

// Rejects a pending booking
async function rejectBooking(bookingId) {
  const reason = prompt("Reason for rejection (optional):"); // collect an optional reason
  if (reason === null) return; // admin clicked Cancel on the prompt — do nothing

  const result = await apiRequest(`/admin/bookings/${bookingId}/reject`, "POST", { reason });

  if (result.success) {
    alert("Booking rejected.");
  } else {
    alert(`Could not reject: ${result.message}`);
  }
  loadPendingBookings(); // refresh the table
}
