import SwipeHandler from './libs/swipe_handler/index.js';

const storageName = window.location.href.split('/').filter(Boolean).pop();
console.log(storageName);

const galleries = (await import(`../${storageName}/data.js`)).default;
console.log(galleries);

const grid = document.querySelector('.gallery-grid');
const galleryEle = {};
const models = {};
const params = new URLSearchParams(location.search);
const code = params.get('code');
const chapter = params.get('chapter');
const elem = document.documentElement;

//Log data
console.log('Added:', galleries.store.length, 'gallery');
//Build Galleries
galleries.store.forEach(gallery => {
    const container = document.createElement('div');
    container.classList.add('gallery');
    container.innerHTML = `<div class="gallery-image">
            <img loading="lazy" title="${gallery.code}" src="https://${gallery.coverImage}" alt="${gallery.code} - Cover Image">
            <span class="category">${toTitleCase(gallery.category)}</span>
          </div>
          <div title="${toTitleCase(gallery.names.split(' [/] ')[0])}" class="gallery-name">${toTitleCase(gallery.names.split(' [/] ')[0])}</div>
        </div>`.trim();

    container.addEventListener('click', () => {
        const model = models[gallery.code];
        if (model) {
            openModel(model, gallery.code);
        } else {
            const newModel = buildModel(gallery);
            document.body.appendChild(newModel);
            models[gallery.code] = newModel;
            openModel(newModel, gallery.code);
            newModel.querySelectorAll('.sub-label').forEach(label => {
                label.addEventListener('click', () => {
                    closeModel(model);
                    const sbox = document.querySelector('#sbox');
                    sbox.value = label.dataset.value;
                    sbox.dispatchEvent(new Event('input'));
                    scrollToTop();
                })
            });
            newModel.querySelector('.read-btn').addEventListener('click', () => {
                smoothScrollTo(newModel, newModel.querySelector('.info').offsetHeight);
            });
            newModel.querySelector('.help-btn').addEventListener('click', () => {
                alert(`You can swipe or drag to change chapter:\n  - from right to left to open next chapter.\n  - from left to right to open previous chapter.\n\nTap blank, press esc key, or double click image to close this.`)
            });
        }
    });

    galleryEle[gallery.code] = container;
    grid.appendChild(container);
});
//Open Model if code exist
if (code && chapter) {
    galleryEle[code].click();
    let value = null;
    if (chapter == 'last') {
        value = galleries.getGalleryByCode(code).images.split('|').length;
    } else if (chapter == 'frist') {
        value = 1
    } else {
        value = parseInt(chapter);
    }
    const input = models[code].querySelector('input');
    input.value = value;
    input.dispatchEvent(new Event('change'));

    params.delete('chapter');
    window.history.replaceState(null, null, window.location.pathname + '?' + params.toString());
} else if (code) {
    galleryEle[code].click();
}

//Close Model key
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closeModel();
    }
});
//Add Search function
const sBox = document.querySelector('#sbox');
const clearBtn = document.querySelector('.clear');
sBox.addEventListener('input', () => {
    find(sBox.value);
    if (!sBox.value)
        document.querySelector('h3.rs-content').textContent = ``;
});
clearBtn.addEventListener('click', () => {
    sBox.value = '';
    sBox.dispatchEvent(new Event('input'));
});
//Handling pop state
window.addEventListener('popstate', (event) => {
    if (params.get('code')) {
        closeModel();
        window.history.pushState(null, null, window.location.pathname);
    }
});
//Fullscreen
document.querySelector('.title').addEventListener('click', () => {
    callFullscreen();
});

//Functions
function find(keyWord) {
    const rs = galleries.find(keyWord);
    for (let id in galleryEle) {
        galleryEle[id].style.display = rs.includes(id) ? 'flex' : 'none';
    }
    document.querySelector('h3.rs-content').textContent = `${rs.length} Result for keyword "${keyWord}"`;
}
function toTitleCase(str) {
    return str.replace(/\b\w+\b/g, (word) => {
        if (word.startsWith('[') && word.endsWith(']')) {
            return '[' + word.charAt(1).toUpperCase() + word.slice(2, -1) + ']';
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
};
function buildModel(gallery) {
    const model = document.createElement('div');
    model.classList.add('modal-overlay');
    model.appendChild(buildGalleryInfo(gallery));
    model.addEventListener('click', (event) => {
        if (Array.from(event.target.classList).includes('modal-overlay')) {
            closeModel(model);
        }
    });
    model.addEventListener('dblclick', (event) => {
        if (Array.from(event.target.classList).includes('img')) {
            closeModel(model);
        }
    });

    if (gallery.splitChap == false) {
        const imgs = gallery.images.split(',').reduce((html, src, index) => {
            return html.concat(`<img class="img" ${index < 2 ? '' : 'loading="lazy"'} src="https://${src}" alt="${gallery.code}-${parseInt(index) + 1}">`);
        }, ``);
        model.innerHTML = `<div class="comic-container">${imgs}</div>`;
    } else {
        const chapters = gallery.images.split('|');
        let imgCount = 0;
        chapters.forEach((chapter, index) => {
            const imgs = chapter.split(',').reduce((html, src, index) => {
                imgCount++;
                return html.concat(`<img class="img" ${index < 2 ? '' : 'loading="lazy"'} src="https://${src}" alt="${gallery.code}-${imgCount}">`);
            }, ``);
            model.innerHTML += `<div data-chap="${parseInt(index) + 1}" ${index ? 'style="display: none"' : ''} class="comic-container g${gallery.code}">${imgs}</div>`;
        })

        const chapterBox = document.createElement('div');
        const nextBtn = document.createElement('div');
        const chapter = document.createElement('div');
        let input = document.createElement('input');
        const prevBtn = document.createElement('div');

        input.type = 'number';
        input.min = 1;
        input.max = chapters.length;

        chapterBox.classList.add('chapter-box');

        nextBtn.classList.add('btn');
        nextBtn.innerHTML = '<i class="fa-solid fa-caret-right"></i>';
        nextBtn.addEventListener('click', () => {
            let input = chapterBox.querySelector('input');
            const value = Number(input.value);
            if (value < Number(input.max)) {
                input.value = value + 1;
                input.dispatchEvent(new Event('change'));
            }
        })

        chapter.classList.add('btn');
        chapter.appendChild(input);
        chapter.innerHTML += ` / ${chapters.length}`;

        prevBtn.classList.add('btn');
        prevBtn.innerHTML = '<i class="fa-solid fa-caret-left"></i>';
        prevBtn.addEventListener('click', () => {
            let input = chapterBox.querySelector('input');
            const value = Number(input.value);
            if (value > Number(input.min)) {
                input.value = value - 1;
                input.dispatchEvent(new Event('change'));
            }
        })

        chapterBox.appendChild(prevBtn);
        chapterBox.appendChild(chapter);
        chapterBox.appendChild(nextBtn);
        chapterBox.querySelector('input').addEventListener('change', (event) => {
            const input = event.currentTarget;
            const value = Number(input.value);
            if (value > input.max) {
                input.value = input.max;
            } else if (value < input.min) {
                input.value = input.min;
            }
            openChapter(gallery.code, input.value, model);
        });
        chapterBox.querySelector('input').value = 1;
        model.appendChild(chapterBox);
        model.addEventListener('scroll', (event) => {
            const element = event.currentTarget;
            const prevScroll = +element.dataset.prevScroll || 0;
            const scrollTop = element.scrollTop;
            const contentHeight = Array.from(element.querySelectorAll('.comic-container')).reduce((height, ele) => {
                return height + ele.getBoundingClientRect().height;
            }, 0);

            if (scrollTop > prevScroll) {
                chapterBox.style.transform = "translateX(-50%) translateY(200%)";
            } else {
                chapterBox.style.transform = "translateX(-50%) translateY(0%)";
            }

            const condition = scrollTop + element.clientHeight - contentHeight;
            if (condition < 20 && condition > -20) {
                chapterBox.style.transform = "translateX(-50%) translateY(0%)";
            }

            // Lưu lại vị trí trước
            element.dataset.prevScroll = scrollTop;
        });
        new SwipeHandler(model, 2.5, () => prevBtn.click(), () => nextBtn.click());
    }

    const errorHandling = (event) => {
        console.log("Error", gallery.code, event.target.src);
        event.target.removeEventListener('error', errorHandling);
    }
    model.querySelectorAll('img').forEach(img => {
        img.addEventListener('error', errorHandling);
    });

    return model;
}
function buildGalleryInfo(gallery) {
    const infoDiv = document.createElement('div');
    const leftDiv = document.createElement('div');
    const rightDiv = document.createElement('div');
    const btnCtn = document.createElement('div');
    const helpBtn = document.createElement('div');
    const readBtn = document.createElement('div');

    let name = '';
    let splittedName = gallery.names.split(' [/] ');
    name = (gallery.names.includes(' [/] ') && splittedName[1].length > 0) ? splittedName[0] + "<br><br><span style=\"color: deeppink\">Other name:</span> " + splittedName[1] : splittedName[0];

    infoDiv.classList.add('info');
    leftDiv.classList.add('left');
    rightDiv.classList.add('right');
    btnCtn.classList.add('btn-ctn');
    helpBtn.classList.add('help-btn');
    readBtn.classList.add('read-btn');

    btnCtn.appendChild(helpBtn);
    btnCtn.appendChild(readBtn);

    leftDiv.innerHTML = `<img class="cover-img" src="${"https://" + gallery.coverImage}" alt="${gallery.code} - Cover image"><h3>${name}</h3>`
    for (let key in gallery) {
        if (gallery[key] && !['code', 'splitChap', 'keyWord', 'coverImage', 'images', 'names'].includes(key)) {
            rightDiv.appendChild(getInfo(gallery, key));
        }
    }
    rightDiv.innerHTML += `<br><div><h3>Total chapter: ${gallery.images.split('|').length}</h3></div>`;
    rightDiv.innerHTML += `<div><h3>Total image: ${gallery.images.replaceAll('|', ',').split(',').length}</h3></div>`;
    rightDiv.appendChild(btnCtn);
    infoDiv.appendChild(leftDiv);
    infoDiv.appendChild(rightDiv);

    return infoDiv;
}
function getInfo(gallery, key) {
    const ctn = document.createElement('div');
    const label = document.createElement('div');
    const subCtn = document.createElement('div');
    const dataSplited = gallery[key].split(',');

    label.innerHTML = `<h3>${toTitleCase(key)}</h3>`;
    subCtn.classList.add('label-ctn');

    dataSplited.forEach(subData => {
        const subLabel = document.createElement('div');
        subLabel.classList.add('sub-label');
        subLabel.textContent = toTitleCase(subData);
        subLabel.dataset.value = `${key}:${subData}`;
        subCtn.appendChild(subLabel);
    });

    ctn.appendChild(label);
    ctn.appendChild(subCtn);

    return ctn;
}
function openChapter(code, chap, model) {
    document.querySelectorAll(`.g${code}`).forEach(cmctn => {
        if (cmctn.style.display != "none") {
            cmctn.dataset.scroll = model.scrollTop;
        }
        cmctn.style.display = 'none';
    });
    let cmctn = document.querySelector(`.comic-container.g${code}[data-chap="${chap}"]`);
    cmctn.style.display = 'block';
    model.scrollTop = cmctn.dataset.scroll || model.querySelector('.info').offsetHeight;
}
function openModel(model, modelId) {
    for (let id in models) {
        models[id].classList.remove('display');
    }
    model.classList.add('display');
    model.scrollTop = 0;
    document.body.classList.add('openModel');
    params.set('code', modelId);
    window.history.pushState(null, null, window.location.pathname + '?' + params.toString());
}
function closeModel(model) {
    const modelToClose = model ?? models[params.get('code')];

    modelToClose.classList.remove('display');
    document.body.classList.remove('openModel');
    window.history.pushState(null, null, window.location.pathname);
}
function openFullscreen() {
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
    }
}
function closeFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
    }
}
function callFullscreen() {
    if (document.fullscreen) {
        closeFullscreen();
    } else {
        openFullscreen();
    }
}
function smoothScrollTo(element, targetPosition, duration = 300) {
    const startPosition = element.scrollTop;
    const distance = targetPosition - startPosition;
    const startTime = performance.now();

    function scrollStep(timestamp) {
        const currentTime = timestamp - startTime;
        const easing = easeInOutQuad(currentTime, startPosition, distance, duration);
        element.scrollTop = easing;

        if (currentTime < duration) {
            requestAnimationFrame(scrollStep);
        }
    }

    function easeInOutQuad(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    requestAnimationFrame(scrollStep);
}
function scrollToTop(scrollDuration = 300) {
    const scrollStep = Math.PI / (scrollDuration / 15);
    let count = 0;
    let scrollPosition = 0;

    function step(timestamp) {
        if (window.scrollY !== 0) {
            const easing = easeInOutQuad(count, 0, 1, 60);
            window.scrollTo(0, document.documentElement.scrollHeight * easing);
            scrollPosition += scrollStep;
            count++;
            if (count < 60) {
                requestAnimationFrame(step);
            }
        }
    }

    function easeInOutQuad(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    requestAnimationFrame(step);
}