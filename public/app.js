// Simple frontend wiring for your existing backend
// Place under public/js/app.js

const API_BASE = "http://127.0.0.1:4444/api"; // adjust if needed

async function apiFetch(path, opts = {}) {
  try {
    const token = localStorage.getItem("authToken"); // read token from localStorage
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}), // add token if present
      },
      ...opts,
    });
    return await res.json();
  } catch (err) {
    console.error("API fetch error:", err);
    return {};
  }
}


/* Register staff form */
const staffForm = document.getElementById("staffForm");
const staffTable = document.getElementById("staffTable");

staffForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("staffName").value.trim();
  const role = document.getElementById("staffRole").value;
  const dept = document.getElementById("staffDept").value.trim();
  const email = document.getElementById("staffEmail").value.trim();
  const phone = document.getElementById("staffphone").value.trim();
  const password = document.getElementById("staffPassword").value;

  const payload = { name, role, department: dept, email, password, phone };

  const result = await apiFetch("/accountStaff/register-staff", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (result && result.staff) {
    insertStaffRow(result.staff);
    staffForm.reset();
    alert("Staff added successfully");
  } else {
    alert(result.error || result.message || "Failed to add staff");
  }
});

/* Insert a staff row into the table */
function insertStaffRow(s) {
  const id = s._id || s.id || "";
  const roleClass = `badge-${(s.role || "").toLowerCase().replace(/\s+/g, "")}`;
  const dept = s.department || "";
  const isActive = s.isActive !== false;
  const row = document.createElement("tr");
  row.innerHTML = `
    <td><strong>${escapeHtml(s.name)}</strong><br><small>${escapeHtml(s.email)}</small></td>
    <td><span class="badge ${roleClass}">${escapeHtml(s.role)}</span></td>
    <td>${escapeHtml(dept)}</td>
    <td>${isActive ? '<span class="status-dot online"></span> Active' : "Inactive"}</td>
    <td class="action-icons">
      <i class="fas fa-edit" data-id="${id}" title="Edit"></i>
      <i class="fas fa-user-slash" data-id="${id}" title="Disable" style="color:var(--danger)"></i>
      <i class="fas fa-trash" data-id="${id}" title="Delete"></i>
    </td>
  `;
  row.querySelectorAll(".action-icons i").forEach((icon) => {
    icon.addEventListener("click", handleActionClick);
  });
  staffTable.insertAdjacentElement("afterbegin", row);
}

/* Load all staff on page load */
async function loadStaff() {
  const res = await apiFetch("/accountStaff/get-staffs/");
  if (res && res.staff && Array.isArray(res.staff)) {
    staffTable.innerHTML = "";
    res.staff.forEach((s) => {
        console.log(s)
      const staffObj = {
        id: s._id || s.id,
        name: s.name || s.fullName || "",
        email: s.email || "",
        role: s.role || "",
        department: s.department || s.dept || "",
        isActive: typeof s.isActive === "boolean" ? s.isActive : true,
      };
      insertStaffRow(staffObj);
    });
  } else {
    console.warn("No staff found or error fetching staff", res);
  }
}

/* Handle row action clicks */
async function handleActionClick(e) {
  const id = this.dataset.id;
  if (!id) return;
  const cls = this.className;
  if (cls.includes("fa-user-slash")) {
    if (!confirm("Toggle staff active state?")) return;
    const res = await apiFetch(`/disable-staff/${id}`, { method: "PATCH" });
    alert(res.message || res.error || "Update failed");
    loadStaff();
  } else if (cls.includes("fa-trash")) {
    if (!confirm("Delete this staff? This cannot be undone.")) return;
    const res = await apiFetch(`/accountStaff/delete-staff/${id}`, { method: "DELETE" });
    alert(res.message || res.error || "Delete failed");
    loadStaff();
  } else if (cls.includes("fa-edit")) {
    alert("Edit flow not implemented in this simple frontend.");
  }
}

/* Quick account-control buttons */
document.getElementById("btnBlock").addEventListener("click", async () => {
  const email = document.getElementById("targetEmail").value.trim();
  if (!email) return alert("Enter target email");
  const all = await apiFetch("/get-staffs");
  const staff = (all.staff || []).find((s) => s.email === email);
  if (!staff) return alert("Staff not found");
  const res = await apiFetch(
    `/accountControl/staff/${staff._id || staff.id}/block`,
    { method: "PATCH" },
  );
  alert(res.message || res.error || "Block request sent");
  loadStaff();
});

document.getElementById("btnUnlock").addEventListener("click", async () => {
  const email = document.getElementById("targetEmail").value.trim();
  if (!email) return alert("Enter target email");
  const all = await apiFetch("/get-staffs");
  const staff = (all.staff || []).find((s) => s.email === email);
  if (!staff) return alert("Staff not found");
  const res = await apiFetch(
    `/accountControl/staff/${staff._id || staff.id}/unblock`,
    { method: "PATCH" },
  );
  alert(res.message || res.error || "Unlock request sent");
  loadStaff();
});

document.getElementById("btnForceReset").addEventListener("click", async () => {
  const email = document.getElementById("targetEmail").value.trim();
  if (!email) return alert("Enter target email");
  const all = await apiFetch("/get-staffs");
  const staff = (all.staff || []).find((s) => s.email === email);
  if (!staff) return alert("Staff not found");
  const temp = prompt(
    "Enter temporary password to set for this account:",
    "TempPass123!",
  );
  if (!temp) return;
  const res = await apiFetch(
    `/accountControl/staff/${staff._id || staff.id}/reset-password`,
    {
      method: "PATCH",
      body: JSON.stringify({ temppasswordfromadmin: temp }),
    },
  );
  alert(res.message || res.error || "Reset request sent");
});

/* Utility: escape HTML */
function escapeHtml(str = "") {
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        m
      ],
  );
}

/* Initialize */
window.addEventListener("DOMContentLoaded", loadStaff);
