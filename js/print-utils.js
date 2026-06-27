/**
 * print-utils.js
 * Al Hossam Law Office — Print Report Builder
 *
 * Source: index.html lines 1061–1159 (buildCaseReport, vf)
 * Stage:  Live cut — extracted per PRINT_UTILS_AUDIT.md, Section 4,
 *         "SAFE TO EXTRACT".
 *
 * Both functions in this file are pure:
 *   - No DOM writes
 *   - No globals mutation
 *   - No onclick dependencies
 *   - No runtime order dependency outside this file
 *
 * Dependencies (declared globals, NOT in-file — must be loaded first):
 *   - formatDate, formatTime, parseLocalDate   (from js/ui-utils.js)
 *
 * buildCaseReport() calls vf(), so vf() must be declared before
 * buildCaseReport() is invoked. Declaration order below satisfies this.
 *
 * Load this file after js/ui-utils.js and before the main inline
 * <script> blocks in index.html (printView, quickPrintCase, viewCase
 * all call buildCaseReport and must find it already defined).
 */

/* ─── View field helper (used by buildCaseReport) ─────────────────── */

// Helper: view field
function vf(label,val){
  var v=(val&&String(val).trim())?String(val).trim():'<span class="empty">—</span>';
  return'<div class="view-field"><div class="view-label">'+label+'</div><div class="view-value">'+v+'</div></div>';
}

/* ─── Case report builder (used by viewCase / printView / quickPrintCase) ─── */

function buildCaseReport(c,sessions,docs,children){
  var today=new Date().toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
  var statusBadge=function(s){var m={نشطة:'active-v',active:'active-v',منتهية:'closed-v',closed:'closed-v',معلقة:'pending-v',قادمة:'active-v',مُرجأة:'pending-v'};return'<span class="badge-v badge-'+(m[s]||'pending-v')+'">'+s+'</span>';};
  var f=function(v,empty){return(v&&String(v).trim())?String(v).trim():('<span class="empty">'+(empty||'—')+'</span>');};

  var html='<div class="view-body" id="viewPrintContent">';
  // Header
  html+='<div class="view-header"><div><div class="view-title">&#9878; ملف القضية</div>';
  html+='<div class="view-subtitle">'+f(c['عنوان_القضية'])+' &nbsp;|&nbsp; رقم الملف: '+f(c['رقم_القضية'])+'</div></div>';
  html+='<div class="view-office"><strong>مكتب المحامي</strong><br>'+statusBadge(c['الحالة']||'نشطة')+'<br><small>'+today+'</small></div></div>';

  // بيانات أساسية
  html+='<div class="view-section"><div class="view-section-title">&#128203; البيانات الأساسية</div><div class="view-grid">';
  html+=vf('نوع الدعوى',c['نوع_الدعوى'])+vf('المحكمة',c['المحكمة'])+vf('رقم الدعوى',c['رقم_الدعوى'])+vf('تاريخ القيد',formatDate(c['تاريخ_القيد']))+vf('الجلسة القادمة',formatDate(c['تاريخ_الجلسة_القادمة']))+vf('أتعاب المحاماة',(c['أتعاب_المحاماة']?c['أتعاب_المحاماة']+' ج.م':''));
  html+='</div></div>';

  // الموكل
  html+='<div class="view-section"><div class="view-section-title">&#128100; بيانات الموكل ('+f(c['نوع_الموكل'])+')</div><div class="view-grid">';
  html+=vf('الاسم',c['اسم_الموكل'])+vf('الرقم القومي',c['رقم_قومي_الموكل'])+vf('الهاتف',c['هاتف_الموكل'])+vf('العنوان',c['عنوان_الموكل'])+vf('الوظيفة',c['عمل_الموكل'])+vf('جهة العمل',c['جهة_عمل_الموكل']);
  html+='</div></div>';

  // الخصم
  if(c['اسم_الخصم']){
    html+='<div class="view-section"><div class="view-section-title">&#128100; بيانات الخصم</div><div class="view-grid">';
    html+=vf('الاسم',c['اسم_الخصم'])+vf('الرقم القومي',c['رقم_قومي_الخصم'])+vf('الهاتف',c['هاتف_الخصم'])+vf('العنوان',c['عنوان_الخصم'])+vf('الوظيفة',c['عمل_الخصم'])+vf('جهة العمل',c['جهة_عمل_الخصم']);
    html+='</div></div>';
  }

  // بيانات الزواج (أحوال شخصية)
  if(c['تاريخ_عقد_الزواج']||c['رقم_وثيقة_الزواج']){
    html+='<div class="view-section"><div class="view-section-title">&#128141; بيانات الزواج</div><div class="view-grid">';
    html+=vf('تاريخ عقد الزواج',formatDate(c['تاريخ_عقد_الزواج']))+vf('رقم الوثيقة',c['رقم_وثيقة_الزواج'])+vf('مكتب التوثيق',c['مكتب_التوثيق'])+vf('قائمة المنقولات',c['وجود_قائمة_منقولات']);
    html+='</div></div>';
  }

  // الأطفال
  if(children.length>0){
    html+='<div class="view-section"><div class="view-section-title">&#128118; الأطفال</div>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;"><tr style="background:#f5f0e8;"><th style="padding:7px 10px;text-align:right;border:1px solid #e8e0d0;">الاسم</th><th style="padding:7px 10px;text-align:right;border:1px solid #e8e0d0;">السن</th><th style="padding:7px 10px;text-align:right;border:1px solid #e8e0d0;">الحضانة</th></tr>';
    children.forEach(function(ch){html+='<tr><td style="padding:7px 10px;border:1px solid #e8e0d0;">'+f(ch.name)+'</td><td style="padding:7px 10px;border:1px solid #e8e0d0;">'+(ch.age?ch.age+' سنة':'—')+'</td><td style="padding:7px 10px;border:1px solid #e8e0d0;">'+f(ch.custody)+'</td></tr>';});
    html+='</table></div>';
  }

  // الطلبات والدفوع
  if(c['الطلبات_القانونية']||c['الدفوع_القانونية']){
    html+='<div class="view-section"><div class="view-section-title">&#128220; الطلبات والدفوع</div>';
    if(c['الطلبات_القانونية'])html+='<div class="view-field-full"><div class="view-label">الطلبات القانونية</div><div class="view-value">'+c['الطلبات_القانونية']+'</div></div>';
    if(c['الدفوع_القانونية'])html+='<div class="view-field-full"><div class="view-label">الدفوع القانونية</div><div class="view-value">'+c['الدفوع_القانونية']+'</div></div>';
    if(c['إجراءات_الدعوى'])html+='<div class="view-field-full"><div class="view-label">إجراءات الدعوى</div><div class="view-value">'+c['إجراءات_الدعوى']+'</div></div>';
    html+='</div>';
  }

  // سجل الجلسات
  html+='<div class="view-section"><div class="view-section-title">&#128197; سجل الجلسات ('+(sessions.length)+' جلسة)</div>';
  if(!sessions.length){html+='<div style="padding:14px;color:#888;font-size:12px;">لا توجد جلسات مسجلة لهذه القضية</div>';}
  else{sessions.forEach(function(s,idx){
    var d=parseLocalDate(s['التاريخ']);
    var dayStr=d?d.toLocaleDateString('ar-EG',{weekday:'short',day:'numeric',month:'short',year:'numeric'}):'—';
    var statusCls=s['الحالة']==='منتهية'?'closed-v':s['الحالة']==='قادمة'?'active-v':'pending-v';
    html+='<div class="session-row"><div class="session-num">'+(idx+1)+'</div><div class="session-detail">';
    html+='<div class="session-detail-title">&#128197; '+dayStr+' &nbsp; <span style="font-size:11px;font-weight:400;">الساعة '+formatTime(s['الوقت'])+'</span></div>';
    html+='<div class="session-detail-meta"><span>&#127963; '+(s['المحكمة']||'—')+'</span>'+(s['القاضي']?'<span>&#128100; القاضي: '+s['القاضي']+'</span>':'')+'<span class="badge-v badge-'+statusCls+'">'+(s['الحالة']||'—')+'</span></div>';
    if(s['ما_تم_في_الجلسة'])html+='<div style="font-size:12px;color:#444;margin-top:4px;">&#128221; '+s['ما_تم_في_الجلسة']+'</div>';
    if(s['القرار'])html+='<div class="session-decision">&#9878; القرار: '+s['القرار']+'</div>';
    if(s['التأجيل_إلى'])html+='<div class="session-next">&#128197; سبب التأجيل / التأجيل إلى: '+formatDate(s['التأجيل_إلى'])+(s['الملاحظات']?' — '+s['الملاحظات']:'')+'</div>';
    html+='</div></div>';
  });}
  html+='</div>';

  // قرارات المحكمة والتنفيذ
  if(c['قرارات_المحكمة']||c['تاريخ_الحكم']||c['رقم_التنفيذ']){
    html+='<div class="view-section"><div class="view-section-title">&#128296; الأحكام والتنفيذ</div><div class="view-grid">';
    if(c['قرارات_المحكمة'])html+='<div class="view-field-full"><div class="view-label">قرارات المحكمة</div><div class="view-value">'+c['قرارات_المحكمة']+'</div></div>';
    html+=vf('تاريخ الحكم',formatDate(c['تاريخ_الحكم']))+vf('رقم التنفيذ',c['رقم_التنفيذ']);
    if(c['إجراءات_التنفيذ'])html+='<div class="view-field-full"><div class="view-label">إجراءات التنفيذ ونتائجه</div><div class="view-value">'+c['إجراءات_التنفيذ']+'</div></div>';
    html+='</div></div>';
  }

  // المستندات
  if(docs.length>0){
    html+='<div class="view-section"><div class="view-section-title">&#128206; المستندات المودعة</div>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;"><tr style="background:#f5f0e8;"><th style="padding:7px 10px;border:1px solid #e8e0d0;text-align:right;">المستند</th><th style="padding:7px 10px;border:1px solid #e8e0d0;text-align:right;">النوع</th><th style="padding:7px 10px;border:1px solid #e8e0d0;text-align:right;">تاريخ الإيداع</th><th style="padding:7px 10px;border:1px solid #e8e0d0;text-align:right;">الرابط</th></tr>';
    docs.forEach(function(d){html+='<tr><td style="padding:7px 10px;border:1px solid #e8e0d0;font-weight:700;">'+f(d['اسم_المستند'])+'</td><td style="padding:7px 10px;border:1px solid #e8e0d0;">'+f(d['نوع_المستند'])+'</td><td style="padding:7px 10px;border:1px solid #e8e0d0;">'+formatDate(d['تاريخ_الإيداع'])+'</td><td style="padding:7px 10px;border:1px solid #e8e0d0;">'+(d['رابط_Drive']?'<a href="'+d['رابط_Drive']+'" style="color:#2980b9;">&#128279; عرض</a>':'—')+'</td></tr>';});
    html+='</table></div>';
  }

  // ملاحظات المحامي
  if(c['الملاحظات'])html+='<div class="view-section"><div class="view-section-title">&#128221; ملاحظات المحامي</div><div class="view-field-full"><div class="view-value">'+c['الملاحظات']+'</div></div></div>';

  html+='<div class="view-footer"><span>نظام دعم المحامي — المدى الهندسية</span><span>تاريخ الطباعة: '+today+'</span></div>';
  html+='</div>';
  return html;
}

// ================================================================
// VIEW CASE - full printable report
// ================================================================
function viewCase(i){
  var c=data.cases[i];
  if(!c)return;
  // Find related sessions by رقم_القضية
  var caseNum=c['رقم_القضية']||'';
  var sessions=data.sessions.filter(function(s){
    return s['رقم_القضية']===caseNum||s['عنوان_القضية']===(c['عنوان_القضية']||'');
  }).sort(function(a,b){return(parseLocalDate(a['التاريخ'])||0)-(parseLocalDate(b['التاريخ'])||0);});
  // Related documents
  var docs=data.documents.filter(function(d){return d['رقم_القضية']===caseNum;});
  // Children from case data
  var children=[];try{children=JSON.parse(c['أطفال_القضية']||'[]');}catch(e){}

  var html=buildCaseReport(c,sessions,docs,children);
  document.getElementById('viewModalTitle').innerHTML='&#128065; عرض القضية: '+caseNum+' — '+(c['عنوان_القضية']||'');
  document.getElementById('viewModalBody').innerHTML=html;
  document.getElementById('modalView').classList.add('open');
  // Store current case for portal
  window._currentViewCase=c;window._currentViewSessions=sessions;
}

// ================================================================
// PRINT
// ================================================================
function printView(){
  var body=document.getElementById('viewModalBody').innerHTML;
  var printContent='<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">'+
    '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap" rel="stylesheet">'+
    '<style>'+
    '*{box-sizing:border-box;margin:0;padding:0;}'+
    'body{font-family:Cairo,Arial,sans-serif;background:#fff;color:#111;direction:rtl;padding:0;}'+
    '@page{size:A4;margin:15mm;}'+
    '@media print{'+
    'body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}'+
    '.view-section-title{background:#0D1B2A!important;color:#C9A84C!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}'+
    '.session-num{background:#f5f0e8!important;color:#C9A84C!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}'+
    '.badge-active-v{background:#d5f5e3!important;color:#1e8449!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}'+
    '.badge-closed-v{background:#eaecee!important;color:#717d7e!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}'+
    '.badge-pending-v{background:#fdebd0!important;color:#a04000!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}'+
    '.badge-urgent-v{background:#fadbd8!important;color:#922b21!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}'+
    '}'+
    '.view-body{padding:20px;background:#fff;color:#111;font-family:Cairo,Arial,sans-serif;direction:rtl;}'+
    '.view-header{border-bottom:3px solid #C9A84C;padding-bottom:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start;}'+
    '.view-office{font-size:11px;color:#888;text-align:left;}'+
    '.view-title{font-size:20px;font-weight:900;color:#0D1B2A;}'+
    '.view-subtitle{font-size:13px;color:#555;margin-top:3px;}'+
    '.view-section{margin-bottom:18px;border:1px solid #e8e0d0;border-radius:8px;overflow:hidden;}'+
    '.view-section-title{background:#0D1B2A;color:#C9A84C;font-size:12px;font-weight:700;padding:8px 14px;letter-spacing:1px;}'+
    '.view-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;}'+
    '.view-field{padding:9px 14px;border-bottom:1px solid #f0ece4;}'+
    '.view-field:nth-child(odd){border-left:1px solid #f0ece4;}'+
    '.view-field-full{padding:9px 14px;border-bottom:1px solid #f0ece4;grid-column:1/-1;}'+
    '.view-label{font-size:10px;font-weight:700;color:#888;margin-bottom:3px;letter-spacing:.5px;}'+
    '.view-value{font-size:13px;color:#111;font-weight:600;}'+
    '.view-value.empty{color:#bbb;font-weight:400;}'+
    '.session-row{display:grid;grid-template-columns:80px 1fr;gap:0;border-bottom:1px solid #f0ece4;}'+
    '.session-row:last-child{border-bottom:none;}'+
    '.session-num{background:#f5f0e8;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;color:#C9A84C;border-left:1px solid #e8e0d0;}'+
    '.session-detail{padding:10px 14px;}'+
    '.session-detail-title{font-size:13px;font-weight:700;color:#0D1B2A;margin-bottom:4px;}'+
    '.session-detail-meta{font-size:11px;color:#888;margin-bottom:4px;display:flex;gap:10px;flex-wrap:wrap;}'+
    '.session-decision{font-size:12px;color:#C9A84C;font-weight:700;margin-top:4px;}'+
    '.session-next{font-size:11px;color:#2980B9;margin-top:2px;}'+
    '.badge-v{display:inline-block;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:700;}'+
    '.badge-active-v{background:#d5f5e3;color:#1e8449;}'+
    '.badge-closed-v{background:#eaecee;color:#717d7e;}'+
    '.badge-pending-v{background:#fdebd0;color:#a04000;}'+
    '.badge-urgent-v{background:#fadbd8;color:#922b21;}'+
    '.view-footer{margin-top:18px;padding-top:12px;border-top:2px solid #C9A84C;display:flex;justify-content:space-between;font-size:10px;color:#999;}'+
    'table{width:100%;border-collapse:collapse;font-size:12px;}'+
    'th,td{padding:7px 10px;border:1px solid #e8e0d0;text-align:right;}'+
    'th{background:#f5f0e8;color:#8B6914;font-weight:700;}'+
    '</style></head><body>'+
    body+
    '<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};<\/script>'+
    '</body></html>';
  var win=window.open('','_blank','width=900,height=700,scrollbars=yes');
  if(!win){toast('فعّل النوافذ المنبثقة للطباعة','error');return;}
  win.document.open();
  win.document.write(printContent);
  win.document.close();
}

// ================================================================
// Quick Print Case — طباعة سريعة من قائمة القضايا مباشرة
// ================================================================
function quickPrintCase(i) {
  var c = data.cases[i];
  if (!c) return;
  var caseNum = c['رقم_القضية'] || '';
  var sessions = data.sessions.filter(function(s) {
    return s['رقم_القضية'] === caseNum || s['عنوان_القضية'] === (c['عنوان_القضية'] || '');
  }).sort(function(a, b) { return (parseLocalDate(a['التاريخ']) || 0) - (parseLocalDate(b['التاريخ']) || 0); });
  var docs = data.documents.filter(function(d) { return d['رقم_القضية'] === caseNum; });
  var children = []; try { children = JSON.parse(c['أطفال_القضية'] || '[]'); } catch(e) {}
  var body = buildCaseReport(c, sessions, docs, children);
  // استخدام نفس أسلوب printView بنافذة مستقلة
  var printContent='<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">'+
    '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap" rel="stylesheet">'+
    '<style>'+
    '*{box-sizing:border-box;margin:0;padding:0;}'+
    'body{font-family:Cairo,Arial,sans-serif;background:#fff;color:#111;direction:rtl;}'+
    '@page{size:A4;margin:15mm;}'+
    '@media print{body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}'+
    '.view-section-title{background:#0D1B2A!important;color:#C9A84C!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}'+
    '.session-num{background:#f5f0e8!important;color:#C9A84C!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}'+
    '.badge-active-v{background:#d5f5e3!important;color:#1e8449!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}'+
    '.badge-closed-v{background:#eaecee!important;color:#717d7e!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}'+
    '.badge-pending-v{background:#fdebd0!important;color:#a04000!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}'+
    '}'+
    '.view-body{padding:20px;background:#fff;color:#111;font-family:Cairo,Arial,sans-serif;direction:rtl;}'+
    '.view-header{border-bottom:3px solid #C9A84C;padding-bottom:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start;}'+
    '.view-office{font-size:11px;color:#888;text-align:left;}'+
    '.view-title{font-size:20px;font-weight:900;color:#0D1B2A;}'+
    '.view-subtitle{font-size:13px;color:#555;margin-top:3px;}'+
    '.view-section{margin-bottom:18px;border:1px solid #e8e0d0;border-radius:8px;overflow:hidden;}'+
    '.view-section-title{background:#0D1B2A;color:#C9A84C;font-size:12px;font-weight:700;padding:8px 14px;letter-spacing:1px;}'+
    '.view-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;}'+
    '.view-field{padding:9px 14px;border-bottom:1px solid #f0ece4;}'+
    '.view-field:nth-child(odd){border-left:1px solid #f0ece4;}'+
    '.view-field-full{padding:9px 14px;border-bottom:1px solid #f0ece4;grid-column:1/-1;}'+
    '.view-label{font-size:10px;font-weight:700;color:#888;margin-bottom:3px;}'+
    '.view-value{font-size:13px;color:#111;font-weight:600;}'+
    '.view-value.empty{color:#bbb;font-weight:400;}'+
    '.session-row{display:grid;grid-template-columns:80px 1fr;gap:0;border-bottom:1px solid #f0ece4;}'+
    '.session-row:last-child{border-bottom:none;}'+
    '.session-num{background:#f5f0e8;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;color:#C9A84C;border-left:1px solid #e8e0d0;}'+
    '.session-detail{padding:10px 14px;}'+
    '.session-detail-title{font-size:13px;font-weight:700;color:#0D1B2A;margin-bottom:4px;}'+
    '.session-detail-meta{font-size:11px;color:#888;margin-bottom:4px;display:flex;gap:10px;flex-wrap:wrap;}'+
    '.session-decision{font-size:12px;color:#C9A84C;font-weight:700;margin-top:4px;}'+
    '.session-next{font-size:11px;color:#2980B9;margin-top:2px;}'+
    '.badge-v{display:inline-block;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:700;}'+
    '.badge-active-v{background:#d5f5e3;color:#1e8449;}'+
    '.badge-closed-v{background:#eaecee;color:#717d7e;}'+
    '.badge-pending-v{background:#fdebd0;color:#a04000;}'+
    '.badge-urgent-v{background:#fadbd8;color:#922b21;}'+
    '.view-footer{margin-top:18px;padding-top:12px;border-top:2px solid #C9A84C;display:flex;justify-content:space-between;font-size:10px;color:#999;}'+
    'table{width:100%;border-collapse:collapse;font-size:12px;}'+
    'th,td{padding:7px 10px;border:1px solid #e8e0d0;text-align:right;}'+
    'th{background:#f5f0e8;color:#8B6914;font-weight:700;}'+
    '</style></head><body>'+
    body+
    '<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};<\/script>'+
    '</body></html>';
  var win=window.open('','_blank','width=900,height=700,scrollbars=yes');
  if(!win){toast('فعّل النوافذ المنبثقة للطباعة','error');return;}
  win.document.open();
  win.document.write(printContent);
  win.document.close();
}

// ================================================================
// Quick QR for Case — فتح QR الموكل من قائمة القضايا مباشرة
// ================================================================
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
    // الموكل غير مضاف — عرض رسالة مع رابط لإضافته
    toast('الموكل "' + clientName + '" غير مسجل في قسم الموكلين — أضفه أولاً لتفعيل QR', 'info');
    return;
  }
  genClientQR(ci);
}

// ================================================================
// populateCaseDropdown — تعبئة قائمة القضايا في النماذج
// ================================================================
function populateCaseDropdown(selectId, selectedVal) {
  var sel = document.getElementById(selectId);
  if (!sel) return;
  var current = selectedVal || sel.value;
  sel.innerHTML = '<option value="">-- اختر القضية --</option>';
  data.cases.forEach(function(c) {
    var num = c['رقم_القضية'] || '';
    var title = c['عنوان_القضية'] || '';
    var opt = document.createElement('option');
    opt.value = num;
    opt.textContent = num + (title ? ' — ' + title : '');
    if (num === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ================================================================
// autofillSessionFromCase — تعبئة تلقائية من القضية
// ================================================================
function autofillSessionFromCase(caseNum, skipCourt) {
  if (!caseNum) return;
  var c = data.cases.find(function(x){ return x['رقم_القضية'] === caseNum; });
  if (!c) return;
  var titleEl = document.getElementById('fSessionCaseTitle');
  var typeEl  = document.getElementById('fSessionCaseType');
  var courtEl = document.getElementById('fSessionCourt');
  if (titleEl && !titleEl.value) titleEl.value = c['عنوان_القضية'] || '';
  else if (titleEl && !skipCourt) titleEl.value = c['عنوان_القضية'] || '';
  if (typeEl && !typeEl.value) typeEl.value = c['نوع_الدعوى'] || '';
  else if (typeEl && !skipCourt) typeEl.value = c['نوع_الدعوى'] || '';
  if (courtEl && !courtEl.value && !skipCourt) courtEl.value = c['المحكمة'] || '';
}

// ================================================================
// autofillFeeFromCase — تعبئة اسم الموكل من القضية
// ================================================================
function autofillFeeFromCase(caseNum) {
  if (!caseNum) return;
  var c = data.cases.find(function(x){ return x['رقم_القضية'] === caseNum; });
  if (!c) return;
  var clientEl = document.getElementById('fFeeClient');
  if (clientEl) clientEl.value = c['اسم_الموكل'] || '';
}

function resetForm(type){(FIELDS[type]||[]).forEach(function(id){var el=document.getElementById(id);if(!el)return;el.value=el.tagName==='SELECT'?(el.options[0]?el.options[0].value:''):'';});}

function fillForm(type,obj){var m=MAP[type]||{};Object.keys(m).forEach(function(fid){var el=document.getElementById(fid);if(el&&obj[m[fid]]!==undefined){var v=obj[m[fid]];if(el.type==='time')v=sanitizeTime(v);el.value=v;}});}

function collectForm(type){var m=MAP[type]||{};var obj={};Object.keys(m).forEach(function(fid){var el=document.getElementById(fid);obj[m[fid]]=el?el.value:'';});return obj;}

function saveCase(){var num=document.getElementById('fCaseNum').value.trim();var title=document.getElementById('fCaseTitle').value.trim();var client=document.getElementById('fCaseClient').value.trim();if(!num||!title||!client){toast('يرجى ملء الحقول الإلزامية','error');return;}var obj=collectForm('cases');obj['تاريخ_الإنشاء']=obj['تاريخ_الإنشاء']||new Date().toISOString();obj['آخر_تحديث']=new Date().toISOString();var idx=editIdx.cases;if(idx>=0){data.cases[idx]=obj;toast('تم تحديث القضية','success');}else{data.cases.push(obj);toast('تمت إضافة القضية','success');}saveLocal();if(API_URL)syncToSheets('القضايا',obj,idx);closeModal('modalCase');renderCases();updateBadges();}

function editCase(i){editIdx.cases=i;fillForm('cases',data.cases[i]);document.getElementById('modalCaseTitle').textContent='تعديل القضية';document.getElementById('modalCase').classList.add('open');}

function deleteCase(i){if(!confirm('حذف هذه القضية؟'))return;if(API_URL)syncDeleteToSheets('القضايا',i);data.cases.splice(i,1);saveLocal();toast('تم الحذف','info');renderCases();updateBadges();}
