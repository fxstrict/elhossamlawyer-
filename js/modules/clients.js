/**
 * ================================================================
 * js/modules/clients.js — وحدة الموكلين | نظام الحسام للمحاماة
 * ================================================================
 * Contains ALL Clients-related functions extracted from index.html.
 *
 * Depends on (globals expected from index.html / prior scripts):
 *   - data          : shared app data object  { clients, cases, sessions, fees, … }
 *   - editIdx       : shared edit-index map   { clients: -1 }
 *   - ApiService    : api.js layer  (replaces direct syncToSheets / syncDeleteToSheets)
 *   - saveLocal()   : localStorage persistence helper
 *   - toast()       : UI notification helper
 *   - updateBadges(): badge counter updater
 *   - closeModal()  : modal close helper
 *   - formatDate()  : date formatter  (from ui-utils.js)
 *   - val()         : getElementById + .value helper  (from ui-utils.js)
 *   - uid()         : unique-ID generator  (from ui-utils.js)
 *   - collectForm() : generic form-to-object helper  (from ui-utils.js)
 *   - fillForm()    : generic object-to-form helper  (from ui-utils.js)
 *   - resetForm()   : generic form-reset helper  (from ui-utils.js)
 *
 * Sheet name (GAS):  'الموكلين'
 *
 * Does NOT touch:
 *   - Cases, Sessions, Documents, Tasks, Fees, Calendar, Library,
 *     Templates, Settings, Children
 *   - CSS / HTML structure
 *   - Google Apps Script backend
 *   - Database / sheet structure
 *   - ApiService internals
 * ================================================================
 */

'use strict';

// ================================================================
// FIELDS & MAP — clients slice only
// ================================================================

var CLIENTS_FIELDS = [
  'fClientName', 'fClientType', 'fClientNID', 'fClientPhone',
  'fClientEmail', 'fClientAddress', 'fClientJob', 'fClientEmployer',
  'fClientMarital', 'fClientNotes'
];

var CLIENTS_MAP = {
  fClientName:     'الاسم',
  fClientType:     'النوع',
  fClientNID:      'الرقم_القومي',
  fClientPhone:    'الهاتف',
  fClientEmail:    'البريد',
  fClientAddress:  'العنوان',
  fClientJob:      'الوظيفة',
  fClientEmployer: 'جهة_العمل',
  fClientMarital:  'الحالة_الاجتماعية',
  fClientNotes:    'ملاحظات'
};

// ================================================================
// RENDER — عرض قائمة الموكلين
// ================================================================

/**
 * renderClients — renders the clients table (desktop) and mobile
 * card list, respecting the search filter.
 */
function renderClients() {
  var s   = val('searchClients').toLowerCase();
  var rows = data.clients.filter(function(c) {
    return !s || Object.values(c).join(' ').toLowerCase().indexOf(s) >= 0;
  });

  var tb  = document.getElementById('clientsTableBody');
  var em  = document.getElementById('clientsEmpty');
  var ml  = document.getElementById('clientsMobileList');

  if (!rows.length) {
    if (tb) tb.innerHTML = '';
    if (ml) ml.innerHTML = '';
    if (em) em.style.display = '';
    return;
  }
  if (em) em.style.display = 'none';

  // ---- Desktop table ----
  if (tb) {
    tb.innerHTML = rows.map(function(c) {
      var ri = data.clients.indexOf(c);
      return '<tr>' +
        '<td><strong>' + (c['الاسم']         || '—') + '</strong></td>' +
        '<td>'         + (c['النوع']          || '—') + '</td>' +
        '<td>'         + (c['الهاتف']         || '—') + '</td>' +
        '<td style="direction:ltr;text-align:right;">' + (c['الرقم_القومي'] || '—') + '</td>' +
        '<td>'         + (c['العنوان']        || '—') + '</td>' +
        '<td>'         + (c['الوظيفة']        || '—') + '</td>' +
        '<td>' +
          '<button class="btn btn-info btn-sm btn-icon" onclick="viewClient(' + ri + ')" title="عرض الملف">&#128065;</button> ' +
          '<button class="btn btn-ghost btn-sm btn-icon" onclick="editClient(' + ri + ')" title="تعديل">&#9998;</button> ' +
          '<button class="btn btn-success btn-sm btn-icon" onclick="genClientQR(' + ri + ')" title="QR الموكل">&#128275;</button> ' +
          '<button class="btn btn-danger btn-sm btn-icon" onclick="deleteClient(' + ri + ')" title="حذف">&#128465;</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  // ---- Mobile cards ----
  if (ml) {
    ml.innerHTML = rows.map(function(c) {
      var ri = data.clients.indexOf(c);
      return '<div class="m-card">' +
        '<div class="m-card-header">' +
          '<div class="m-card-title">&#128100; ' + (c['الاسم'] || '—') + '</div>' +
          '<div class="m-card-num">' + (c['النوع'] || '—') + '</div>' +
        '</div>' +
        '<div class="m-card-meta">' +
          (c['الهاتف']   ? '<span>&#128222; ' + c['الهاتف']   + '</span>' : '') +
          (c['العنوان']  ? '<span>&#127968; ' + c['العنوان']  + '</span>' : '') +
          (c['الوظيفة']  ? '<span>&#128188; ' + c['الوظيفة']  + '</span>' : '') +
        '</div>' +
        '<div class="m-card-actions">' +
          '<button class="btn btn-info btn-sm" onclick="viewClient(' + ri + ')" style="flex:1;">&#128065; عرض</button>' +
          '<button class="btn btn-ghost btn-sm btn-icon" onclick="editClient(' + ri + ')">&#9998;</button>' +
          '<button class="btn btn-success btn-sm btn-icon" onclick="genClientQR(' + ri + ')">&#128275;</button>' +
          '<button class="btn btn-danger btn-sm btn-icon" onclick="deleteClient(' + ri + ')">&#128465;</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }
}

// ================================================================
// SEARCH — بحث في الموكلين (triggered by oninput on searchClients)
// ================================================================

/**
 * searchClients — alias kept for any direct callers; delegates to renderClients.
 */
function searchClients() {
  renderClients();
}

// ================================================================
// CRUD — إنشاء / تحديث / حذف الموكلين
// ================================================================

/**
 * saveClient — creates or updates a client record.
 * Called by the modal "حفظ الموكل" button.
 */
function saveClient() {
  var name = document.getElementById('fClientName') ? document.getElementById('fClientName').value.trim() : '';
  if (!name) {
    toast('يرجى إدخال اسم الموكل', 'error');
    return;
  }

  var obj = collectForm('clients');

  // Preserve auto-generated fields on update; create them on add
  obj['رقم_الموكل']    = obj['رقم_الموكل']    || uid();
  obj['تاريخ_الإنشاء'] = obj['تاريخ_الإنشاء'] || new Date().toISOString();

  var idx = editIdx.clients;

  if (idx >= 0) {
    data.clients[idx] = obj;
    toast('تم تحديث بيانات الموكل', 'success');
  } else {
    data.clients.push(obj);
    toast('تمت إضافة الموكل بنجاح', 'success');
  }

  saveLocal();
  ApiService.syncRow('الموكلين', obj, idx);

  closeModal('modalClient');
  renderClients();
  updateBadges();
}

/**
 * editClient — opens the client modal pre-filled for editing.
 * @param {number} i  0-based index in data.clients
 */
function editClient(i) {
  editIdx.clients = i;
  fillForm('clients', data.clients[i]);
  document.getElementById('modalClientTitle').textContent = 'تعديل بيانات الموكل';
  document.getElementById('modalClient').classList.add('open');
}

/**
 * deleteClient — confirms and deletes a client record.
 * @param {number} i  0-based index in data.clients
 */
function deleteClient(i) {
  if (!confirm('حذف هذا الموكل من السجل؟')) return;

  ApiService.deleteData('الموكلين', i);

  data.clients.splice(i, 1);
  saveLocal();
  toast('تم حذف الموكل', 'info');
  renderClients();
  updateBadges();
}

// ================================================================
// VIEW — عرض ملف الموكل الكامل
// ================================================================

/**
 * viewClient — builds and displays the full client file in the
 * shared modalView overlay (same overlay used by viewCase).
 * @param {number} i  0-based index in data.clients
 */
function viewClient(i) {
  var c = data.clients[i];
  if (!c) return;

  // Store reference so printView() and showClientPortal() can use it
  window._currentViewCase   = null;    // not a case view
  window._currentViewClient = c;
  window._currentViewClientIdx = i;

  document.getElementById('viewModalTitle').textContent =
    '&#128100; ملف الموكل — ' + (c['الاسم'] || '');

  // Show/hide the portal button
  var portalBtn = document.getElementById('viewPortalBtn');
  if (portalBtn) portalBtn.style.display = '';

  document.getElementById('viewModalBody').innerHTML = buildClientReport(c);
  document.getElementById('modalView').classList.add('open');
}

// ================================================================
// OVERRIDE viewCase — clear stale _currentViewClient flag
// ================================================================
// viewClient() (above) nulls out window._currentViewCase whenever a
// client file is opened, so printView() can tell the two view types
// apart. viewCase() (cases.js) has no symmetric reset: it sets
// window._currentViewCase but never clears window._currentViewClient.
// Without this wrap, opening a client file and then a case file (in
// the same session, no reload) would leave _currentViewClient set,
// and printView() would wrongly try to print the client template for
// a case. This wrap is additive only — it adds the missing reset
// after the original viewCase() runs unchanged.
if (typeof viewCase === 'function') {
  var _origViewCaseForPrintView = viewCase;
  viewCase = function(i) {
    _origViewCaseForPrintView(i);
    window._currentViewClient = null;
    window._currentViewClientIdx = null;
  };
}


// ================================================================
// REPORT BUILDER — بناء تقرير الموكل
// ================================================================

/**
 * buildClientReport — returns the inner HTML for the client file view.
 * @param {Object} c  Client record
 * @returns {string}
 */
function buildClientReport(c) {
  var today = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // Helper: safe value
  function f(v) {
    return (v && String(v).trim()) ? String(v).trim() : '—';
  }

  // Helper: view field row
  function vf(label, value) {
    var v = (value && String(value).trim())
      ? String(value).trim()
      : '<span class="empty">—</span>';
    return '<div class="view-field"><div class="view-label">' + label +
           '</div><div class="view-value">' + v + '</div></div>';
  }

  // Linked cases
  var clientName = (c['الاسم'] || '').trim();
  var linkedCases = (data.cases || []).filter(function(cs) {
    var caseClients = (cs['اسم_الموكل'] || '');
    return caseClients.indexOf(clientName) >= 0;
  });

  // Linked fees
  var linkedFees = (data.fees || []).filter(function(f) {
    return (f['اسم_الموكل'] || '').indexOf(clientName) >= 0;
  });
  var totalFees = linkedFees.reduce(function(acc, f) {
    return acc + (parseFloat(f['المبلغ']) || 0);
  }, 0);

  var html = '';

  // ---- Report header ----
  html += '<div class="case-report" style="padding:20px;font-family:Cairo,Arial,sans-serif;direction:rtl;">';
  html += '<div class="report-header" style="text-align:center;border-bottom:2px solid #c9a84c;padding-bottom:14px;margin-bottom:18px;">' +
    '<div style="font-size:20px;font-weight:900;color:#1a2744;">مكتب الحسام للمحاماة</div>' +
    '<div style="font-size:13px;color:#555;margin-top:4px;">المستشار حسام محمد إبراهيم</div>' +
    '<div style="font-size:15px;font-weight:700;color:#c9a84c;margin-top:10px;">&#128100; ملف الموكل</div>' +
  '</div>';

  // ---- Client details ----
  html += '<div class="view-section"><div class="view-section-title">&#128100; البيانات الشخصية</div>' +
    '<div class="view-grid">' +
    vf('الاسم الكامل',       f(c['الاسم'])) +
    vf('نوع الموكل',         f(c['النوع'])) +
    vf('الرقم القومي',       f(c['الرقم_القومي'])) +
    vf('رقم الهاتف',         f(c['الهاتف'])) +
    vf('البريد الإلكتروني',  f(c['البريد'])) +
    vf('العنوان',             f(c['العنوان'])) +
    vf('الوظيفة',             f(c['الوظيفة'])) +
    vf('جهة العمل',           f(c['جهة_العمل'])) +
    vf('الحالة الاجتماعية',  f(c['الحالة_الاجتماعية'])) +
    '</div></div>';

  // ---- Notes ----
  if (c['ملاحظات'] && c['ملاحظات'].trim()) {
    html += '<div class="view-section"><div class="view-section-title">&#128221; ملاحظات</div>' +
      '<div class="view-field-full"><div class="view-value">' + c['ملاحظات'] + '</div></div>' +
      '</div>';
  }

  // ---- Linked cases ----
  html += '<div class="view-section"><div class="view-section-title">&#9878; القضايا المرتبطة (' + linkedCases.length + ' قضية)</div>';
  if (!linkedCases.length) {
    html += '<div style="padding:12px;color:#888;font-size:12px;">لا توجد قضايا مسجلة لهذا الموكل</div>';
  } else {
    html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">' +
      '<tr style="background:#f5f0e8;">' +
        '<th style="padding:7px 10px;text-align:right;border:1px solid #e8e0d0;">رقم القضية</th>' +
        '<th style="padding:7px 10px;text-align:right;border:1px solid #e8e0d0;">العنوان</th>' +
        '<th style="padding:7px 10px;text-align:right;border:1px solid #e8e0d0;">النوع</th>' +
        '<th style="padding:7px 10px;text-align:right;border:1px solid #e8e0d0;">الحالة</th>' +
        '<th style="padding:7px 10px;text-align:right;border:1px solid #e8e0d0;">الجلسة القادمة</th>' +
      '</tr>';
    linkedCases.forEach(function(cs) {
      html += '<tr>' +
        '<td style="padding:7px 10px;border:1px solid #e8e0d0;font-weight:700;color:#c9a84c;">' + f(cs['رقم_القضية']) + '</td>' +
        '<td style="padding:7px 10px;border:1px solid #e8e0d0;">' + f(cs['عنوان_القضية']) + '</td>' +
        '<td style="padding:7px 10px;border:1px solid #e8e0d0;">' + f(cs['نوع_الدعوى']) + '</td>' +
        '<td style="padding:7px 10px;border:1px solid #e8e0d0;">' + f(cs['الحالة']) + '</td>' +
        '<td style="padding:7px 10px;border:1px solid #e8e0d0;">' +
          (cs['تاريخ_الجلسة_القادمة']
            ? new Date(cs['تاريخ_الجلسة_القادمة']).toLocaleDateString('ar-EG')
            : '—') +
        '</td>' +
      '</tr>';
    });
    html += '</table>';
  }
  html += '</div>';

  // ---- Fees summary ----
  html += '<div class="view-section"><div class="view-section-title">&#128176; الأتعاب المسجلة (' + linkedFees.length + ' عملية)</div>';
  if (!linkedFees.length) {
    html += '<div style="padding:12px;color:#888;font-size:12px;">لا توجد أتعاب مسجلة لهذا الموكل</div>';
  } else {
    html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">' +
      '<tr style="background:#f5f0e8;">' +
        '<th style="padding:7px 10px;text-align:right;border:1px solid #e8e0d0;">رقم القضية</th>' +
        '<th style="padding:7px 10px;text-align:right;border:1px solid #e8e0d0;">النوع</th>' +
        '<th style="padding:7px 10px;text-align:right;border:1px solid #e8e0d0;">المبلغ</th>' +
        '<th style="padding:7px 10px;text-align:right;border:1px solid #e8e0d0;">التاريخ</th>' +
        '<th style="padding:7px 10px;text-align:right;border:1px solid #e8e0d0;">طريقة الدفع</th>' +
      '</tr>';
    linkedFees.forEach(function(fee) {
      html += '<tr>' +
        '<td style="padding:7px 10px;border:1px solid #e8e0d0;color:#c9a84c;">' + f(fee['رقم_القضية']) + '</td>' +
        '<td style="padding:7px 10px;border:1px solid #e8e0d0;">' + f(fee['نوع_الأتعاب']) + '</td>' +
        '<td style="padding:7px 10px;border:1px solid #e8e0d0;font-weight:700;color:#1ab46c;">' +
          (fee['المبلغ'] ? Number(fee['المبلغ']).toLocaleString('ar-EG') + ' ج.م' : '—') +
        '</td>' +
        '<td style="padding:7px 10px;border:1px solid #e8e0d0;">' +
          (fee['تاريخ_الاستلام'] ? new Date(fee['تاريخ_الاستلام']).toLocaleDateString('ar-EG') : '—') +
        '</td>' +
        '<td style="padding:7px 10px;border:1px solid #e8e0d0;">' + f(fee['طريقة_الدفع']) + '</td>' +
      '</tr>';
    });
    html += '<tr style="background:#f0f8f4;">' +
      '<td colspan="2" style="padding:8px 10px;border:1px solid #e8e0d0;font-weight:700;">الإجمالي</td>' +
      '<td style="padding:8px 10px;border:1px solid #e8e0d0;font-weight:900;color:#1ab46c;">' +
        totalFees.toLocaleString('ar-EG') + ' ج.م' +
      '</td>' +
      '<td colspan="2" style="border:1px solid #e8e0d0;"></td>' +
    '</tr>';
    html += '</table>';
  }
  html += '</div>';

  // ---- Footer ----
  html += '<div class="view-footer" style="display:flex;justify-content:space-between;border-top:1px solid #e8e0d0;padding-top:10px;margin-top:18px;font-size:11px;color:#999;">' +
    '<span>نظام الحسام للمحاماة</span>' +
    '<span>تاريخ الطباعة: ' + today + '</span>' +
  '</div>';

  html += '</div>'; // .case-report
  return html;
}

// ================================================================
// PRINT — طباعة ملف الموكل
// ================================================================

/**
 * printClientFile — opens a standalone print window for a client.
 * Can be called directly from the clients list.
 * @param {number} i  0-based index in data.clients
 */
function printClientFile(i) {
  var c = data.clients[i];
  if (!c) return;

  var body = buildClientReport(c);

  var printContent =
    '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap" rel="stylesheet">' +
    '<style>' +
    '*{box-sizing:border-box;margin:0;padding:0;}' +
    'body{font-family:Cairo,Arial,sans-serif;background:#fff;color:#111;direction:rtl;}' +
    '@page{size:A4;margin:15mm;}' +
    '.case-report{padding:10px;}' +
    '.report-header{text-align:center;border-bottom:2px solid #c9a84c;padding-bottom:12px;margin-bottom:16px;}' +
    '.view-section{margin-bottom:16px;border:1px solid #e8e0d0;border-radius:6px;overflow:hidden;}' +
    '.view-section-title{background:#f5f0e8;padding:8px 12px;font-weight:700;font-size:13px;border-bottom:1px solid #e8e0d0;}' +
    '.view-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0;}' +
    '.view-field{padding:7px 12px;border-bottom:1px solid #f0ece4;border-left:1px solid #f0ece4;}' +
    '.view-field-full{padding:7px 12px;border-bottom:1px solid #f0ece4;}' +
    '.view-label{font-size:10px;color:#888;margin-bottom:2px;}' +
    '.view-value{font-size:13px;font-weight:600;}' +
    '.empty{color:#ccc;}' +
    'table{width:100%;border-collapse:collapse;font-size:12px;}' +
    'th,td{padding:6px 10px;border:1px solid #e8e0d0;text-align:right;}' +
    'th{background:#f5f0e8;font-weight:700;}' +
    '.view-footer{display:flex;justify-content:space-between;border-top:1px solid #e8e0d0;padding-top:8px;margin-top:14px;font-size:10px;color:#999;}' +
    '</style>' +
    '</head><body>' + body + '</body></html>';

  var w = window.open('', '_blank', 'width=850,height=1100');
  if (!w) { toast('افتح النوافذ المنبثقة للطباعة', 'info'); return; }
  w.document.write(printContent);
  w.document.close();
  w.focus();
  setTimeout(function() { w.print(); }, 600);
}

// ================================================================
// QR / PORTAL — رمز QR للموكل
// ================================================================

/**
 * genClientQR — generates the portal QR for a client.
 * Uses ApiService.getPortalUrl() and ApiService.getQrImageUrl().
 *
 * This is the ACTIVE implementation (third definition in original
 * index.html — the first two were dead code).
 *
 * @param {number} i  0-based index in data.clients
 */
function genClientQR(i) {
  var c = data.clients[i];
  if (!c) return;

  var token = c['portal_token'];
  if (!token) {
    toast('لا يوجد رمز بوابة لهذا الموكل — احفظ الموكل أولاً مع تفعيل الخدمة', 'info');
    return;
  }

  var portalUrl = ApiService.getPortalUrl(token);
  displayPortalModal(c['الاسم'] || 'الموكل', portalUrl, token, i);
}

/**
 * showClientPortal — triggered from the view modal "QR الموكل" button.
 * Reads the current viewed client from window._currentViewClientIdx.
 */
function showClientPortal() {
  var idx = window._currentViewClientIdx;
  if (idx === undefined || idx === null || idx < 0) {
    toast('لم يتم تحديد موكل', 'info');
    return;
  }
  genClientQR(idx);
}

/**
 * displayPortalModal — renders the portal modal with QR code and action buttons.
 * @param {string} clientName   - Display name shown in modal header
 * @param {string} portalUrl    - Full portal URL
 * @param {string} token        - Portal token (for revoke/regenerate)
 * @param {number} clientIdx    - 0-based index (for revoke/regenerate save-back)
 */
function displayPortalModal(clientName, portalUrl, token, clientIdx) {
  // Persist so action buttons (copy, open, revoke) can access them
  window._portalUrl      = portalUrl;
  window._portalToken    = token;
  window._portalClientIdx = clientIdx;

  // Label
  var label = document.getElementById('portalClientLabel');
  if (label) label.textContent = 'بوابة الموكل: ' + clientName;

  // Link text
  var linkDiv = document.getElementById('portalLinkDiv');
  if (linkDiv) linkDiv.textContent = portalUrl;

  // QR code image — responsive size
  var qrSize = Math.min(window.innerWidth - 60, 220);
  var qrUrl  = ApiService.getQrImageUrl(portalUrl, qrSize, 'M');
  var qrDiv  = document.getElementById('qrCodeDiv');
  if (qrDiv) {
    qrDiv.innerHTML =
      '<img src="' + qrUrl + '" alt="QR الموكل" ' +
      'style="border-radius:8px;border:4px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,0.25);" ' +
      'width="' + qrSize + '" height="' + qrSize + '">';
  }

  document.getElementById('modalPortal').classList.add('open');
}

/**
 * copyPortalLink — copies the portal URL to clipboard.
 */
function copyPortalLink() {
  var url = window._portalUrl || '';
  if (!url) { toast('لا يوجد رابط', 'info'); return; }
  navigator.clipboard.writeText(url).then(function() {
    toast('تم نسخ رابط البوابة', 'success');
  }).catch(function() {
    toast('تعذر النسخ — انسخ الرابط يدوياً', 'error');
  });
}

/**
 * openPortalDirect — opens the portal URL in a new tab.
 */
function openPortalDirect() {
  var url = window._portalUrl || '';
  if (!url) { toast('لا يوجد رابط', 'info'); return; }
  window.open(url, '_blank');
}

/**
 * revokeAndRegenQR — invalidates the current portal token and
 * generates a new one, then saves back to Sheets.
 */
function revokeAndRegenQR() {
  var idx = window._portalClientIdx;
  if (idx === undefined || idx === null || !data.clients[idx]) {
    toast('تعذر إعادة إنشاء الرمز', 'error');
    return;
  }

  if (!confirm('سيصبح رمز QR القديم بلا فائدة فوراً. هل تريد المتابعة؟')) return;

  var newToken = uid() + '-' + uid();
  data.clients[idx]['portal_token'] = newToken;
  saveLocal();

  ApiService.updateData('الموكلين', data.clients[idx], idx);
  toast('تم إنشاء رمز QR جديد — الرمز القديم لم يعد صالحاً', 'success');

  closeModal('modalPortal');

  // Re-open portal modal with new token
  var c = data.clients[idx];
  var portalUrl = ApiService.getPortalUrl(newToken);
  displayPortalModal(c['الاسم'] || 'الموكل', portalUrl, newToken, idx);
}

// ================================================================
// CLIENT SELECTOR — منتقي الموكلين في نموذج القضايا
// ================================================================
// This block powers the multi-client picker inside the Case modal
// (fCaseClient field). It lives here because it reads data.clients
// and its functions are conceptually part of the Clients module.
//
// NOTE: The picker wraps resetForm / editCase / saveCase via variable
// re-assignment (same pattern used by cases.js for children). The
// wraps are additive and do not break prior overrides.
// ================================================================

/** Separator used when joining multiple selected client names */
var CLIENT_NAME_SEPARATOR = '، ';

/** Array of currently selected client names in the case modal picker */
var _caseSelectedClients = [];

/**
 * _splitClientNames — splits a separator-delimited client string
 * into a clean array of names.
 * @param {string} str
 * @returns {string[]}
 */
function _splitClientNames(str) {
  return String(str || '')
    .split(/\s*[,،]\s*/)
    .map(function(s) { return s.trim(); })
    .filter(Boolean);
}

/**
 * _attrSafeJSString — wraps JSON.stringify and HTML-escapes the result
 * so it can be placed safely inside an HTML attribute (onchange/onclick).
 * @param {string} s
 * @returns {string}
 */
function _attrSafeJSString(s) {
  return JSON.stringify(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

/**
 * toggleClientSelector — opens or closes the picker dropdown panel.
 * @param {Event} [e]
 */
function toggleClientSelector(e) {
  if (e) e.stopPropagation();
  var panel = document.getElementById('clientSelectorPanel');
  if (!panel) return;
  if (panel.classList.contains('open')) {
    closeClientSelector();
  } else {
    panel.classList.add('open');
    renderClientSelectorList();
    var s = document.getElementById('clientSelectorSearch');
    if (s) { s.value = ''; s.focus(); }
  }
}

/**
 * closeClientSelector — closes the picker panel.
 */
function closeClientSelector() {
  var panel = document.getElementById('clientSelectorPanel');
  if (panel) panel.classList.remove('open');
}

// Close picker on outside click
document.addEventListener('click', function(e) {
  var panel = document.getElementById('clientSelectorPanel');
  var box   = document.getElementById('clientSelectorBox');
  if (!panel || !panel.classList.contains('open')) return;
  if (box   && box.contains(e.target))   return;
  if (panel && panel.contains(e.target)) return;
  closeClientSelector();
});

/**
 * renderClientSelectorList — rebuilds the checkbox list inside the picker.
 * Filtered by the search input.
 */
function renderClientSelectorList() {
  var list = document.getElementById('clientSelectorList');
  if (!list) return;

  var qEl     = document.getElementById('clientSelectorSearch');
  var q       = ((qEl && qEl.value) || '').trim().toLowerCase();
  var all     = (data.clients || []).filter(function(c) { return (c['الاسم'] || '').trim(); });
  var clients = q
    ? all.filter(function(c) { return (c['الاسم'] || '').toLowerCase().indexOf(q) >= 0; })
    : all;

  if (!clients.length) {
    list.innerHTML = '<div class="client-selector-empty">' +
      (all.length
        ? 'لا يوجد موكلين مطابقين للبحث'
        : 'لا يوجد موكلين مسجلين بعد — أضف موكلاً من صفحة «الموكلين» أولاً') +
      '</div>';
    return;
  }

  list.innerHTML = clients.map(function(c) {
    var name    = (c['الاسم'] || '').trim();
    var checked = _caseSelectedClients.indexOf(name) >= 0;
    var sub     = [c['النوع'], c['الهاتف']].filter(Boolean).join(' · ');
    return '<label class="client-selector-item">' +
      '<input type="checkbox" ' + (checked ? 'checked' : '') +
        ' onchange="toggleCaseClient(' + _attrSafeJSString(name) + ', this.checked)">' +
      '<span class="client-selector-item-text">' +
        '<span class="client-selector-item-name">' + name + '</span>' +
        (sub ? '<span class="client-selector-item-sub">' + sub + '</span>' : '') +
      '</span></label>';
  }).join('');
}

/**
 * toggleCaseClient — adds or removes a client name from the selection.
 * @param {string}  name
 * @param {boolean} checked
 */
function toggleCaseClient(name, checked) {
  var idx = _caseSelectedClients.indexOf(name);
  if (checked && idx < 0)  _caseSelectedClients.push(name);
  else if (!checked && idx >= 0) _caseSelectedClients.splice(idx, 1);
  _syncCaseClientField();
  renderClientSelectorChips();
}

/**
 * removeCaseClient — removes a client from the selection via chip ×.
 * @param {string} name
 */
function removeCaseClient(name) {
  var idx = _caseSelectedClients.indexOf(name);
  if (idx >= 0) _caseSelectedClients.splice(idx, 1);
  _syncCaseClientField();
  renderClientSelectorChips();
  renderClientSelectorList();
}

/**
 * _syncCaseClientField — writes the joined client names to the
 * hidden #fCaseClient input and triggers detail auto-fill.
 */
function _syncCaseClientField() {
  var el = document.getElementById('fCaseClient');
  if (el) el.value = _caseSelectedClients.join(CLIENT_NAME_SEPARATOR);
  _autofillCaseClientDetails();
}

/**
 * _autofillCaseClientDetails — when exactly one client is selected,
 * fills the detail fields (NID, phone, address, job, employer) from
 * the matching data.clients record.
 *
 * BUGFIX: toggleCaseClient previously only pushed the name, leaving
 * detail inputs blank unless typed manually.
 */
function _autofillCaseClientDetails() {
  if (_caseSelectedClients.length !== 1) return;
  var name  = _caseSelectedClients[0];
  var match = (data.clients || []).filter(function(c) {
    return (c['الاسم'] || '').trim() === name.trim();
  })[0];
  if (!match) return;

  var fieldMap = {
    fCaseClientNID:      'الرقم_القومي',
    fCaseClientPhone:    'الهاتف',
    fCaseClientAddr:     'العنوان',
    fCaseClientJob:      'الوظيفة',
    fCaseClientEmployer: 'جهة_العمل'
  };
  Object.keys(fieldMap).forEach(function(fieldId) {
    var el = document.getElementById(fieldId);
    if (el) el.value = match[fieldMap[fieldId]] || '';
  });
}

/**
 * renderClientSelectorChips — redraws the selected-client chip bar.
 */
function renderClientSelectorChips() {
  var box = document.getElementById('clientSelectorChips');
  if (!box) return;
  if (!_caseSelectedClients.length) {
    box.innerHTML = '<span class="client-selector-placeholder">اختر موكلاً واحداً أو أكثر من القائمة...</span>';
    return;
  }
  box.innerHTML = _caseSelectedClients.map(function(name) {
    return '<span class="client-chip">' + name +
      '<button type="button" class="client-chip-remove" ' +
        'onclick="event.stopPropagation();removeCaseClient(' + _attrSafeJSString(name) + ')" ' +
        'title="إزالة">&times;</button></span>';
  }).join('');
}

/**
 * syncCaseClientSelectorFromField — re-syncs the picker's visual
 * state from the hidden #fCaseClient field value.
 * Called when an existing case is loaded into the form for editing.
 */
function syncCaseClientSelectorFromField() {
  var el = document.getElementById('fCaseClient');
  _caseSelectedClients = _splitClientNames(el ? el.value : '');
  renderClientSelectorChips();
}

// ================================================================
// OVERRIDE resetForm — clear picker on case form reset
// ================================================================
// Wrap the existing resetForm (which may already have been wrapped
// by cases.js) so the picker is cleaned up when the modal resets.
var _origResetFormForClientSelector = resetForm;
resetForm = function(type) {
  _origResetFormForClientSelector(type);
  if (type === 'cases') {
    _caseSelectedClients = [];
    renderClientSelectorChips();
    closeClientSelector();
  }
};

// ================================================================
// OVERRIDE editCase — sync picker when a case is opened for editing
// ================================================================
if (typeof editCase === 'function') {
  var _origEditCaseForClientSelector = editCase;
  editCase = function(i) {
    _origEditCaseForClientSelector(i);
    syncCaseClientSelectorFromField();
    closeClientSelector();
  };
}

// ================================================================
// OVERRIDE saveCase — guarantee hidden field is synced before save
// ================================================================
if (typeof saveCase === 'function') {
  var _origSaveCaseForClientSelector = saveCase;
  saveCase = function() {
    if (typeof _syncCaseClientField === 'function') _syncCaseClientField();
    _origSaveCaseForClientSelector();
  };
}

// ================================================================
// CLIENT REPORT — تقرير الموكلين
// ================================================================

/**
 * printClientsReport — prints a summary table of all clients.
 * Accessible via a dedicated button (if added to the clients toolbar).
 */
function printClientsReport() {
  if (!data.clients || !data.clients.length) {
    toast('لا يوجد موكلون لطباعتهم', 'info');
    return;
  }

  var today = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  var rows = data.clients.map(function(c, i) {
    return '<tr>' +
      '<td style="padding:7px 10px;border:1px solid #e8e0d0;text-align:center;">' + (i + 1) + '</td>' +
      '<td style="padding:7px 10px;border:1px solid #e8e0d0;font-weight:700;">' + (c['الاسم'] || '—') + '</td>' +
      '<td style="padding:7px 10px;border:1px solid #e8e0d0;">' + (c['النوع'] || '—') + '</td>' +
      '<td style="padding:7px 10px;border:1px solid #e8e0d0;">' + (c['الهاتف'] || '—') + '</td>' +
      '<td style="padding:7px 10px;border:1px solid #e8e0d0;">' + (c['الوظيفة'] || '—') + '</td>' +
      '<td style="padding:7px 10px;border:1px solid #e8e0d0;">' + (c['العنوان'] || '—') + '</td>' +
    '</tr>';
  }).join('');

  var printContent =
    '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap" rel="stylesheet">' +
    '<style>' +
    '*{box-sizing:border-box;margin:0;padding:0;}' +
    'body{font-family:Cairo,Arial,sans-serif;background:#fff;color:#111;direction:rtl;padding:20px;}' +
    '@page{size:A4 landscape;margin:12mm;}' +
    'h1{font-size:16px;text-align:center;color:#1a2744;border-bottom:2px solid #c9a84c;padding-bottom:8px;margin-bottom:14px;}' +
    'p{font-size:11px;color:#888;text-align:center;margin-bottom:12px;}' +
    'table{width:100%;border-collapse:collapse;font-size:12px;}' +
    'th{background:#f5f0e8;padding:8px 10px;border:1px solid #e8e0d0;text-align:right;font-weight:700;}' +
    '</style></head><body>' +
    '<h1>مكتب الحسام للمحاماة — سجل الموكلين</h1>' +
    '<p>تاريخ الطباعة: ' + today + ' | عدد الموكلين: ' + data.clients.length + '</p>' +
    '<table>' +
      '<thead><tr>' +
        '<th>#</th><th>الاسم</th><th>النوع</th><th>الهاتف</th><th>الوظيفة</th><th>العنوان</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>' +
    '</body></html>';

  var w = window.open('', '_blank', 'width=1000,height=700');
  if (!w) { toast('افتح النوافذ المنبثقة للطباعة', 'info'); return; }
  w.document.write(printContent);
  w.document.close();
  w.focus();
  setTimeout(function() { w.print(); }, 600);
}

// ================================================================
// SHARED VIEW-MODAL PRINT — طباعة من نافذة العرض المشتركة (modalView)
// ================================================================
// FIX (CLIENTS_AUDIT_REPORT.md §2 / §4 — missing printView()):
// The "طباعة" button inside the shared #modalView overlay (used by
// BOTH viewCase() and viewClient()) calls onclick="printView()" with
// no arguments. That function never existed in any loaded script,
// so clicking it threw "ReferenceError: printView is not defined"
// and never printed anything.
//
// viewCase() (cases.js) sets window._currentViewCase and renders
// buildCaseReport()'s output (wrapped in <div class="view-body"
// id="viewPrintContent">) into #viewModalBody.
// viewClient() (this file) sets window._currentViewCase = null and
// window._currentViewClient = <client>, rendering buildClientReport()'s
// output (wrapped in <div class="case-report">) into #viewModalBody.
//
// printView() reuses the SAME print CSS already shipped with
// quickPrintCase() (cases.js) and printClientFile() (this file) —
// no new design, no new layout, RTL/Arabic font stack unchanged —
// and simply prints whatever is currently sitting in #viewModalBody,
// which is exactly the markup those two builder functions produced.
// This avoids re-implementing report HTML a third time and keeps a
// single source of truth: the builder functions themselves.

/**
 * printView — prints whichever report (case or client) is currently
 * open in the shared #modalView overlay. Triggered by the "طباعة"
 * button in the view-modal header.
 */
function printView() {
  var body = document.getElementById('viewModalBody');
  if (!body || !body.innerHTML.trim()) {
    toast('لا يوجد محتوى لطباعته', 'info');
    return;
  }

  var isClientView = !!window._currentViewClient;
  var isCaseView   = !isClientView && !!window._currentViewCase;

  if (!isClientView && !isCaseView) {
    toast('لا يوجد ملف مفتوح للطباعة', 'info');
    return;
  }

  var printContent = isClientView
    ? _buildClientPrintDocument(body.innerHTML)
    : _buildCasePrintDocument(body.innerHTML);

  var w = window.open('', '_blank', 'width=900,height=1100,scrollbars=yes');
  if (!w) { toast('افتح النوافذ المنبثقة للطباعة', 'info'); return; }
  w.document.open();
  w.document.write(printContent);
  w.document.close();
  w.focus();
  setTimeout(function() { w.print(); }, 600);
}

/**
 * _buildClientPrintDocument — wraps client-report HTML with the
 * exact same print CSS used by printClientFile() (unchanged).
 * @param {string} bodyHtml
 * @returns {string}
 */
function _buildClientPrintDocument(bodyHtml) {
  return '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap" rel="stylesheet">' +
    '<style>' +
    '*{box-sizing:border-box;margin:0;padding:0;}' +
    'body{font-family:Cairo,Arial,sans-serif;background:#fff;color:#111;direction:rtl;}' +
    '@page{size:A4;margin:15mm;}' +
    '.case-report{padding:10px;}' +
    '.report-header{text-align:center;border-bottom:2px solid #c9a84c;padding-bottom:12px;margin-bottom:16px;}' +
    '.view-section{margin-bottom:16px;border:1px solid #e8e0d0;border-radius:6px;overflow:hidden;}' +
    '.view-section-title{background:#f5f0e8;padding:8px 12px;font-weight:700;font-size:13px;border-bottom:1px solid #e8e0d0;}' +
    '.view-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0;}' +
    '.view-field{padding:7px 12px;border-bottom:1px solid #f0ece4;border-left:1px solid #f0ece4;}' +
    '.view-field-full{padding:7px 12px;border-bottom:1px solid #f0ece4;}' +
    '.view-label{font-size:10px;color:#888;margin-bottom:2px;}' +
    '.view-value{font-size:13px;font-weight:600;}' +
    '.empty{color:#ccc;}' +
    'table{width:100%;border-collapse:collapse;font-size:12px;}' +
    'th,td{padding:6px 10px;border:1px solid #e8e0d0;text-align:right;}' +
    'th{background:#f5f0e8;font-weight:700;}' +
    '.view-footer{display:flex;justify-content:space-between;border-top:1px solid #e8e0d0;padding-top:8px;margin-top:14px;font-size:10px;color:#999;}' +
    '</style>' +
    '</head><body>' + bodyHtml + '</body></html>';
}

/**
 * _buildCasePrintDocument — wraps case-report HTML with the exact
 * same print CSS used by quickPrintCase() in cases.js (unchanged).
 * @param {string} bodyHtml
 * @returns {string}
 */
function _buildCasePrintDocument(bodyHtml) {
  return '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">' +
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
    '</style></head><body>' + bodyHtml + '</body></html>';
}
