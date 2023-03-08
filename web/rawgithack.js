const GITHUB_API_URL = 'https://api.onmicrosoft.cn';

const TEMPLATES = [
  [/^(https?):\/\/gitlab\.com\/([^\/]+.*\/[^\/]+)\/(?:raw|blob)\/(.+?)(?:\?.*)?$/i,
   '$1://gl.cmds.run/$2/raw/$3'],
  [/^(https?):\/\/bitbucket\.org\/([^\/]+\/[^\/]+)\/(?:raw|src)\/(.+?)(?:\?.*)?$/i,
   '$1://bb.cmds.run/$2/raw/$3'],

  // snippet file URL from web interface, with revision
  [/^(https?):\/\/bitbucket\.org\/snippets\/([^\/]+\/[^\/]+)\/revisions\/([^\/\#\?]+)(?:\?[^#]*)?(?:\#file-(.+?))$/i,
   '$1://bb.cmds.run/!api/2.0/snippets/$2/$3/files/$4'],
  // snippet file URL from web interface, no revision
  [/^(https?):\/\/bitbucket\.org\/snippets\/([^\/]+\/[^\/\#\?]+)(?:\?[^#]*)?(?:\#file-(.+?))$/i,
   '$1://bb.cmds.run/!api/2.0/snippets/$2/HEAD/files/$3'],
  // snippet file URLs from REST API
  [/^(https?):\/\/bitbucket\.org\/\!api\/2.0\/snippets\/([^\/]+\/[^\/]+\/[^\/]+)\/files\/(.+?)(?:\?.*)?$/i,
   '$1://bb.cmds.run/!api/2.0/snippets/$2/files/$3'],
  [/^(https?):\/\/api\.bitbucket\.org\/2.0\/snippets\/([^\/]+\/[^\/]+\/[^\/]+)\/files\/(.+?)(?:\?.*)?$/i,
   '$1://bb.cmds.run/!api/2.0/snippets/$2/files/$3'],

  // welcome rawgit refugees
  [/^(https?):\/\/(?:cdn\.)?rawgit\.com\/(.+?\/[0-9a-f]+\/raw\/(?:[0-9a-f]+\/)?.+)$/i,
   '$1://gist.cmds.run/$2'],
  [/^(https?):\/\/(?:cdn\.)?rawgit\.com\/([^\/]+\/[^\/]+\/[^\/]+|[0-9A-Za-z-]+\/[0-9a-f]+\/raw)\/(.+)/i,
   '$1://raw.cmds.run/$2/$3'],

  [/^(https?):\/\/raw\.github(?:usercontent)?\.com\/([^\/]+\/[^\/]+\/[^\/]+|[0-9A-Za-z-]+\/[0-9a-f]+\/raw)\/(.+)/i,
   '$1://raw.cmds.run/$2/$3'],
  [/^(https?):\/\/github\.com\/(.[^\/]+?)\/(.[^\/]+?)\/(?!releases\/)(?:(?:blob|raw)\/)?(.+?\/.+)/i,
   '$1://raw.cmds.run/$2/$3/$4'],
  [/^(https?):\/\/gist\.github(?:usercontent)?\.com\/(.+?\/[0-9a-f]+\/raw\/(?:[0-9a-f]+\/)?.+)$/i,
   '$1://gist.cmds.run/$2'],

  [/^(https?):\/\/git\.sr\.ht\/(~[^\/]+\/[^\/]+\/blob\/.+\/.+)/i,
   '$1://srht.cmds.run/$2'],
  [/^(https?):\/\/hg\.sr\.ht\/(~[^\/]+\/[^\/]+\/raw\/.+)/i,
   '$1://srhgt.cmds.run/$2']
];

function mergeSlashes(url) {
  try {
    var url = new URL(url);
  } catch (e) {
    return url;
  }
  url.pathname = url.pathname.replace(/\/\/+/ig, '/');
  return url.toString();
}

function maybeConvertUrl(url) {
  for (var i in TEMPLATES) {
    var [pattern, template] = TEMPLATES[i];
    if (pattern.test(url)) {
      return url.replace(pattern, template);
    }
  }
}

function cdnize(url) {
  return url.replace(/^(\w+):\/\/(\w+)/, "$1://$2-dev");
}

function onFocus(e) {
  setTimeout(function () { e.target.select(); }, 1);
}

function hide(element) {
  element.classList.add('hidden');
}

function show(element) {
  element.classList.remove('hidden');
}


// index
(function (doc) {
  "use strict";

  var urlEl  = doc.getElementById('url');
  if (!urlEl) return;

  var prodEl = doc.getElementById('url-prod');
  var devEl  = doc.getElementById('url-dev');

  new Clipboard('.url-copy-button');

  var devCopyButton  = doc.getElementById('url-dev-copy');
  var prodCopyButton = doc.getElementById('url-prod-copy');

  if (doc.queryCommandSupported && doc.queryCommandSupported('copy')) {
    devCopyButton.style.display  = 'inline-block';
    prodCopyButton.style.display = 'inline-block';
  }

  urlEl.addEventListener('input', formatURL, false);

  if (/(iPhone|iPad|iPod)/i.test(navigator.userAgent)) {
    // On iOS, it's quite difficult to copy the value of readonly input elements (see https://git.io/vpI8Z).
    // By making the inputs non-readonly and preventing keydown we can mimic the behaviour of readonly inputs while
    // improving the copy-input-value interaction.
    inputDev.removeAttribute('readonly')
    inputProd.removeAttribute('readonly')
    inputDev.addEventListener('keydown', function (e) {
      e.preventDefault();
    });
    inputProd.addEventListener('keydown', function (e) {
      e.preventDefault();
    });
  }

  formatURL();

  function formatURL() {
    var url = urlEl.value = mergeSlashes(decodeURIComponent(urlEl.value.trim()));

    urlEl.classList.remove('valid');
    urlEl.classList.toggle('invalid', url.length);
    devEl.value  = '';
    prodEl.value = '';
    devEl.classList.remove('valid');
    prodEl.classList.remove('valid');
    devCopyButton.disabled = true;
    prodCopyButton.disabled = true;

    var ghUrl = maybeConvertUrl(url);
    if (ghUrl) {
      var matches = ghUrl.match(/^(\w+:\/\/(raw).cmds.run\/([^\/]+)\/([^\/]+))\/([^\/]+)\/(.*)/i);
      if (!matches) {
        devEl.value = cdnize(ghUrl); 
        prodEl.value = ghUrl;
        setValid();
      } else if (matches[2] === 'raw') {
        devEl.value = cdnize(ghUrl);
        let apiUrl = `${GITHUB_API_URL}/repos/${matches[3]}/${matches[4]}/git/refs/heads/${matches[5]}`;
        fetch(apiUrl)
          .then(res => { if (res.ok) return res.json(); })
          .then(data => {
            let ref = data && data.object && data.object.sha ? data.object.sha : matches[5];
            prodEl.value = `${matches[1]}/${ref}/${matches[6]}`;
            setValid();
          });
      }
    }
  }

  function setValid() {
    urlEl.classList.remove('invalid');
    urlEl.classList.add('valid');
    prodEl.classList.add('valid');
    devEl.classList.add('valid');
    devCopyButton.disabled = false;
    prodCopyButton.disabled = false;
  }

  prodEl.addEventListener('focus', onFocus);
  devEl.addEventListener('focus', onFocus);
  urlEl.addEventListener('focus', onFocus);

}(document));


// purge
(function (doc) {
  "use strict";

  var filesTextarea = doc.querySelector('.purge textarea');
  if (!filesTextarea) return;
  var filesSubmit = doc.querySelector('.purge input[type=submit]');
  var filesPatron = doc.querySelector('.purge input[name=patron]');
  var filesWait = doc.querySelector('.purge .wait');
  var filesSuccess = doc.querySelector('.purge .success');
  var filesError = doc.querySelector('.purge .error');

  autosize(filesTextarea);

  filesTextarea.oninput = function() {
    var result = [];
    for (var url of this.value.split('\n')) {
      var url = decodeURIComponent(url.trim());
      var converted = maybeConvertUrl(url);
      result.push(converted ? cdnize(converted) : url);
    }
    this.value = result.join('\n');
    return false;
  }

  document.getElementById('purge-form').onsubmit = function() {
    filesTextarea.disabled = true;
    filesSubmit.disabled = true;
    filesPatron.disabled = true;
    hide(filesSuccess);
    hide(filesError);
    show(filesWait);
    var body = 'files=' + encodeURIComponent(filesTextarea.value) + '&patron=' + encodeURIComponent(filesPatron.value);
    fetch('/purge', { method: 'POST', body: body})
      .then(res => {
        if (res.status == 429) {
          return {success: false, response: 'too many requests'};
        }
        return res.json();
      })
      .then(res => {
          hide(filesWait);
          filesSubmit.disabled = false;
          filesPatron.disabled = false;
          filesTextarea.disabled = false;
          var operand = res.success ? filesSuccess : filesError;
          operand.textContent = res.response;
          show(operand);
      });
    return false;
  }

}(document));
