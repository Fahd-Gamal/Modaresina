/*
 * js/theme.js — single source of truth for light/dark theme.
 * Load in <head> (no defer) so the theme is applied before first paint.
 * Only the theme name ("light" | "dark") is stored. Never store passwords,
 * tokens or form data here.
 */
(function () {
  'use strict';
  var KEY = 'maderesina-theme';
  var root = document.documentElement;

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function save(theme) {
    try { localStorage.setItem(KEY, theme); } catch (e) { /* storage unavailable: ignore */ }
  }
  function preferred() {
    var s = read();
    if (s === 'light' || s === 'dark') return s;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function current() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }
  function syncButtons() {
    var dark = current() === 'dark';
    var label = dark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن';
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-label', label);
      buttons[i].setAttribute('title', label);
    }
  }
  function apply(theme, persist) {
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-bs-theme', theme); // keeps Bootstrap components in sync
    root.style.colorScheme = theme;
    if (persist) save(theme);
    syncButtons();
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
  }

  apply(preferred(), false);

  // Delegated, so toggles injected later (navbar) work automatically.
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (btn) apply(current() === 'dark' ? 'light' : 'dark', true);
  });
  // Keep other open tabs in agreement.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY && (e.newValue === 'light' || e.newValue === 'dark')) apply(e.newValue, false);
  });

  window.MaderesinaTheme = { get: current, set: function (t) { apply(t, true); }, sync: syncButtons };
})();
