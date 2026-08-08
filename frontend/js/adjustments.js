// adjustments.js
// Powers the Requests inbox: shows incoming requests (waiting on me) and
// outgoing requests (that I've sent), and lets me accept/decline incoming
// ones — accepting is what triggers the atomic transfer in the backend.
// This page is what Acceptance Test 2 exercises.

const currentUser = requireLogin(); // from api.js

if (currentUser.role === "admin") {
  document.getElementById("adminLink").style.display = "inline";
}

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

// Loads requests where I own the target booking (i.e. someone wants MY slot)
async function loadIncoming() {
  const result = await apiRequest(`/adjustments/incoming/${currentUser.id}`); // GET requests targeting my bookings

  const list = document.getElementById("incomingList");
  list.innerHTML = "";

  if (!result.success || result.requests.length === 0) {
    list.innerHTML = "<p>No incoming requests right now.</p>";
    return;
  }

  result.requests.forEach((req) => {
    // Build one card per incoming request

    const booking = req.targetBooking; // the booking being requested (already populated with full details by the backend)
    const start = new Date(booking.startDateTime).toLocaleString();
    const end = new Date(booking.endDateTime).toLocaleString();

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <p><strong>${req.requester.name}</strong> requests your slot (${req.requestType})</p>
      <p>${booking.eventName || "Untitled"} — ${start} → ${end}</p>
      <p>Message: "${req.message}"</p>
      <button onclick="respondToRequest('${req.id}', 'accept')">Accept</button>
      <button class="secondary" onclick="respondToRequest('${req.id}', 'decline')">Decline</button>
    `; // two buttons calling the same handler with a different action string

    list.appendChild(card);
  });
}

// Loads requests I've sent to other people, so I can track their status
async function loadOutgoing() {
  const result = await apiRequest(`/adjustments/outgoing/${currentUser.id}`); // GET requests I created

  const list = document.getElementById("outgoingList");
  list.innerHTML = "";

  if (!result.success || result.requests.length === 0) {
    list.innerHTML = "<p>You haven't sent any requests yet.</p>";
    return;
  }

  result.requests.forEach((req) => {
    const booking = req.targetBooking;
    const start = new Date(booking.startDateTime).toLocaleString();
    const end = new Date(booking.endDateTime).toLocaleString();

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <p>${req.requestType} request for <strong>${booking.eventName || "Untitled"}</strong> <span class="badge ${req.status}">${req.status}</span></p>
      <p>${start} → ${end}</p>
      <p>Your message: "${req.message}"</p>
    `; // outgoing requests are read-only — no buttons, just status

    list.appendChild(card);
  });
}

// Handles clicking Accept or Decline on an incoming request
async function respondToRequest(requestId, action) {
  // action is either "accept" or "decline" — matches our backend route names exactly
  const result = await apiRequest(`/adjustments/${requestId}/${action}`, "POST"); // no body needed, the id in the URL is enough

  if (result.success) {
    alert(action === "accept" ? "Slot transferred successfully!" : "Request declined.");
    loadIncoming(); // refresh both lists so the UI reflects the new state
    loadOutgoing();
  } else {
    alert(`Action failed: ${result.message}`); // show the backend's error, e.g. if the slot was already cancelled
  }
}

// Load both lists as soon as the page opens
loadIncoming();
loadOutgoing();
