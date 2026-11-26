(function () {
  'use strict';
  var app = document.getElementById('board-app');
  if (!app) return;

  var NS = 'http://www.w3.org/2000/svg';
  var palette = ['#008a88', '#5fc3a5', '#bcced8', '#528bc0', '#e5b34b', '#83b984', '#a8a0be'];
  var monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  var form = document.getElementById('filter-form');
  var monthInput = document.getElementById('filter-month');
  var channelFilter = document.getElementById('filter-channel');
  var regionFilter = document.getElementById('filter-region');
  var serviceFilter = document.getElementById('filter-service');
  var options = null;
  var isFetching = false;

  function el(id) { return document.getElementById(id); }
  function fmt(value) { return numberFormat.format(Number(value || 0)); }
  function pct(value) { return value == null ? '—' : Number(value).toFixed(1) + '%'; }
  function decimal(value) { return value == null ? '—' : Number(value).toFixed(2); }
  function fallbackName(name, id) { return name && String(name).trim() ? name : (id == null ? 'غير محدد' : 'غير مسمى (ID ' + id + ')'); }
  function monthTitle(value) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || '')) return '—';
    var parts = value.split('-');
    return monthNames[Number(parts[1]) - 1] + ' ' + parts[0];
  }
  function setStatus(message, kind) {
    el('refresh-state').textContent = message;
    el('state-dot').className = 'live-dot' + (kind === 'ok' ? ' ok' : kind === 'error' ? ' error' : '');
  }
  function alertError(message) { el('alert').textContent = message; el('alert').hidden = false; }
  function clearError() { el('alert').hidden = true; el('alert').textContent = ''; }

  function addOption(select, name, id) {
    var option = document.createElement('option');
    option.value = String(id);
    option.textContent = fallbackName(name, id);
    select.appendChild(option);
  }
  function fillOptions(select, items) {
    while (select.options.length > 1) select.remove(1);
    (items || []).forEach(function (item) { addOption(select, item.Name, item.Id); });
  }
  async function requestJson(url) {
    var response = await fetch(url, { method: 'GET', credentials: 'same-origin', cache: 'no-store', headers: { 'Accept': 'application/json' } });
    var body;
    try { body = await response.json(); } catch (e) { throw new Error('استجابة الخادم ليست JSON صالحًا. تحقق من تسجيل الدخول وإعداد IIS.'); }
    if (!response.ok || body.Error) throw new Error(body.Error || 'تعذر قراءة الاستجابة من الخادم.');
    return body;
  }
  function makeUrl(base) {
    var params = new URLSearchParams();
    params.set('month', monthInput.value);
    if (channelFilter.value) params.set('channelId', channelFilter.value);
    if (regionFilter.value) params.set('regionId', regionFilter.value);
    if (serviceFilter.value) params.set('serviceId', serviceFilter.value);
    return base + '?' + params.toString();
  }
  function restoreFromUrl() {
    var qs = new URLSearchParams(window.location.search);
    ['channelId', 'regionId', 'serviceId'].forEach(function (key) {
      var select = key === 'channelId' ? channelFilter : key === 'regionId' ? regionFilter : serviceFilter;
      var value = qs.get(key);
      if (value && Array.prototype.some.call(select.options, function (option) { return option.value === value; })) select.value = value;
    });
    var month = qs.get('month');
    if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) monthInput.value = month;
  }
  function updateUrl() {
    var qs = new URLSearchParams();
    qs.set('month', monthInput.value);
    if (channelFilter.value) qs.set('channelId', channelFilter.value);
    if (regionFilter.value) qs.set('regionId', regionFilter.value);
    if (serviceFilter.value) qs.set('serviceId', serviceFilter.value);
    history.replaceState(null, '', window.location.pathname + '?' + qs.toString());
  }

  function makeKpi(title, value, color) {
    var item = document.createElement('article');
    item.className = 'kpi';
    var heading = document.createElement('div');
    heading.className = 'kpi-top';
    var glyph = document.createElement('span');
    glyph.className = 'kpi-icon';
    glyph.textContent = '●';
    glyph.style.color = color;
    var label = document.createElement('span');
    label.textContent = title;
    heading.appendChild(glyph);
    heading.appendChild(label);
    var number = document.createElement('strong');
    number.textContent = fmt(value);
    item.appendChild(heading);
    item.appendChild(number);
    return item;
  }
  function renderMetrics(data) {
    el('metric-total').textContent = fmt(data.Total);
    el('metric-closure').textContent = pct(data.ClosureRate);
    el('metric-sla').textContent = pct(data.SlaRate);
    el('metric-rating').textContent = decimal(data.AverageRating);
    el('rating-count').textContent = 'عدد التقييمات المسجلة: ' + fmt(data.RatingsCount);
    el('metric-sla').title = 'الملتزمة: ' + fmt(data.SlaMet) + ' / القابلة للاحتساب: ' + fmt(data.SlaEligible) + '؛ مستبعدة: ' + fmt(data.SlaExcluded);
    var node = el('channel-kpis');
    node.replaceChildren();
    (data.Channels || []).forEach(function (channel, index) {
      node.appendChild(makeKpi(fallbackName(channel.Name, channel.Id), channel.Count, palette[index % palette.length]));
    });
    if ((data.Channels || []).length === 0) node.appendChild(makeKpi('القنوات المسجلة', 0, '#7da9b1'));
  }
  function svgElement(type, attrs, text) {
    var node = document.createElementNS(NS, type);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, String(attrs[key])); });
    if (text != null) node.textContent = String(text);
    return node;
  }
  function renderDonut(data) {
    var svg = el('channel-donut');
    var legend = el('channel-legend');
    svg.replaceChildren();
    legend.replaceChildren();
    var total = Number(data.Total || 0);
    var channels = data.Channels || [];
    var r = 100, circumference = Math.PI * 2 * r, offset = 0;
    svg.appendChild(svgElement('circle', { cx: 170, cy: 170, r: r, fill: 'none', stroke: '#e7f0f3', 'stroke-width': 48 }));
    channels.forEach(function (item, index) {
      var fraction = total ? Number(item.Count) / total : 0;
      var length = circumference * fraction;
      var color = palette[index % palette.length];
      if (length > 0) {
        var segment = svgElement('circle', {
          cx: 170, cy: 170, r: r, fill: 'none', stroke: color, 'stroke-width': 48,
          'stroke-dasharray': length + ' ' + circumference,
          'stroke-dashoffset': -offset, transform: 'rotate(-90 170 170)',
          'role': item.Id == null ? 'img' : 'button', tabindex: item.Id == null ? '-1' : '0',
          'aria-label': fallbackName(item.Name, item.Id) + ': ' + fmt(item.Count) + ' مشاركة'
        });
        if (item.Id != null) {
          segment.addEventListener('click', function () { channelFilter.value = String(item.Id); loadSnapshot(); });
          segment.addEventListener('keydown', function (evt) {
            if (evt.key === 'Enter' || evt.key === ' ') { evt.preventDefault(); channelFilter.value = String(item.Id); loadSnapshot(); }
          });
        }
        svg.appendChild(segment);
      }
      offset += length;
      var row = document.createElement('div');
      row.className = 'legend-line';
      var dot = document.createElement('i');
      dot.className = 'swatch'; dot.style.backgroundColor = color;
      var content = document.createElement('div');
      var title = document.createElement('strong'); title.textContent = fallbackName(item.Name, item.Id);
      var detail = document.createElement('small'); detail.textContent = fmt(item.Count) + ' (' + pct(item.Percent) + ')';
      content.appendChild(title); content.appendChild(detail);
      row.appendChild(dot); row.appendChild(content); legend.appendChild(row);
    });
    svg.appendChild(svgElement('text', { x: 170, y: 170, 'text-anchor': 'middle', 'font-size': 30, 'font-weight': 800, fill: '#173c54' }, fmt(total)));
    svg.appendChild(svgElement('text', { x: 170, y: 195, 'text-anchor': 'middle', 'font-size': 17, fill: '#375c6c' }, 'مشاركة'));
    if (channels.length === 0) { var p = document.createElement('p'); p.className = 'no-data'; p.textContent = 'لا توجد مشاركات خلال الشهر المحدد'; legend.appendChild(p); }
  }
  function renderDaily(data) {
    var svg = el('daily-chart'); svg.replaceChildren();
    var values = data.Daily || [];
    var left = 56, top = 15, chartWidth = 840, chartHeight = 245, bottom = top + chartHeight;
    var max = values.reduce(function (acc, point) { return Math.max(acc, Number(point.Count)); }, 0);
    var scaleMax = max > 0 ? Math.ceil(max / 5) * 5 : 5;
    for (var tick = 0; tick <= 5; tick++) {
      var val = scaleMax * tick / 5, y = bottom - chartHeight * tick / 5;
      svg.appendChild(svgElement('line', { x1: left, y1: y, x2: left + chartWidth, y2: y, stroke: '#deeaee', 'stroke-width': 1 }));
      svg.appendChild(svgElement('text', { x: left - 12, y: y + 5, 'text-anchor': 'end', class: 'chart-label' }, Number(val).toFixed(val % 1 === 0 ? 0 : 1)));
    }
    if (max > 0) {
      var slot = chartWidth / values.length, width = Math.min(slot * .66, 23);
      values.forEach(function (item, index) {
        var val = Number(item.Count), barHeight = val / scaleMax * chartHeight;
        var x = left + index * slot + (slot - width) / 2;
        var rect = svgElement('rect', { x: x, y: bottom - barHeight, width: width, height: barHeight, rx: 1, fill: '#12a39c', opacity: .92 });
        rect.appendChild(svgElement('title', {}, 'اليوم ' + item.Day + ': ' + fmt(val) + ' مشاركة'));
        svg.appendChild(rect);
      });
    }
    values.forEach(function (item, index) {
      var slot = chartWidth / values.length;
      if (values.length > 25 && index % 2 !== 0 && index !== values.length - 1) return;
      svg.appendChild(svgElement('text', { x: left + index * slot + slot / 2, y: bottom + 24, 'text-anchor': 'middle', class: 'chart-label' }, item.Day));
    });
    svg.appendChild(svgElement('text', { x: left + chartWidth / 2, y: 325, 'text-anchor': 'middle', class: 'chart-label' }, 'اليوم من الشهر'));
    var mean = data.DailyAverage;
    el('daily-average').textContent = mean == null ? '—' : Number(mean).toFixed(1);
    el('highest-day').textContent = data.HighestDay ? fmt(data.HighestDay.Count) : '—';
    el('highest-date').textContent = data.HighestDay ? 'اليوم ' + data.HighestDay.Day : '';
    el('lowest-day').textContent = data.LowestDay ? fmt(data.LowestDay.Count) : '—';
    el('lowest-date').textContent = data.LowestDay ? 'اليوم ' + data.LowestDay.Day : '';
  }
  function renderStatuses(data) {
    var area = el('status-rows'); area.replaceChildren();
    var values = data.Statuses || [];
    if (!values.length) { var n = document.createElement('p'); n.className = 'no-data'; n.textContent = 'لا توجد حالات لعرضها'; area.appendChild(n); return; }
    values.forEach(function (item, index) {
      var row = document.createElement('div'); row.className = 'status-row';
      var label = document.createElement('span'); label.className = 'status-label'; label.textContent = fallbackName(item.Name, item.Id);
      var track = document.createElement('div'); track.className = 'status-track';
      var fill = document.createElement('div'); fill.className = 'status-fill'; fill.style.width = Math.min(100, Math.max(0, Number(item.Percent))) + '%'; fill.style.background = palette[index % palette.length];
      track.appendChild(fill);
      var count = document.createElement('span'); count.className = 'status-count'; count.textContent = fmt(item.Count);
      var percent = document.createElement('span'); percent.className = 'status-pct'; percent.textContent = pct(item.Percent);
      row.appendChild(label); row.appendChild(track); row.appendChild(count); row.appendChild(percent); area.appendChild(row);
    });
  }
  function renderRecent(data) {
    var tbody = el('latest-body'); tbody.replaceChildren();
    if (!(data.LatestTickets || []).length) {
      var tr = document.createElement('tr'), td = document.createElement('td'); td.colSpan = 6; td.className = 'empty-row'; td.textContent = 'لا توجد مشاركات واردة في الفترة المحددة'; tr.appendChild(td); tbody.appendChild(tr); return;
    }
    data.LatestTickets.forEach(function (item) {
      var tr = document.createElement('tr');
      var fields = [ (item.CreatedAt || '').split(' ')[1] || item.CreatedAt, String(item.Id), fallbackName(item.Channel, null), fallbackName(item.Type, null), fallbackName(item.Region, null) ];
      fields.forEach(function (value) { var td = document.createElement('td'); td.textContent = value || '—'; tr.appendChild(td); });
      var td = document.createElement('td'), pill = document.createElement('span'); pill.className = 'status-pill'; pill.textContent = fallbackName(item.Status, null); td.appendChild(pill); tr.appendChild(td); tbody.appendChild(tr);
    });
  }
  function render(data) {
    el('subtitle-month').textContent = monthTitle(data.Month);
    el('retrieved-at').textContent = 'وقت الاستعلام (خادم التطبيق): ' + (data.RetrievedAt || '—');
    el('source-latest').textContent = 'أحدث مشاركة مسجلة: ' + (data.LatestTicketAt || 'لا يوجد');
    renderMetrics(data); renderDonut(data); renderDaily(data); renderStatuses(data); renderRecent(data);
    setStatus(data.Total ? 'تم استرجاع البيانات بنجاح' : 'اتصال ناجح، لا توجد مشاركات في الفترة المحددة', 'ok');
  }
  async function loadSnapshot() {
    if (isFetching) return;
    if (!monthInput.value) { alertError('لا يمكن تحديد الفترة تلقائيًا: لا توجد تذاكر مسجلة أو لم يتم اختيار شهر.'); return; }
    isFetching = true;
    clearError(); setStatus('جاري تحديث اللوحة', 'busy');
    try {
      updateUrl();
      var data = await requestJson(makeUrl(app.dataset.snapshotUrl));
      render(data);
    } catch (e) {
      setStatus('تعذر تحديث البيانات', 'error');
      alertError(e.message || 'حدث خطأ غير متوقع أثناء الاتصال.');
    } finally { isFetching = false; }
  }
  async function initialize() {
    try {
      options = await requestJson(app.dataset.optionsUrl);
      fillOptions(channelFilter, options.Channels);
      fillOptions(regionFilter, options.Regions);
      fillOptions(serviceFilter, options.Services);
      if (options.LatestMonth) monthInput.value = options.LatestMonth;
      restoreFromUrl();
      if (monthInput.value) await loadSnapshot();
      else { setStatus('لا توجد بيانات مسجلة', 'ok'); alertError('لا تتضمن قاعدة البيانات أي تذكرة نشطة مؤرخة. اختر شهرًا يدويًا بعد توفر البيانات.'); }
    } catch (e) { setStatus('فشل الاتصال بقاعدة البيانات', 'error'); alertError(e.message || 'تعذر تحميل خيارات التصفية.'); }
  }
  form.addEventListener('submit', function (evt) { evt.preventDefault(); loadSnapshot(); });
  el('reset-filters').addEventListener('click', function () {
    channelFilter.value = ''; regionFilter.value = ''; serviceFilter.value = '';
    monthInput.value = options && options.LatestMonth ? options.LatestMonth : '';
    loadSnapshot();
  });
  el('manual-refresh').addEventListener('click', loadSnapshot);
  window.setInterval(function () {
    if (document.visibilityState === 'visible' && !isFetching && monthInput.value) loadSnapshot();
  }, 60000);
  initialize();
})();
