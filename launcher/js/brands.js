// Render app and input cards. App identities and branding live in app-catalog.js.
(function (A) {
  'use strict';

  function svg(viewBoxContent, className) {
    return '<svg' + (className ? ' class="' + className + '"' : '') + ' viewBox="0 0 24 24">' + viewBoxContent + '</svg>';
  }
  var BADGE = '<rect width="24" height="24" rx="5" fill="#2c2c30"/>';
  var ICONS = {
    flame: svg('<path fill="#ffd27a" d="M12 2c1 3.5-1.5 5-1.5 7.5 0 1.4 1 2.5 2.3 2.5 1.5 0 2.2-1.2 2-3 2.3 1.9 3.7 4.3 3.7 7A6.5 6.5 0 0 1 12 22.5 6.5 6.5 0 0 1 5.5 16c0-4.6 3.6-7.4 4.8-10.4C11 4.2 11.6 3 12 2z"/>', 'flame'),
    plus: svg('<circle cx="12" cy="12" r="10.5" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M12 7v10M7 12h10" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>', 'logo'),
    hdmi: svg(BADGE + '<path fill="#fff" d="M5 9h14v3l-2 3H7l-2-3zM8 11v1h1v-1zm3 0v1h2v-1zm4 0v1h1v-1z"/>'),
    tv: svg(BADGE + '<path fill="none" stroke="#fff" stroke-width="1.6" d="M5 8h14v9H5zM9 5l3 3 3-3"/>'),
    game: svg(BADGE + '<path fill="#fff" d="M7.5 8h9a3.5 3.5 0 0 1 3.4 4.3l-.8 3.2a2 2 0 0 1-3.4.9L14.3 15H9.7l-1.4 1.4a2 2 0 0 1-3.4-.9l-.8-3.2A3.5 3.5 0 0 1 7.5 8zM8 10v1H7v1h1v1h1v-1h1v-1H9v-1zm7.5.3a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6zm-1.6 1.6a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z"/>'),
    pc: svg(BADGE + '<path fill="none" stroke="#fff" stroke-width="1.6" d="M5 6.5h14v9H5zM9 19h6M12 15.5V19"/>'),
    box: svg(BADGE + '<path fill="none" stroke="#fff" stroke-width="1.6" d="M4.5 10h15v5h-15z"/><circle cx="16.5" cy="12.5" r="1" fill="#fff"/>')
  };

  function shortName(name) { return name.replace(/ - .*/, '').replace(/NextGeneration$/, ''); }

  function brandFor(app) {
    var known = A.catalog.brand(app);
    if (known) { return known; }
    var name = app.name, n = name.toLowerCase();
    // Preserve the original icon and generated background for unknown apps.
    var h = 0;
    for (var j = 0; j < n.length; j++) { h = (h * 31 + n.charCodeAt(j)) % 360; }
    return { background: 'linear-gradient(135deg,hsl(' + h + ',55%,42%),hsl(' + ((h + 40) % 360) + ',65%,14%))',
             logo: null, label: shortName(name), textColour: '#ffffff', useAppIcon: true };
  }

  function logoSvg(logo, fill) {
    var d = window.LOGOS && window.LOGOS[logo.slug];
    return d ? svg('<path fill="' + fill + '" d="' + d + '"/>', 'logo') : '';
  }

  // Sample a tiny image once per icon. Alpha-weighted color buckets ignore transparent pixels.
  var iconColors = Object.create(null), colorCount = 0;
  function imageBackground(image, tile) {
    var key = image.src, color = iconColors[key];
    try {
      if (!color) {
        var canvas = document.createElement('canvas'); canvas.width = canvas.height = 24;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, 24, 24);
        var pixels = ctx.getImageData(0, 0, 24, 24).data, buckets = {}, best = null;
        for (var i = 0; i < pixels.length; i += 4) {
          var alpha = pixels[i + 3] / 255;
          if (alpha < 0.12) { continue; }
          var bucketKey = (pixels[i] >> 5) + ',' + (pixels[i + 1] >> 5) + ',' + (pixels[i + 2] >> 5);
          var bucket = buckets[bucketKey] || (buckets[bucketKey] = { weight: 0, r: 0, g: 0, b: 0 });
          bucket.weight += alpha; bucket.r += pixels[i] * alpha; bucket.g += pixels[i + 1] * alpha; bucket.b += pixels[i + 2] * alpha;
          if (!best || bucket.weight > best.weight) { best = bucket; }
        }
        if (!best) { return; }
        color = [best.r, best.g, best.b].map(function (value) { return Math.round(8 + value / best.weight * 0.26); });
        if (colorCount >= 100) { iconColors = Object.create(null); colorCount = 0; }
        iconColors[key] = color; colorCount++;
      }
      var dark = color.map(function (value) { return Math.round(value * 0.55); });
      tile.style.background = 'linear-gradient(135deg,rgb(' + color.join(',') + '),rgb(' + dark.join(',') + '))';
    } catch (e) { /* Some TV/cross-origin icons cannot be read by canvas; retain the fallback background. */ }
  }

  function appTile(app, extraClass, onSelect) {
    var b = brandFor(app), tile = A.el('div'), nodoCard = extraClass === 'nodo-card';
    tile.className = 'tile app-tile' + (extraClass ? ' ' + extraClass : '');
    tile.setAttribute('role', 'button');
    tile.setAttribute('aria-label', shortName(app.name));
    tile.title = shortName(app.name);
    tile.style.background = b.background;
    if (/^#(?:fff|ffffff)$/i.test(b.background)) { tile.classList.add('light-brand'); }
    var fallback = A.el('div', 'app-fallback'), mark = b.logo && logoSvg(b.logo, b.logoColour);
    if (!b.label && !nodoCard) { fallback.classList.add('logo-only'); }
    if (b.largeLogo) { fallback.classList.add('logo-big'); }
    if (mark) {
      fallback.innerHTML = mark;
    } else if (b.useAppIcon && app.icon) {
      if (nodoCard) {
        tile.classList.add('native-icon');
        var initials = shortName(app.name).split(/\s+/).map(function (word) { return word.charAt(0); }).slice(0, 2).join('').toUpperCase();
        var monogram = A.el('span', 'app-monogram', initials);
        fallback.appendChild(monogram);
      }
      var img = new Image();
      img.className = 'logo'; img.alt = '';
      if (nodoCard) { img.onload = function () {
        monogram.hidden = true; imageBackground(img, tile);
        var backdrop = new Image(); backdrop.className = 'native-backdrop'; backdrop.alt = '';
        backdrop.src = img.src; fallback.appendChild(backdrop);
        img.onload = null;
      }; }
      img.onerror = function () { fallback.removeChild(img); };
      img.src = app.icon;
      fallback.appendChild(img);
    }
    if (nodoCard || b.label || !mark) {
      var name = A.el('div', 'name', b.label || shortName(app.name));
      name.style.color = b.textColour;
      if (nodoCard && name.textContent.length > 24) { name.classList.add(name.textContent.length > 45 ? 'name-extra-long' : 'name-long'); }
      fallback.appendChild(name);
    }
    tile.appendChild(fallback);
    tile.onclick = onSelect;

    if (nodoCard) { return tile; }
    var sources = A.artwork.sources(app), at = 0;
    function next() {
      if (at >= sources.length) { return; }
      var image = new Image(), src = sources[at++], timer;
      function clear() { clearTimeout(timer); image.onload = image.onerror = null; }
      function failed() { clear(); next(); }
      image.className = 'app-artwork'; image.alt = '';
      image.onload = function () {
        clear();
        fallback.hidden = true;
        // Do not let the fallback colour show through antialiased image corners.
        tile.style.background = 'transparent';
        tile.classList.add('has-artwork');
        tile.appendChild(image);
      };
      image.onerror = failed;
      // Keep the fallback visible if a local file lookup stalls on older firmware.
      timer = setTimeout(failed, 2000);
      image.src = src;
    }
    next();
    return tile;
  }

  // Measure whole words: single-word titles shrink, multi-word titles wrap only at spaces.
  var labelCanvas = null;
  function fitNames(grid) {
    if (!grid || !grid.querySelectorAll) { return; }
    labelCanvas = labelCanvas || document.createElement('canvas');
    var context = labelCanvas.getContext('2d');
    var labels = grid.querySelectorAll('.name');
    for (var i = 0; i < labels.length; i++) {
      var name = labels[i]; name.style.fontSize = ''; name.style.whiteSpace = '';
      var words = name.textContent.trim().split(/\s+/), style = window.getComputedStyle(name);
      var size = parseFloat(style.fontSize), width = name.clientWidth;
      if (!size || !width) { continue; }
      if (words.length === 1) { name.style.whiteSpace = 'nowrap'; }
      context.font = style.fontWeight + ' ' + size + 'px ' + style.fontFamily;
      var widest = 0;
      words.forEach(function (word) { widest = Math.max(widest, context.measureText(word).width); });
      if (widest > width) { size = size * (width - 1) / widest; }
      var available = name.parentNode.clientHeight - parseFloat(style.bottom || 0) - 16;
      // Fit tall multi-line names as well, while leaving every word intact.
      for (var attempt = 0; attempt < 8; attempt++) {
        name.style.fontSize = size.toFixed(2) + 'px';
        if (name.offsetHeight <= available) { break; }
        size *= 0.9;
      }
    }
  }

  // A compact card (icon + label), used for inputs.
  function card(label, iconSvg, onSelect) {
    var tile = A.el('div', 'tile');
    tile.innerHTML = iconSvg;
    tile.appendChild(A.el('div', 'name', label));
    tile.onclick = onSelect;
    return tile;
  }

  // Data-only access for Preact Settings. Legacy screen rendering stays unchanged.
  function describe(app) {
    var brand = brandFor(app), logo = brand.logo && window.LOGOS && window.LOGOS[brand.logo.slug];
    return { title: shortName(app.name), background: brand.background, label: brand.label,
      textColour: brand.textColour, logoPath: logo || null, logoColour: brand.logoColour || '#fff',
      largeLogo: !!brand.largeLogo, useAppIcon: !!brand.useAppIcon, artwork: A.artwork.sources(app) };
  }

  A.tiles = { ICONS: ICONS, app: appTile, card: card, shortName: shortName, describe: describe, fitNames: fitNames };
})(window.AeroTizen);
