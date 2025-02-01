const getTemplate = (url)=>{
  let linkSplit = url.split('/');
  let dataSplit = linkSplit[linkSplit.length - 1].split('.');
  dataSplit[0] = '[rpl]';
  linkSplit[linkSplit.length - 1] = dataSplit.join('.');
  return linkSplit.join('/');
}

const errorHandling = (event)=>{
  const img = event.target;
  if(img.dataset.handled == "1") {
    img.removeActionListener('error', errorHandling);
    img.alt = img.alt + ' - Error';
    console.log('can\'t handling error for img:::', img.id);
  } else {
    img.src = img.src.replace('jpg', 'png');
    img.dataset.handled = "1";
    console.log('error handled img:::', img.id);
  }
}

const leak = (limit, _document, url, galleryId)=>{
  _document.body.innerHTML = '';
  _document.body.style.padding = "0 200px";
  _document.body.style.backgroundColor = "#222222";
  // url ?? window.location.href;
  for(let i=1; i<=limit; i++) {
      let img = _document.createElement('img');
      img.id = i;
      img.alt = `${galleryId}-${i}`;
      img.loading = 'lazy';
      img.style.width = "100%";
      img.dataset.handled = "0";
      img.addEventListener('error', errorHandling);
      img.src = getTemplate(url).replace('[rpl]', i);
      _document.body.appendChild(img);
  }
}

const getArraySrc = (_document)=>{
  return Array.from(_document.querySelectorAll('img')).map(img => img.src.replace('https://', ''));
}

const buildInfo = ()=>{
  //code, category, artists, characters, names, parodies, tags, coverImage, images
  //saveToGalleries(code, category, artists, characters, names, parodies, tags, coverImage, images) {
  const info = document.querySelector('.galleries_info').querySelectorAll('li');
  
  let code = window.location.href.split('/')[4];
  const rd = document.querySelector('.right_details')
  let names = escapeInvalidCharacters(`${rd.querySelector('h1').textContent.trim()} [/] ${rd.querySelector('.subtitle').textContent.trim()}`);  
  let coverImage = document.querySelector('.left_cover').querySelector('img').dataset.src.replace('https://', '');
  
  let infoData = {
    category: '',
    artists: '',
    characters: '',
    parodies: '',
    tags: '',
    images: ''
  }

  
  info.forEach(li => {
    if(!li.querySelector('.tags_text')) {
      return;
    }
    const label = li.querySelector('.tags_text').textContent.toLowerCase();
    for (let key in infoData) {
      if(label.includes(key)) {
        infoData[key] = getArrayData(li.querySelectorAll('a')); 
      }
    }
    if(label.includes('groups')) {
      console.log('alo');
      infoData.artists += (infoData.artists.length>1 ? ',' : '') + getArrayData(li.querySelectorAll('a'), 'group-');
    }
  });
  
  function getArrayData(nodeList, prefix='') {
    return Array.from(nodeList).reduce((arr, a)=>{
      const number = a.querySelector('.badge') 
      number?number.remove():'';
      arr.push(`${prefix}${a.textContent.trim()}`);
      return arr;
    }, []).join(',');
  }
  
  return `galleries.saveToGalleries(\n\t${code},\n\t'${infoData.category}',\n\t'${infoData.artists}',\n\t'${infoData.characters}',\n\t'${names}',\n\t'${infoData.parodies}',\n\t'${infoData.tags}',\n\t'${coverImage}',\n\t'[imgs]'\n);\n`;
};

const getStringSrc = (arrOfSrc)=>{
  return arrOfSrc.toString().replaceAll(' ', '').replaceAll('\'', '').replace('[', '').replace(']', '');
}


//
  const iframe = document.createElement('iframe');
  const firstLink = document.querySelector('.gthumb').querySelector('a');
  const limit = parseInt(document.querySelector('li.pages').textContent.replace('Pages: ', ''));
  const galleryId = window.location.href.split('/')[4];

  iframe.id = "ifleak";
  iframe.style.position = "fixed";
  iframe.style.top = 0;
  iframe.style.width = "400px";
  iframe.style.height = "250px";
  iframe.src = firstLink.href;
  iframe.dataset.textToCop = buildInfo();
  iframe.addEventListener('load', ()=>{
    
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
    downlink.addEventListener('click', ()=>{
      myWindow.document.querySelector('textarea').value = iframe.dataset.textToCop.replace('[imgs]', getStringSrc(getArraySrc(myWindow.document)));
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
  return str.replace(/["']/g, function(match) {
    if (match === '"') {
      return '\\"'; // Thay thế " bằng \"
    } else if (match === "'") {
      return "\\'"; // Thay thế ' bằng \'
    }
  });
}