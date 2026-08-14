export function registerPwaShell() {
  document.documentElement.dataset.network = navigator.onLine ? "online" : "offline";
  window.addEventListener("online", () => { document.documentElement.dataset.network = "online"; });
  window.addEventListener("offline", () => { document.documentElement.dataset.network = "offline"; });
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}
