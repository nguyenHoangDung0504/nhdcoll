const CACHE_NAME = "nhdcoll-cache-v1";
const CACHE_EXPIRATION = 10 * 60 * 1000;

const urlsToCache = [
    "/index.html",
    "/hf/",
    "/imh/",
    "/src/",
    "/assets/",
    "/ajax/libs/font-awesome/6.0.0-beta2/css/all.min.css"
];

function shouldCache(url) {
    return urlsToCache.some((prefix) => url.startsWith(prefix));
}

async function saveCacheMetadata(cache, request) {
    const metadata = { timestamp: Date.now() };
    const metadataRequest = `${request.url}-metadata`;
    const metadataResponse = new Response(JSON.stringify(metadata));
    await cache.put(metadataRequest, metadataResponse);
}

async function getCacheMetadata(cache, request) {
    const metadataRequest = `${request.url}-metadata`;
    const metadataResponse = await cache.match(metadataRequest);
    if (!metadataResponse) return null;

    const metadataText = await metadataResponse.text();
    return JSON.parse(metadataText);
}

async function removeIfExpired(cache, request) {
    const metadata = await getCacheMetadata(cache, request);
    if (!metadata) return false;

    const isExpired = Date.now() - metadata.timestamp > CACHE_EXPIRATION;
    if (isExpired) {
        await cache.delete(request);
        await cache.delete(`${request.url}-metadata`);
        return true;
    }
    return false;
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("Opened cache");
            return Promise.all(
                urlsToCache.map((prefix) =>
                    fetch(prefix)
                        .then(async (response) => {
                            if (response.ok) {
                                await cache.put(new Request(prefix), response.clone());
                                await saveCacheMetadata(cache, new Request(prefix));
                                console.log('> [Worker] Cached:', response.url);
                            }
                        })
                        .catch((err) => console.error(`Failed to cache ${prefix}:`, err))
                )
            );
        })
    );
});

self.addEventListener("fetch", (event) => {
    const requestUrl = new URL(event.request.url);

    if (!shouldCache(requestUrl.pathname)) {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cachedResponse = await cache.match(event.request);

            if (cachedResponse) {
                const isExpired = await removeIfExpired(cache, event.request);
                if (!isExpired) {
                    console.log(`> [Worker] Cache hit: ${event.request.url}`);
                    return cachedResponse;
                }
            }

            const networkResponse = await fetch(event.request);
            if (!networkResponse.ok) return networkResponse;

            await cache.put(event.request, networkResponse.clone());
            await saveCacheMetadata(cache, event.request);
            return networkResponse;
        })
    );
});
