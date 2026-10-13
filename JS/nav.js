/*
 * JS/nav.js — shared layout for every page:
 *  1) loads nav.html + footer.html into #site-navbar / #site-footer
 *  2) navbar behaviour (mobile menu, active link) and the two scroll lines
 *  3) MAlert: the big success / error alert with a moving timer line
 * NOTE: fetch() needs a local server (VS Code "Live Server", `python -m http.server`).
 */
(function () {
  'use strict';

  window.Modaresina = {
    whatsapp: 'https://wa.me/201099879820',
    phone: '01099879820',
    routes: { login: 'login.html', register: 'register.html' }
  };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===================== MAlert (big alert) ===================== */
  var ICONS = {
    success: '<svg class="ma-icon" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="60" cy="60" r="54"/><path class="t1" d="M30 62L45 77L72 45"/><path class="t2" d="M58 74L63 79L92 44"/></svg>',
    error: '<svg class="ma-icon" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="60" cy="60" r="54"/><path class="t1" d="M43 43L77 77"/><path class="t2" d="M77 43L43 77"/></svg>'
  };
  var current = null;

  function closeAlert() {
    if (!current) return;
    var c = current; current = null;
    clearTimeout(c.timer);
    c.root.removeEventListener('keydown', c.onKey);
    c.root.classList.add('out');
    document.body.classList.remove('ma-open');
    setTimeout(function () { c.root.remove(); }, reduce ? 0 : 180);
    if (c.opts.onClose) c.opts.onClose();
    else if (c.prev && c.prev.focus && document.contains(c.prev)) c.prev.focus();
  }

  /**
   * MAlert.show({ type:'success'|'error', title, text:string|string[], duration:ms,
   *               actions:[{label, href?, newTab?, primary?, wa?, icon?}], onClose })
   * The first action without href closes the alert. The bottom line is the countdown;
   * hovering/focusing pauses it. Closing (button, Esc, timeout) runs onClose once.
   */
  function showAlert(opts) {
    if (current) closeAlert();
    var root = document.createElement('div');
    root.className = 'm-alert is-' + opts.type;
    root.innerHTML = '<div class="ma-card" role="alertdialog" aria-modal="true" aria-labelledby="ma-t" aria-describedby="ma-d" tabindex="-1">' +
      ICONS[opts.type] + '<h2 class="ma-title" id="ma-t"></h2><div class="ma-body" id="ma-d"></div><div class="ma-actions"></div>' +
      '<div class="ma-bar" aria-hidden="true"><span></span></div></div>';
    var card = root.firstChild;
    card.querySelector('.ma-title').textContent = opts.title;
    [].concat(opts.text || []).forEach(function (t) {
      var p = document.createElement('p'); p.textContent = t; card.querySelector('.ma-body').appendChild(p);
    });
    var actions = opts.actions && opts.actions.length ? opts.actions : [{ label: 'حسنًا', primary: true }];
    actions.forEach(function (a) {
      var el = document.createElement(a.href ? 'a' : 'button');
      el.className = 'ma-btn' + (a.primary ? ' primary' : '') + (a.wa ? ' wa' : '');
      if (a.href) { el.href = a.href; if (a.newTab) { el.target = '_blank'; el.rel = 'noopener noreferrer'; } }
      else { el.type = 'button'; el.addEventListener('click', closeAlert); }
      if (a.icon) { var i = document.createElement('i'); i.className = 'bi ' + a.icon; i.setAttribute('aria-hidden', 'true'); el.appendChild(i); }
      el.appendChild(document.createTextNode(a.label));
      card.querySelector('.ma-actions').appendChild(el);
    });

    var bar = card.querySelector('.ma-bar span'), dur = opts.duration || 6000, timer = null;
    if (opts.duration === 0) card.querySelector('.ma-bar').hidden = true;
    else if (reduce) timer = setTimeout(closeAlert, dur);
    else { bar.style.animationDuration = dur + 'ms'; bar.addEventListener('animationend', closeAlert); }

    var ctx = current = { root: root, opts: opts, prev: document.activeElement, timer: timer };
    ctx.onKey = function (e) {
      if (e.key === 'Escape') { closeAlert(); return; }
      if (e.key === 'Tab') {
        var f = card.querySelectorAll('a[href],button'); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    root.addEventListener('keydown', ctx.onKey);
    document.body.appendChild(root);
    document.body.classList.add('ma-open');
    var primary = card.querySelector('.ma-btn'); (primary || card).focus();
  }
  window.MAlert = { show: showAlert, close: closeAlert };

  /* ===================== Scroll lines ===================== */
  var topBar = document.createElement('div');
  topBar.className = 'scroll-progress'; topBar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(topBar);
  var navBar = null, ticking = false;
  function update() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    var t = 'scaleX(' + p + ')';
    topBar.style.transform = t;
    if (navBar) navBar.style.transform = t;
    ticking = false;
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /* ===================== Partials ===================== */
  function load(slotId, url, done) {
    var slot = document.getElementById(slotId);
    if (!slot) return;
    fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) { slot.innerHTML = html; if (done) done(slot); })
      .catch(function () { slot.innerHTML = '<p class="layout-fail">تعذّر تحميل ' + url + ' — شغّل المشروع عبر سيرفر محلي (Live Server).</p>'; });
  }

  load('site-navbar', 'nav.html', function (slot) {
    var page = location.pathname.split('/').pop() || 'index.html';
    slot.querySelectorAll('a[data-nav]').forEach(function (a) {
      if (a.getAttribute('href') === page) a.setAttribute('aria-current', 'page');
    });
    navBar = slot.querySelector('.nav-progress span');
    var burger = slot.querySelector('#navBurger'), menu = slot.querySelector('#mobileMenu');
    function setMenu(open) {
      menu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
      burger.firstElementChild.className = 'bi ' + (open ? 'bi-x-lg' : 'bi-list');
    }
    burger.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); burger.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (menu.classList.contains('open') && !e.target.closest('.site-nav')) setMenu(false);
    });
    window.matchMedia('(min-width: 768px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
    if (window.MaderesinaTheme) window.MaderesinaTheme.sync();
    update();
  });

  load('site-footer', 'footer.html', function (slot) {
    var y = slot.querySelector('#footerYear'); if (y) y.textContent = new Date().getFullYear();
    var f = slot.querySelector('.site-footer');
    if (f && 'IntersectionObserver' in window) {   // heartbeat runs only while visible
      new IntersectionObserver(function (en) { f.classList.toggle('in-view', en[0].isIntersecting); }).observe(f);
    }
    update();
  });
})();
