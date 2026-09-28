// ============================================================
// لوحة تحكم اتقان — للموظفين فقط
// ============================================================
const { createClient } = supabase;
const sb = createClient(window.ITQAN_CONFIG.supabaseUrl, window.ITQAN_CONFIG.supabaseAnonKey);

const app = document.getElementById("app");
document.body.classList.add("admin-body");

// مهم: أي نص يدخله العميل يُعرض بعد تعقيمه حتى لا يُنفَّذ كود داخل اللوحة
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const STATUS_LABELS = {
  new: "جديد",
  contacted: "تم التواصل",
  quote_sent: "عرض السعر مُرسل",
  quote_accepted: "العرض مقبول — بانتظار السداد",
  payment_proof_submitted: "إثبات سداد للمراجعة",
  payment_rejected: "إثبات مرفوض",
  in_progress: "قيد التنفيذ",
  delivered: "تم التسليم",
  declined: "مغلق",
  cancelled: "ملغي",
};

const EVENT_LABELS = {
  created: "تم إنشاء الطلب",
  contacted: "تم التواصل مع العميل",
  quote_sent: "تم إرسال عرض السعر",
  quote_accepted: "العميل وافق على العرض",
  proof_submitted: "العميل رفع إثبات السداد",
  payment_approved: "تم اعتماد السداد",
  payment_rejected: "تم رفض إثبات السداد",
  delivered: "تم التسليم",
  declined: "تم إغلاق الطلب",
  "email:request_received": "أُرسل بريد استلام الطلب للعميل",
  "email:quote_sent": "أُرسل بريد عرض السعر للعميل",
  "email:quote_accepted": "أُرسل بريد قبول العرض",
  "email:payment_proof_received": "أُرسل بريد استلام الإثبات",
  "email:payment_approved": "أُرسل بريد اعتماد السداد",
  "email:payment_rejected": "أُرسل بريد رفض الإثبات",
  "email:delivered": "أُرسل بريد التسليم",
};

let session = null;
let flash = null; // {type:'success'|'error'|'warn', text}

// ---------------- Auth ----------------
window.addEventListener("DOMContentLoaded", init);
window.addEventListener("hashchange", route);

async function init() {
  const { data } = await sb.auth.getSession();
  session = data.session;
  sb.auth.onAuthStateChange((_e, s) => { session = s; });
  route();
}

async function isAdmin() {
  if (!session) return false;
  const { data, error } = await sb.from("admin_users").select("id, full_name").eq("id", session.user.id).single();
  if (error || !data) return false;
  return data;
}

async function route() {
  const hash = location.hash || "#/requests";
  if (!session) return renderLogin();
  const admin = await isAdmin();
  if (!admin) return renderLogin("هذا الحساب غير مصرّح له بالدخول للوحة التحكم.");

  const parts = hash.split("/"); // ["#", "requests", "id"]
  const section = parts[1];
  const arg = parts[2];

  if (section === "requests" && arg) return renderRequestDetail(arg);
  if (section === "services" || section === "packages") {
    if (arg) return renderContentForm(section, arg === "new" ? null : arg);
    return renderContentList(section);
  }
  return renderRequests();
}

function renderLogin(errorMsg) {
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-box">
        <div class="logo-chip"><img src="logo.png" alt="اتقان"></div>
        <h2>لوحة تحكم اتقان</h2>
        ${errorMsg ? `<div class="notice error">${esc(errorMsg)}</div>` : ""}
        <div id="loginMsg"></div>
        <form id="loginForm">
          <div class="field"><label>البريد الإلكتروني</label><input required type="email" name="email"></div>
          <div class="field"><label>كلمة المرور</label><input required type="password" name="password"></div>
          <button class="btn btn-primary" type="submit">دخول</button>
        </form>
      </div>
    </div>`;
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector("button");
    btn.disabled = true; btn.textContent = "جارِ الدخول…";
    const { data, error } = await sb.auth.signInWithPassword({ email: fd.get("email"), password: fd.get("password") });
    if (error) {
      document.getElementById("loginMsg").innerHTML = `<div class="notice error">بيانات الدخول غير صحيحة.</div>`;
      btn.disabled = false; btn.textContent = "دخول";
      return;
    }
    session = data.session;
    route();
  });
}

function shell(content) {
  const hash = location.hash || "#/requests";
  const active = (k) => (hash.startsWith(k) ? "active" : "");
  app.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="logo-row">
          <span class="logo-chip"><img src="logo.png" alt="اتقان"></span>
          <span>لوحة تحكم اتقان</span>
        </div>
        <nav class="admin-nav">
          <a href="#/requests" class="${active("#/requests")}">الطلبات</a>
          <a href="#/services" class="${active("#/services")}">الخدمات</a>
          <a href="#/packages" class="${active("#/packages")}">الباقات</a>
        </nav>
        <div class="signout"><button id="signOutBtn">تسجيل الخروج</button></div>
      </aside>
      <div class="admin-main">${content}</div>
    </div>`;
  document.getElementById("signOutBtn").addEventListener("click", async () => {
    await sb.auth.signOut();
    session = null;
    route();
  });
}

function flashHtml() {
  if (!flash) return "";
  const cls = flash.type === "error" ? "error" : flash.type === "success" ? "success" : "";
  const html = `<div class="notice ${cls}">${esc(flash.text)}</div>`;
  flash = null;
  return html;
}

// ---------------- Requests list ----------------
async function renderRequests() {
  shell(`
    <div class="admin-header-row"><h1>الطلبات</h1></div>
    <div id="kpis" class="kpi-row"></div>
    <div id="tabs" class="status-tabs"></div>
    <div id="wrap"><div class="loading">جارِ التحميل…</div></div>`);

  const { data, error } = await sb
    .from("service_requests")
    .select("id, request_number, full_name, status, source, created_at, services(title), packages(title)")
    .order("created_at", { ascending: false });

  const wrap = document.getElementById("wrap");
  if (error) { wrap.innerHTML = `<div class="notice error">تعذّر تحميل الطلبات.</div>`; return; }

  const c = {};
  data.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
  document.getElementById("kpis").innerHTML = `
    <div class="kpi-card"><div class="num">${c.new || 0}</div><div class="label">طلبات جديدة</div></div>
    <div class="kpi-card"><div class="num">${c.quote_sent || 0}</div><div class="label">بانتظار رد العميل على العرض</div></div>
    <div class="kpi-card"><div class="num">${c.payment_proof_submitted || 0}</div><div class="label">إثباتات سداد للمراجعة</div></div>
    <div class="kpi-card"><div class="num">${c.in_progress || 0}</div><div class="label">قيد التنفيذ</div></div>`;

  const tabs = document.getElementById("tabs");
  const statuses = ["", ...Object.keys(STATUS_LABELS)];
  tabs.innerHTML = statuses
    .map((s) => `<div class="chip ${s === "" ? "active" : ""}" data-status="${s}">${s ? STATUS_LABELS[s] : "الكل"}${s ? ` (${c[s] || 0})` : ""}</div>`)
    .join("");

  const draw = (filter) => {
    const list = filter ? data.filter((r) => r.status === filter) : data;
    if (!list.length) { wrap.innerHTML = `<div class="empty-state">لا توجد طلبات في هذا التصنيف.</div>`; return; }
    wrap.innerHTML = `
      <table class="data-table">
        <thead><tr><th>رقم الطلب</th><th>العميل</th><th>الخدمة / الباقة</th><th>الحالة</th><th>المصدر</th><th>التاريخ</th></tr></thead>
        <tbody>
          ${list.map((r) => `
            <tr data-id="${esc(r.id)}">
              <td>${esc(r.request_number)}</td>
              <td>${esc(r.full_name)}</td>
              <td>${esc([r.services?.title, r.packages?.title].filter(Boolean).join(" — ") || "—")}</td>
              <td><span class="status-badge status-${esc(r.status)}">${esc(STATUS_LABELS[r.status] || r.status)}</span></td>
              <td>${esc(r.source)}</td>
              <td>${new Date(r.created_at).toLocaleDateString("ar-SA")}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
    wrap.querySelectorAll("tr[data-id]").forEach((tr) =>
      tr.addEventListener("click", () => (location.hash = `#/requests/${tr.dataset.id}`))
    );
  };
  draw("");
  tabs.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    [...tabs.children].forEach((x) => x.classList.remove("active"));
    chip.classList.add("active");
    draw(chip.dataset.status);
  });
}

// ---------------- Request detail ----------------
async function setStatus(id, status, eventName, details, fields = {}) {
  const { error } = await sb.from("service_requests").update({ status, ...fields }).eq("id", id);
  if (error) throw error;
  await sb.from("request_events").insert({ request_id: id, event: eventName, actor: "admin", details: details || null });
}

// يرسل بريدًا للعميل. يرجع null عند النجاح أو نص المشكلة
async function notify(id, event) {
  const { data, error } = await sb.functions.invoke("send-order-email", { body: { request_id: id, event } });
  if (error) {
    let msg = error.message || "خطأ غير معروف";
    if (error.context && typeof error.context.json === "function") {
      try { const b = await error.context.json(); if (b?.error) msg = b.error; } catch (_) {}
    }
    return "تعذّر إرسال البريد (" + msg + ")";
  }
  if (data?.error) return "تعذّر إرسال البريد (" + data.error + ")";
  if (data?.skipped) return "لم يُرسل بريد (" + (data.reason || "") + ")";
  return null;
}

async function act(id, fn, okText) {
  try {
    const warn = await fn();
    flash = warn ? { type: "warn", text: okText + " — لكن: " + warn } : { type: "success", text: okText };
  } catch (e) {
    flash = { type: "error", text: "تعذّر تنفيذ الإجراء: " + (e.message || e) };
  }
  renderRequestDetail(id);
}

function on(id, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", async (e) => {
    el.disabled = true;
    await handler(e);
    if (document.body.contains(el)) el.disabled = false;
  });
}

async function renderRequestDetail(id) {
  shell(`<div class="loading">جارِ التحميل…</div>`);

  const { data: r, error } = await sb
    .from("service_requests")
    .select("*, services(title), packages(title)")
    .eq("id", id)
    .single();
  if (error || !r) {
    shell(`<div class="notice error">تعذّر العثور على الطلب. <a href="#/requests">عودة للطلبات</a></div>`);
    return;
  }

  const [{ data: proofs }, { data: events }] = await Promise.all([
    sb.from("request_payment_proofs").select("*").eq("request_id", id).order("created_at", { ascending: false }),
    sb.from("request_events").select("*").eq("request_id", id).order("created_at", { ascending: false }),
  ]);

  const proofItems = [];
  for (const p of proofs || []) {
    const { data: s } = await sb.storage.from("payment-proofs").createSignedUrl(p.proof_file_path, 3600);
    proofItems.push({ ...p, url: s?.signedUrl || null });
  }

  const st = r.status;
  const canQuote = ["new", "contacted", "quote_sent"].includes(st);
  const closed = ["delivered", "declined", "cancelled"].includes(st);
  const what = [r.services?.title, r.packages?.title].filter(Boolean).join(" — ") || "—";

  const proofHtml = proofItems.length
    ? proofItems.map((p) => `
        <div class="info-card">
          <h4>إثبات تحويل — ${new Date(p.created_at).toLocaleString("ar-SA")}</h4>
          <div class="info-row"><span>اسم المحوِّل</span><span>${esc(p.transferor_name)}</span></div>
          <div class="info-row"><span>البنك</span><span>${esc(p.source_bank)}</span></div>
          <div class="info-row"><span>تاريخ التحويل</span><span>${esc(p.transfer_date)}</span></div>
          <div class="info-row"><span>رقم المرجع</span><span>${esc(p.reference_number || "—")}</span></div>
          ${p.url ? (/\.pdf$/i.test(p.proof_file_path)
            ? `<a href="${esc(p.url)}" target="_blank" class="btn btn-ghost" style="width:auto;margin-top:10px;padding:8px 16px;">فتح ملف الإثبات (PDF)</a>`
            : `<a href="${esc(p.url)}" target="_blank"><img class="proof-image" src="${esc(p.url)}" alt="إثبات التحويل"></a>`) : ""}
        </div>`).join("")
    : "";

  let actions = "";
  if (st === "new") actions += `<div class="action-row"><button class="btn btn-ghost" id="contactedBtn">تم التواصل مع العميل</button></div>`;
  if (st === "payment_proof_submitted") {
    actions += `<p style="font-size:13.5px;color:var(--slate);">طابق التحويل مع الحساب البنكي قبل الاعتماد.</p>
      <div class="action-row">
        <button class="btn btn-success" id="approveBtn">اعتماد السداد وبدء التنفيذ</button>
        <button class="btn btn-danger" id="rejectBtn">رفض الإثبات</button>
      </div>`;
  }
  if (st === "quote_accepted") actions += `<p style="font-size:13.5px;color:var(--slate);">العميل وافق على العرض وبانتظار تحويل المبلغ.</p>`;
  if (st === "in_progress") actions += `<div class="action-row"><button class="btn btn-success" id="deliverBtn">تحديد كمُسلَّم</button></div>`;
  if (!closed) actions += `<div class="action-row"><button class="btn btn-ghost" id="declineBtn" style="color:var(--alert);border-color:var(--alert);">إغلاق الطلب</button></div>`;
  if (!actions) actions = `<p style="font-size:13.5px;color:var(--slate);">لا توجد إجراءات متاحة في هذه الحالة.</p>`;

  const quoteForm = canQuote ? `
    <div class="info-card">
      <h4>${st === "quote_sent" ? "تعديل عرض السعر وإعادة إرساله" : "إعداد عرض السعر"}</h4>
      <div id="quoteMsg"></div>
      <form id="quoteForm">
        <div class="field"><label>المبلغ (ريال) * — اذكر في النطاق إن كان شاملًا الضريبة</label>
          <input required type="number" min="1" step="0.01" name="quote_amount" value="${esc(r.quote_amount ?? "")}"></div>
        <div class="field"><label>نطاق العمل * (ما الذي سيُنفَّذ)</label>
          <textarea required name="quote_scope" rows="5">${esc(r.quote_scope || "")}</textarea></div>
        <div class="field"><label>مدة التنفيذ</label>
          <input name="quote_duration" value="${esc(r.quote_duration || "")}" placeholder="مثال: 3 أسابيع"></div>
        <div class="field"><label>صالح حتى</label>
          <input type="date" name="quote_valid_until" value="${esc(r.quote_valid_until || "")}"></div>
        <div class="field"><label>ملاحظات للعميل</label>
          <textarea name="quote_notes" rows="3">${esc(r.quote_notes || "")}</textarea></div>
        <button class="btn btn-primary" type="submit">${st === "quote_sent" ? "حفظ وإعادة الإرسال للعميل" : "حفظ وإرسال العرض للعميل"}</button>
      </form>
    </div>` : "";

  const quoteView = !canQuote && r.quote_amount != null ? `
    <div class="info-card">
      <h4>عرض السعر</h4>
      <div class="info-row"><span>المبلغ</span><span>${Number(r.quote_amount).toLocaleString("ar-SA")} ريال</span></div>
      <div class="info-row"><span>مدة التنفيذ</span><span>${esc(r.quote_duration || "—")}</span></div>
      <div class="info-row"><span>صالح حتى</span><span>${esc(r.quote_valid_until || "—")}</span></div>
      <div style="white-space:pre-line;font-size:13.5px;margin-top:10px;">${esc(r.quote_scope || "")}</div>
    </div>` : "";

  shell(`
    <div class="admin-header-row">
      <h1>طلب ${esc(r.request_number)}</h1>
      <span class="status-badge status-${esc(st)}">${esc(STATUS_LABELS[st] || st)}</span>
    </div>
    ${flashHtml()}
    <div class="detail-grid">
      <div>
        <div class="info-card">
          <h4>بيانات العميل</h4>
          <div class="info-row"><span>الاسم</span><span>${esc(r.full_name)}</span></div>
          <div class="info-row"><span>الجوال</span><span><a href="https://wa.me/${esc(String(r.phone).replace(/\D/g, "").replace(/^0/, "966"))}" target="_blank" style="color:var(--brass);">${esc(r.phone)}</a></span></div>
          <div class="info-row"><span>البريد</span><span>${esc(r.email)}</span></div>
          <div class="info-row"><span>المنشأة</span><span>${esc(r.company_name || "—")}</span></div>
          <div class="info-row"><span>وضع النشاط</span><span>${esc(r.business_stage || "—")}</span></div>
          <div class="info-row"><span>الحجم</span><span>${esc(r.business_size || "—")}</span></div>
          <div class="info-row"><span>الميزانية التقريبية</span><span>${esc(r.budget_range || "—")}</span></div>
          <div class="info-row"><span>الخدمة / الباقة</span><span>${esc(what)}</span></div>
          <div class="info-row"><span>المصدر</span><span>${esc(r.source)}</span></div>
          <div class="info-row"><span>تاريخ الطلب</span><span>${new Date(r.created_at).toLocaleString("ar-SA")}</span></div>
        </div>
        <div class="info-card">
          <h4>هدف العميل</h4>
          <div style="white-space:pre-line;font-size:14px;">${esc(r.goal)}</div>
          ${r.message ? `<h4 style="margin-top:16px;">ملاحظات العميل</h4><div style="white-space:pre-line;font-size:14px;">${esc(r.message)}</div>` : ""}
        </div>
        ${quoteForm}
        ${quoteView}
        ${proofHtml}
      </div>
      <div>
        <div class="info-card">
          <h4>الإجراءات</h4>
          ${actions}
        </div>
        <div class="info-card">
          <h4>ملاحظات داخلية (لا تظهر للعميل)</h4>
          <textarea id="adminNotes" rows="4" style="width:100%;padding:10px;border:1px solid var(--line);font-family:var(--font-body);">${esc(r.admin_notes || "")}</textarea>
          <div class="action-row"><button class="btn btn-ghost" id="saveNotesBtn">حفظ الملاحظات</button></div>
        </div>
        <div class="info-card">
          <h4>سجل الطلب</h4>
          ${(events || []).map((ev) => `
            <div class="info-row"><span>${esc(EVENT_LABELS[ev.event] || ev.event)}${ev.details ? " — " + esc(ev.details) : ""}</span>
            <span style="white-space:nowrap;">${new Date(ev.created_at).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}</span></div>`).join("") || `<div style="font-size:13.5px;color:var(--slate);">لا يوجد سجل.</div>`}
        </div>
      </div>
    </div>`);

  on("contactedBtn", () => act(id, () => setStatus(id, "contacted", "contacted"), "تم تحديث الحالة."));

  on("approveBtn", () => act(id, async () => {
    await setStatus(id, "in_progress", "payment_approved", null, { public_note: null });
    return await notify(id, "payment_approved");
  }, "تم اعتماد السداد وبدء التنفيذ."));

  on("rejectBtn", async () => {
    const reason = prompt("سبب الرفض (سيظهر للعميل في البريد وصفحة الطلب):");
    if (reason === null) return;
    await act(id, async () => {
      await setStatus(id, "payment_rejected", "payment_rejected", reason, { public_note: reason || null });
      return await notify(id, "payment_rejected");
    }, "تم رفض الإثبات وإشعار العميل.");
  });

  on("deliverBtn", () => act(id, async () => {
    await setStatus(id, "delivered", "delivered");
    return await notify(id, "delivered");
  }, "تم تحديد الطلب كمُسلَّم وإشعار العميل."));

  on("declineBtn", async () => {
    if (!confirm("هل تريد إغلاق هذا الطلب؟")) return;
    await act(id, () => setStatus(id, "declined", "declined"), "تم إغلاق الطلب.");
  });

  on("saveNotesBtn", async () => {
    const notes = document.getElementById("adminNotes").value;
    const { error: e } = await sb.from("service_requests").update({ admin_notes: notes || null }).eq("id", id);
    flash = e ? { type: "error", text: "تعذّر حفظ الملاحظات." } : { type: "success", text: "تم حفظ الملاحظات." };
    renderRequestDetail(id);
  });

  document.getElementById("quoteForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const amount = Number(fd.get("quote_amount"));
    const scope = String(fd.get("quote_scope") || "").trim();
    if (!(amount > 0) || !scope) {
      document.getElementById("quoteMsg").innerHTML = `<div class="notice error">أدخل مبلغًا صحيحًا ونطاق العمل.</div>`;
      return;
    }
    e.target.querySelector("button").disabled = true;
    await act(id, async () => {
      await setStatus(id, "quote_sent", "quote_sent", "المبلغ: " + amount, {
        quote_amount: amount,
        quote_scope: scope,
        quote_duration: String(fd.get("quote_duration") || "").trim() || null,
        quote_valid_until: fd.get("quote_valid_until") || null,
        quote_notes: String(fd.get("quote_notes") || "").trim() || null,
        quote_sent_at: new Date().toISOString(),
      });
      return await notify(id, "quote_sent");
    }, "تم حفظ عرض السعر وإرساله للعميل.");
  });
}

// ---------------- Services / Packages management ----------------
const CONTENT = {
  services: { label: "الخدمات", single: "خدمة", audience: false, svcFields: true },
  packages: { label: "الباقات", single: "باقة", audience: true, svcFields: false },
};

async function renderContentList(table) {
  const meta = CONTENT[table];
  shell(`
    <div class="admin-header-row">
      <h1>${meta.label}</h1>
      <a href="#/${table}/new" class="btn btn-primary" style="width:auto;padding:10px 18px;">+ إضافة ${meta.single}</a>
    </div>
    <div id="wrap"><div class="loading">جارِ التحميل…</div></div>`);

  const { data, error } = await sb.from(table).select("*").order("sort_order").order("created_at");
  const wrap = document.getElementById("wrap");
  if (error) { wrap.innerHTML = `<div class="notice error">تعذّر التحميل.</div>`; return; }
  if (!data.length) { wrap.innerHTML = `<div class="empty-state">لا يوجد شيء بعد.</div>`; return; }

  wrap.innerHTML = `
    <table class="data-table">
      <thead><tr><th>الاسم</th><th>الترتيب</th><th>الحالة</th></tr></thead>
      <tbody>
        ${data.map((x) => `
          <tr data-id="${esc(x.id)}">
            <td>${esc(x.title)}</td>
            <td>${esc(x.sort_order)}</td>
            <td><span class="status-badge status-${x.status === "published" ? "payment_approved" : "pending_payment"}">${x.status === "published" ? "منشور" : "مسودة"}</span></td>
          </tr>`).join("")}
      </tbody>
    </table>`;
  wrap.querySelectorAll("tr[data-id]").forEach((tr) =>
    tr.addEventListener("click", () => (location.hash = `#/${table}/${tr.dataset.id}`))
  );
}

async function renderContentForm(table, id) {
  const meta = CONTENT[table];
  let x = { slug: "", title: "", short_description: "", full_description: "", audience: "", items: [], sort_order: 0, status: "draft", target_customer: "", duration_note: "", requirements_note: "", delivery_note: "" };
  if (id) {
    const { data } = await sb.from(table).select("*").eq("id", id).single();
    if (data) x = data;
  }

  shell(`
    <div class="admin-header-row"><h1>${id ? "تعديل" : "إضافة"} ${meta.single}</h1></div>
    <div id="formMsg"></div>
    <form id="cForm" class="info-card" style="max-width:640px;">
      <div class="field"><label>الاسم *</label><input required name="title" value="${esc(x.title)}"></div>
      <div class="field"><label>الرابط (بالإنجليزي، أحرف صغيرة وشرطات) *</label>
        <input required name="slug" value="${esc(x.slug)}" placeholder="business-plans" pattern="[a-z0-9]+(-[a-z0-9]+)*"></div>
      <div class="field"><label>وصف مختصر</label><textarea name="short_description">${esc(x.short_description)}</textarea></div>
      <div class="field"><label>الوصف الكامل</label><textarea name="full_description" rows="5">${esc(x.full_description)}</textarea></div>
      ${meta.audience ? `<div class="field"><label>لمن تناسب</label><input name="audience" value="${esc(x.audience)}"></div>` : ""}
      ${meta.svcFields ? `
        <div class="field"><label>لمن تناسب هذه الخدمة (اختياري)</label><input name="target_customer" value="${esc(x.target_customer || "")}" placeholder="مثال: أصحاب المشاريع الجديدة والشركات القائمة"></div>
        <div class="form-row-2">
          <div class="field"><label>مدة التنفيذ (اختياري، اتركه فارغًا إن لم تحدَّد بعد)</label><input name="duration_note" value="${esc(x.duration_note || "")}" placeholder="مثال: تُحدَّد ضمن عرض السعر"></div>
          <div class="field"><label>طريقة التسليم (اختياري)</label><input name="delivery_note" value="${esc(x.delivery_note || "")}" placeholder="مثال: تسليم إلكتروني بعد اعتماد السداد"></div>
        </div>
        <div class="field"><label>المتطلبات من العميل (اختياري)</label><textarea name="requirements_note">${esc(x.requirements_note || "")}</textarea></div>` : ""}
      <div class="field"><label>ما تشمله (كل بند في سطر)</label>
        <textarea name="items_text" rows="6">${esc((Array.isArray(x.items) ? x.items : []).join("\n"))}</textarea></div>
      <div class="form-row-2">
        <div class="field"><label>الترتيب (الأصغر أولاً)</label><input type="number" name="sort_order" value="${esc(x.sort_order)}"></div>
        <div class="field"><label>الحالة</label>
          <select name="status">
            <option value="draft" ${x.status === "draft" ? "selected" : ""}>مسودة (مخفي)</option>
            <option value="published" ${x.status === "published" ? "selected" : ""}>منشور</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary" type="submit">حفظ</button>
    </form>`);

  document.getElementById("cForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector("button");
    btn.disabled = true; btn.textContent = "جارِ الحفظ…";
    const payload = {
      slug: String(fd.get("slug")).trim(),
      title: String(fd.get("title")).trim(),
      short_description: fd.get("short_description") || null,
      full_description: fd.get("full_description") || null,
      items: String(fd.get("items_text") || "").split("\n").map((s) => s.trim()).filter(Boolean),
      sort_order: parseInt(fd.get("sort_order"), 10) || 0,
      status: fd.get("status"),
    };
    if (meta.audience) payload.audience = fd.get("audience") || null;
    if (meta.svcFields) {
      payload.target_customer = fd.get("target_customer") || null;
      payload.duration_note = fd.get("duration_note") || null;
      payload.requirements_note = fd.get("requirements_note") || null;
      payload.delivery_note = fd.get("delivery_note") || null;
    }

    const { error } = id
      ? await sb.from(table).update(payload).eq("id", id)
      : await sb.from(table).insert(payload);

    if (error) {
      document.getElementById("formMsg").innerHTML = `<div class="notice error">تعذّر الحفظ: ${esc(error.message)}</div>`;
      btn.disabled = false; btn.textContent = "حفظ";
      return;
    }
    location.hash = `#/${table}`;
  });
}
