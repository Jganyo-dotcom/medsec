const API_BASE = "http://127.0.0.1:4444/api"; // since frontend and backend are served together

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${API_BASE}/accountStaff/login-staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    console.log(data);

    if (res.ok) {
      alert(data.message);

      // If the backend did not return a token, it means setup mode
      if (!data.token || !data.staff) {
        return;
      }

      // Normal login case: store auth info
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("staffName", data.staff.name);
      localStorage.setItem("staffRole", data.staff.role);
      localStorage.setItem("staffEmail", data.staff.email);

      // Redirect based on role
      if (data.staff.role === "Admin") {
        window.location.href = "IT.html";
      } else if (data.staff.role === "Doctor") {
        window.location.href = "doc.html";
      } else {
        // fallback for other roles
        window.location.href = "ITG.html";
      }
    } else {
      alert(data.message || "Login failed");
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("Server error during login");
  }
});
