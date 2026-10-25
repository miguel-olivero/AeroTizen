// Featured Commons landscapes/astronomy. Only load validated HTTPS images >= 1080p.
window.Wallpapers = (function () {
  'use strict';
  var epoch = 0, xhr = null, selected = null, selectedAt = 0;
  var categories = ['Featured pictures of landscapes', 'Featured pictures of astronomy'];
  var cacheKey = 'aerotizen.wallpapers.v1';
  function text(value) { return String(value || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"'); }
  function valid(item) {
    return item && /^https:\/\/(?:upload|thumb)\.wikimedia\.org\//.test(item.url) &&
      /^https:\/\/commons\.wikimedia\.org\//.test(item.source) && item.width >= 1920 && item.height >= 1080;
  }
  function stop() {
    epoch++;
    if (xhr) { xhr.abort(); xhr = null; }
    var credit = document.getElementById('wallpaper-credit');
    if (credit) { credit.hidden = true; credit.textContent = ''; }
  }
  function apply(layer) {
    var token = epoch, credit = document.getElementById('wallpaper-credit');
    function show(items) {
      if (token !== epoch) { return; }
      items = items.filter(valid);
      if (!items.length) { return; }
      var at = Math.floor(Math.random() * items.length), item = items.splice(at, 1)[0];
      var image = new Image(), timeout;
      function fail() { clearTimeout(timeout); image.onload = image.onerror = null; if (token === epoch && items.length) { show(items); } }
      image.className = 'wallpaper-photo'; image.alt = '';
      image.onload = function () {
        clearTimeout(timeout); image.onload = image.onerror = null;
        if (token !== epoch) { return; }
        if (image.naturalWidth < 1920 || image.naturalHeight < 1080) { fail(); return; }
        layer.textContent = ''; layer.appendChild(image); selected = item; selectedAt = Date.now();
        if (credit) {
          credit.textContent = '';
          var source = document.createElement('a'); source.href = item.source;
          source.textContent = item.title + ' · ' + item.artist + ' · Wikimedia Commons';
          credit.appendChild(source);
          if (/^https:\/\/(?:creativecommons.org|www.creativecommons.org)\//.test(item.licenseUrl)) {
            var license = document.createElement('a'); license.href = item.licenseUrl; license.textContent = ' · ' + item.license;
            credit.appendChild(license);
          } else { credit.appendChild(document.createTextNode(' · ' + item.license)); }
          credit.hidden = false;
        }
      };
      image.onerror = fail; timeout = setTimeout(fail, 10000); image.src = item.url;
    }
    if (selected && Date.now() - selectedAt < 900000) { show([selected]); return; }
    try {
      var saved = JSON.parse(localStorage.getItem(cacheKey));
      if (saved && Date.now() - saved.at < 86400000 && Array.isArray(saved.items) && saved.items.some(valid)) { show(saved.items); return; }
    } catch (e) { /* optional metadata cache */ }
    function load(category, retry) {
      var request = xhr = new XMLHttpRequest();
      var url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=categorymembers&gcmtype=file&gcmlimit=50&gcmtitle=' +
        encodeURIComponent('Category:' + category) + '&prop=imageinfo&iiprop=url%7Csize%7Cmime%7Cextmetadata&iiurlwidth=2560&iiextmetadatafilter=Artist%7CLicenseShortName%7CLicenseUrl%7CObjectName';
      function fallback() { if (token === epoch && retry) { load(categories[0], false); } }
      request.onload = function () {
        if (token !== epoch) { return; } xhr = null;
        try {
          if (request.status !== 200) { throw new Error('HTTP'); }
          var data = JSON.parse(request.responseText), pages = data.query && data.query.pages;
          var items = Object.keys(pages || {}).map(function (key) {
            var page = pages[key], info = page.imageinfo && page.imageinfo[0];
            if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime) || info.width / info.height < 1.4 || info.width / info.height > 2.2) { return null; }
            var meta = info.extmetadata || {};
            return { url: info.thumburl || info.url, width: info.width, height: info.height, source: info.descriptionurl,
              title: text(meta.ObjectName && meta.ObjectName.value || page.title.replace(/^File:/, '')),
              artist: text(meta.Artist && meta.Artist.value || 'Autor en la fuente'),
              license: text(meta.LicenseShortName && meta.LicenseShortName.value || 'Ver licencia en la fuente'),
              licenseUrl: String(meta.LicenseUrl && meta.LicenseUrl.value || '') };
          }).filter(valid);
          if (!items.length) { fallback(); return; }
          try { localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), items: items })); } catch (e) { /* cache unavailable */ }
          show(items);
        } catch (e) { fallback(); }
      };
      request.onerror = request.ontimeout = fallback;
      request.open('GET', url, true); request.timeout = 10000; request.send();
    }
    load(categories[Math.floor(Math.random() * categories.length)], true);
  }
  return { apply: apply, stop: stop };
})();
