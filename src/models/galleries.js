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

    getGalleryByCode(code) {
        return galleries.store.find(ele => ele.code === code);
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
  
    sort(by) {
        const o = by === 'ASC' ? 1 : -1;
        this.store.sort(({ code: a }, { code: b }) => Number(a) >= Number(b) ? 1 * o : -1 * o);
        return this;
    }
};

export default galleries;