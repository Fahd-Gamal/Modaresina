/*
 * JS/register.js — student/teacher registration (client side).
 *
 * BACKEND: connect the real API only inside registerAccount(). Set API_ENDPOINT.
 * DEMO = true uses the fake in-memory "server" below so you can test every case
 * (success, duplicate data, server error). Set DEMO = false for production.
 * Always re-validate and normalize on the server.
 */
(function () {
  'use strict';

  var APP = window.Modaresina;
  var DEMO = true;
  var API_ENDPOINT = null; // e.g. '/api/register'
  var MIN_PW = 8;
  var PHONE_RE = /^01[0125]\d{8}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // Fake demo data (DEMO only): these already "exist" on the demo server.
  var DEMO_TAKEN_EMAILS = ['student@demo.com', 'teacher@demo.com'];
  var DEMO_TAKEN_PHONES = ['01012345678', '01212345678'];
  var DEMO_SERVER_ERROR_EMAIL = 'fail@demo.com';

  var GOVS = ['القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية', 'الشرقية', 'الدقهلية', 'البحيرة', 'المنوفية', 'الغربية',
    'كفر الشيخ', 'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس', 'شمال سيناء', 'جنوب سيناء', 'الفيوم', 'بني سويف',
    'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح'];

  var STAGES = {
    primary: { label: 'ابتدائي', grades: ['الصف الأول الابتدائي', 'الصف الثاني الابتدائي', 'الصف الثالث الابتدائي', 'الصف الرابع الابتدائي', 'الصف الخامس الابتدائي', 'الصف السادس الابتدائي'] },
    preparatory: { label: 'إعدادي', grades: ['الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي'] },
    secondary: { label: 'ثانوي', grades: ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'] }
  };

  var M = {
    phoneEmpty: 'من فضلك اكتب رقم التليفون.',
    phoneBad: 'رقم التليفون غير صحيح. لازم يكون 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015.',
    emailEmpty: 'من فضلك اكتب البريد الإلكتروني.',
    emailBad: 'البريد الإلكتروني غير صحيح. مثال: name@example.com',
    pwEmpty: 'من فضلك اكتب كلمة المرور.',
    pwShort: 'كلمة المرور لازم تكون ' + MIN_PW + ' أحرف على الأقل.',
    confEmpty: 'من فضلك أكّد كلمة المرور.',
    confBad: 'كلمتا المرور غير متطابقتين.',
    gradeStage: 'اختر المرحلة الدراسية أولاً.',
    gradeBad: 'الصف المختار لا يتبع المرحلة الدراسية.'
  };

  var ROLES = {
    student: {
      title: 'انضم إلى مدرسينا',
      desc: 'سجّل حسابك كطالب، وابدأ تتواصل مع مدرسينك وتذاكر بشكل أسهل وأكتر تنظيمًا.',
      legend: 'بيانات حساب الطالب', submit: 'إنشاء حساب الطالب',
      fields: [
        { n: 'firstName', l: 'الاسم الأول', k: 'text', ac: 'given-name', req: 'من فضلك اكتب الاسم الأول.' },
        { n: 'guardianName', l: 'اسم ولي الأمر', k: 'text', ac: 'off', req: 'من فضلك اكتب اسم ولي الأمر.' },
        { n: 'phone', l: 'رقم تليفون الطالب', k: 'tel', ac: 'tel' },
        { n: 'guardianPhone', l: 'رقم تليفون ولي الأمر', k: 'tel', ac: 'off' },
        { n: 'email', l: 'البريد الإلكتروني', k: 'email', ac: 'email', full: true },
        { n: 'stage', l: 'المرحلة الدراسية', k: 'select', ph: 'اختر المرحلة', req: 'من فضلك اختر المرحلة الدراسية.' },
        { n: 'grade', l: 'الصف الدراسي', k: 'select', ph: 'اختر المرحلة أولاً', req: 'من فضلك اختر الصف الدراسي.' },
        { n: 'password', l: 'كلمة المرور', k: 'password' },
        { n: 'confirmPassword', l: 'تأكيد كلمة المرور', k: 'confirm' }
      ]
    },
    teacher: {
      title: 'انضم إلى مدرسينا كمدرس',
      desc: 'أنشئ حساب المدرس، وسنراجع بياناتك ونتواصل معك لاستكمال تفعيل الحساب.',
      legend: 'بيانات حساب المدرس', submit: 'إنشاء حساب المدرس',
      fields: [
        { n: 'firstName', l: 'الاسم الأول', k: 'text', ac: 'given-name', req: 'من فضلك اكتب الاسم الأول.' },
        { n: 'lastName', l: 'الاسم الثاني', k: 'text', ac: 'family-name', req: 'من فضلك اكتب الاسم الثاني.' },
        { n: 'phone', l: 'رقم التليفون', k: 'tel', ac: 'tel', full: true },
        { n: 'email', l: 'البريد الإلكتروني', k: 'email', ac: 'email', full: true },
        { n: 'governorate', l: 'المحافظة', k: 'select', ph: 'اختر المحافظة', req: 'من فضلك اختر المحافظة.', full: true },
        { n: 'password', l: 'كلمة المرور', k: 'password' },
        { n: 'confirmPassword', l: 'تأكيد كلمة المرور', k: 'confirm' }
      ]
    }
  };
  var SHARED = ['firstName', 'phone', 'email', 'password', 'confirmPassword']; // carried over when switching

  var $ = function (id) { return document.getElementById(id); };
  var forms = { student: $('studentForm'), teacher: $('teacherForm') };
  var seg = $('seg'), tabs = { student: $('tab-student'), teacher: $('tab-teacher') };
  var side = $('side'), state = { role: 'student', busy: false };

  /* ------------------------- helpers ------------------------- */
  function normDigits(s) {
    return String(s).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; })
      .replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; });
  }
  function normPhone(s) { return normDigits(s).replace(/[\s-]/g, ''); }
  function fieldDef(role, name) { return ROLES[role].fields.filter(function (f) { return f.n === name; })[0]; }
  function ctl(role, name) { return forms[role].elements[name]; }

  /* ------------------------- rendering ------------------------- */
  function fieldHTML(role, f) {
    var id = role + '-' + f.n, h = id + '-hint', e = id + '-err';
    var base = ' id="' + id + '" name="' + f.n + '" required aria-describedby="' + h + ' ' + e + '"';
    var control, hint = '';
    if (f.k === 'select') {
      var opts = '<option value="" disabled selected>' + f.ph + '</option>';
      if (f.n === 'governorate') opts += GOVS.map(function (g) { return '<option value="' + g + '">' + g + '</option>'; }).join('');
      if (f.n === 'stage') opts += Object.keys(STAGES).map(function (k) { return '<option value="' + k + '">' + STAGES[k].label + '</option>'; }).join('');
      control = '<select class="form-select"' + base + (f.n === 'grade' ? ' disabled' : '') + '>' + opts + '</select>';
    } else if (f.k === 'password' || f.k === 'confirm') {
      control = '<div class="pw-wrap"><input class="form-control ltr" type="password"' + base + ' autocomplete="new-password" autocapitalize="off" spellcheck="false">' +
        '<button type="button" class="pw-toggle" data-toggle="' + id + '" aria-controls="' + id + '" aria-label="إظهار كلمة المرور"><i class="bi bi-eye" aria-hidden="true"></i></button></div>';
      if (f.k === 'password') {
        control += '<div class="meter" id="' + id + '-meter" data-level="0" aria-hidden="true"><span></span><span></span><span></span></div>';
        hint = MIN_PW + ' أحرف على الأقل. الأفضل تجمع بين حروف وأرقام.';
      }
    } else if (f.k === 'tel') {
      control = '<input class="form-control ltr" type="tel" inputmode="numeric" maxlength="11" placeholder="01xxxxxxxxx" autocomplete="' + f.ac + '"' + base + '>';
      hint = '11 رقم، مثال: 01012345678';
    } else if (f.k === 'email') {
      control = '<input class="form-control ltr" type="email" inputmode="email" autocomplete="email" placeholder="name@example.com"' + base + ' spellcheck="false">';
    } else {
      control = '<input class="form-control" type="text" autocomplete="' + f.ac + '"' + base + '>';
    }
    return '<div class="fld' + (f.full ? ' full' : '') + '"><label for="' + id + '">' + f.l + '</label>' + control +
      '<div class="hint" id="' + h + '">' + hint + '</div><div class="err" id="' + e + '" aria-live="polite"></div></div>';
  }

  function render(role) {
    var R = ROLES[role];
    forms[role].innerHTML = '<fieldset class="fs"><legend class="visually-hidden">' + R.legend + '</legend><div class="fgrid">' +
      R.fields.map(function (f) { return fieldHTML(role, f); }).join('') + '</div></fieldset>' +
      '<button class="btn-brand w-100 mt-4" type="submit"><span class="spinner-border spinner-border-sm" aria-hidden="true" hidden></span><span class="btn-label">' + R.submit + '</span></button>';
    forms[role].addEventListener('input', function (e) { onInput(role, e); });
    forms[role].addEventListener('focusout', function (e) { onBlur(role, e); });
    forms[role].addEventListener('click', onToggleClick);
    forms[role].addEventListener('submit', function (e) { e.preventDefault(); onSubmit(role); });
  }

  /* ------------------------- validation ------------------------- */
  function check(role, f, v) {
    var form = forms[role];
    switch (f.k) {
      case 'text': return v.trim() ? '' : f.req;
      case 'tel': return !v.trim() ? M.phoneEmpty : (PHONE_RE.test(normPhone(v)) ? '' : M.phoneBad);
      case 'email': return !v.trim() ? M.emailEmpty : (EMAIL_RE.test(v.trim()) ? '' : M.emailBad);
      case 'password': return !v ? M.pwEmpty : (v.length < MIN_PW ? M.pwShort : '');
      case 'confirm': return !v ? M.confEmpty : (v !== form.elements.password.value ? M.confBad : '');
      case 'select':
        if (f.n === 'governorate') return GOVS.indexOf(v) > -1 ? '' : f.req;
        if (f.n === 'stage') return STAGES[v] ? '' : f.req;
        if (f.n === 'grade') {
          var s = form.elements.stage.value;
          if (!s) return M.gradeStage;
          if (!v) return f.req;
          return STAGES[s].grades.indexOf(v) > -1 ? '' : M.gradeBad;
        }
    }
    return '';
  }
  function setError(el, msg) {
    $(el.id + '-err').textContent = msg || '';
    el.classList.toggle('has-error', !!msg);
    if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  function validateField(role, name) {
    var f = fieldDef(role, name), el = ctl(role, name);
    if (name === 'grade' && el.disabled) { setError(el, ''); return true; } // stage error covers it
    var msg = check(role, f, el.value);
    setError(el, msg);
    return !msg;
  }
  function validateAll(role) {
    var first = null;
    ROLES[role].fields.forEach(function (f) {
      var el = ctl(role, f.n);
      el.dataset.touched = '1';
      if (!validateField(role, f.n) && !first) first = el;
    });
    if (first) first.focus();
    return !first;
  }

  function strength(p) {
    if (!p) return { lv: 0, t: '' };
    if (p.length < MIN_PW) return { lv: 1, t: 'قصيرة — ' + MIN_PW + ' أحرف على الأقل' };
    var score = (/\p{Ll}|\p{Lo}/u.test(p) ? 1 : 0) + (/\p{Lu}/u.test(p) ? 1 : 0) + (/\d/.test(p) ? 1 : 0) + (/[^\p{L}\d]/u.test(p) ? 1 : 0) + (p.length >= 12 ? 1 : 0);
    if (score >= 4) return { lv: 3, t: 'قوية' };
    if (score >= 2) return { lv: 2, t: 'مقبولة — أضف أرقامًا أو رموزًا لتصبح أقوى' };
    return { lv: 1, t: 'ضعيفة — أضف أرقامًا أو حروفًا مختلفة' };
  }
  function updateMeter(el) {
    var s = strength(el.value), m = $(el.id + '-meter');
    if (m) m.setAttribute('data-level', s.lv);
    $(el.id + '-hint').textContent = s.lv ? 'قوة كلمة المرور: ' + s.t : MIN_PW + ' أحرف على الأقل. الأفضل تجمع بين حروف وأرقام.';
  }

  /* ------------------------- events ------------------------- */
  function onInput(role, e) {
    var el = e.target, form = forms[role];
    if (!el.name) return;
    if (el.type === 'tel') {
      var n = normDigits(el.value).replace(/\D/g, '');
      if (n !== el.value) el.value = n;
    }
    if (el.name === 'stage') updateGrades(role);
    if (el.name === 'password') {
      updateMeter(el);
      if (form.elements.confirmPassword.dataset.touched) validateField(role, 'confirmPassword');
    }
    if (el.dataset.touched || el.classList.contains('has-error')) validateField(role, el.name);
  }
  function onBlur(role, e) {
    var el = e.target;
    if (!el.name || el.type === 'button') return;
    el.dataset.touched = '1';
    validateField(role, el.name);
  }
  function onToggleClick(e) {
    var b = e.target.closest('[data-toggle]');
    if (!b) return;
    var input = $(b.dataset.toggle), show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.setAttribute('aria-label', show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
    b.firstElementChild.className = 'bi ' + (show ? 'bi-eye-slash' : 'bi-eye');
  }

  function updateGrades(role) {
    var form = forms[role], s = form.elements.stage.value, g = form.elements.grade;
    g.innerHTML = '<option value="" disabled selected>' + (s ? 'اختر الصف الدراسي' : 'اختر المرحلة أولاً') + '</option>' +
      (s ? STAGES[s].grades.map(function (x) { return '<option value="' + x + '">' + x + '</option>'; }).join('') : '');
    g.disabled = !s;
    g.value = '';
    delete g.dataset.touched;
    setError(g, '');
  }

  /* ------------------------- role switching ------------------------- */
  function setRole(role, focusTab) {
    if (role === state.role || state.busy) return;
    var prev = forms[state.role], next = forms[role];
    SHARED.forEach(function (n) {
      var a = prev.elements[n], b = next.elements[n];
      if (a && b && a.value && !b.value) { b.value = a.value; if (n === 'password') updateMeter(b); }
    });
    prev.hidden = true; prev.querySelector('fieldset').disabled = true;   // hidden form can never submit
    next.hidden = false; next.querySelector('fieldset').disabled = false;
    next.classList.remove('panel-in'); void next.offsetWidth; next.classList.add('panel-in');
    state.role = role;
    seg.dataset.active = role === 'teacher' ? '1' : '0';
    Object.keys(tabs).forEach(function (k) {
      tabs[k].setAttribute('aria-selected', String(k === role));
      tabs[k].tabIndex = k === role ? 0 : -1;
    });
    $('regTitle').textContent = ROLES[role].title;
    $('regDesc').textContent = ROLES[role].desc;
    if (side) side.dataset.role = role;
    renderDemo();
    if (focusTab) tabs[role].focus();
  }

  /* ------------------------- submission ------------------------- */
  function buildPayload(role) {
    var f = forms[role].elements, p = { role: role };
    ROLES[role].fields.forEach(function (d) {
      if (d.k === 'confirm') return;               // never send the confirmation
      var v = f[d.n].value;
      if (d.k === 'tel') v = normPhone(v);
      else if (d.k === 'email') v = v.trim().toLowerCase();
      else if (d.k !== 'password') v = v.trim();
      p[d.n] = v;
    });
    return p; // field names are placeholders: align them with the backend contract
  }

  /**
   * ======================= BACKEND INTEGRATION POINT =======================
   * Resolve only on genuine success; throw on failure (err.status, and
   * err.fieldErrors = {fieldName: message} if the API returns them).
   * Never log the payload (it contains a password).
   * ==========================================================================
   */
  async function registerAccount(payload) {
    if (API_ENDPOINT) {
      var res = await fetch(API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload) });
      if (!res.ok) { var er = new Error('HTTP_' + res.status); er.status = res.status; throw er; }
      return res;
    }
    if (!DEMO) { var e = new Error('BACKEND_NOT_CONFIGURED'); e.code = 'BACKEND_NOT_CONFIGURED'; throw e; }
    await new Promise(function (r) { setTimeout(r, 900); });          // fake network delay
    if (payload.email === DEMO_SERVER_ERROR_EMAIL) { var se = new Error('HTTP_500'); se.status = 500; throw se; }
    var fe = {};
    if (DEMO_TAKEN_EMAILS.indexOf(payload.email) > -1) fe.email = 'هذا البريد الإلكتروني مسجّل بالفعل.';
    if (DEMO_TAKEN_PHONES.indexOf(payload.phone) > -1) fe.phone = 'رقم التليفون مسجّل بالفعل.';
    if (Object.keys(fe).length) { var de = new Error('CONFLICT'); de.status = 409; de.fieldErrors = fe; throw de; }
    return { demo: true };
  }

  function errorMessage(err) {
    if (err.code === 'BACKEND_NOT_CONFIGURED') return 'الخادم لم يُربط بعد، لذلك لم يتم حفظ أي بيانات.';
    if (err instanceof TypeError) return 'تعذّر الاتصال بالخادم. تأكد من الإنترنت وحاول مرة أخرى.';
    if (err.status === 409) return 'بعض البيانات مسجّلة بالفعل. راجع الحقول المميزة بالأخطاء.';
    if (err.status >= 500) return 'حصلت مشكلة في الخادم. حاول مرة أخرى بعد قليل.';
    return 'تعذّر إنشاء الحساب. راجع البيانات وحاول مرة أخرى.';
  }

  function setBusy(role, busy) {
    state.busy = busy;
    var btn = forms[role].querySelector('button[type="submit"]');
    btn.disabled = busy;
    btn.setAttribute('aria-busy', String(busy));
    btn.querySelector('.spinner-border').hidden = !busy;
    btn.querySelector('.btn-label').textContent = busy ? 'جارٍ إنشاء الحساب…' : ROLES[role].submit;
    Object.keys(tabs).forEach(function (k) { tabs[k].disabled = busy; });
  }

  async function onSubmit(role) {
    if (state.busy || role !== state.role) return;
    if (!validateAll(role)) return;
    setBusy(role, true);
    try {
      await registerAccount(buildPayload(role));
      showSuccess(role);
    } catch (err) {
      var first = null;
      if (err.fieldErrors) {
        Object.keys(err.fieldErrors).forEach(function (n) { var el = ctl(role, n); if (el) { setError(el, err.fieldErrors[n]); if (!first) first = el; } });
      }
      MAlert.show({ type: 'error', title: 'تعذّر إنشاء الحساب', text: errorMessage(err), duration: 6000,
        onClose: function () { if (first) first.focus(); } });
    } finally {
      setBusy(role, false);
    }
  }

  function resetForm(role) {
    var form = forms[role];
    form.reset();
    ROLES[role].fields.forEach(function (f) { var el = ctl(role, f.n); delete el.dataset.touched; setError(el, ''); });
    var pw = form.elements.password; if (pw) updateMeter(pw);
    if (role === 'student') updateGrades('student');
  }

  /* ------------------------- success alert ------------------------- */
  function showSuccess(role) {
    if (role === 'teacher') {
      var msg = 'السلام عليكم، أنا مدرس سجلت حساب جديد على منصة مدرسينا، وعايز أستفسر عن خطوات مراجعة وتفعيل الحساب.';
      MAlert.show({
        type: 'success', title: 'تم إنشاء الحساب بنجاح', duration: 14000,
        text: ['شكرًا لانضمامك إلى مدرسينا. سيتم مراجعة بياناتك والتواصل معك لاستكمال إجراءات تفعيل حسابك.', 'لو عندك أي استفسار، تقدر تتواصل مع فريق المنصة على واتساب.'],
        actions: [{ label: 'تواصل عبر واتساب ' + APP.phone, href: APP.whatsapp + '?text=' + encodeURIComponent(msg), newTab: true, wa: true, icon: 'bi-whatsapp' }, { label: 'حسنًا', primary: true }],
        onClose: function () { resetForm('teacher'); }
      });
    } else {
      MAlert.show({
        type: 'success', title: 'تم إنشاء حسابك بنجاح', duration: 6000,
        text: 'أهلاً بيك في مدرسينا! تقدر دلوقتي تسجل دخولك وتبدأ رحلتك التعليمية.',
        actions: [{ label: 'حسنًا', primary: true }],
        onClose: function () { window.location.href = APP.routes.login; }
      });
    }
  }

  /* ------------------------- demo helper ------------------------- */
  var DEMO_FILL = {
    student: { firstName: 'أحمد', guardianName: 'محمد علي', phone: '01123456789', guardianPhone: '01234567890', email: 'ahmed.test@example.com', stage: 'secondary', grade: 'الصف الثاني الثانوي', password: 'Demo@12345', confirmPassword: 'Demo@12345' },
    teacher: { firstName: 'سارة', lastName: 'محمود', phone: '01512345678', email: 'sara.test@example.com', governorate: 'القاهرة', password: 'Demo@12345', confirmPassword: 'Demo@12345' }
  };
  function fillDemo(role) {
    var d = DEMO_FILL[role], form = forms[role];
    Object.keys(d).forEach(function (n) {
      if (n === 'grade') return;
      form.elements[n].value = d[n];
      if (n === 'stage') updateGrades(role);
    });
    if (d.grade) form.elements.grade.value = d.grade;
    updateMeter(form.elements.password);
    ROLES[role].fields.forEach(function (f) { delete ctl(role, f.n).dataset.touched; setError(ctl(role, f.n), ''); });
  }
  function renderDemo() {
    var box = $('demoBox');
    if (!DEMO || !box) return;
    box.hidden = false;
    box.innerHTML = '<strong>وضع تجريبي (بيانات وهمية):</strong> لن يتم حفظ أي شيء.<br>' +
      'لاختبار خطأ التكرار استخدم <code>student@demo.com</code>، ولخطأ الخادم استخدم <code>fail@demo.com</code>.<br>' +
      '<button type="button" id="demoFill">تعبئة بيانات تجريبية</button>';
    $('demoFill').addEventListener('click', function () { fillDemo(state.role); });
  }

  /* ------------------------- init ------------------------- */
  render('student');
  render('teacher');
  updateGrades('student');
  forms.teacher.querySelector('fieldset').disabled = true;
  $('regDesc').textContent = ROLES.student.desc;
  renderDemo();

  Object.keys(tabs).forEach(function (k) {
    tabs[k].addEventListener('click', function () { setRole(k, false); });
    tabs[k].addEventListener('keydown', function (e) {
      if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].indexOf(e.key) > -1) {
        e.preventDefault();
        var target = e.key === 'Home' ? 'student' : e.key === 'End' ? 'teacher' : (k === 'student' ? 'teacher' : 'student');
        setRole(target, true);
      }
    });
  });
})();
