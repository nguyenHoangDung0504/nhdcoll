const CACHE_NAME = 'nhdcoll-cache-v1';
const CACHE_VERSION = 5;
const CACHE_EXPIRATION = time({ minutes: 10 });
const LOG = true;

const cacheTargets = buildCacheTargets`
	-- External CSS
	https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta2/css/all.min.css
	-- https://img.henzz.xyz/*

	-- Path
	/assets/*
	/src/*
	/hf/*
	/imh/*
    /index.html
	/
`;

/**
 * Build danh sách cache target từ một chuỗi ngăn cách bởi `\n`
 * @param {string} targets
 * @returns {string[]}
 */
function buildCacheTargets(targets, ..._) {
	return targets[0]
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.filter((line) => line && !line.startsWith('--'));
}

function getFullCacheName() {
	return `${CACHE_NAME}/v=${CACHE_VERSION}`;
}

/**
 * Helper giúp chuyển thời gian thành milisecond
 * @param {Object} [param0={}]
 * @param {number} [param0.hours=0]
 * @param {number} [param0.minutes=0]
 * @param {number} [param0.seconds=0]
 */
function time({ hours = 0, minutes = 0, seconds = 0 } = {}) {
	hours ??= 0;
	minutes ??= 0;
	seconds ??= 0;
	return 1000 * (hours * 60 ** 2 + minutes * 60 + seconds);
}

/**
 * @param {string} url
 * @returns {boolean}
 */
/**
 * @param {string} url
 * @returns {boolean}
 */
function shouldCache(url) {
	const { origin, pathname } = new URL(url);

	if (origin.startsWith('chrome-extension:')) return false;

	return cacheTargets.some((target) => {
		// Nếu target là một URL external cụ thể (có http/https)
		if (target.startsWith('http')) {
			// Xử lý pattern với /*
			if (target.endsWith('/*')) {
				const baseUrl = target.slice(0, -2); // Bỏ /* đi
				return url.startsWith(baseUrl);
			}

			// Khớp tuyệt đối
			return url === target;
		}

		// Nếu target là đường dẫn internal kết thúc bằng /*
		if (target.endsWith('/*')) {
			const basePath = target.slice(0, -2);
			return pathname.startsWith(basePath);
		}

		// Nếu target là đường dẫn internal, cache file con trực tiếp
		if (pathname.startsWith(target)) {
			const relativePath = pathname.slice(target.length);
			return !relativePath.includes('/') || relativePath === '/';
		}

		return false;
	});
}

/**
 * @param {Cache} cache
 * @param {Request} request
 */
async function saveCacheMetadata(cache, request) {
	const metadata = { timestamp: Date.now() };
	const metadataRequest = new Request(`${request.url}-metadata`);
	await cache.put(metadataRequest, new Response(JSON.stringify(metadata)));
}

/**
 * @param {Cache} cache
 * @param {Request} request
 */
async function getCacheMetadata(cache, request) {
	const metadataRequest = new Request(`${request.url}-metadata`);
	const metadataResponse = await cache.match(metadataRequest);
	if (!metadataResponse) return null;

	return JSON.parse(await metadataResponse.text());
}

/**
 * @param {Cache} cache
 * @param {Request} request
 */
async function removeIfExpired(cache, request) {
	const metadata = await getCacheMetadata(cache, request);
	if (!metadata) return false;

	const isExpired = Date.now() - metadata.timestamp > CACHE_EXPIRATION;
	if (isExpired) {
		await Promise.all([cache.delete(request), cache.delete(new Request(`${request.url}-metadata`))]);
		return true;
	}
	return false;
}

// Khi worker được install, xóa cache có tên hoặc version cũ
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.map((key) => {
						if (key !== getFullCacheName()) {
							LOG && console.log(`--> [CacheManager.worker]: Deleting old cache ${key}`);
							return caches.delete(key);
						}
					}),
				),
			)
			.then(() => self.skipWaiting()),
	);
});

// Lắng nghe event xóa cache từ manager
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'CLEAR_CACHE') {
		caches
			.keys()
			.then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
			.then(() => {
				LOG && console.log('--> [CacheManager.worker]: Cache cleared on request');
				event.source.postMessage({ status: 'CACHE_CLEARED' });
			});
	}
});

// Khi fetch, kiểm tra và lấy từ cache, nếu cache hết hạn, cập nhật dưới nền
self.addEventListener('fetch', (event) => {
	const requestUrl = new URL(event.request.url).toString();

	if (CACHE_EXPIRATION < 1) return;
	if (!shouldCache(requestUrl)) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(getFullCacheName());
			const cachedResponse = await cache.match(event.request);
			const isExpired = cachedResponse ? await removeIfExpired(cache, event.request) : false;

			// Luôn ưu tiên trả về cache ngay lập tức để tăng tốc độ phản hồi
			if (cachedResponse) {
				console.log(`--> [CacheManager.worker]: Using cache for ${event.request.url}`);
				// Nếu cache đã hết hạn, cập nhật dữ liệu dưới nền
				if (isExpired) updateCacheInBackground(event.request, cache);
				return cachedResponse;
			}

			// Nếu không có cache, fetch bình thường
			try {
				LOG && console.log(`--> [CacheManager.worker]: Fetching ${event.request.url} and caching`);
				const networkResponse = await fetch(event.request);
				if (!networkResponse.ok) throw new Error('--> [CacheManager.worker]: Network response not ok');

				// Cập nhật cache sau khi tải thành công
				await cache.put(event.request, networkResponse.clone());
				await saveCacheMetadata(cache, event.request);
				return networkResponse;
			} catch (error) {
				LOG &&
					console.error(`--> [CacheManager.worker]: Fetch failed and no cache available: ${event.request.url}`, error);
				return new Response('--> [CacheManager.worker]: Network error and no cache available', {
					status: 503,
					statusText: 'Service Unavailable',
				});
			}
		})(),
	);
});

/**
 * Cập nhật cache trong nền khi cache đã cũ
 * @param {Request} request
 * @param {Cache} cache
 */
async function updateCacheInBackground(request, cache) {
	try {
		const networkResponse = await fetch(request);
		if (!networkResponse.ok) throw new Error('--> [CacheManager.worker]: Network response not ok');

		await cache.put(request, networkResponse.clone());
		await saveCacheMetadata(cache, request);
		LOG && console.log(`--> [CacheManager.worker]: Cache updated for ${request.url}`);
	} catch (error) {
		LOG && console.warn(`--> [CacheManager.worker]: Background update failed for ${request.url}`);
	}
}
