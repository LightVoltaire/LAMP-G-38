// Contact Main Page .js

// Helper Function
//Escape HTMl converts special characters into html so data does not become markup 
// run code on the page.
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

// Loads the table 
function renderContacts(contacts) {
  const tbody = document.getElementById("contactsBody");
  //Empty Case
  const empty = document.getElementById("contactsEmpty");
  tbody.innerHTML = "";

  if (!contacts || contacts.length === 0) {
    empty.classList.remove("d-none");
    return;
  }
  empty.classList.add("d-none");

  contacts.forEach((c) => {
    // Accepts either Capital Case
    // the API, since we don't know for certain which one it sends back yet.
    const id = c.id ?? c.ID;
    const first = c.firstName ?? c.FirstName ?? "";
    const last = c.lastName ?? c.LastName ?? "";
    const email = c.email ?? c.Email ?? "";
    const phone = c.phone ?? c.Phone ?? "";

    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td>${escapeHtml(first)} ${escapeHtml(last)}</td>` +
      `<td>${escapeHtml(email)}</td>` +
      `<td>${escapeHtml(phone)}</td>` +
      `<td class="text-end">` +
      `<button type="button" class="btn btn-sm btn-outline-light me-1" onclick="openEditContact(${JSON.stringify(id)}, '${escapeAttr(first)}', '${escapeAttr(last)}', '${escapeAttr(email)}', '${escapeAttr(phone)}')" title="Edit"><i class="bi bi-pencil"></i></button>` +
      `<button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteContact(${JSON.stringify(id)})" title="Delete"><i class="bi bi-trash"></i></button>` +
      `</td>`;
    tbody.appendChild(tr);
  });
}

//  Search (Loads inital)  
function searchContacts() {
  let srchInput = document.getElementById("searchText");
  let srch = srchInput ? srchInput.value.trim() : "";
  let resultSpan = document.getElementById("contactsSearchResult");
  if (resultSpan) resultSpan.innerHTML = "";

  let url = urlBase + (srch ? ("?q=" + encodeURIComponent(srch)) : "");

  let xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Authorization", "Bearer " + userId);
  xhr.setRequestHeader("X-User-Id", userId);

  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        let jsonObject = {};
        try { jsonObject = JSON.parse(xhr.responseText); } catch (e) { /* leave empty */ }
        //  Contacts come back as "contacts".
        // "results" is kept as a fallback, same pattern as searchColor().
        let contacts = jsonObject.contacts || jsonObject.results || [];
        renderContacts(contacts);
      } else {
        if (resultSpan) resultSpan.innerHTML = "<span class='text-danger'><i class='bi bi-exclamation-circle-fill me-1'></i>Couldn't load contacts.</span>";
      }
    }
  };
  xhr.send();
}

// Add Contact
function addContact() {
  let first = document.getElementById("newFirstName").value.trim();
  let last = document.getElementById("newLastName").value.trim();
  let email = document.getElementById("newEmail").value.trim();
  let phone = document.getElementById("newPhone").value.trim();
  let resultEl = document.getElementById("contactAddResult");
  resultEl.innerHTML = "";

  if (!first || !last || !email || !phone) {
    resultEl.className = "small fw-semibold text-warning";
    resultEl.innerHTML = "<i class='bi bi-exclamation-triangle-fill me-1'></i> Please fill in every field.";
    return;
  }

  let jsonPayload = JSON.stringify({ firstName: first, lastName: last, email: email, phone: phone });

  let xhr = new XMLHttpRequest();
  xhr.open("POST", urlBase, true);
  xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
  xhr.setRequestHeader("Authorization", "Bearer " + userId);
  xhr.setRequestHeader("X-User-Id", userId);

  try {
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status === 200 || this.status === 201) {
          resultEl.className = "small fw-semibold text-success";
          resultEl.innerHTML = "<i class='bi bi-check-circle-fill me-1'></i> Contact added!";
          document.getElementById("addContactForm").reset();
          searchContacts();
        } else {
          try {
            let res = JSON.parse(xhr.responseText);
            resultEl.className = "small fw-semibold text-danger";
            resultEl.innerHTML = `<i class='bi bi-exclamation-circle-fill me-1'></i> ${res.error || "Failed to add contact."}`;
          } catch (e) {
            resultEl.className = "small fw-semibold text-danger";
            resultEl.innerHTML = "<i class='bi bi-exclamation-circle-fill me-1'></i> Error adding contact.";
          }
        }
      }
    };
    xhr.send(jsonPayload);
  } catch (err) {
    resultEl.className = "small fw-semibold text-danger";
    resultEl.innerHTML = err.message;
  }
}

// Edit 
let editingId = null;

function openEditContact(id, first, last, email, phone) {
  editingId = id;
  document.getElementById("editFirstName").value = first;
  document.getElementById("editLastName").value = last;
  document.getElementById("editEmail").value = email;
  document.getElementById("editPhone").value = phone;
  document.getElementById("editContactResult").innerHTML = "";
  new bootstrap.Modal(document.getElementById("editContactModal")).show();
}

// added and deleted. Confirm the real method/URL for editing with your
// update this function later - everything else can stay the same.
function updateContact() {
  let first = document.getElementById("editFirstName").value.trim();
  let last = document.getElementById("editLastName").value.trim();
  let email = document.getElementById("editEmail").value.trim();
  let phone = document.getElementById("editPhone").value.trim();
  let resultEl = document.getElementById("editContactResult");
  resultEl.innerHTML = "";

  if (!first || !last || !email || !phone) {
    resultEl.className = "small fw-semibold text-warning";
    resultEl.innerHTML = "<i class='bi bi-exclamation-triangle-fill me-1'></i> Please fill in every field.";
    return;
  }

  let jsonPayload = JSON.stringify({ id: editingId, firstName: first, lastName: last, email: email, phone: phone });

  let xhr = new XMLHttpRequest();
  xhr.open("PUT", urlBase, true);
  xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
  xhr.setRequestHeader("Authorization", "Bearer " + userId);
  xhr.setRequestHeader("X-User-Id", userId);

  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        bootstrap.Modal.getInstance(document.getElementById("editContactModal")).hide();
        searchContacts();
      } else {
        try {
          let res = JSON.parse(xhr.responseText);
          resultEl.className = "small fw-semibold text-danger";
          resultEl.innerHTML = `<i class='bi bi-exclamation-circle-fill me-1'></i> ${res.error || "Failed to save changes."}`;
        } catch (e) {
          resultEl.className = "small fw-semibold text-danger";
          resultEl.innerHTML = "<i class='bi bi-exclamation-circle-fill me-1'></i> Error saving changes.";
        }
      }
    }
  };
  xhr.send(jsonPayload);
}

// Delete
function deleteContact(id) {
  if (!confirm("Delete this contact? This can't be undone.")) return;

  let url = urlBase + "?id=" + encodeURIComponent(id);
  let xhr = new XMLHttpRequest();
  xhr.open("DELETE", url, true);
  xhr.setRequestHeader("Authorization", "Bearer " + userId);
  xhr.setRequestHeader("X-User-Id", userId);

  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        searchContacts();
      } else {
        alert("Couldn't delete that contact.");
      }
    }
  };
  xhr.send();
}
