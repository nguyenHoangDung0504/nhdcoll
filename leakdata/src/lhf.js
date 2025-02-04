const getTemplate = (url) => {
  let linkSplit = url.split('/');
  let dataSplit = linkSplit[linkSplit.length - 1].split('.');
  dataSplit[0] = '[rpl]';
  linkSplit[linkSplit.length - 1] = dataSplit.join('.');
  return linkSplit.join('/');
}

const errorHandling = (event) => {
  const img = event.target;
  const formats = ["webp", "jpg", "png"]; // Danh sách định dạng fallback

  // Khởi tạo attempts nếu chưa có
  if (!img.dataset.attempts) {
    img.dataset.attempts = 0;
  }

  // Tăng số lần thử
  img.dataset.attempts++;

  // Nếu đã thử quá số lần tối đa (10 lần), báo lỗi và gỡ sự kiện
  const maxAttempts = formats.length * 2; // 3 lần thử cho mỗi định dạng
  if (img.dataset.attempts > maxAttempts) {
    img.removeEventListener('error', errorHandling);
    img.alt += ' - Error';
    console.log("Can't handle error for img:::", img.id);
    return;
  }

  // Tính toán định dạng tiếp theo theo chu kỳ
  const formatIndex = (img.dataset.attempts - 1) % formats.length;
  const nextFormat = formats[formatIndex];
  
  // Thay đổi src với định dạng mới
  img.src = img.src.replace(/\.\w+$/, `.${nextFormat}`);
  console.log(`Attempt ${img.dataset.attempts}: Trying ${nextFormat} for img::`, img.id);
};

const leak = (limit, _document, url, galleryId) => {
  _document.body.innerHTML = '';
  _document.body.style.padding = "0 200px";
  _document.body.style.backgroundColor = "#222222";
  for (let i = 1; i <= limit; i++) {
    let img = _document.createElement('img');
    img.id = i;
    img.alt = `${galleryId}-${i}`;
    img.loading = 'lazy';
    img.style.width = "100%";
    img.addEventListener('error', errorHandling);
    img.src = getTemplate(url).replace('[rpl]', i);
    _document.body.appendChild(img);
  }
}

const getArraySrc = (_document) => {
  return Array.from(_document.querySelectorAll('img')).map(img => img.src.replace('https://', ''));
}

const buildInfo = () => {
  const info = document.querySelector('.info').querySelectorAll('ul');

  let code = window.location.href.split('/')[4];
  let names = escapeInvalidCharacters(`${document.querySelector('.info').querySelector('h1').textContent.trim()}`);
  let coverImage = document.querySelector('.gallery_left').querySelector('img').src.replace('https://', '');

  let infoData = {
    category: '',
    artists: '',
    characters: '',
    parodies: '',
    tags: '',
    images: ''
  }

  info.forEach(ul => {
    if (!ul.querySelector('.i_text')) {
      return;
    }
    const label = ul.querySelector('.i_text').textContent.toLowerCase();
    for (let key in infoData) {
      if (label.includes(key)) {
        infoData[key] = getArrayData(ul.querySelectorAll('a'));
      }
    }
    if (label.includes('groups')) {
      infoData.artists += (infoData.artists.length > 1 ? ',' : '') + getArrayData(ul.querySelectorAll('a'), 'group-');
    }
  });

  function getArrayData(nodeList, prefix = '') {
    return Array.from(nodeList).reduce((arr, a) => {
      const number = a.querySelector('.t_badge')
      number ? number.remove() : '';
      arr.push(`${prefix}${a.textContent.trim()}`);
      return arr;
    }, []).join(',');
  }

  return `g.s(${code},'${infoData.category}','${infoData.artists}','${infoData.characters}','${names}','${infoData.parodies}',\n\t'${infoData.tags}',\n\t'${coverImage}','[imgs]')\n`;
};

const getStringSrc = (arrOfSrc) => {
  return arrOfSrc.toString().replaceAll(' ', '').replaceAll('\'', '').replace('[', '').replace(']', '');
}

const iframe = document.createElement('iframe');
const firstLink = document.querySelector('.g_thumb').querySelector('a');
const limit = parseInt(document.querySelector('span.i_text.pages').textContent.replace('Pages: ', ''));
const galleryId = window.location.href.split('/')[4];

iframe.id = "ifleak";
iframe.style.position = "fixed";
iframe.style.top = 0;
iframe.style.width = "400px";
iframe.style.height = "250px";
iframe.src = firstLink.href;
iframe.dataset.textToCop = buildInfo();
iframe.addEventListener('load', () => {

  const dataSrc = iframe.contentDocument.querySelector('img.lazy').dataset.src;
  const w_width = (screen.width * 80) / 100;
  const w_height = (screen.height * 90) / 100;
  const w_left = (screen.width - w_width) / 2;
  const w_top = (screen.height - w_height) / 2;

  const myWindow = window.open(
    "",
    "",
    `width=${w_width},height=${w_height},left=${w_left},top=${w_top}`
  );
  leak(limit, myWindow.document, dataSrc, galleryId);

  const downlink = myWindow.document.createElement("a");
  downlink.download = `test.html`;
  downlink.textContent = "Copy data";
  downlink.style.padding = "10px";
  downlink.style.color = "white";
  downlink.addEventListener('click', () => {
    myWindow.document.querySelector('textarea').value = iframe.dataset.textToCop.replace('[imgs]', optimizeImageUrlsString(getStringSrc(getArraySrc(myWindow.document))));
  });

  const textField = document.createElement('textarea');
  textField.style.width = "100%";
  textField.style.height = "200px";
  myWindow.document.body.insertBefore(textField, myWindow.document.body.firstChild);
  myWindow.document.body.insertBefore(downlink, myWindow.document.body.firstChild);

  document.body.removeChild(iframe);
});
document.body.appendChild(iframe);
//

function escapeInvalidCharacters(str) {
  return str.replace(/["']/g, function (match) {
    if (match === '"') {
      return '\\"'; // Thay thế " bằng \"
    } else if (match === "'") {
      return "\\'"; // Thay thế ' bằng \'
    }
  });
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