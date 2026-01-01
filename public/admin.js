document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const errorMsg = document.getElementById("errorMsg");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
      errorMsg.textContent = "Enter username and password";
      return;
    }

    try {
      const res = await fetch("/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include"
      });

      if (res.ok) {
        window.location.href = "/admin";  // <-- redirect to admin dashboard
      } else if (res.status === 401) {
        errorMsg.textContent = "Invalid credentials";
      } else {
        errorMsg.textContent = "Login failed. Try again.";
      }
    } catch (err) {
      console.error("Login error:", err);
      errorMsg.textContent = "Server error. Try again.";
    }
  });
});
