class Gallery {
    constructor(code, category, artists, characters, names, parodies, tags, coverImage, images) {
        this.code = code;
        this.category = category;
        this.artists = artists.split(',').filter(artist => !artist.includes('group-')).join(',');
        this.groups = artists.split(',').filter(artist => artist.includes('group-')).map(group => group.replace('group-', '')).join(',');
        this.characters = characters;
        this.names = names;
        this.parodies = parodies;
        this.tags = tags.split(',').sort().join(',');
        this.coverImage = coverImage;
        this.images = images;
        this.splitChap = true;
        this.keyWord = [code, category, artists, characters, names, parodies, tags].join(',').toLowerCase();
    }
}

const galleries = {
    store: [],
    sortedStore: [],

    getGalleryByCode(code) {
        return galleries.store.find(ele => ele.code === code);
    },

    s(code, category, artists, characters, names, parodies, tags, coverImage, images) {
        if (galleries.store.map(gallery => gallery.code).includes(code.toString())) {
            console.log('Duplicate code:', code);
            return;
        }

        const filter = (input) => {
            let array = input.split(",");
            let uniqueArray = array.filter(function (item, index) {
                return array.indexOf(item) === index;
            });
            return uniqueArray.join(",");
        }

        const gallery = new Gallery(code.toString(), category, artists, characters, names, parodies, filter(tags), coverImage, restoreImageUrls(images));

        galleries.store.unshift(gallery);

        function restoreImageUrls(optimizedString) {
            const [prefixPart, urlsPart] = optimizedString.split("}");
            const prefixes = prefixPart.split(",");
            const urlPattern = /<(\d+)>([^,|]+)/g;

            // Thay thế `<index>` bằng `prefixes[index]`
            const restoredUrls = urlsPart.replace(urlPattern, (_, idx, fileName) => prefixes[idx] + fileName);

            return restoredUrls;
        }
    },

    saveToGalleries(code, category, artists, characters, names, parodies, tags, coverImage, images) {
        if (galleries.store.map(gallery => gallery.code).includes(code.toString())) {
            console.log('Duplicate code:', code);
            return;
        }

        const filter = (input) => {
            let array = input.split(",");
            let uniqueArray = array.filter(function (item, index) {
                return array.indexOf(item) === index;
            });
            return uniqueArray.join(",");
        }

        const gallery = new Gallery(code.toString(), category, artists, characters, names, parodies, filter(tags), coverImage, images);

        galleries.store.unshift(gallery);
    },

    find(keyWord) {
        if (keyWord.includes(':') || keyWord.includes(',')) {
            if (keyWord.includes(':') && !keyWord.includes(',')) {
                const keyWords = keyWord.split(':');
                if (['artists', 'characters', 'names', 'parodies', 'tags', 'groups', 'category'].includes(keyWords[0].toLowerCase())) {
                    const keyToCompare = keyWords[1].trim().toLowerCase();
                    let rs = galleries.store.filter(gallery => gallery[keyWords[0]].toLowerCase().includes(keyToCompare));

                    rs = rs.length > 0 ? rs : galleries.store.filter(gallery => {
                        const keyWordSplitted = keyToCompare.split(' ');
                        let _rs = true;
                        keyWordSplitted.forEach(kw => {
                            if (!gallery[keyWords[0]].toLowerCase().includes(kw)) {
                                _rs = false;
                            }
                        });
                        return _rs;
                    });
                    return rs.map(gallery => gallery.code);
                }
                return [];
            } else if (keyWord.includes(',') && !keyWord.includes(':')) {
                const keyWords = keyWord.replace(/\s*,\s*/g, ',').split(',');
                return keyWords.reduce((rs, _keyWord) => {
                    if (_keyWord) {
                        return rs.filter(gallery => gallery.keyWord.includes(_keyWord.toLowerCase()));
                    }
                }, galleries.store).map(gallery => gallery.code);
            }
        } else {
            return galleries.store.filter(gallery => gallery.keyWord.includes(keyWord.toLowerCase())).map(gallery => gallery.code);
        }
    },

    getSorted(by) {
        if (by === 'NEWEST') return this.store.slice();

        if (this.sortedStore.length === 0) {
            this.sortedStore = this.store.toSorted((a, b) => Number(a.code) - Number(b.code));
        }

        // Trả về phiên bản "ngược" để append child lại các node
        return by === 'DESC' ? this.sortedStore : this.sortedStore.slice().reverse();
    }
};

export default galleries;