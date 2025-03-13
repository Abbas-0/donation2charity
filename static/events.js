// events.js

export function getEventStatus(event) {
  const now = new Date();
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  if (now < start) return "upcoming";
  if (now >= start && now < end) return "ongoing";
  return "completed";
}

export async function fetchAndDisplayEvents(filterValue = "all", containerId = "events-list") {
  try {
    const response = await fetch("/get_events");
    const events = await response.json();
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    const entries = Object.entries(events);
    
    // Sort events by start time
    entries.sort((a, b) => new Date(a[1].start_time) - new Date(b[1].start_time));

    entries.forEach(([eventId, ev]) => {
      const status = getEventStatus(ev);
      if (filterValue !== "all" && status !== filterValue) return;

      const progressPercent = ev.goal > 0 ? (ev.current_donation / ev.goal) * 100 : 0;
      const card = document.createElement("div");
      card.classList.add("event-card");

      if (document.body.classList.contains("admin-page")) {
        card.innerHTML = `
          <img src="${ev.image}" alt="${ev.name}" class="event-image" />
          <h3>${ev.name}</h3>
          <p>Created by: <strong>${ev.created_by}</strong></p>
          <p>${ev.description}</p>
          <p><strong>Start:</strong> ${new Date(ev.start_time).toLocaleString()}</p>
          <p><strong>End:</strong> ${new Date(ev.end_time).toLocaleString()}</p>
          <p><strong>Status:</strong> ${status}</p>
          <div class="progress-bar">
            <div class="progress" style="width: ${progressPercent}%;"></div>
          </div>
          <p>Donations: $${ev.current_donation} / $${ev.goal}</p>
          <button class="edit-event-btn">Edit</button>
          <button class="delete-event-btn">Delete</button>
        `;
      } else {
        card.innerHTML = `
          <img src="${ev.image}" alt="${ev.name}" class="event-image" />
          <h3>${ev.name}</h3>
          <p>Created by: <strong>${ev.created_by}</strong></p>
          <p>${ev.description}</p>
          <p><strong>Start:</strong> ${new Date(ev.start_time).toLocaleString()}</p>
          <p><strong>End:</strong> ${new Date(ev.end_time).toLocaleString()}</p>
          <p><strong>Status:</strong> ${status}</p>
          <div class="progress-bar">
            <div class="progress" style="width: ${progressPercent}%;"></div>
          </div>
          <p>Donations: $${ev.current_donation} / $${ev.goal}</p>
          <button class="view-event-btn">View</button>
        `;
      }
      container.appendChild(card);

      if (!document.body.classList.contains("admin-page")) {
        // Attach listener to the "View" button only.
        const viewButton = card.querySelector(".view-event-btn");
        if (viewButton) {
          viewButton.addEventListener("click", (e) => {
            e.stopPropagation();
            console.log("View button clicked for event:", eventId);
            openViewEventModal(eventId, ev);
          });
        }
      } else {
        // For admin pages, attach Edit and Delete listeners.
        const editButton = card.querySelector(".edit-event-btn");
        if (editButton) {
          editButton.addEventListener("click", (e) => {
            e.stopPropagation();
            openEditEventModal(eventId, ev);
          });
        }
        const deleteButton = card.querySelector(".delete-event-btn");
        if (deleteButton) {
          deleteButton.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteEvent(eventId);
          });
        }
      }
    });
  } catch (error) {
    console.error("Error fetching events:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const addEventForm = document.getElementById("add-event-form");
  if (addEventForm) {
    addEventForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("Add Event form submitted!");

      const created_by = document.getElementById("event-created-by").value.trim();
      const name = document.getElementById("event-name").value.trim();
      const description = document.getElementById("event-description").value.trim();
      const start_time = document.getElementById("event-start-time").value;
      const end_time = document.getElementById("event-end-time").value;
      const goal = document.getElementById("event-goal").value.trim();
      const image = document.getElementById("event-image").value.trim();

      if (!created_by || !name || !start_time || !end_time || !goal) {
        document.getElementById("message").textContent = "Please fill in all required fields.";
        return;
      }

      try {
        const response = await fetch("/admin/add_event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ created_by, name, description, start_time, end_time, goal, image })
        });
        const result = await response.json();
        console.log("Add Event response:", result);
        document.getElementById("message").textContent = result.message || result.error;

        if (result.message) {
          addEventForm.reset();
          fetchAndDisplayEvents("all", "events-list");
        }
      } catch (error) {
        console.error("Error adding event:", error);
        document.getElementById("message").textContent = "An error occurred while adding the event.";
      }
    });
  }
});

// === VIEW EVENT MODAL FUNCTIONALITY (Non-admin only) ===
export function openViewEventModal(eventId, eventData) {
  const modal = document.getElementById("view-event-modal");
  if (!modal) {
    console.error("View event modal element not found");
    return;
  }
  console.log("Opening view modal for event:", eventId);
  document.getElementById("view-event-name").textContent = eventData.name;
  document.getElementById("view-event-description").textContent = eventData.description;
  document.getElementById("view-event-start-time").textContent = new Date(eventData.start_time).toLocaleString();
  document.getElementById("view-event-end-time").textContent = new Date(eventData.end_time).toLocaleString();
  document.getElementById("view-event-status").textContent = getEventStatus(eventData);
  
  const imageElem = document.getElementById("view-event-image");
  imageElem.src = eventData.image || "";
  imageElem.alt = eventData.name;
  
  const progressPercent = eventData.goal > 0 ? (eventData.current_donation / eventData.goal) * 100 : 0;
  document.getElementById("view-event-progress").style.width = `${progressPercent}%`;
  
  document.getElementById("view-event-current").textContent = eventData.current_donation;
  document.getElementById("view-event-goal").textContent = eventData.goal;
  
  // Attach donate button functionality
  const donateButton = document.getElementById("donate-to-event");
  if (donateButton) {
    donateButton.onclick = async () => {
      const donationStr = prompt("Enter donation amount:");
      const donationAmount = parseFloat(donationStr);
      if (isNaN(donationAmount) || donationAmount <= 0) {
        alert("Invalid donation amount.");
        return;
      }
      const donorUsername = document.getElementById("user-name").textContent;
      try {
        const response = await fetch("/donate_event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: donorUsername, event_id: eventId, amount: donationAmount })
        });
        const result = await response.json();
        if (result.message) {
          alert(result.message);
          let currentDonation = parseFloat(document.getElementById("view-event-current").textContent);
          currentDonation += donationAmount;
          document.getElementById("view-event-current").textContent = currentDonation;
          const newProgress = eventData.goal > 0 ? (currentDonation / eventData.goal) * 100 : 0;
          document.getElementById("view-event-progress").style.width = `${newProgress}%`;
        } else {
          alert(result.error || "Donation failed");
        }
      } catch (error) {
        console.error("Error donating to event:", error);
        alert("An error occurred while donating.");
      }
    };
  }
  
  // Show the modal as a dialog box
  modal.style.display = 'flex';
  modal.classList.remove("hidden");
  void modal.offsetWidth;
  modal.classList.add("show");
}

document.addEventListener("DOMContentLoaded", () => {
  const closeViewModalBtn = document.getElementById("close-view-event-modal");
  if (closeViewModalBtn) {
    closeViewModalBtn.addEventListener("click", () => {
      const modal = document.getElementById("view-event-modal");
      if (modal) {
        modal.classList.remove("show");
        setTimeout(() => {
          modal.classList.add("hidden");
          modal.style.display = 'none';
        }, 300);
      }
    });
  } else {
    console.log("Close view modal button not found (this may be expected if not present).");
  }
});

// === EDIT EVENT MODAL (Admin Only) ===
export function openEditEventModal(eventId, eventData) {
  console.log("Opening edit modal for event:", eventId, eventData);
  const editEventId = document.getElementById("edit-event-id");
  const editEventName = document.getElementById("edit-event-name");
  const editEventDescription = document.getElementById("edit-event-description");
  const editEventStartTime = document.getElementById("edit-event-start-time");
  const editEventEndTime = document.getElementById("edit-event-end-time");
  const editEventGoal = document.getElementById("edit-event-goal");
  const editEventImage = document.getElementById("edit-event-image");
  const editEventModal = document.getElementById("edit-event-modal");

  if (editEventId && editEventName && editEventDescription && editEventStartTime && editEventEndTime && editEventGoal && editEventImage && editEventModal) {
    editEventId.value = eventId;
    editEventName.value = eventData.name;
    editEventDescription.value = eventData.description;
    editEventStartTime.value = eventData.start_time;
    editEventEndTime.value = eventData.end_time;
    editEventGoal.value = eventData.goal;
    editEventImage.value = eventData.image;
    editEventModal.classList.remove("hidden");
  } else {
    console.error("Edit event modal elements are missing. This may be expected on non-admin pages.");
  }
}

const editEventForm = document.getElementById("edit-event-form");
if (editEventForm) {
  editEventForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const eventId = document.getElementById("edit-event-id").value;
    const name = document.getElementById("edit-event-name").value;
    const description = document.getElementById("edit-event-description").value;
    const start_time = document.getElementById("edit-event-start-time").value;
    const end_time = document.getElementById("edit-event-end-time").value;
    const goal = document.getElementById("edit-event-goal").value;
    const image = document.getElementById("edit-event-image").value;

    try {
      const response = await fetch(`/admin/edit_event/${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, start_time, end_time, goal, image })
      });

      const result = await response.json();
      console.log("Edit Event response:", result);

      if (result.message) {
        const editModal = document.getElementById("edit-event-modal");
        if (editModal) {
          editModal.classList.add("hidden");
        }
        fetchAndDisplayEvents("all", "events-list");
      } else {
        console.error("Error editing event:", result.error);
      }
    } catch (error) {
      console.error("Error submitting edit event form:", error);
    }
  });
} else {
  console.log("Edit event form not found (this is expected on non-admin pages).");
}

const closeEditModalBtn = document.getElementById("close-edit-event-modal");
if (closeEditModalBtn) {
  closeEditModalBtn.addEventListener("click", () => {
    const editModal = document.getElementById("edit-event-modal");
    if (editModal) {
      editModal.classList.add("hidden");
    }
  });
} else {
  console.log("Close edit modal button not found (this is expected on non-admin pages).");
}

async function deleteEvent(eventId) {
  if (!confirm("Are you sure you want to delete this event?")) return;

  try {
    const response = await fetch("/admin/delete_event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId })
    });
    const result = await response.json();
    console.log("Delete Event response:", result);

    if (result.message) {
      fetchAndDisplayEvents("all", "events-list");
    } else {
      console.error("Error deleting event:", result.error);
    }
  } catch (error) {
    console.error("Error deleting event:", error);
  }
}

// === ADD BALANCE FUNCTIONALITY for Logged-in User ===
export function attachAddBalanceFunction() {
  const addBalanceForm = document.getElementById("add-balance-form");
  if (addBalanceForm) {
    addBalanceForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("Add Balance form submitted!");
      const username = document.getElementById("add-balance-username").value.trim();
      const amountStr = document.getElementById("add-balance-amount").value.trim();
      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
      }
      try {
        const response = await fetch("/add_balance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, amount })
        });
        const result = await response.json();
        alert(result.message);
        // Optionally update user balance display here if needed.
      } catch (error) {
        console.error("Error adding balance:", error);
        alert("An error occurred while adding balance.");
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  attachAddBalanceFunction();
});
