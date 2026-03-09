export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        await navigator.serviceWorker.register("/sw.js");
      } catch (err) {
        console.log("SW registration failed: ", err);
      }
    });
  }
}
