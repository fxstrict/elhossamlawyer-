/**
 * ================================================================
 * js/modules/cases.js — وحدة القضايا | نظام الحسام للمحاماة
 * ================================================================
 * Contains ALL Cases-related functions extracted from index.html.
 *
 * Depends on (globals expected from index.html):
 *   - data          : shared app data object  { cases, sessions, documents, clients, … }
 *   - editIdx       : shared edit-index map   { cases: -1 }
 *   - ApiService    : api.js layer
 *   - saveLocal()   : localStorage persistence helper
 *   - toast()       : UI notification helper
 *   - updateBadges(): badge counter updater
 *   - closeModal()  : modal close helper
 *   - formatDate()  : date formatter
 *   - formatTime()  : time formatter
 *   - parseLocalDate(): date parser
 *   - urgencyBadge(): urgency badge builder
 *   - statusBadge() : status badge builder
 *   - val()         : getElementById + .value helper
 *   - collectForm() : overridden below for cases children
 *   - fillForm()    : overridden below for cases children
 *   - resetForm()   : overridden below (case dropdown repopulation)
 *   - populateCaseDropdown() : defined at bottom of this file
 *   - genClientQR() : defined in clients module / third <script> block
 *
 * Does NOT touch:
 *   - CSS / HTML structure
 *   - Other modules (clients, sessions, documents, tasks, fees, …)
 *   - Google Apps Script backend
 *   - Database / sheet structure
 *   - ApiService internals
 * ================================================================
 */

// ================================================================
// FIELDS & MAP — cases slice only
// (Full FIELDS/MAP objects live in index.html; these are the
//  cases-specific entries referenced by renderCases helpers.)
// ================================================================

var CASES_FIELDS = [
  'fCaseNum','fCaseDocketNum','fCaseType','fCaseCourt','fCaseTitle',
  'fCaseClientType','fCaseClient','fCaseClientNID','fCaseClientPhone',
  'fCaseClientAddr','fCaseClientJob','fCaseClientEmployer',
  'fCaseOpponent','fCaseOpponentNID','fCaseOpponentPhone',
  'fCaseOpponentAddr','fCaseOpponentJob','fCaseOpponentEmployer',
  'fCaseStatus','fCaseDate','fCaseNextSession','fCaseFees',
  'fCaseMarriageDate','fCaseMarriageDoc','fCaseNotaryOffice',
  'fCaseHasInventory','fCaseHasChildren',
  'fCaseDemands','fCaseDefenses','fCaseProcedures','fCaseDecisions',
  'fCaseJudgmentDate','fCaseEnforcement','fCaseEnforcementDetails',
  'fCaseNotes'
];

var CASES_MAP = {
  fCaseNum:              'رقم_القضية',
  fCaseDocketNum:        'رقم_الدعوى',
  fCaseType:             'نوع_الدعوى',
  fCaseCourt:            'المحكمة',
  fCaseTitle:            'عنوان_القضية',
  fCaseClientType:       'نوع_الموكل',
  fCaseClient:           'اسم_الموكل',
  fCaseClientNID:        'رقم_قومي_الموكل',
  fCaseClientPhone:      'هاتف_الموكل',
  fCaseClientAddr:       'عنوان_الموكل',
  fCaseClientJob:        'عمل_الموكل',
  fCaseClientEmployer:   'جهة_عمل_الموكل',
  fCaseOpponent:         'اسم_الخصم',
  fCaseOpponentNID:      'رقم_قومي_الخصم',
  fCaseOpponentPhone:    'هاتف_الخصم',
  fCaseOpponentAddr:     'عنوان_الخصم',
  fCaseOpponentJob:      'عمل_الخصم',
  fCaseOpponentEmployer: 'جهة_عمل_الخصم',
  fCaseStatus:           'الحالة',
  fCaseDate:             'تاريخ_القيد',
  fCaseNextSession:      'تاريخ_الجلسة_القادمة',
  fCaseFees:             'أتعاب_المحاماة',
  fCaseMarriageDate:     'تاريخ_عقد_الزواج',
  fCaseMarriageDoc:      'رقم_وثيقة_الزواج',
  fCaseNotaryOffice:     'مكتب_التوثيق',
  fCaseHasInventory:     'وجود_قائمة_منقولات',
  fCaseHasChildren:      'وجود_أطفال',
  fCaseDemands:          'الطلبات_القانونية',
  fCaseDefenses:         'الدفوع_القانونية',
  fCaseProcedures:       'إجراءات_الدعوى',
  fCaseDecisions:        'قرارات_المحكمة',
  fCaseJudgmentDate:     'تاريخ_الحكم',
  fCaseEnforcement:      'رقم_التنفيذ',
  fCaseEnforcementDetails: 'إجراءات_التنفيذ',
  fCaseNotes:            'الملاحظات'
};

// ================================================================
// RENDER — عرض قائمة القضايا
// ================================================================

function renderCases() {
  var s  = val('searchCases').toLowerCase();
  var st = val('filterCaseStatus');
  var ty = val('filterCaseType');

  var rows = data.cases.filter(function(c) {
    var t = Object.values(c).join(' ').toLowerCase();
    return (!s || t.includes(s)) && (!st || c['الحالة'] === st) && (!ty || c['نوع_الدعوى'] === ty);
  });

  var tb = document.getElementById('casesTableBody');
  var em = document.getElementById('casesEmpty');
  var ml = document.getElementById('casesMobileList');
  var cc = document.getElementById('casesCount');

  if (cc) cc.textContent = rows.length > 0 ? rows.length + ' قضية' : 'لا نتائج';

  if (!rows.length) {
    tb.innerHTML = '';
    ml.innerHTML = '';
    em.style.display = '';
    return;
  }
  em.style.display = 'none';

  // Desktop table rows
  tb.innerHTML = rows.map(function(c) {
    var ri = data.cases.indexOf(c);
    return '<tr>' +
      '<td><strong style="color:var(--gold)">' + (c['رقم_القضية'] || '—') + '</strong></td>' +
      '<td>' + (c['عنوان_القضية'] || '—') + '</td>' +
      '<td><small>' + (c['نوع_الدعوى'] || '—') + '</small></td>' +
      '<td>' + (c['اسم_الموكل'] || '—') + '</td>' +
      '<td>' + (c['اسم_الخصم'] || '—') + '</td>' +
      '<td><small>' + (c['المحكمة'] || '—') + '</small></td>' +
      '<td>' + statusBadge(c['الحالة']) + '</td>' +
      '<td>' + (c['تاريخ_الجلسة_القادمة']
        ? urgencyBadge(c['تاريخ_الجلسة_القادمة']) + '<br><small>' + formatDate(c['تاريخ_الجلسة_القادمة']) + '</small>'
        : '—') + '</td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn btn-ghost btn-sm btn-icon" onclick="editCase(' + ri + ')" title="تعديل">&#9998;</button> ' +
        '<button class="btn btn-success btn-sm btn-icon" onclick="viewCase(' + ri + ')" title="عرض وطباعة القضية">&#128065;</button> ' +
        '<button class="btn btn-info btn-sm btn-icon" onclick="quickPrintCase(' + ri + ')" title="طباعة سريعة">&#128438;</button> ' +
        '<button class="btn btn-ghost btn-sm btn-icon" onclick="quickCaseQR(' + ri + ')" title="QR بوابة الموكل">&#128275;</button> ' +
        '<button class="btn btn-danger btn-sm btn-icon" onclick="deleteCase(' + ri + ')" title="حذف">&#128465;</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  // Mobile card list
  ml.innerHTML = rows.map(function(c) {
    var ri = data.cases.indexOf(c);
    return '<div class="m-card">' +
      '<div class="m-card-header">' +
        '<div class="m-card-title">' + (c['عنوان_القضية'] || '—') + '</div>' +
        '<div class="m-card-num">' + (c['رقم_القضية'] || '—') + '</div>' +
      '</div>' +
      statusBadge(c['الحالة']) + ' <small style="color:var(--muted)">' + (c['نوع_الدعوى'] || '') + '</small>' +
      '<div class="m-card-meta" style="margin-top:7px;">' +
        '<span>&#128100; ' + (c['اسم_الموكل'] || '—') + '</span>' +
        (c['اسم_الخصم'] ? '<span>&#9876; ' + c['اسم_الخصم'] + '</span>' : '') +
        (c['المحكمة']   ? '<span>&#127963; ' + c['المحكمة'] + '</span>' : '') +
        (c['تاريخ_الجلسة_القادمة'] ? '<span>&#128197; ' + formatDate(c['تاريخ_الجلسة_القادمة']) + '</span>' : '') +
      '</div>' +
      '<div class="m-card-actions" style="flex-wrap:wrap;gap:6px;">' +
        '<button class="btn btn-ghost btn-sm" onclick="editCase(' + ri + ')" style="flex:1;min-width:80px;">&#9998; تعديل</button>' +
        '<button class="btn btn-success btn-sm btn-icon" onclick="viewCase(' + ri + ')" title="عرض">&#128065;</button>' +
        '<button class="btn btn-info btn-sm btn-icon" onclick="quickPrintCase(' + ri + ')" title="طباعة">&#128438;</button>' +
        '<button class="btn btn-ghost btn-sm btn-icon" onclick="quickCaseQR(' + ri + ')" title="QR الموكل">&#128275;</button>' +
        '<button class="btn btn-danger btn-sm btn-icon" onclick="deleteCase(' + ri + ')">&#128465;</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ================================================================
// CRUD — حفظ / تعديل / حذف
// ================================================================

/**
 * saveCase — حفظ قضية جديدة أو تحديث موجودة.
 * The original function is defined here; the override at the bottom
 * of this file wraps it to also persist embedded children JSON.
 */
function saveCase() {
  var num    = document.getElementById('fCaseNum').value.trim();
  var title  = document.getElementById('fCaseTitle').value.trim();
  var client = document.getElementById('fCaseClient').value.trim();

  if (!num || !title || !client) {
    toast('يرجى ملء الحقول الإلزامية', 'error');
    return;
  }

  var obj = collectForm('cases');
  obj['تاريخ_الإنشاء'] = obj['تاريخ_الإنشاء'] || new Date().toISOString();
  obj['آخر_تحديث']     = new Date().toISOString();

  var idx = editIdx.cases;

  if (idx >= 0) {
    data.cases[idx] = obj;
    toast('تم تحديث القضية', 'success');
  } else {
    data.cases.push(obj);
    toast('تمت إضافة القضية', 'success');
  }

  saveLocal();

  // Use ApiService instead of direct syncToSheets call
  ApiService.syncRow('القضايا', obj, idx);

  closeModal('modalCase');
  renderCases();
  updateBadges();
}

/**
 * editCase — فتح نموذج تعديل قضية موجودة.
 */
function editCase(i) {
  editIdx.cases = i;
  fillForm('cases', data.cases[i]);
  document.getElementById('modalCaseTitle').textContent = 'تعديل القضية';
  document.getElementById('modalCase').classList.add('open');
}

/**
 * deleteCase — حذف قضية.
 */
function deleteCase(i) {
  if (!confirm('حذف هذه القضية؟')) return;
  // Use ApiService instead of direct syncDeleteToSheets call
  ApiService.deleteData('القضايا', i);
  data.cases.splice(i, 1);
  saveLocal();
  toast('تم الحذف', 'info');
  renderCases();
  updateBadges();
}

// ================================================================
// CASE STATISTICS — إحصائيات القضايا
// (Consumed by renderDashboard in index.html via data.cases)
// ================================================================

/**
 * getCaseStats — returns a plain object with case counts.
 * Can be used by dashboard or any future stats widget.
 */
function getCaseStats() {
  var total  = data.cases.length;
  var active = data.cases.filter(function(c) {
    return ['نشطة', 'active'].includes(c['الحالة']);
  }).length;
  var closed = data.cases.filter(function(c) {
    return ['منتهية', 'closed'].includes(c['الحالة']);
  }).length;
  var pending = data.cases.filter(function(c) {
    return ['معلقة', 'pending'].includes(c['الحالة']);
  }).length;
  return { total: total, active: active, closed: closed, pending: pending };
}

// ================================================================
// SEARCH & FILTER — البحث والتصفية
// (Implemented inline in renderCases above; these are the
//  event-handler entry points wired from index.html toolbar.)
// ================================================================

/** searchCases — called by oninput on the search field. */
function searchCases() {
  renderCases();
}

/** filterCases — called by onchange on the status/type filters. */
function filterCases() {
  renderCases();
}

// ================================================================
// CASE DETAIL VIEW — عرض تفاصيل القضية
// ================================================================

/**
 * viewCase — opens the full printable case report in modalView.
 */
function viewCase(i) {
  var c = data.cases[i];
  if (!c) return;

  var caseNum = c['رقم_القضية'] || '';

  var sessions = data.sessions.filter(function(s) {
    return s['رقم_القضية'] === caseNum || s['عنوان_القضية'] === (c['عنوان_القضية'] || '');
  }).sort(function(a, b) {
    return (parseLocalDate(a['التاريخ']) || 0) - (parseLocalDate(b['التاريخ']) || 0);
  });

  var docs = data.documents.filter(function(d) {
    return d['رقم_القضية'] === caseNum;
  });

  var children = [];
  try { children = JSON.parse(c['أطفال_القضية'] || '[]'); } catch(e) {}

  // FIX: The new client selector only writes the client name into the case
  // record; it does not autofill the detail fields (NID, phone, address, job,
  // employer).  Back-fill any missing client fields from data.clients so the
  // report always shows the full client record.  We work on a shallow copy so
  // the stored case object is never mutated.
  var clientName = (c['اسم_الموكل'] || '').trim();
  if (clientName && data.clients) {
    var firstName = clientName.split(/\s*[,،]\s*/)[0].trim();
    var clientRecord = null;
    for (var _ci = 0; _ci < data.clients.length; _ci++) {
      if ((data.clients[_ci]['الاسم'] || '').trim() === firstName) {
        clientRecord = data.clients[_ci];
        break;
      }
    }
    if (clientRecord) {
      c = Object.assign({}, c);
      if (!c['رقم_قومي_الموكل']) c['رقم_قومي_الموكل'] = clientRecord['الرقم_القومي'] || '';
      if (!c['هاتف_الموكل'])     c['هاتف_الموكل']     = clientRecord['الهاتف']       || '';
      if (!c['عنوان_الموكل'])    c['عنوان_الموكل']    = clientRecord['العنوان']      || '';
      if (!c['عمل_الموكل'])      c['عمل_الموكل']      = clientRecord['الوظيفة']      || '';
      if (!c['جهة_عمل_الموكل']) c['جهة_عمل_الموكل'] = clientRecord['جهة_العمل']    || '';
    }
  }

  var html = buildCaseReport(c, sessions, docs, children);

  document.getElementById('viewModalTitle').innerHTML =
    '&#128065; عرض القضية: ' + caseNum + ' — ' + (c['عنوان_القضية'] || '');
  document.getElementById('viewModalBody').innerHTML = html;
  document.getElementById('modalView').classList.add('open');

  // Store for portal button in view modal header
  window._currentViewCase    = c;
  window._currentViewSessions = sessions;
}

/**
 * buildCaseReport — builds the full HTML report string for a case.
 * Used by viewCase() and quickPrintCase().
 */
function buildCaseReport(c, sessions, docs, children) {
  var today = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });

  // Local status badge (print-safe, doesn't depend on outer statusBadge)
  var sb = function(s) {
    var m = {
      نشطة: 'active-v', active: 'active-v',
      منتهية: 'closed-v', closed: 'closed-v',
      معلقة: 'pending-v', قادمة: 'active-v', مُرجأة: 'pending-v'
    };
    return '<span class="badge-v badge-' + (m[s] || 'pending-v') + '">' + s + '</span>';
  };

  var f = function(v, empty) {
    return (v && String(v).trim())
      ? String(v).trim()
      : '<span class="empty">' + (empty || '—') + '</span>';
  };

  var html = '<div class="view-body" id="viewPrintContent">';

  // Header
  html += '<div class="view-header">' +
    '<div>' +
      '<div class="view-title">&#9878; ملف القضية</div>' +
      '<div class="view-subtitle">' + f(c['عنوان_القضية']) + ' &nbsp;|&nbsp; رقم الملف: ' + f(c['رقم_القضية']) + '</div>' +
    '</div>' +
    '<div class="view-office">' +
      '<strong>مكتب المحامي</strong><br>' + sb(c['الحالة'] || 'نشطة') + '<br><small>' + today + '</small>' +
    '</div>' +
  '</div>';

  // البيانات الأساسية
  html += '<div class="view-section"><div class="view-section-title">&#128203; البيانات الأساسية</div><div class="view-grid">';
  html += vf('نوع الدعوى', c['نوع_الدعوى']) +
          vf('المحكمة', c['المحكمة']) +
          vf('رقم الدعوى', c['رقم_الدعوى']) +
          vf('تاريخ القيد', formatDate(c['تاريخ_القيد'])) +
          vf('الجلسة القادمة', formatDate(c['تاريخ_الجلسة_القادمة'])) +
          vf('أتعاب المحاماة', c['أتعاب_المحاماة'] ? c['أتعاب_المحاماة'] + ' ج.م' : '');
  html += '</div></div>';

  // الموكل
  html += '<div class="view-section"><div class="view-section-title">&#128100; بيانات الموكل (' + f(c['نوع_الموكل']) + ')</div><div class="view-grid">';
  html += vf('الاسم', c['اسم_الموكل']) +
          vf('الرقم القومي', c['رقم_قومي_الموكل']) +
          vf('الهاتف', c['هاتف_الموكل']) +
          vf('العنوان', c['عنوان_الموكل']) +
          vf('الوظيفة', c['عمل_الموكل']) +
          vf('جهة العمل', c['جهة_عمل_الموكل']);
  html += '</div></div>';

  // الخصم
  if (c['اسم_الخصم']) {
    html += '<div class="view-section"><div class="view-section-title">&#128100; بيانات الخصم</div><div class="view-grid">';
    html += vf('الاسم', c['اسم_الخصم']) +
            vf('الرقم القومي', c['رقم_قومي_الخصم']) +
            vf('الهاتف', c['هاتف_الخصم']) +
            vf('العنوان', c['عنوان_الخصم']) +
            vf('الوظيفة', c['عمل_الخصم']) +
            vf('جهة العمل', c['جهة_عمل_الخصم']);
    html += '</div></div>';
  }

  // بيانات الزواج (أحوال شخصية)
  if (c['تاريخ_عقد_الزواج'] || c['رقم_وثيقة_الزواج']) {
    html += '<div class="view-section"><div class="view-section-title">&#128141; بيانات الزواج</div><div class="view-grid">';
    html += vf('تاريخ عقد الزواج', formatDate(c['تاريخ_عقد_الزواج'])) +
            vf('رقم الوثيقة', c['رقم_وثيقة_الزواج']) +
            vf('مكتب التوثيق', c['مكتب_التوثيق']) +
            vf('قائمة المنقولات', c['وجود_قائمة_منقولات']);
    html += '</div></div>';
  }

  // الأطفال
  if (children.length > 0) {
    html += '<div class="view-section"><div class="view-section-title">&#128118; الأطفال</div>';
    html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">' +
      '<tr style="background:#f5f0e8;">' +
        '<th style="padding:7px 10px;text-align:right;border:1px solid #e8e0d0;">الاسم</th>' +
        '<th style="padding:7px 10px;text-align:right;border:1px solid #e8e0d0;">السن</th>' +
        '<th style="padding:7px 10px;text-align:right;border:1px solid #e8e0d0;">الحضانة</th>' +
      '</tr>';
    children.forEach(function(ch) {
      html += '<tr>' +
        '<td style="padding:7px 10px;border:1px solid #e8e0d0;">' + f(ch.name) + '</td>' +
        '<td style="padding:7px 10px;border:1px solid #e8e0d0;">' + (ch.age ? ch.age + ' سنة' : '—') + '</td>' +
        '<td style="padding:7px 10px;border:1px solid #e8e0d0;">' + f(ch.custody) + '</td>' +
      '</tr>';
    });
    html += '</table></div>';
  }

  // الطلبات والدفوع
  if (c['الطلبات_القانونية'] || c['الدفوع_القانونية']) {
    html += '<div class="view-section"><div class="view-section-title">&#128220; الطلبات والدفوع</div>';
    if (c['الطلبات_القانونية'])
      html += '<div class="view-field-full"><div class="view-label">الطلبات القانونية</div><div class="view-value">' + c['الطلبات_القانونية'] + '</div></div>';
    if (c['الدفوع_القانونية'])
      html += '<div class="view-field-full"><div class="view-label">الدفوع القانونية</div><div class="view-value">' + c['الدفوع_القانونية'] + '</div></div>';
    if (c['إجراءات_الدعوى'])
      html += '<div class="view-field-full"><div class="view-label">إجراءات الدعوى</div><div class="view-value">' + c['إجراءات_الدعوى'] + '</div></div>';
    html += '</div>';
  }

  // سجل الجلسات
  html += '<div class="view-section"><div class="view-section-title">&#128197; سجل الجلسات (' + sessions.length + ' جلسة)</div>';
  if (!sessions.length) {
    html += '<div style="padding:14px;color:#888;font-size:12px;">لا توجد جلسات مسجلة لهذه القضية</div>';
  } else {
    sessions.forEach(function(s, idx) {
      var d = parseLocalDate(s['التاريخ']);
      var dayStr = d
        ? d.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
        : '—';
      var statusCls = s['الحالة'] === 'منتهية' ? 'closed-v'
                    : s['الحالة'] === 'قادمة'   ? 'active-v'
                    : 'pending-v';
      html += '<div class="session-row">' +
        '<div class="session-num">' + (idx + 1) + '</div>' +
        '<div class="session-detail">' +
          '<div class="session-detail-title">&#128197; ' + dayStr +
            ' &nbsp; <span style="font-size:11px;font-weight:400;">الساعة ' + formatTime(s['الوقت']) + '</span>' +
          '</div>' +
          '<div class="session-detail-meta">' +
            '<span>&#127963; ' + (s['المحكمة'] || '—') + '</span>' +
            (s['القاضي'] ? '<span>&#128100; القاضي: ' + s['القاضي'] + '</span>' : '') +
            '<span class="badge-v badge-' + statusCls + '">' + (s['الحالة'] || '—') + '</span>' +
          '</div>' +
          (s['ما_تم_في_الجلسة'] ? '<div style="font-size:12px;color:#444;margin-top:4px;">&#128221; ' + s['ما_تم_في_الجلسة'] + '</div>' : '') +
          (s['القرار']          ? '<div class="session-decision">&#9878; القرار: ' + s['القرار'] + '</div>' : '') +
          (s['التأجيل_إلى']     ? '<div class="session-next">&#128197; سبب التأجيل / التأجيل إلى: ' + formatDate(s['التأجيل_إلى']) + (s['الملاحظات'] ? ' — ' + s['الملاحظات'] : '') + '</div>' : '') +
        '</div>' +
      '</div>';
    });
  }
  html += '</div>';

  // الأحكام والتنفيذ
  if (c['قرارات_المحكمة'] || c['تاريخ_الحكم'] || c['رقم_التنفيذ']) {
    html += '<div class="view-section"><div class="view-section-title">&#128296; الأحكام والتنفيذ</div><div class="view-grid">';
    if (c['قرارات_المحكمة'])
      html += '<div class="view-field-full"><div class="view-label">قرارات المحكمة</div><div class="view-value">' + c['قرارات_المحكمة'] + '</div></div>';
    html += vf('تاريخ الحكم', formatDate(c['تاريخ_الحكم'])) + vf('رقم التنفيذ', c['رقم_التنفيذ']);
    if (c['إجراءات_التنفيذ'])
      html += '<div class="view-field-full"><div class="view-label">إجراءات التنفيذ ونتائجه</div><div class="view-value">' + c['إجراءات_التنفيذ'] + '</div></div>';
    html += '</div></div>';
  }

  // المستندات
  if (docs.length > 0) {
    html += '<div class="view-section"><div class="view-section-title">&#128206; المستندات المودعة</div>';
    html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">' +
      '<tr style="background:#f5f0e8;">' +
        '<th style="padding:7px 10px;border:1px solid #e8e0d0;text-align:right;">المستند</th>' +
        '<th style="padding:7px 10px;border:1px solid #e8e0d0;text-align:right;">النوع</th>' +
        '<th style="padding:7px 10px;border:1px solid #e8e0d0;text-align:right;">تاريخ الإيداع</th>' +
        '<th style="padding:7px 10px;border:1px solid #e8e0d0;text-align:right;">الرابط</th>' +
      '</tr>';
    docs.forEach(function(d) {
      html += '<tr>' +
        '<td style="padding:7px 10px;border:1px solid #e8e0d0;font-weight:700;">' + f(d['اسم_المستند']) + '</td>' +
        '<td style="padding:7px 10px;border:1px solid #e8e0d0;">' + f(d['نوع_المستند']) + '</td>' +
        '<td style="padding:7px 10px;border:1px solid #e8e0d0;">' + formatDate(d['تاريخ_الإيداع']) + '</td>' +
        '<td style="padding:7px 10px;border:1px solid #e8e0d0;">' +
          (d['رابط_Drive'] ? '<a href="' + d['رابط_Drive'] + '" style="color:#2980b9;">&#128279; عرض</a>' : '—') +
        '</td>' +
      '</tr>';
    });
    html += '</table></div>';
  }

  // ملاحظات المحامي
  if (c['الملاحظات'])
    html += '<div class="view-section"><div class="view-section-title">&#128221; ملاحظات المحامي</div>' +
            '<div class="view-field-full"><div class="view-value">' + c['الملاحظات'] + '</div></div></div>';

  html += '<div class="view-footer">' +
    '<span>نظام دعم المحامي — المدى الهندسية</span>' +
    '<span>تاريخ الطباعة: ' + today + '</span>' +
  '</div>';

  html += '</div>';
  return html;
}

/**
 * vf — helper: renders a single view-field div (label + value).
 * Only used by buildCaseReport; defined here to keep it scoped.
 */
function vf(label, val) {
  var v = (val && String(val).trim())
    ? String(val).trim()
    : '<span class="empty">—</span>';
  return '<div class="view-field"><div class="view-label">' + label + '</div><div class="view-value">' + v + '</div></div>';
}

// ================================================================
// QUICK PRINT — طباعة سريعة من قائمة القضايا
// ================================================================

/**
 * quickPrintCase — opens a standalone print window for a case
 * without opening the view modal first.
 */
function quickPrintCase(i) {
  var c = data.cases[i];
  if (!c) return;

  var caseNum  = c['رقم_القضية'] || '';
  var sessions = data.sessions.filter(function(s) {
    return s['رقم_القضية'] === caseNum || s['عنوان_القضية'] === (c['عنوان_القضية'] || '');
  }).sort(function(a, b) {
    return (parseLocalDate(a['التاريخ']) || 0) - (parseLocalDate(b['التاريخ']) || 0);
  });
  var docs = data.documents.filter(function(d) { return d['رقم_القضية'] === caseNum; });
  var children = [];
  try { children = JSON.parse(c['أطفال_القضية'] || '[]'); } catch(e) {}

  var body = buildCaseReport(c, sessions, docs, children);

  var printContent =
    '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap" rel="stylesheet">' +
    '<style>' +
    '*{box-sizing:border-box;margin:0;padding:0;}' +
    'body{font-family:Cairo,Arial,sans-serif;background:#fff;color:#111;direction:rtl;}' +
    '@page{size:A4;margin:15mm;}' +
    '@media print{body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}' +
    '.view-section-title{background:#0D1B2A!important;color:#C9A84C!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}' +
    '.session-num{background:#f5f0e8!important;color:#C9A84C!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}' +
    '.badge-active-v{background:#d5f5e3!important;color:#1e8449!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}' +
    '.badge-closed-v{background:#eaecee!important;color:#717d7e!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}' +
    '.badge-pending-v{background:#fdebd0!important;color:#a04000!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}' +
    '}' +
    '.view-body{padding:20px;background:#fff;color:#111;font-family:Cairo,Arial,sans-serif;direction:rtl;}' +
    '.view-header{border-bottom:3px solid #C9A84C;padding-bottom:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start;}' +
    '.view-office{font-size:11px;color:#888;text-align:left;}' +
    '.view-title{font-size:20px;font-weight:900;color:#0D1B2A;}' +
    '.view-subtitle{font-size:13px;color:#555;margin-top:3px;}' +
    '.view-section{margin-bottom:18px;border:1px solid #e8e0d0;border-radius:8px;overflow:hidden;}' +
    '.view-section-title{background:#0D1B2A;color:#C9A84C;font-size:12px;font-weight:700;padding:8px 14px;letter-spacing:1px;}' +
    '.view-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;}' +
    '.view-field{padding:9px 14px;border-bottom:1px solid #f0ece4;}' +
    '.view-field:nth-child(odd){border-left:1px solid #f0ece4;}' +
    '.view-field-full{padding:9px 14px;border-bottom:1px solid #f0ece4;grid-column:1/-1;}' +
    '.view-label{font-size:10px;font-weight:700;color:#888;margin-bottom:3px;}' +
    '.view-value{font-size:13px;color:#111;font-weight:600;}' +
    '.view-value.empty{color:#bbb;font-weight:400;}' +
    '.session-row{display:grid;grid-template-columns:80px 1fr;gap:0;border-bottom:1px solid #f0ece4;}' +
    '.session-row:last-child{border-bottom:none;}' +
    '.session-num{background:#f5f0e8;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;color:#C9A84C;border-left:1px solid #e8e0d0;}' +
    '.session-detail{padding:10px 14px;}' +
    '.session-detail-title{font-size:13px;font-weight:700;color:#0D1B2A;margin-bottom:4px;}' +
    '.session-detail-meta{font-size:11px;color:#888;margin-bottom:4px;display:flex;gap:10px;flex-wrap:wrap;}' +
    '.session-decision{font-size:12px;color:#C9A84C;font-weight:700;margin-top:4px;}' +
    '.session-next{font-size:11px;color:#2980B9;margin-top:2px;}' +
    '.badge-v{display:inline-block;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:700;}' +
    '.badge-active-v{background:#d5f5e3;color:#1e8449;}' +
    '.badge-closed-v{background:#eaecee;color:#717d7e;}' +
    '.badge-pending-v{background:#fdebd0;color:#a04000;}' +
    '.badge-urgent-v{background:#fadbd8;color:#922b21;}' +
    '.view-footer{margin-top:18px;padding-top:12px;border-top:2px solid #C9A84C;display:flex;justify-content:space-between;font-size:10px;color:#999;}' +
    'table{width:100%;border-collapse:collapse;font-size:12px;}' +
    'th,td{padding:7px 10px;border:1px solid #e8e0d0;text-align:right;}' +
    'th{background:#f5f0e8;color:#8B6914;font-weight:700;}' +
    '</style></head><body>' +
    body +
    '<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};<\/script>' +
    '</body></html>';

  var win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if (!win) { toast('فعّل النوافذ المنبثقة للطباعة', 'error'); return; }
  win.document.open();
  win.document.write(printContent);
  win.document.close();
}

// ================================================================
// QUICK QR FROM CASES LIST — QR الموكل من قائمة القضايا
// ================================================================

/**
 * quickCaseQR — finds the client linked to a case and calls genClientQR.
 */
function quickCaseQR(i) {
  var c = data.cases[i];
  if (!c) { toast('القضية غير موجودة', 'error'); return; }

  var clientName = c['اسم_الموكل'] || '';
  if (!clientName) { toast('لا يوجد اسم موكل لهذه القضية', 'info'); return; }

  var ci = -1;
  for (var x = 0; x < data.clients.length; x++) {
    if ((data.clients[x]['الاسم'] || '').trim() === clientName.trim()) { ci = x; break; }
  }

  if (ci < 0) {
    toast('الموكل "' + clientName + '" غير مسجل في قسم الموكلين — أضفه أولاً لتفعيل QR', 'info');
    return;
  }

  genClientQR(ci);
}

// ================================================================
// CHILDREN SECTION inside Case Modal
// ================================================================

/**
 * toggleChildrenSection — shows/hides the children rows section
 * based on the "وجود أطفال" select value.
 */
function toggleChildrenSection() {
  var v = document.getElementById('fCaseHasChildren').value;
  document.getElementById('childrenSectionDiv').style.display = (v === 'نعم') ? '' : 'none';
}

/**
 * addChildRow — appends a child entry row inside the case modal.
 * @param {Object} [childData] - Optional prefill: { name, age, custody }
 */
function addChildRow(childData) {
  childData = childData || {};
  var d   = document.getElementById('childrenRows');
  var row = document.createElement('div');
  row.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr) 30px;gap:7px;margin-bottom:7px;align-items:end;';
  row.innerHTML =
    '<div><label style="font-size:10px;color:var(--muted);">الاسم</label>' +
      '<input type="text" value="' + (childData.name || '') + '" placeholder="اسم الطفل" onchange="updateChildrenData()"></div>' +
    '<div><label style="font-size:10px;color:var(--muted);">السن</label>' +
      '<input type="number" value="' + (childData.age || '') + '" placeholder="السن" min="0" max="25" onchange="updateChildrenData()"></div>' +
    '<div><label style="font-size:10px;color:var(--muted);">الحضانة</label>' +
      '<select onchange="updateChildrenData()">' +
        '<option value="">—</option>' +
        '<option' + (childData.custody === 'مع الأم' ? ' selected' : '') + '>مع الأم</option>' +
        '<option' + (childData.custody === 'مع الأب' ? ' selected' : '') + '>مع الأب</option>' +
        '<option' + (childData.custody === 'مشتركة'  ? ' selected' : '') + '>مشتركة</option>' +
      '</select></div>' +
    '<button type="button" class="btn btn-danger btn-icon btn-sm" onclick="this.parentNode.remove();updateChildrenData();">&#10005;</button>';
  d.appendChild(row);
  updateChildrenData();
}

/**
 * updateChildrenData — serialises current child rows into the
 * hidden fCaseChildrenData field as JSON.
 */
function updateChildrenData() {
  var rows = document.getElementById('childrenRows').children;
  var arr  = [];
  for (var i = 0; i < rows.length; i++) {
    var inputs = rows[i].querySelectorAll('input,select');
    arr.push({ name: inputs[0].value, age: inputs[1].value, custody: inputs[2].value });
  }
  document.getElementById('fCaseChildrenData').value = JSON.stringify(arr);
}

/**
 * loadChildrenRows — deserialises saved children JSON and rebuilds rows.
 * @param {string} jsonStr
 */
function loadChildrenRows(jsonStr) {
  document.getElementById('childrenRows').innerHTML = '';
  try {
    var arr = JSON.parse(jsonStr || '[]');
    arr.forEach(function(c) { addChildRow(c); });
  } catch(e) {}
}

// ================================================================
// OVERRIDE saveCase to persist embedded children JSON
// ================================================================
// The base saveCase() above calls collectForm('cases') which (via
// the collectForm override below) will attach أطفال_القضية.
// We wrap saveCase so children data is harvested before collectForm runs.

var _origSaveCase = saveCase;
saveCase = function() {
  updateChildrenData();
  var childrenJson = document.getElementById('fCaseChildrenData');
  window._pendingChildren = childrenJson ? childrenJson.value : '[]';
  _origSaveCase();
};

// ================================================================
// OVERRIDE collectForm — inject children into cases object
// ================================================================
var _origCollect = collectForm;
collectForm = function(type) {
  var obj = _origCollect(type);
  if (type === 'cases' && window._pendingChildren) {
    obj['أطفال_القضية'] = window._pendingChildren;
    window._pendingChildren = null;
  }
  return obj;
};

// ================================================================
// OVERRIDE fillForm — restore children rows when editing a case
// ================================================================
var _origFill = fillForm;
fillForm = function(type, obj) {
  _origFill(type, obj);
  if (type === 'cases') {
    var hasChildren = document.getElementById('fCaseHasChildren');
    var childrenData = obj['أطفال_القضية'] || '[]';
    if (hasChildren && hasChildren.value === 'نعم') {
      document.getElementById('childrenSectionDiv').style.display = '';
      loadChildrenRows(childrenData);
    }
  }
};

// ================================================================
// OVERRIDE resetForm — repopulate case dropdowns in other modules
// after reset clears them.
// ================================================================
var _origResetForm = resetForm;
resetForm = function(type) {
  _origResetForm(type);
  var dropdownMap = {
    sessions:  'fSessionCaseNum',
    documents: 'fDocCaseNum',
    fees:      'fFeeCaseNum',
    children:  'fChildCaseNum'
  };
  if (dropdownMap[type]) {
    populateCaseDropdown(dropdownMap[type]);
  }
};

// ================================================================
// populateCaseDropdown — تعبئة قائمة القضايا في النماذج الأخرى
// (sessions, documents, fees, children)
// ================================================================

/**
 * populateCaseDropdown — fills a <select> with all cases.
 * @param {string} selectId    - ID of the target <select>
 * @param {string} [selectedVal] - Optional value to pre-select
 */
function populateCaseDropdown(selectId, selectedVal) {
  var sel = document.getElementById(selectId);
  if (!sel) return;
  var current = selectedVal || sel.value;
  sel.innerHTML = '<option value="">-- اختر القضية --</option>';
  data.cases.forEach(function(c) {
    var num   = c['رقم_القضية'] || '';
    var title = c['عنوان_القضية'] || '';
    var opt   = document.createElement('option');
    opt.value       = num;
    opt.textContent = num + (title ? ' — ' + title : '');
    if (num === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ================================================================
// autofillSessionFromCase — تعبئة تلقائية لنموذج الجلسة
// Shared helper kept here because it reads data.cases.
// ================================================================

/**
 * autofillSessionFromCase — pre-fills court/type/title in the
 * session modal when a case is selected.
 * @param {string}  caseNum
 * @param {boolean} [skipCourt] - If true, don't overwrite court field
 */
function autofillSessionFromCase(caseNum, skipCourt) {
  if (!caseNum) return;
  var c = data.cases.find(function(x) { return x['رقم_القضية'] === caseNum; });
  if (!c) return;

  var titleEl = document.getElementById('fSessionCaseTitle');
  var typeEl  = document.getElementById('fSessionCaseType');
  var courtEl = document.getElementById('fSessionCourt');

  if (titleEl && !titleEl.value)            titleEl.value = c['عنوان_القضية'] || '';
  else if (titleEl && !skipCourt)           titleEl.value = c['عنوان_القضية'] || '';

  if (typeEl && !typeEl.value)              typeEl.value  = c['نوع_الدعوى'] || '';
  else if (typeEl && !skipCourt)            typeEl.value  = c['نوع_الدعوى'] || '';

  if (courtEl && !courtEl.value && !skipCourt) courtEl.value = c['المحكمة'] || '';
}

// ================================================================
// autofillFeeFromCase — تعبئة اسم الموكل من القضية لنموذج الأتعاب
// ================================================================

/**
 * autofillFeeFromCase — pre-fills the client name in the fee modal.
 * @param {string} caseNum
 */
function autofillFeeFromCase(caseNum) {
  if (!caseNum) return;
  var c = data.cases.find(function(x) { return x['رقم_القضية'] === caseNum; });
  if (!c) return;
  var clientEl = document.getElementById('fFeeClient');
  if (clientEl) clientEl.value = c['اسم_الموكل'] || '';
}
