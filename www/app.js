(function () {
  "use strict";

  var KEY = "modarasa_v1";
  var CARDS = 8;
  var LINES = 10;
  var MAX_SQUARES = 500;

  function blank() {
    var tasks = [];
    for (var i = 0; i < LINES; i++) tasks.push({ t: "", s: 0 });
    return {
      name: "", pages: "", amount: "", start: "", done: [],
      benefits: fill(""), tasks: tasks, discuss: fill(""), quotes: fill("")
    };
  }
  function fill(v) { var a = []; for (var i = 0; i < LINES; i++) a.push(v); return a; }

  function load() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) { saved = null; }
    var list = [];
    for (var i = 0; i < CARDS; i++) {
      var b = blank();
      var s = saved && saved.cards && saved.cards[i];
      if (s && typeof s === "object") {
        Object.keys(b).forEach(function (k) { if (s[k] !== undefined) b[k] = s[k]; });
        ["benefits", "discuss", "quotes"].forEach(function (k) {
          var arr = fill("");
          for (var j = 0; j < LINES; j++) arr[j] = String((b[k] && b[k][j]) || "");
          b[k] = arr;
        });
        var tk = [];
        for (var q = 0; q < LINES; q++) {
          var t = b.tasks && b.tasks[q];
          tk.push({ t: t && t.t ? String(t.t) : "", s: t && (t.s === 1 || t.s === 2) ? t.s : 0 });
        }
        b.tasks = tk;
        if (!Array.isArray(b.done)) b.done = [];
      }
      list.push(b);
    }
    return list;
  }

  var cards = load();
  var timer = null;
  function save() {
    if (timer) { clearTimeout(timer); timer = null; }
    try { localStorage.setItem(KEY, JSON.stringify({ cards: cards })); } catch (e) { /* التخزين غير متاح */ }
  }
  function saveSoon() {           // حفظ مؤجل أثناء الكتابة حتى لا يثقل التطبيق
    if (timer) clearTimeout(timer);
    timer = setTimeout(save, 400);
  }
  window.addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", function () { if (document.hidden) save(); });

  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m];
    });
  }
  function n2a(n) { return Number(n).toLocaleString("ar-EG"); }
  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + dd;
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    var p = iso.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
  }
  function num(v) { var n = parseInt(v, 10); return isFinite(n) && n > 0 ? n : 0; }

  function sessions(c) {
    var p = num(c.pages), a = num(c.amount);
    return p && a ? Math.min(MAX_SQUARES, Math.ceil(p / a)) : 0;
  }
  function doneCount(c) {
    var n = sessions(c), k = 0;
    for (var i = 0; i < n; i++) if (c.done[i]) k++;
    return k;
  }
  function readPages(c) { return Math.min(num(c.pages), doneCount(c) * num(c.amount)); }
  function remaining(c) { return Math.max(0, num(c.pages) - readPages(c)); }
  function percent(c) { var p = num(c.pages); return p ? Math.round((readPages(c) / p) * 100) : 0; }
  function dateCard(c) {
    if (!c.start) return '<small>تاريخ بداية الكتاب</small><span class="dnote">يُسجَّل تلقائيًا عند أول إدخال</span>';
    var p = c.start.split("-").map(Number);
    var d0 = new Date(p[0], p[1] - 1, p[2]), now = new Date();
    var days = Math.max(0, Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - d0) / 86400000));
    var ago = days === 0 ? "بدأت اليوم" : days === 1 ? "مرّ يوم" : days === 2 ? "مرّ يومان" :
      days <= 10 ? "مرّ " + n2a(days) + " أيام" : "مرّ " + n2a(days) + " يومًا";
    var full = d0.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return '<small>تاريخ بداية الكتاب</small><strong>' + full + '</strong><span class="dnote">' + ago + '</span>';
  }
  function stamp(c) { if (!c.start) c.start = todayISO(); }

  /* ---------- الشاشة الرئيسية ---------- */
  var home = $("#home"), detail = $("#detail");
  var current = -1;

  function renderHome() {
    var h = '<header class="head"><h1>مُدارسة</h1><span class="today">' + fmtDate(todayISO()) + "</span></header>";
    h += '<div class="grid">';
    cards.forEach(function (c, i) {
      var pct = percent(c);
      h += '<button type="button" class="book" data-c="' + (i + 1) + '" data-i="' + i + '">' +
        '<span class="no">' + n2a(i + 1) + "</span>" +
        '<span class="title' + (c.name ? "" : " empty") + '">' + (c.name ? esc(c.name) : "اضغط لإضافة كتاب") + "</span>" +
        '<span class="date">' + (c.start ? "بدأ " + fmtDate(c.start) : "&nbsp;") + "</span>" +
        '<span class="read"><span class="bar"><i style="width:' + pct + '%"></i></span>' +
        '<span class="pct">' + n2a(pct) + "٪</span></span></button>";
    });
    h += "</div>";
    home.innerHTML = h;
  }

  home.addEventListener("click", function (e) {
    var b = e.target.closest(".book");
    if (!b) return;
    openBook(Number(b.dataset.i), true);
  });

  /* ---------- شاشة الكتاب ---------- */
  function lines(key, c, withCheck) {
    var h = "";
    for (var i = 0; i < LINES; i++) {
      h += '<div class="line"><span class="n">' + n2a(i + 1) + "</span>";
      if (withCheck) {
        h += '<input class="t" type="text" data-k="tasks" data-i="' + i + '" value="' + esc(c.tasks[i].t) + '" aria-label="مهمة ' + (i + 1) + '">';
        h += '<button type="button" class="chk" data-i="' + i + '" data-s="' + c.tasks[i].s + '" aria-label="حالة التنفيذ">' +
          (c.tasks[i].s === 1 ? "✓" : c.tasks[i].s === 2 ? "✗" : "") + "</button>";
      } else {
        h += '<input class="t" type="text" data-k="' + key + '" data-i="' + i + '" value="' + esc(c[key][i]) + '" aria-label="سطر ' + (i + 1) + '">';
      }
      h += "</div>";
    }
    return h;
  }

  function renderDetail(i) {
    var c = cards[i];
    detail.dataset.c = String(i + 1);
    var h = '<div class="top"><div class="datecard" id="d-date"></div>' +
      '<button type="button" class="pdfbtn" data-pdf="all">حفظ الكتاب PDF</button></div>' +
      '<p class="msg" id="msg" role="status"></p>';
    h += '<section class="box readbox"><div class="field"><label for="f-name">اسم الكتاب</label>' +
      '<input id="f-name" type="text" value="' + esc(c.name) + '" placeholder="اكتب اسم الكتاب"></div>' +
      '<div class="row3">' +
      '<div class="field"><label for="f-pages">عدد الصفحات</label><input id="f-pages" type="number" inputmode="numeric" min="1" value="' + esc(c.pages) + '"></div>' +
      '<div class="field"><label for="f-amount">كمية المقروء</label><input id="f-amount" type="number" inputmode="numeric" min="1" value="' + esc(c.amount) + '"></div>' +
      '<div class="field"><label for="f-rem">المتبقي</label><output id="f-rem"></output></div></div>' +
      '<div class="prog"><div class="bar"><i id="p-bar"></i></div><span class="pct" id="p-pct"></span></div>' +
      '<p class="hint" id="sq-hint"></p><div class="squares" id="sq"></div>' +
      '<div class="acts"><button type="button" class="clrbtn" data-clear="reading">مسح بيانات القراءة</button></div></section>';
    function sub(title, key, body) {
      return '<div class="sub"><div class="subhead"><h3>' + title + '</h3>' +
        '<span class="acts"><button type="button" class="clrbtn small" data-clear="' + key + '">مسح</button>' +
        '<button type="button" class="pdfbtn small" data-pdf="' + key + '">PDF</button></span></div>' + body + "</div>";
    }
    h += '<section class="box"><h2>مدارسة الكتاب</h2>' +
      sub("ما استفدته من الكتاب", "benefits", lines("benefits", c)) +
      sub("مهام عملية", "tasks", lines("tasks", c, true)) +
      sub("مناقشات", "discuss", lines("discuss", c)) +
      sub("اقتباسات", "quotes", lines("quotes", c)) + "</section>" +
      '<section class="box dangerbox"><h2>إدارة الكتاب</h2>' +
      '<p class="hint">كل الحقول قابلة للتعديل بالكتابة فيها مباشرة. يمكنك مسح قسم واحد أو حذف الكتاب بالكامل.</p>' +
      '<button type="button" class="delbtn" data-clear="all">حذف كل بيانات هذا الكتاب</button></section>';
    detail.innerHTML = h;
    renderDerived(c, true);
  }

  function renderDerived(c, force) {
    $("#d-date").innerHTML = dateCard(c);
    var rem = remaining(c);
    $("#f-rem").textContent = num(c.pages) ? n2a(rem) + " صفحة" : "—";
    var pct = percent(c);
    $("#p-bar").style.width = pct + "%";
    $("#p-pct").textContent = n2a(pct) + "٪";
    var n = sessions(c), sq = $("#sq");
    $("#sq-hint").textContent = n
      ? "كل مربع = " + n2a(num(c.amount)) + " صفحة · " + n2a(n) + " مربع"
      : "اكتب عدد الصفحات وكمية المقروء لتظهر المربعات";
    if (force || sq.dataset.n !== String(n) || sq.dataset.a !== String(num(c.amount))) {
      sq.dataset.n = String(n);
      sq.dataset.a = String(num(c.amount));
      var h = "";
      for (var i = 0; i < n; i++) {
        h += '<button type="button" class="sq' + (c.done[i] ? " on" : "") + '" data-i="' + i +
          '" aria-pressed="' + (c.done[i] ? "true" : "false") + '">' + (c.done[i] ? "✓" : n2a(i + 1)) + "</button>";
      }
      sq.innerHTML = h;
    }
  }

  detail.addEventListener("input", function (e) {
    var el = e.target, c = cards[current];
    if (!c) return;
    if (el.id === "f-name") c.name = el.value;
    else if (el.id === "f-pages") c.pages = el.value;
    else if (el.id === "f-amount") c.amount = el.value;
    else if (el.classList.contains("t")) {
      var i = Number(el.dataset.i), k = el.dataset.k;
      if (k === "tasks") c.tasks[i].t = el.value; else c[k][i] = el.value;
    } else return;
    stamp(c);
    saveSoon();
    renderDerived(c, false);
  });

  detail.addEventListener("click", function (e) {
    var c = cards[current];
    if (!c) return;
    var cl = e.target.closest("[data-clear]");
    if (cl) { armClear(cl); return; }
    var pb = e.target.closest("[data-pdf]");
    if (pb) { exportPdf(c, pb.dataset.pdf); return; }
    var sq = e.target.closest(".sq");
    if (sq) {
      var i = Number(sq.dataset.i);
      c.done[i] = !c.done[i];
      for (var j = 0; j < i; j++) if (c.done[j] === undefined) c.done[j] = false;
      stamp(c);
      save();
      renderDerived(c, true);
      return;
    }
    var chk = e.target.closest(".chk");
    if (chk) {
      var t = c.tasks[Number(chk.dataset.i)];
      t.s = (t.s + 1) % 3;
      chk.dataset.s = String(t.s);
      chk.textContent = t.s === 1 ? "✓" : t.s === 2 ? "✗" : "";
      stamp(c);
      save();
      renderDerived(c, false);
    }
  });

  /* ---------- تصدير PDF إلى مجلد التنزيلات ---------- */
  var SECTION_TITLES = { benefits: "ما استفدته من الكتاب", tasks: "مهام عملية", discuss: "مناقشات", quotes: "اقتباسات" };
  var PRINT_COLORS = [
    ["#cfe8dc", "#1d6b55"], ["#f6d3d0", "#b3453b"], ["#d4def7", "#3558b0"], ["#f2d9ef", "#9b3f93"],
    ["#fbe0bd", "#b8641a"], ["#cdeaf0", "#17758a"], ["#e0dbf6", "#5e45b3"], ["#dfeab8", "#5f7a14"]
  ];

  function printSection(c, key, bg, ac) {
    var h = '<section><h2>' + SECTION_TITLES[key] + '</h2>';
    for (var i = 0; i < LINES; i++) {
      var text = key === "tasks" ? c.tasks[i].t : c[key][i];
      var badge = "";
      if (key === "tasks" && c.tasks[i].s === 1) badge = '<b class="ok">تم</b>';
      if (key === "tasks" && c.tasks[i].s === 2) badge = '<b class="no">لم يتم</b>';
      h += '<div class="ln"><i>' + n2a(i + 1) + '</i><span>' + esc(text) + '</span>' + badge + '</div>';
    }
    return h + "</section>";
  }

  function printHtml(c, which, idx) {
    var col = PRINT_COLORS[idx] || PRINT_COLORS[0], bg = col[0], ac = col[1];
    var name = c.name || "كتاب بدون اسم";
    var body = '<header><h1>' + esc(which === "all" ? name : SECTION_TITLES[which]) + '</h1>';
    if (which !== "all") body += '<p class="sub">الكتاب: ' + esc(name) + '</p>';
    body += '</header>';
    if (which === "all") {
      body += '<div class="read"><div><small>تاريخ البداية</small><strong>' + fmtDate(c.start) + '</strong></div>' +
        '<div><small>عدد الصفحات</small><strong>' + (num(c.pages) ? n2a(num(c.pages)) : "—") + '</strong></div>' +
        '<div><small>المقروء في المرة</small><strong>' + (num(c.amount) ? n2a(num(c.amount)) : "—") + '</strong></div>' +
        '<div><small>المتبقي</small><strong>' + (num(c.pages) ? n2a(remaining(c)) : "—") + '</strong></div>' +
        '<div><small>التقدم</small><strong>' + n2a(percent(c)) + '٪</strong></div></div>';
    }
    (which === "all" ? Object.keys(SECTION_TITLES) : [which]).forEach(function (k) { body += printSection(c, k, bg, ac); });
    var css = '@page{size:A4;margin:14mm}' +
      '@font-face{font-family:CairoAr;font-weight:400;src:url("fonts/cairo-arabic-400-normal.woff2") format("woff2")}' +
      '@font-face{font-family:CairoAr;font-weight:700;src:url("fonts/cairo-arabic-700-normal.woff2") format("woff2")}' +
      '@font-face{font-family:CairoLa;font-weight:400;src:url("fonts/cairo-latin-400-normal.woff2") format("woff2")}' +
      '@font-face{font-family:CairoLa;font-weight:700;src:url("fonts/cairo-latin-700-normal.woff2") format("woff2")}' +
      '*{box-sizing:border-box}html,body{margin:0}' +
      'body{font-family:CairoAr,CairoLa,"Noto Naskh Arabic",Tahoma,sans-serif;color:#14202b;font-size:13pt;line-height:1.7;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      'header{background:' + bg + ';border-right:8px solid ' + ac + ';border-radius:8px;padding:10px 16px;margin-bottom:12px}' +
      'h1{margin:0;font-size:22pt;color:' + ac + ';overflow-wrap:anywhere}.sub{margin:0;color:#55636f;font-size:11pt}' +
      '.read{display:flex;flex-wrap:wrap;gap:8px;background:#efd9a1;color:#4a3a10;border-radius:8px;padding:10px 12px;margin-bottom:14px}' +
      '.read div{flex:1 1 28%;min-width:0}.read small{display:block;font-size:9.5pt;opacity:.8}.read strong{font-size:13pt}' +
      'section{margin-bottom:14px;break-inside:avoid}h2{margin:0 0 4px;font-size:15pt;color:' + ac + ';border-bottom:2px solid ' + ac + '}' +
      '.ln{display:flex;align-items:center;gap:8px;min-height:30px;border-bottom:1px solid #c9d2dc}' +
      '.ln i{flex:none;width:22px;text-align:center;font-style:normal;font-size:9.5pt;color:#7a8794}' +
      '.ln span{flex:1;min-width:0;overflow-wrap:anywhere}' +
      '.ln b{flex:none;font-size:10pt;padding:0 10px;border-radius:99px;color:#fff}.ok{background:#1e8a4a}.no{background:#c0392b}';
    return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>' + esc(name) +
      '</title><style>' + css + '</style></head><body>' + body + '</body></html>';
  }

  function setMsg(t) { var m = $("#msg"); if (m) m.textContent = t; }

  function openPrint(html, title) {
    var cap = window.Capacitor, plugin = null;
    if (cap && cap.registerPlugin) { try { plugin = cap.registerPlugin("Printer"); } catch (e) { plugin = null; } }
    if (plugin && plugin.printHtml) return plugin.printHtml({ html: html, title: title });
    // احتياطي للمتصفح العادي
    return new Promise(function (resolve) {
      var f = document.createElement("iframe");
      f.style.cssText = "position:fixed;width:0;height:0;border:0";
      document.body.appendChild(f);
      f.srcdoc = html;
      f.onload = function () { f.contentWindow.print(); setTimeout(function () { f.remove(); }, 2000); resolve(); };
    });
  }

  function exportPdf(c, which) {
    save();
    var base = (c.name || "كتاب").replace(/[\\\/:*?"<>|\n\r]+/g, " ").trim().slice(0, 60) || "كتاب";
    var title = "مدارسة - " + base + (which === "all" ? "" : " - " + SECTION_TITLES[which]);
    setMsg("جارٍ تجهيز الملف…");
    openPrint(printHtml(c, which, current), title).then(function () {
      setMsg("اختر «حفظ كـ PDF» من أعلى النافذة ثم اضغط زر PDF الأصفر واختر التنزيلات.");
    }).catch(function (err) {
      var d = err && (err.message || err.code) ? String(err.message || err.code) : "";
      if (/unimplemented|not implemented|not available/i.test(d)) d = "إضافة الطباعة غير موجودة في هذا الإصدار، أعد بناء التطبيق من GitHub ثم ثبّته من جديد";
      setMsg("تعذّر فتح نافذة الحفظ" + (d ? ": " + d : "."));
    });
  }

  function armClear(btn) {
    if (btn.dataset.armed) { doClear(btn.dataset.clear); return; }
    btn.dataset.armed = "1";
    btn.dataset.label = btn.textContent;
    btn.textContent = "اضغط مرة أخرى للتأكيد";
    btn.classList.add("armed");
    setTimeout(function () {
      if (btn.isConnected && btn.dataset.armed) {
        delete btn.dataset.armed;
        btn.textContent = btn.dataset.label;
        btn.classList.remove("armed");
      }
    }, 4000);
  }
  function doClear(k) {
    var c = cards[current], b = blank();
    if (k === "all") cards[current] = b;
    else if (k === "reading") { c.pages = ""; c.amount = ""; c.done = []; }
    else c[k] = b[k];
    save();
    renderDetail(current);
    setMsg(k === "all" ? "تم حذف كل بيانات الكتاب." : k === "reading" ? "تم مسح بيانات القراءة." : "تم مسح القسم.");
  }

  function openBook(i, push) {
    current = i;
    renderDetail(i);
    home.hidden = true;
    detail.hidden = false;
    window.scrollTo(0, 0);
    if (push) history.pushState({ v: "book", i: i }, "");
  }
  function showHome() {
    save();
    current = -1;
    detail.hidden = true;
    home.hidden = false;
    renderHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener("popstate", showHome);
  (function () {
    var capApp = null;
    try { if (window.Capacitor && window.Capacitor.registerPlugin) capApp = window.Capacitor.registerPlugin("App"); } catch (e) { capApp = null; }
    if (capApp && capApp.addListener) {
      capApp.addListener("backButton", function () {
        if (current >= 0) showHome();
        else if (capApp.exitApp) capApp.exitApp();
      });
    }
  })();

  renderHome();
})();
