const mainName = document.querySelector('.post-title')?.textContent?.trim() ?? '';
const contents = document.querySelectorAll('.post-content_item');
const thumbnail = document.querySelector('.summary_image img')?.src ?? '';

let anotherName = '';
let tags = '';
let authors = [];
contents.forEach((node) => {
	const content = node.textContent.trim();
	if (content.startsWith('Alternative')) anotherName = content.replaceAll('Alternative', '').trim();
	else if (content.startsWith('Author(s)')) authors.push(format(content, 'Author(s)'));
	else if (content.startsWith('Artist(s)')) authors.push(format(content, 'Artist(s)'));
	else if (content.startsWith('Thể loại')) tags = format(content, 'Thể loại');
});
authors = authors.join(',');

const chapURLs = [...document.querySelectorAll('.wp-manga-chapter a')]
	.reverse()
	.map((/**@type {HTMLAnchorElement}*/ a) => a.href);

let [i1 = 1, i2 = chapURLs.length] =
	prompt('Cắt chap (đánh như ý muốn, không phải index)')
		?.split(',')
		.map((s) => {
			const n = parseInt(s.trim(), 10);
			return Number.isFinite(n) ? n : undefined;
		}) ?? [];
i1 -= 1;

let fullImageURLs = [];
const targets = chapURLs.slice(i1, i2);
fullImageURLs.length = targets.length;

let cursor = 0;
const CONCURRENCY = 2;

async function worker() {
	while (cursor < targets.length) {
		const i = cursor++;
		fullImageURLs[i] = (await getImageURLs(targets[i])).join(',');
	}
}

Promise.all([worker(), worker()])
	.then(() => {
		fullImageURLs = optimizeImageUrlsString(fullImageURLs.join('|'));
		console.group('Debug:');
		console.log('mainName:', mainName);
		console.log('anotherName:', anotherName);
		console.log('tags:', tags);
		console.log('authors:', authors);
		console.log('chapURLs:', chapURLs);
		console.log('fullImageURLs:', fullImageURLs);
		console.groupEnd();

		navigator.clipboard
			?.writeText(
				`g.s(${Math.floor(Date.now() / 10)},'manga',\`${authors}\`,'',\`${mainName}${
					anotherName ? '[/]' + anotherName : ''
				}\`,'',\n\t'${tags}',\n\t'${thumbnail.replace('https://', '')}','${fullImageURLs.replaceAll(
					'https://',
					''
				)}')\n`
			)
			.then(
				() => console.log('Copied'),
				(err) => console.error('Copy failed', err)
			);
	})
	.catch(console.error);

/**
 * Lấy danh sách URL ảnh từ trang (không load ảnh)
 * @param {string} url
 * @returns {Promise<string[]>}
 */
async function getImageURLs(url) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 20000);

	try {
		console.log('Fetching:', url);
		const res = await fetch(url, { signal: controller.signal });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);

		const html = await res.text();
		const doc = new DOMParser().parseFromString(html, 'text/html');

		return [...doc.querySelectorAll('.reading-content img')]
			.map((img) => img.getAttribute('src'))
			.filter(Boolean)
			.map((src) => new URL(src, url).href);
	} catch (err) {
		if (err.name === 'AbortError') throw new Error('Timeout');
		throw err;
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * @param {string} line
 * @param {string} removePart
 */
function format(line, removePart, splitBy = ',') {
	return line
		.replace(removePart, '')
		.split(splitBy)
		.map((w) => w.trim())
		.filter(Boolean)
		.join(splitBy);
}

/**
 * @param {string} urlString
 */
function optimizeImageUrlsString(urlString) {
	const prefixes = [];
	const urlPattern = /[^,|]+/g; // Tách URL khỏi dấu phân cách
	const optimizedParts = [];

	// Duyệt từng URL trong chuỗi
	urlString.replace(urlPattern, (url) => {
		const lastSlashIndex = url.lastIndexOf('/') + 1;
		const prefix = url.substring(0, lastSlashIndex);
		const fileName = url.substring(lastSlashIndex);

		// Tìm hoặc thêm prefix
		let prefixIndex = prefixes.indexOf(prefix);
		if (prefixIndex === -1) {
			prefixIndex = prefixes.length;
			prefixes.push(prefix);
		}

		optimizedParts.push(`<${prefixIndex}>${fileName}`);
		return url; // Chỉ để giữ nguyên dấu phân cách
	});

	// Khôi phục chuỗi ban đầu với URL đã rút gọn
	let optimizedURLs = urlString.replace(urlPattern, () => optimizedParts.shift());

	return `${prefixes.join(',')}}${optimizedURLs}`;
}
