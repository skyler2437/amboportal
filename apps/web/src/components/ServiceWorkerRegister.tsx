"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
    useEffect(() => {
        if ("serviceWorker" in navigator && typeof window !== "undefined") {
            navigator.serviceWorker
                .register("/sw.js")
                .then(async (registration) => {
                    console.log("SW registered scope: ", registration.scope);

                    // Check if subscription exists and sync with server
                    try {
                        const sub = await registration.pushManager.getSubscription();

                        // Log status to server
                        await fetch("/api/debug/log", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                level: "info",
                                message: sub ? "Client: Found subscription, syncing..." : "Client: No subscription found"
                            }),
                        });

                        if (sub) {
                            const res = await fetch("/api/web-push/subscription", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ subscription: sub }),
                            });

                            if (!res.ok) {
                                const errText = await res.text();
                                throw new Error(`API error: ${res.status} ${errText}`);
                            }
                        }
                    } catch (err: unknown) {
                        // Ignore 401s (not logged in)
                        const errMessage = err instanceof Error ? err.message : String(err);
                        if (errMessage.includes("401")) {
                            return;
                        }
                        console.error("Failed to sync sub:", err);
                        await fetch("/api/debug/log", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ level: "error", message: "Client: Sync failed", data: { error: String(err) } }),
                        });
                    }
                })
                .catch((error) => console.log("SW registration failed: ", error));
        }
    }, []);

    return null;
}
