/**
 * ================================================================
 * js/modules/sessions.js — وحدة الجلسات | نظام الحسام للمحاماة
 * ================================================================
 * Contains ALL Sessions-related functions extracted from index.html.
 *
 * Depends on (globals expected from index.html / prior scripts):
 *   - data              : shared app data object  { sessions, cases, … }
 *   - editIdx           : shared edit-index map   { sessions: -1 }
 *   - ApiService        : api.js layer (replaces direct syncToSheets /
 *                         syncDeleteToSheets calls)
 *   - saveLocal()       : localStorage persistence helper
 *   - toast()           : UI notification helper
 *   - updateBadges()    : badge counter updater
 *   - closeModal()      : modal close helper
 *   - populateCaseDropdown() : defined in cases.js
 *   - autofillSessionFromCase(): defined in cases.js
 *   - sanitizeTime()    : time-string normalizer (from ui-utils.js)
 *   - formatTime()      : time formatter          (from ui-utils.js)
 *   - formatDate()      : date formatter          (from ui-utils.js)
 *   - parseLocalDate()  : date parser             (from ui-utils.js)
 *   - urgencyBadge()    : urgency badge builder   (from ui-utils.js)
 *   - statusBadge()     : status badge builder    (from ui-utils.js)
 *   - val()             : getElementById+.value   (from ui-utils.js)
 *   - uid()             : unique-ID generator     (from ui-utils.js)
 *   - collectForm()     : generic form-to-object  (from ui-utils.js)
 *   - fillForm()        : generic object-to-form  (from ui-utils.js)
 *
 * GAS Sheet name: 'الجلسات'
 *
 * Does NOT touch:
 *   - CSS / HTML structure
 *   - Other modules (cases, clients, documents, tasks, fees, …)
 *   - Google Apps Script backend
 *   - Database / sheet structure
 *   - ApiService internals
 * ================================================================
 */

'use strict';

// ================================================================
// FIELDS & MAP — sessions slice only
// ================================================================

var SESSIONS_FIELDS = [
  'fSessionCaseNum',
  'fSessionCaseTitle',
  'fSessionCaseType',
  'fSessionCourt',
  'fSessionDate',
  'fSessionTime',
  'fSessionJudge',
  'fSessionStatus',
  'fSessionWhat',
  'fSessionDecision',
  'fSessionNextDate',
  'fSessionNotes'
];

var SESSIONS_MAP = {
  fSessionCaseNum:   'رقم_القضية',
  fSessionCaseTitle: 'عنوان_القضية',
  fSessionCaseType:  'نوع_الدعوى',
  fSessionCourt:     'المحكمة',
  fSessionDate:      'التاريخ',
  fSessionTime:      'الوقت',
  fSessionJudge:     'القاضي',
  fSessionStatus:    'الحالة',
  fSessionWhat:      'ما_تم_في_الجلسة',
  fSessionDecision:  'القرار',
  fSessionNextDate:  'التأجيل_إلى',
  fSessionNotes:     'الملاحظات'
};

// ================================================================
// RENDER — عرض قائمة الجلسات
// ================================================================

/**
 * renderSessions — renders the sessions list view.
 * Reads: data.sessions, searchSessions filter, filterSessionStatus filter.
 * Writes to: #sessionsListView, #sessionsEmpty.
 */
function renderSessions() {
  var s  = val('searchSessions').toLowerCase();
  var st = val('filterSessionStatus');

  var rows = data.sessions
    .filter(function(x) {
      var t = Object.values(x).join(' ').toLowerCase();
      return (!s || t.includes(s)) && (!st || x['الحالة'] === st);
    })
    .sort(function(a, b) {
      return (parseLocalDate(a['التاريخ']) || 0) - (parseLocalDate(b['التاريخ']) || 0);
    });

  var c  = document.getElementById('sessionsListView');
  var em = document.getElementById('sessionsEmpty');

  if (!rows.length) {
    c.innerHTML = '';
    em.style.display = '';
    return;
  }
  em.style.display = 'none';

  c.innerHTML = rows.map(function(s) {
    var ri  = data.sessions.indexOf(s);
    var d   = parseLocalDate(s['التاريخ']);
    var day = d ? d.getDate() : '—';
    var mon = d ? d.toLocaleDateString('ar-EG', { month: 'short' }) : '';

    return (
      '<div class="session-item">' +
        '<div class="session-date">' +
          '<div class="day">'   + day + '</div>' +
          '<div class="month">' + mon + '</div>' +
        '</div>' +
        '<div class="session-info">' +
          '<div class="session-title">' +
            (s['عنوان_القضية'] || 'جلسة') +
            (s['رقم_القضية'] ? ' <small style="color:var(--muted)">— ' + s['رقم_القضية'] + '</small>' : '') +
            ' ' + urgencyBadge(s['التاريخ']) +
          '</div>' +
          '<div class="session-meta">' +
            '<span>&#128336; ' + formatTime(s['الوقت']) + '</span>' +
            '<span>&#127963; ' + (s['المحكمة'] || '—') + '</span>' +
            (s['القاضي']     ? '<span>&#128100; ' + s['القاضي']     + '</span>' : '') +
            (s['نوع_الدعوى'] ? '<span>&#128203; ' + s['نوع_الدعوى'] + '</span>' : '') +
            statusBadge(s['الحالة']) +
          '</div>' +
          (s['ما_تم_في_الجلسة']
            ? '<div style="font-size:12px;color:var(--muted);margin-top:5px;">&#128221; ' + s['ما_تم_في_الجلسة'] + '</div>'
            : '') +
          (s['القرار']
            ? '<div style="font-size:12px;color:var(--gold);margin-top:3px;">&#9878; القرار: ' + s['القرار'] + '</div>'
            : '') +
          (s['التأجيل_إلى']
            ? '<div style="font-size:12px;color:var(--info);margin-top:3px;">&#128197; التأجيل: ' + formatDate(s['التأجيل_إلى']) + '</div>'
            : '') +
        '</div>' +
        '<div class="session-actions">' +
          '<button class="btn btn-ghost btn-sm btn-icon" onclick="editSession(' + ri + ')">&#9998;</button>' +
          '<button class="btn btn-danger btn-sm btn-icon" onclick="deleteSession(' + ri + ')">&#128465;</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

// ================================================================
// CRUD — حفظ / تعديل / حذف
// ================================================================

/**
 * saveSession — validates, saves to data.sessions, syncs to GAS.
 * Replaces: inline saveSession() in index.html <script> block.
 * ApiService.syncRow() replaces the original syncToSheets() call.
 */
function saveSession() {
  var date = document.getElementById('fSessionDate').value;
  var time = document.getElementById('fSessionTime').value;
  if (!date || !time) {
    toast('يرجى تحديد تاريخ ووقت الجلسة', 'error');
    return;
  }

  var obj = collectForm('sessions');
  obj['الوقت']         = sanitizeTime(obj['الوقت']);
  obj['رقم_الجلسة']    = obj['رقم_الجلسة']    || uid();
  obj['تاريخ_الإنشاء'] = obj['تاريخ_الإنشاء'] || new Date().toISOString();

  var idx = editIdx.sessions;
  if (idx >= 0) {
    data.sessions[idx] = obj;
    toast('تم تحديث الجلسة', 'success');
  } else {
    data.sessions.push(obj);
    toast('تمت إضافة الجلسة — ستظهر في Google Calendar', 'success');
  }

  saveLocal();
  ApiService.syncRow('الجلسات', obj, idx);   // replaces: if(API_URL)syncToSheets(...)
  closeModal('modalSession');
  renderSessions();
  updateBadges();
}

/**
 * editSession — opens the session modal pre-filled with existing data.
 * @param {number} i - 0-based index in data.sessions
 */
function editSession(i) {
  editIdx.sessions = i;
  populateCaseDropdown('fSessionCaseNum', data.sessions[i]['رقم_القضية']);
  fillForm('sessions', data.sessions[i]);
  autofillSessionFromCase(data.sessions[i]['رقم_القضية'], true);
  document.getElementById('modalSessionTitle').textContent = 'تعديل الجلسة';
  document.getElementById('modalSession').classList.add('open');
}

/**
 * deleteSession — confirms, removes from data.sessions, syncs to GAS.
 * @param {number} i - 0-based index in data.sessions
 * ApiService.deleteData() replaces the original syncDeleteToSheets() call.
 */
function deleteSession(i) {
  if (!confirm('حذف هذه الجلسة؟')) return;
  ApiService.deleteData('الجلسات', i);       // replaces: if(API_URL)syncDeleteToSheets(...)
  data.sessions.splice(i, 1);
  saveLocal();
  toast('تم الحذف', 'info');
  renderSessions();
  updateBadges();
}
