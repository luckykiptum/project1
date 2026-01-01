document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");

  // Prevent error on pages without the button
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/logout", { method: "POST" });
      window.location.href = "/admin-login";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  });
});
