/**
 * Service Worker for Push Notifications & Offline Support
 */

const CACHE_NAME = "ambo-v1";
const OFFLINE_URL = "/offline.html";
const STATIC_ASSETS = ["/logo.png", "/manifest.json"];

// Helper to send logs to server
async function logToServer(level, message, data = {}) {
    try {
        await fetch("/api/debug/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ level, message, data }),
        });
    } catch (err) {
        console.error("Failed to send log to server:", err);
    }
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll([OFFLINE_URL, ...STATIC_ASSETS]))
            .then(() => logToServer("info", "Service Worker Installed"))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => logToServer("info", "Service Worker Activated"))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    // Only handle navigation requests for offline fallback
    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(OFFLINE_URL))
        );
        return;
    }

    // Cache-first for static assets
    if (
        event.request.destination === "image" ||
        STATIC_ASSETS.some((asset) => event.request.url.endsWith(asset))
    ) {
        event.respondWith(
            caches.match(event.request).then(
                (cached) => cached || fetch(event.request)
            )
        );
    }
});

self.addEventListener("push", function (event) {
    const data = event.data ? event.data.json() : null;

    event.waitUntil(
        (async () => {
            await logToServer("info", "Push Event Received", {
                hasData: !!event.data,
                dataPayload: data
            });

            if (data) {
                const options = {
                    body: data.body,
                    icon: "/logo.png",
                    badge: "/logo.png",
                    vibrate: [100, 50, 100],
                    data: {
                        dateOfArrival: Date.now(),
                        primaryKey: "2",
                        url: data.url,
                    },
                };

                try {
                    await self.registration.showNotification(data.title, options);
                    await logToServer("info", "Notification Shown Successfully", { title: data.title, options });
                } catch (err) {
                    await logToServer("error", "showNotification Failed", { error: err.toString() });
                    throw err;
                }
            } else {
                await logToServer("warn", "Push received but no data");
            }
        })()
    );
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    const targetUrl = (event.notification.data && event.notification.data.url) || "/";

    event.waitUntil(
        (async () => {
            await logToServer("info", "Notification Clicked", { url: targetUrl });

            const absoluteUrl = new URL(targetUrl, self.location.origin).href;

            // Prefer reusing an already-open app window. This also covers the iOS
            // cold-launch case: tapping the notification opens the PWA at its
            // start_url (/login → dashboard) first, so by the time this handler
            // runs there is usually a window we can refocus and redirect to the
            // deep link. Plain openWindow() doesn't reliably override that
            // launch navigation on iOS, which is why taps stranded the user on
            // the dashboard instead of the chat thread.
            const allClients = await self.clients.matchAll({
                type: "window",
                includeUncontrolled: true,
            });

            for (const client of allClients) {
                if ("focus" in client) {
                    await client.focus();
                    if ("navigate" in client && client.url !== absoluteUrl) {
                        try {
                            await client.navigate(absoluteUrl);
                        } catch (err) {
                            await logToServer("error", "client.navigate failed", {
                                error: err.toString(),
                                url: absoluteUrl,
                            });
                        }
                    }
                    return;
                }
            }

            // No open window — open a fresh one at the deep link.
            if (self.clients.openWindow) {
                await self.clients.openWindow(absoluteUrl);
            }
        })()
    );
});
