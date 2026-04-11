const API_BASE = "http://127.0.0.1:4444/api"; // update to your backend
const token = localStorage.getItem("authToken") || null;

let currentPage = 1;
const limit = 10;

const elements = {
  patientTbody: document.getElementById("patientTbody"),
  pageInfo: document.getElementById("pageInfo"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  searchInput: document.getElementById("patientSearch"),
  searchBtn: document.getElementById("searchBtn"),
  deptAssign: document.getElementById("deptAssign"),
  registrationForm: document.getElementById("registrationForm"),
  clerkingForm: document.getElementById("clerkingForm"),
  staffName: document.getElementById("staffName"),
  staffRole: document.getElementById("staffRole"),
  profileInitials: document.getElementById("profileInitials"),
  serverStatus: document.getElementById("serverStatus"),
  navMenu: document.getElementById("navMenu"),
};

function setAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function checkServer() {
  try {
    const res = await fetch(`${API_BASE}/patients`, {
      method: "GET",
      headers: setAuthHeaders(),
    });
    elements.serverStatus.textContent = res.ok
      ? "Server: Online"
      : "Server: Offline";
  } catch {
    elements.serverStatus.textContent = "Server: Offline";
  }
}

async function loadStaffProfile() {
  try {
    const res = await fetch(`${API_BASE}/staff/me`, {
      headers: setAuthHeaders(),
    });
    if (!res.ok) throw new Error("No profile");
    const data = await res.json();
    const staff = data.staff || data;
    elements.staffName.textContent = staff.name || "Staff";
    elements.staffRole.textContent = staff.role || "";
    elements.profileInitials.textContent = (staff.name || "S")
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("");
  } catch {
    elements.staffName.textContent = "Guest";
    elements.staffRole.textContent = "";
    elements.profileInitials.textContent = "G";
  }
}

async function loadDepartments() {
  // Replace with backend endpoint if you have dynamic departments
  const departments = [
    "General OPD",
    "Emergency",
    "Maternity",
    "Medicine",
    "Pediatrics",
    "Surgery",
  ];
  elements.deptAssign.innerHTML = departments
    .map((d) => `<option>${d}</option>`)
    .join("");
}

async function fetchPatients(page = 1, q = "") {
  const url = new URL(`${API_BASE}/patients`);
  url.searchParams.set("page", page);
  url.searchParams.set("limit", limit);
  if (q) url.searchParams.set("q", q);

  const res = await fetch(url.toString(), { headers: setAuthHeaders() });
  if (!res.ok) {
    elements.patientTbody.innerHTML = `<tr><td colspan="6">Error loading patients</td></tr>`;
    return { items: [], totalPages: 1 };
  }
  const data = await res.json();
  // Expect backend to return { ALL: [...], totalPages } or { items: [...], totalPages }
  const items = data.ALL || data.items || [];
  const totalPages =
    data.totalPages ||
    Math.max(1, Math.ceil((data.total || items.length) / limit));
  return { items, totalPages };
}

function renderPatients(items) {
  if (!items.length) {
    elements.patientTbody.innerHTML = `<tr><td colspan="6">No patients found</td></tr>`;
    return;
  }

  elements.patientTbody.innerHTML = items
    .map((p) => {
      const age = p.dob ? calculateAge(p.dob) : "";
      const folder = p.folderId || p._id || "";
      const status = p.status || "Active";
      return `
      <tr>
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td>${escapeHtml(folder)}</td>
        <td>${escapeHtml(p.clinic || p.department || "")}</td>
        <td>${escapeHtml(p.sex || "")} ${age ? "/ " + age : ""}</td>
        <td><span class="badge">${escapeHtml(status)}</span></td>
        <td class="result-actions">
          <button class="btn" data-id="${p._id}" onclick="openPatient('${p._id}')">Open File</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

function calculateAge(dob) {
  const b = new Date(dob);
  if (isNaN(b)) return "";
  const diff = Date.now() - b.getTime();
  const age = new Date(diff).getUTCFullYear() - 1970;
  return `${age} yrs`;
}

function escapeHtml(str = "") {
  return String(str).replace(
    /[&<>"']/g,
    (s) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        s
      ],
  );
}

async function loadResults() {
  const q = elements.searchInput.value.trim();
  const { items, totalPages } = await fetchPatients(currentPage, q);
  renderPatients(items);
  elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  elements.prevPage.disabled = currentPage <= 1;
  elements.nextPage.disabled = currentPage >= totalPages;
}

elements.prevPage.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    loadResults();
  }
});
elements.nextPage.addEventListener("click", () => {
  currentPage++;
  loadResults();
});
elements.searchBtn.addEventListener("click", () => {
  currentPage = 1;
  loadResults();
});

document
  .getElementById("registrationForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      name: form.name.value.trim(),
      dob: form.dob.value,
      sex: form.sex.value,
      phone: form.phone.value.trim(),
      address: form.address.value.trim(),
      occupation: form.occupation.value.trim(),
      tribe: form.tribe.value.trim(),
      informant: form.informant.value.trim(),
      clinic: form.clinic.value,
    };

    try {
      const res = await fetch(`${API_BASE}/patients`, {
        method: "POST",
        headers: setAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Patient registered");
        form.reset();
        loadResults();
        showSection("directory");
      } else {
        alert(data.message || data.error || "Registration failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  });

document
  .getElementById("clerkingForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const patientId = form.patientId.value.trim();
    if (!patientId) return alert("Provide patient folder id");

    const payload = {
      presentingComplaint: form.presentingComplaint.value,
      history: form.history.value,
      pastMedical: form.pastMedical.value,
      familyHistory: form.familyHistory.value,
      socialHistory: form.socialHistory.value,
      drugAllergy: form.drugAllergy.value,
    };

    try {
      const res = await fetch(`${API_BASE}/patients/${patientId}/clerking`, {
        method: "POST",
        headers: setAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Clerking saved");
        form.reset();
        showSection("directory");
      } else {
        alert(data.message || data.error || "Save failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  });

function openPatient(id) {
  // navigate to patient detail page handled by backend route or SPA route
  window.location.href = `patient.html?id=${id}`;
}

function showSection(sectionId) {
  document
    .querySelectorAll(".content-section")
    .forEach((s) => (s.style.display = "none"));
  document.getElementById(sectionId).style.display = "block";
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  const active = Array.from(document.querySelectorAll(".nav-item")).find(
    (n) => n.dataset.section === sectionId,
  );
  if (active) active.classList.add("active");
}

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => showSection(item.dataset.section));
});

window.openPatient = openPatient; // expose for inline onclick

// initial boot
(async function init() {
  await checkServer();
  await loadStaffProfile();
  await loadDepartments();
  await loadResults();
})();
