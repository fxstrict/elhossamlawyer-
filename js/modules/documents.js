/**
 * ================================================================
 * js/modules/documents.js — وحدة المستندات | نظام الحسام للمحاماة
 * ================================================================
 * Contains ALL Documents-related functions extracted from index.html.
 *
 * Depends on (globals expected from index.html / prior scripts):
 *   - data              : shared app data object  { documents, cases, … }
 *   - editIdx           : shared edit-index map   { documents: -1 }
 *   - ApiService        : api.js layer (replaces direct syncToSheets /
 *                         syncDeleteToSheets calls)
 *   - saveLocal()       : localStorage persistence helper
 *   - toast()           : UI notification helper
 *   - updateBadges()    : badge counter updater
 *   - closeModal()      : modal close helper
 *   - populateCaseDropdown() : defined in cases.js
 *   - formatDate()      : date formatter          (from ui-utils.js)
 *   - val()             : getElementById+.value   (from ui-utils.js)
 *   - uid()             : unique-ID generator     (from ui-utils.js)
 *   - collectForm()     : generic form-to-object  (from ui-utils.js)
 *   - fillForm()        : generic object-to-form  (from ui-utils.js)
 *
 * GAS Sheet name: 'المستندات'
 *
 * Does NOT touch:
 *   - CSS / HTML structure
 *   - Other modules (cases, clients, sessions, tasks, fees, …)
 *   - Google Apps Script backend
 *   - Database / sheet structure
 *   - ApiService internals
 * ================================================================
 */

'use strict';

// ================================================================
// FIELDS & MAP — documents slice only
// ================================================================

var DOCUMENTS_FIELDS = [
  'fDocCaseNum',
  'fDocName',
  'fDocType',
  'fDocDate',
  'fDocDriveUrl',
  'fDocNotes'
];

var DOCUMENTS_MAP = {
  fDocCaseNum:   'رقم_القضية',
  fDocName:      'اسم_المستند',
  fDocType:      'نوع_المستند',
  fDocDate:      'تاريخ_الإيداع',
  fDocDriveUrl:  'رابط_Drive',
  fDocNotes:     'الملاحظات'
};

// ================================================================
// RENDER — عرض قائمة المستندات
// ================================================================

/**
 * renderDocuments — renders the documents list view (table + mobile cards).
 * Reads: data.documents, searchDocuments filter, filterDocType filter.
 * Writes to: #documentsTableBody, #documentsMobileList, #documentsEmpty.
 */
function renderDocuments() {
  var s  = val('searchDocuments').toLowerCase();
  var ty = val('filterDocType');

  var rows = data.documents.filter(function(d) {
    var t = Object.values(d).join(' ').toLowerCase();
    return (!s || t.includes(s)) && (!ty || d['نوع_المستند'] === ty);
  });

  var tb = document.getElementById('documentsTableBody');
  var em = document.getElementById('documentsEmpty');
  var ml = document.getElementById('documentsMobileList');

  if (!rows.length) {
    tb.innerHTML = '';
    ml.innerHTML = '';
    em.style.display = '';
    return;
  }
  em.style.display = 'none';

  tb.innerHTML = rows.map(function(d) {
    var ri = data.documents.indexOf(d);
    return (
      '<tr>' +
        '<td><strong>' + (d['اسم_المستند'] || '—') + '</strong></td>' +
        '<td style="color:var(--gold)">' + (d['رقم_القضية'] || '—') + '</td>' +
        '<td>' + (d['نوع_المستند'] || '—') + '</td>' +
        '<td>' + formatDate(d['تاريخ_الإيداع']) + '</td>' +
        '<td>' +
          (d['رابط_Drive']
            ? '<a href="' + d['رابط_Drive'] + '" target="_blank" class="btn btn-success btn-sm">&#128279; فتح</a>'
            : '—') +
        '</td>' +
        '<td><small>' + (d['الملاحظات'] || '—') + '</small></td>' +
        '<td>' +
          '<button class="btn btn-ghost btn-sm btn-icon" onclick="editDocument(' + ri + ')">&#9998;</button> ' +
          '<button class="btn btn-danger btn-sm btn-icon" onclick="deleteDocument(' + ri + ')">&#128465;</button>' +
        '</td>' +
      '</tr>'
    );
  }).join('');

  ml.innerHTML = rows.map(function(d) {
    var ri = data.documents.indexOf(d);
    return (
      '<div class="m-card">' +
        '<div class="m-card-header">' +
          '<div class="m-card-title">&#128206; ' + (d['اسم_المستند'] || '—') + '</div>' +
          '<div class="m-card-num">قضية: ' + (d['رقم_القضية'] || '—') + '</div>' +
        '</div>' +
        '<div class="m-card-meta">' +
          '<span>&#128203; ' + (d['نوع_المستند'] || '—') + '</span>' +
          '<span>&#128197; ' + formatDate(d['تاريخ_الإيداع']) + '</span>' +
        '</div>' +
        '<div class="m-card-actions">' +
          (d['رابط_Drive']
            ? '<a href="' + d['رابط_Drive'] + '" target="_blank" class="btn btn-success btn-sm" style="flex:1;">&#128279; فتح Drive</a>'
            : '') +
          '<button class="btn btn-ghost btn-sm btn-icon" onclick="editDocument(' + ri + ')">&#9998;</button>' +
          '<button class="btn btn-danger btn-sm btn-icon" onclick="deleteDocument(' + ri + ')">&#128465;</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

// ================================================================
// CRUD — حفظ / تعديل / حذف
// ================================================================

/**
 * saveDocument — validates, saves to data.documents, syncs to GAS.
 * Replaces: inline saveDocument() in index.html <script> block.
 * ApiService.syncRow() replaces the original syncToSheets() call.
 */
function saveDocument() {
  var c = document.getElementById('fDocCaseNum').value.trim();
  var n = document.getElementById('fDocName').value.trim();
  if (!c || !n) {
    toast('يرجى ملء رقم القضية واسم المستند', 'error');
    return;
  }

  var obj = collectForm('documents');
  obj['رقم_المستند']    = obj['رقم_المستند']    || uid();
  obj['تاريخ_الإنشاء']  = obj['تاريخ_الإنشاء']  || new Date().toISOString();

  var idx = editIdx.documents;
  if (idx >= 0) {
    data.documents[idx] = obj;
    toast('تم التحديث', 'success');
  } else {
    data.documents.push(obj);
    toast('تمت الإضافة', 'success');
  }

  saveLocal();
  ApiService.syncRow('المستندات', obj, idx);   // replaces: if(API_URL)syncToSheets(...)
  closeModal('modalDocument');
  renderDocuments();
  updateBadges();
}

/**
 * editDocument — opens the document modal pre-filled with existing data.
 * @param {number} i - 0-based index in data.documents
 */
function editDocument(i) {
  editIdx.documents = i;
  populateCaseDropdown('fDocCaseNum', data.documents[i]['رقم_القضية']);
  fillForm('documents', data.documents[i]);
  document.getElementById('modalDocTitle').textContent = 'تعديل المستند';
  document.getElementById('modalDocument').classList.add('open');
}

/**
 * deleteDocument — confirms, removes from data.documents.
 * @param {number} i - 0-based index in data.documents
 *
 * NOTE: Preserves original behaviour exactly — the original inline
 * deleteDocument() does NOT call syncDeleteToSheets()/ApiService.deleteData()
 * for documents (unlike deleteSession/deleteClient/etc). This module makes
 * no functional change to that behaviour; it is flagged in
 * DOCUMENTS_MODULE_REPORT.md as a pre-existing gap, consistent with the
 * "no functional changes" extraction mandate.
 */
function deleteDocument(i) {
  if (!confirm('حذف؟')) return;
  data.documents.splice(i, 1);
  saveLocal();
  toast('تم الحذف', 'info');
  renderDocuments();
  updateBadges();
}
