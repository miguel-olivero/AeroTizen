// Read-only Nodo client. ES5 for the TV runtime; no request can launch a service.
(function (A) {
  'use strict';
  var request = null, timer = null, unsubscribe = null, endpoint = '', generation = 0;
  var status, resources, services;

  function percent(value) {
    if (typeof value !== 'number' || !isFinite(value)) { throw new Error('Invalid metric'); }
    return Math.max(0, Math.min(100, value));
  }
  function bytes(value) {
    if (typeof value !== 'number' || !isFinite(value) || value < 0) { return '—'; }
    var unit = value >= 1099511627776 ? 'TiB' : 'GiB';
    return (value / (unit === 'TiB' ? 1099511627776 : 1073741824)).toFixed(1) + ' ' + unit;
  }
  function unavailable() {
    status.textContent = 'Nodo no disponible';
    resources.hidden = true; services.hidden = true;
    resources.textContent = ''; services.textContent = '';
  }
  function meter(label, value, detail) {
    var card = A.el('div', 'nodo-meter'), heading = A.el('div', 'nodo-metric-heading');
    heading.appendChild(A.el('span', '', label));
    heading.appendChild(A.el('strong', '', Math.round(value) + '%'));
    card.appendChild(heading);
    var track = A.el('div', 'nodo-track'), bar = A.el('i');
    bar.style.width = value + '%'; track.appendChild(bar); card.appendChild(track);
    card.title = detail;
    return card;
  }
  function diskCard(disk, value) {
    var card = A.el('div', 'nodo-disk'), ring = A.el('div', 'nodo-ring');
    // Only validated numeric values enter SVG markup. Server text uses textContent.
    ring.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" class="ring-track"/>' +
      '<circle cx="32" cy="32" r="26" class="ring-value" stroke-dasharray="' + (value * 1.63363) + ' 163.363"/></svg>';
    ring.appendChild(A.el('span', '', Math.round(value) + '%'));
    var copy = A.el('div', 'nodo-disk-copy');
    copy.appendChild(A.el('strong', '', String(disk.label || disk.name || 'Disco')));
    copy.appendChild(A.el('span', '', bytes(disk.used) + ' / ' + bytes(disk.total)));
    card.title = String(disk.name || disk.label || 'Disco');
    card.appendChild(ring); card.appendChild(copy);
    return card;
  }
  function render(data) {
    if (!data || data.ok !== true || !data.system || data.system.ok === false ||
        !data.services || data.services.ok === false || !data.system.cpu || !data.system.memory ||
        !Array.isArray(data.system.disks) || !Array.isArray(data.services.services)) { throw new Error('Invalid status'); }
    var sys = data.system, cpu = percent(sys.cpu.percent), ram = percent(sys.memory.percent);
    var diskValues = sys.disks.map(function (disk) { return percent(disk.percent); });
    var list = data.services.services;
    list.forEach(function (service) {
      if (!service || typeof service.name !== 'string' || typeof service.up !== 'boolean') { throw new Error('Invalid service'); }
    });
    var batch = document.createDocumentFragment();
    batch.appendChild(meter('CPU', cpu, 'Uso de CPU'));
    batch.appendChild(meter('RAM', ram, bytes(sys.memory.used) + ' / ' + bytes(sys.memory.total)));
    sys.disks.slice(0, 3).forEach(function (disk, index) { batch.appendChild(diskCard(disk, diskValues[index])); });
    resources.textContent = ''; resources.appendChild(batch); resources.hidden = false;
    services.textContent = '';
    var up = list.filter(function (service) { return service.up; }).length;
    services.appendChild(A.el('span', 'nodo-service-summary', up + '/' + list.length + ' servicios'));
    list.slice(0, 12).forEach(function (service) {
      var badge = A.el('span', 'nodo-service ' + (service.up ? 'is-up' : 'is-down'), service.name);
      badge.title = service.name + ': ' + (service.up ? 'Activo · ' + service.latencyMs + ' ms' : 'Caído');
      badge.setAttribute('aria-label', service.name + ': ' + (service.up ? 'Activo' : 'Caído'));
      services.appendChild(badge);
    });
    if (list.length > 12) { services.appendChild(A.el('span', '', '+' + (list.length - 12))); }
    services.hidden = false;
    status.textContent = 'Actualizado ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (sys.disks.length > 3) { status.textContent += ' · ' + (sys.disks.length - 3) + ' discos más'; }
    status.title = 'Datos: ' + String(data.updatedAt || '—') + ' · Uptime: ' + Math.floor((sys.uptimeSeconds || 0) / 86400) + ' d';
  }
  function cancel() {
    generation++;
    if (request) { var old = request; request = null; old.abort(); }
  }
  function refresh() {
    if (document.hidden || request) { return; }
    if (!/^https?:\/\/[^\s]+$/i.test(endpoint)) { unavailable(); return; }
    var xhr = new XMLHttpRequest(), token = ++generation, watchdog;
    request = xhr;
    function fail() {
      if (token !== generation) { return; }
      clearTimeout(watchdog); request = null; generation++; xhr.abort(); unavailable();
    }
    xhr.onload = function () {
      if (token !== generation) { return; }
      clearTimeout(watchdog); request = null;
      try {
        if (xhr.status < 200 || xhr.status >= 300) { throw new Error('HTTP status'); }
        render(JSON.parse(xhr.responseText));
      } catch (e) { unavailable(); }
    };
    xhr.onerror = fail; xhr.ontimeout = fail;
    xhr.onabort = function () { clearTimeout(watchdog); };
    watchdog = setTimeout(fail, 8000);
    try { xhr.open('GET', endpoint, true); xhr.timeout = 8000; xhr.send(); }
    catch (e) { fail(); }
  }
  function visibility() {
    if (document.hidden) { cancel(); } else { refresh(); }
  }
  function changed() {
    var next = String(A.settings.nodoUrl || '').trim();
    if (next === endpoint) { return; }
    cancel(); endpoint = next; unavailable(); refresh();
  }
  A.nodo = {
    start: function () {
      if (timer !== null) { return; }
      status = A.$('nodo-status'); resources = A.$('nodo-resources'); services = A.$('nodo-services');
      endpoint = String(A.settings.nodoUrl || '').trim();
      unsubscribe = A.settings.subscribe(changed);
      document.addEventListener('visibilitychange', visibility);
      timer = setInterval(refresh, 30000); refresh();
    },
    stop: function () {
      clearInterval(timer); timer = null; cancel();
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
      document.removeEventListener('visibilitychange', visibility);
    },
    refresh: refresh
  };
})(window.AeroTizen);
