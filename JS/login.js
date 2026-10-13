/*
 * JS/login.js — login form (client side).
 * BACKEND: connect the real API only inside loginAccount(). Set API_ENDPOINT.
 * DEMO = true checks the fake accounts below (DEMO ONLY: never ship real
 * credentials or password checks in client code). Set DEMO = false for production.
 * Never store passwords or tokens in localStorage.
 */
(function () {
  'use strict';

  var DEMO = true;
  var API_ENDPOINT = null;          // e.g. '/api/login'
  var AFTER_LOGIN_URL = null;       // e.g. 'dashboard.html' once that page exists
  var PHONE_RE = /^01[0125]\d{8}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var DEMO_ACCOUNTS = [
    { ids: ['student@demo.com', '01012345678'], password: 'Student@123', name: 'أحمد', role: 'طالب' },
    { ids: ['teacher@demo.com', '01212345678'], password: 'Teacher@123', name: 'سارة', role: 'مدرس' }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var form = $('loginForm'), idEl = $('identifier'), pwEl = $('password');
  var btn = form.querySelector('button[type="submit"]'), busy = false;

  function normDigits(s) {
    return String(s).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; });
  }
  function normId(v) {
    v = v.trim();
    return v.indexOf('@') > -1 ? v.toLowerCase() : normDigits(v).replace(/[\s-]/g, '');
  }
  function setError(el, msg) {
    $(el.id + '-err').textContent = msg || '';
    el.classList.toggle('has-error', !!msg);
    if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  function checkId() {
    var v = normId(idEl.value), m = '';
    if (!v) m = 'من فضلك اكتب البريد الإلكتروني أو رقم التليفون.';
    else if (v.indexOf('@') > -1 ? !EMAIL_RE.test(v) : !PHONE_RE.test(v)) m = 'اكتب بريدًا إلكترونيًا صحيحًا أو رقم موبايل مصري من 11 رقم.';
    setError(idEl, m); return !m;
  }
  function checkPw() {
    var m = pwEl.value ? '' : 'من فضلك اكتب كلمة المرور.';
    setError(pwEl, m); return !m;
  }

  /**
   * ======================= BACKEND INTEGRATION POINT =======================
   * Resolve with the user info on success; throw on failure. Use err.status === 401
   * (or your API's equivalent) for wrong credentials. Never log the payload.
   * ==========================================================================
   */
  async function loginAccount(payload) {
    if (API_ENDPOINT) {
      var res = await fetch(API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload) });
      if (!res.ok) { var er = new Error('HTTP_' + res.status); er.status = res.status; throw er; }
      return res.json();
    }
    if (!DEMO) { var e = new Error('BACKEND_NOT_CONFIGURED'); e.code = 'BACKEND_NOT_CONFIGURED'; throw e; }
    await new Promise(function (r) { setTimeout(r, 800); });          // fake network delay
    if (payload.identifier === 'fail@demo.com') { var se = new Error('HTTP_500'); se.status = 500; throw se; }
    var acc = DEMO_ACCOUNTS.filter(function (a) { return a.ids.indexOf(payload.identifier) > -1 && a.password === payload.password; })[0];
    if (!acc) { var ue = new Error('HTTP_401'); ue.status = 401; throw ue; }
    return { name: acc.name, role: acc.role };
  }

  function errorMessage(err) {
    if (err.status === 401) return 'اسم المستخدم أو كلمة المرور غير صحيحة. راجع بياناتك وحاول مرة أخرى.';
    if (err.code === 'BACKEND_NOT_CONFIGURED') return 'الخادم لم يُربط بعد، لذلك لا يمكن تسجيل الدخول حاليًا.';
    if (err instanceof TypeError) return 'تعذّر الاتصال بالخادم. تأكد من الإنترنت وحاول مرة أخرى.';
    if (err.status >= 500) return 'حصلت مشكلة في الخادم. حاول مرة أخرى بعد قليل.';
    return 'تعذّر تسجيل الدخول. حاول مرة أخرى.';
  }

  function setBusy(on) {
    busy = on; btn.disabled = on; btn.setAttribute('aria-busy', String(on));
    btn.querySelector('.spinner-border').hidden = !on;
    btn.querySelector('.btn-label').textContent = on ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (busy) return;
    var okId = checkId(), okPw = checkPw();
    if (!okId || !okPw) { (okId ? pwEl : idEl).focus(); return; }
    setBusy(true);
    try {
      var user = await loginAccount({ identifier: normId(idEl.value), password: pwEl.value });
      pwEl.value = '';
      MAlert.show({
        type: 'success', title: 'تم تسجيل الدخول بنجاح', duration: 5000,
        text: 'أهلاً بيك' + (user && user.name ? ' ' + user.name : '') + ' في مدرسينا.',
        onClose: function () { if (AFTER_LOGIN_URL) window.location.href = AFTER_LOGIN_URL; }
      });
    } catch (err) {
      pwEl.value = '';
      MAlert.show({ type: 'error', title: 'تعذّر تسجيل الدخول', text: errorMessage(err), duration: 6000,
        onClose: function () { pwEl.focus(); } });
    } finally {
      setBusy(false);
    }
  });

  idEl.addEventListener('blur', function () { if (idEl.value) checkId(); });
  idEl.addEventListener('input', function () { if (idEl.classList.contains('has-error')) checkId(); });
  pwEl.addEventListener('input', function () { if (pwEl.classList.contains('has-error')) checkPw(); });
  form.querySelector('.pw-toggle').addEventListener('click', function (e) {
    var b = e.currentTarget, show = pwEl.type === 'password';
    pwEl.type = show ? 'text' : 'password';
    b.setAttribute('aria-label', show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
    b.firstElementChild.className = 'bi ' + (show ? 'bi-eye-slash' : 'bi-eye');
  });

  if (DEMO) {
    var box = $('demoBox'); box.hidden = false;
    box.innerHTML = '<strong>وضع تجريبي (بيانات وهمية):</strong><br>طالب: <code>student@demo.com</code> / <code>Student@123</code><br>مدرس: <code>teacher@demo.com</code> / <code>Teacher@123</code><br>أي بيانات غير ذلك تعطي خطأ، و<code>fail@demo.com</code> يعطي خطأ خادم.<br>' +
      '<button type="button" data-fill="0">تعبئة حساب الطالب</button><button type="button" data-fill="1">تعبئة حساب المدرس</button>';
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-fill]'); if (!b) return;
      var a = DEMO_ACCOUNTS[+b.dataset.fill];
      idEl.value = a.ids[0]; pwEl.value = a.password; setError(idEl, ''); setError(pwEl, '');
    });
  }
})();
