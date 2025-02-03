const mapped = galleries.store.toReversed().map(g => transformGallery(g));

function transformGallery(gallery) {
    gallery.images = optimizeImageUrlsString(gallery.images);
    return toString(gallery);
}

function optimizeImageUrlsString(urlString) {
    const prefixes = [];
    const urlPattern = /[^,|]+/g; // Tách URL khỏi dấu phân cách
    const optimizedParts = [];

    // Duyệt từng URL trong chuỗi
    urlString.replace(urlPattern, (url) => {
        const lastSlashIndex = url.lastIndexOf("/") + 1;
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

function restoreImageUrls(optimizedString) {
    const [prefixPart, urlsPart] = optimizedString.split("}");
    const prefixes = prefixPart.split(",");
    const urlPattern = /<(\d+)>([^,|]+)/g;

    // Thay thế `<index>` bằng `prefixes[index]`
    const restoredUrls = urlsPart.replace(urlPattern, (_, idx, fileName) => prefixes[idx] + fileName);

    return restoredUrls.split(',');
}

function toString(gallery) {
    const { code, category, artists, characters, names, parodies, tags, coverImage, images } = gallery;
return `g.s(${code},'${category}','${artists}','${characters}','${names.replaceAll('\'', "\\'").replaceAll(' [/] ', '[/]')}','${parodies.replaceAll('\'', "\\'")}',
    '${tags}',
    '${coverImage}','${images}'
)
`}