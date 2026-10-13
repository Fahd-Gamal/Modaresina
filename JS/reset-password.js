/*
 * JS/reset-password.js — 3-step password reset (client side): email -> code -> new password.
 * BACKEND: connect the real API only inside sendCode(), verifyCode() and resetPassword().
 * DEMO = true uses fake behaviour (code is always 123456). Set DEMO = false for production.
 * Never store passwords, codes or tokens in localStorage.
 */
(function () {
  'use strict';

  var DEMO = true;
  var API = { send: null, verify: null, reset: null };   // e.g. '/api/password/send-code'
  var LOGIN_URL = 'login.html';
  var DEMO_CODE = '123456';
  var CODE_LEN = 6, MIN_PW = 8, RESEND_SECONDS = 30;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var $ = function (id) { return document.getElementById(id); };
  var forms = { 1: $('formEmail'), 2: $('formCode'), 3: $('formPw') };
  var emailEl = $('email'), codeEl = $('code'), pwEl = $('newPw'), cfEl = $('confirmPw');
  var descEl = $('resetDesc'), stepsEl = $('steps'), resendBtn = $('resend');
  var DESC = {
    1: 'اكتب بريدك الإلكتروني وهنبعتلك كود تأكيد.',
    2: 'اكتب الكود المكوّن من ' + CODE_LEN + ' أرقام الذي وصلك.',
    3: 'اختار كلمة مرور جديدة لحسابك.'
  };
  var state = { step: 1, email: '', resetToken: null, busy: false, timer: null };

  function normDigits(s) {
    return String(s).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; });
  }
  function setError(el, msg) {
    $(el.id + '-err').textContent = msg || '';
    el.classList.toggle('has-error', !!msg);
    if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function post(url, body) {
    var res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
    if (!res.ok) { var er = new Error('HTTP_' + res.status); er.status = res.status; throw er; }
    return res.json().catch(function () { return {}; });
  }

  /* ======================= BACKEND INTEGRATION POINTS =======================
   * Each one resolves on success and throws on failure (err.status = HTTP status).
   * sendCode: email the code.  verifyCode: check it, return { token } if your API
   * issues a reset token.  resetPassword: set the new password (send the token).
   * Do not reveal whether an email has an account. Never log the payloads.
   * ========================================================================== */
  async function sendCode(email) {
    if (API.send) return post(API.send, { email: email });
    if (!DEMO) { var e = new Error('BACKEND_NOT_CONFIGURED'); e.code = 'BACKEND_NOT_CONFIGURED'; throw e; }
    await delay(800);
    if (email === 'fail@demo.com') { var se = new Error('HTTP_500'); se.status = 500; throw se; }
    return {};
  }
  async function verifyCode(email, code) {
    if (API.verify) return post(API.verify, { email: email, code: code });
    if (!DEMO) { var e = new Error('BACKEND_NOT_CONFIGURED'); e.code = 'BACKEND_NOT_CONFIGURED'; throw e; }
    await delay(700);
    if (code !== DEMO_CODE) { var ue = new Error('HTTP_400'); ue.status = 400; throw ue; }
    return { token: 'demo-token' };
  }
  async function resetPassword(email, token, password) {
    if (API.reset) return post(API.reset, { email: email, token: token, password: password });
    if (!DEMO) { var e = new Error('BACKEND_NOT_CONFIGURED'); e.code = 'BACKEND_NOT_CONFIGURED'; throw e; }
    await delay(900);
    return {};
  }

  function errorMessage(err, what) {
    if (err.status === 400 || err.status === 401 || err.status === 422) return 'الكود غير صحيح أو انتهت صلاحيته. راجع الكود أو اطلب كود جديد.';
    if (err.status === 429) return 'محاولات كتير. استنى شوية وحاول تاني.';
    if (err.code === 'BACKEND_NOT_CONFIGURED') return 'الخادم لم يُربط بعد، لذلك لا يمكن إكمال العملية حاليًا.';
    if (err instanceof TypeError) return 'تعذّر الاتصال بالخادم. تأكد من الإنترنت وحاول مرة أخرى.';
    if (err.status >= 500) return 'حصلت مشكلة في الخادم. حاول مرة أخرى بعد قليل.';
    return what;
  }

  function setBusy(form, on, busyText) {
    state.busy = on;
    var b = form.querySelector('button[type="submit"]'), lbl = b.querySelector('.btn-label');
    if (on) { b.dataset.label = lbl.textContent; lbl.textContent = busyText; } else if (b.dataset.label) lbl.textContent = b.dataset.label;
    b.disabled = on; b.setAttribute('aria-busy', String(on));
    b.querySelector('.spinner-border').hidden = !on;
  }

  function goTo(n, focusEl) {
    state.step = n;
    [1, 2, 3].forEach(function (i) { forms[i].hidden = i !== n; });
    stepsEl.querySelectorAll('li').forEach(function (li) {
      var s = +li.dataset.step;
      li.classList.toggle('is-active', s === n);
      li.classList.toggle('is-done', s < n);
      if (s === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    descEl.textContent = DESC[n];
    if (focusEl) focusEl.focus();
  }

  function startCooldown() {
    clearInterval(state.timer);
    var left = RESEND_SECONDS;
    resendBtn.disabled = true;
    function tick() {
      if (left <= 0) { clearInterval(state.timer); resendBtn.disabled = false; resendBtn.textContent = 'إعادة إرسال الكود'; return; }
      resendBtn.textContent = 'إعادة الإرسال بعد ' + left + ' ث'; left--;
    }
    tick(); state.timer = setInterval(tick, 1000);
  }

  /* ---------- Step 1: email ---------- */
  function checkEmail() {
    var v = emailEl.value.trim().toLowerCase(), m = '';
    if (!v) m = 'من فضلك اكتب البريد الإلكتروني.';
    else if (!EMAIL_RE.test(v)) m = 'اكتب بريدًا إلكترونيًا صحيحًا.';
    setError(emailEl, m); return !m;
  }
  forms[1].addEventListener('submit', async function (e) {
    e.preventDefault();
    if (state.busy) return;
    if (!checkEmail()) { emailEl.focus(); return; }
    var email = emailEl.value.trim().toLowerCase();
    setBusy(forms[1], true, 'جارٍ الإرسال…');
    try {
      await sendCode(email);
      state.email = email; codeEl.value = ''; setError(codeEl, '');
      $('codeHint').textContent = 'أرسلنا الكود إلى ' + email;
      goTo(2, codeEl); startCooldown();
    } catch (err) {
      MAlert.show({ type: 'error', title: 'تعذّر إرسال الكود', text: errorMessage(err, 'تعذّر إرسال الكود. حاول مرة أخرى.'), duration: 6000, onClose: function () { emailEl.focus(); } });
    } finally { setBusy(forms[1], false); }
  });
  emailEl.addEventListener('blur', function () { if (emailEl.value) checkEmail(); });
  emailEl.addEventListener('input', function () { if (emailEl.classList.contains('has-error')) checkEmail(); });

  /* ---------- Step 2: code ---------- */
  function cleanCode() { return normDigits(codeEl.value).replace(/\D/g, '').slice(0, CODE_LEN); }
  function checkCode() {
    var v = cleanCode(), m = '';
    if (!v) m = 'من فضلك اكتب كود التأكيد.';
    else if (v.length < CODE_LEN) m = 'الكود لازم يكون ' + CODE_LEN + ' أرقام.';
    setError(codeEl, m); return !m;
  }
  codeEl.addEventListener('input', function () {
    codeEl.value = cleanCode();
    if (codeEl.classList.contains('has-error')) checkCode();
  });
  forms[2].addEventListener('submit', async function (e) {
    e.preventDefault();
    if (state.busy) return;
    if (!checkCode()) { codeEl.focus(); return; }
    setBusy(forms[2], true, 'جارٍ التأكيد…');
    try {
      var r = await verifyCode(state.email, cleanCode());
      state.resetToken = (r && r.token) || null;
      pwEl.value = ''; cfEl.value = ''; setError(pwEl, ''); setError(cfEl, '');
      goTo(3, pwEl);
    } catch (err) {
      codeEl.value = '';
      MAlert.show({ type: 'error', title: 'كود غير صحيح', text: errorMessage(err, 'تعذّر تأكيد الكود. حاول مرة أخرى.'), duration: 6000, onClose: function () { codeEl.focus(); } });
    } finally { setBusy(forms[2], false); }
  });
  resendBtn.addEventListener('click', async function () {
    if (state.busy || resendBtn.disabled) return;
    resendBtn.disabled = true;
    try {
      await sendCode(state.email);
      codeEl.value = ''; setError(codeEl, ''); codeEl.focus();
      $('codeHint').textContent = 'أعدنا إرسال الكود إلى ' + state.email;
      startCooldown();
    } catch (err) {
      resendBtn.disabled = false;
      MAlert.show({ type: 'error', title: 'تعذّر إرسال الكود', text: errorMessage(err, 'تعذّر إعادة إرسال الكود.'), duration: 6000 });
    }
  });
  $('changeEmail').addEventListener('click', function () { clearInterval(state.timer); goTo(1, emailEl); });

  /* ---------- Step 3: new password ---------- */
  function checkPw() {
    var v = pwEl.value, m = !v ? 'من فضلك اكتب كلمة المرور الجديدة.' : (v.length < MIN_PW ? 'كلمة المرور لازم تكون ' + MIN_PW + ' أحرف على الأقل.' : '');
    setError(pwEl, m); return !m;
  }
  function checkCf() {
    var m = !cfEl.value ? 'من فضلك أكّد كلمة المرور.' : (cfEl.value !== pwEl.value ? 'كلمتا المرور غير متطابقتين.' : '');
    setError(cfEl, m); return !m;
  }
  pwEl.addEventListener('input', function () { if (pwEl.classList.contains('has-error')) checkPw(); if (cfEl.value) checkCf(); });
  cfEl.addEventListener('input', function () { if (cfEl.classList.contains('has-error') || cfEl.value) checkCf(); });
  forms[3].addEventListener('submit', async function (e) {
    e.preventDefault();
    if (state.busy) return;
    var okP = checkPw(), okC = checkCf();
    if (!okP || !okC) { (okP ? cfEl : pwEl).focus(); return; }
    setBusy(forms[3], true, 'جارٍ التغيير…');
    try {
      await resetPassword(state.email, state.resetToken, pwEl.value);
      pwEl.value = ''; cfEl.value = ''; state.resetToken = null;
      MAlert.show({
        type: 'success', title: 'تم تغيير كلمة المرور بنجاح', duration: 5000,
        text: 'تقدر دلوقتي تسجّل الدخول بكلمة المرور الجديدة.',
        actions: [{ label: 'الذهاب لتسجيل الدخول', primary: true }],
        onClose: function () { window.location.href = LOGIN_URL; }
      });
    } catch (err) {
      MAlert.show({ type: 'error', title: 'تعذّر تغيير كلمة المرور', text: errorMessage(err, 'تعذّر تغيير كلمة المرور. حاول مرة أخرى.'), duration: 6000, onClose: function () { pwEl.focus(); } });
    } finally { setBusy(forms[3], false); }
  });
  document.querySelectorAll('.pw-toggle').forEach(function (b) {
    b.addEventListener('click', function () {
      var input = $(b.dataset.toggle), show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      b.setAttribute('aria-label', show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
      b.firstElementChild.className = 'bi ' + (show ? 'bi-eye-slash' : 'bi-eye');
    });
  });

  if (DEMO) {
    var box = $('demoBox'); box.hidden = false;
    box.innerHTML = '<strong>وضع تجريبي (بيانات وهمية):</strong><br>اكتب أي بريد صحيح، والكود دايمًا <code>' + DEMO_CODE + '</code>.<br><code>fail@demo.com</code> يعطي خطأ خادم.<br>' +
      '<button type="button" id="fillEmail">تعبئة بريد تجريبي</button>';
    box.addEventListener('click', function (e) {
      if (!e.target.closest('#fillEmail')) return;
      if (state.step === 1) { emailEl.value = 'student@demo.com'; setError(emailEl, ''); }
      else if (state.step === 2) { codeEl.value = DEMO_CODE; setError(codeEl, ''); }
      else { pwEl.value = 'Demo@12345'; cfEl.value = 'Demo@12345'; setError(pwEl, ''); setError(cfEl, ''); }
    });
    $('fillEmail').textContent = 'تعبئة بيانات هذه الخطوة';
  }
})();
