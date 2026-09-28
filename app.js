// ============================================================
// منصة اتقان للخدمات الاستشارية — واجهة العملاء
// ============================================================
const { createClient } = supabase;
const CFG = window.ITQAN_CONFIG;
const SETTINGS = window.ITQAN_SETTINGS || {};
const sb = createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
const app = document.getElementById("app");

// حفظ مصدر الزائر (مثلاً ?src=samam) لتسجيله مع الطلب
(function captureSource() {
  const s = new URLSearchParams(location.search).get("src");
  if (s) sessionStorage.setItem("itqan_src", s.slice(0, 40));
})();

// ---------------- Helpers ----------------
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const money = (n) => `${Number(n).toLocaleString("ar-SA")} ريال`;

const STATUS = {
  new: "تم استلام طلبك",
  contacted: "قيد المراجعة والتواصل",
  quote_sent: "تم إرسال عرض السعر",
  quote_accepted: "بانتظار السداد",
  payment_proof_submitted: "تم استلام إثبات السداد — قيد المراجعة",
  payment_rejected: "تعذّر اعتماد إثبات السداد",
  in_progress: "العمل قيد التنفيذ",
  delivered: "تم التسليم",
  declined: "مغلق",
  cancelled: "ملغي",
};

function setMeta(title, description) {
  document.title = title;
  const m = document.querySelector('meta[name="description"]');
  if (m && description) m.setAttribute("content", description);
}

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [pathPart, query = ""] = raw.split("?");
  return {
    parts: pathPart.split("/").filter(Boolean).map(decodeURIComponent),
    params: new URLSearchParams(query),
  };
}

const listItems = (x) => (Array.isArray(x.items) ? x.items : []);

async function loadServices() {
  const { data } = await sb.from("services").select("*").eq("status", "published").order("sort_order").order("created_at");
  return data || [];
}
async function loadPackages() {
  const { data } = await sb.from("packages").select("*").eq("status", "published").order("sort_order").order("created_at");
  return data || [];
}

function layout(content) {
  app.innerHTML = `
    <header class="site-header">
      <div class="wrap">
        <a href="#/" class="brand">
          <span class="logo-chip"><img src="logo.png" alt="شعار اتقان لخدمات الأعمال"></span>
          <span class="brand-text">اتقان<small>استشارات ودراسات وخطط أعمال</small></span>
        </a>
        <nav class="nav-links">
          <a href="#/">الرئيسية</a>
          <a href="#/services">الخدمات</a>
          <a href="#/packages">الباقات</a>
          <a href="#/track">تتبع طلبك</a>
          <a href="#/request" class="btn btn-primary">اطلب عرض سعر</a>
        </nav>
      </div>
    </header>
    <main>${content}</main>
    <footer class="site-footer">
      <div class="wrap">
        <a href="https://itqanbs.sa" target="_blank" rel="noopener">اتقان لخدمات الأعمال</a> — دراسات متخصصة، استشارات، إعادة هيكلة، وخطط تطوير أعمال<br>
        © ${new Date().getFullYear()} جميع الحقوق محفوظة.
      </div>
    </footer>
    <a class="wa-float" href="https://wa.me/${esc(CFG.whatsappSupportNumber)}" target="_blank" rel="noopener" aria-label="تواصل معنا عبر واتساب" title="تواصل معنا عبر واتساب">
      <svg width="26" height="26" viewBox="0 0 32 32" fill="white"><path d="M16 3C9.4 3 4 8.4 4 15c0 2.4.7 4.6 1.9 6.5L4 29l7.7-1.9c1.8 1 3.9 1.5 6.3 1.5 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.8c-2 0-3.9-.6-5.5-1.6l-.4-.2-4.6 1.2 1.2-4.5-.3-.4C5.4 17.7 4.8 16.4 4.8 15c0-6.2 5-11.2 11.2-11.2S27.2 8.8 27.2 15 22.2 24.8 16 24.8zm6.1-8.4c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-2-1.8-2.3-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6-.1-.2-.8-1.9-1.1-2.6-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.8 5.1.8.3 1.4.6 1.9.7.8.3 1.5.2 2.1.1.6-.1 2-.8 2.3-1.6.3-.8.3-1.4.2-1.6-.1-.1-.3-.2-.6-.4z"/></svg>
    </a>
  `;
}

const serviceCard = (s) => `
  <a class="product-card" href="#/service/${esc(s.slug)}">
    <h3>${esc(s.title)}</h3>
    <div class="desc">${esc(s.short_description)}</div>
    <div class="price" style="color:var(--brass);font-weight:500;">تفاصيل الخدمة ←</div>
  </a>`;

const packageCard = (k) => `
  <div class="pkg-card">
    <h3>${esc(k.title)}</h3>
    <p class="pkg-sub">${esc(k.short_description)}</p>
    ${k.audience ? `<div class="pkg-aud"><b>تناسب:</b> ${esc(k.audience)}</div>` : ""}
    <ul class="contents-list">${listItems(k).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
    <a class="btn btn-primary" href="#/request?package=${esc(k.slug)}">اطلب عرض سعر</a>
  </div>`;

// ---------------- Router ----------------
window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);

function route() {
  const { parts, params } = parseHash();
  window.scrollTo(0, 0);
  const [page, arg] = parts;
  if (!page) return renderHome();
  if (page === "services") return renderServices();
  if (page === "service") return renderService(arg);
  if (page === "packages") return renderPackages();
  if (page === "request") return renderRequestForm(params);
  if (page === "done") return renderDone(arg);
  if (page === "track") return renderTrack(arg);
  return renderHome();
}

// ---------------- Home ----------------
async function renderHome() {
  setMeta(
    "اتقان | دراسات واستشارات وخطط تطوير الأعمال في السعودية",
    "دراسات متخصصة واستشارية، إعادة هيكلة، وخطط تطوير أعمال من اتقان لخدمات الأعمال. اطلب عرض سعر لمشروعك أو شركتك القائمة."
  );
  const eco = (SETTINGS.ecosystem || []).filter((e) => e.url);

  layout(`
    <section class="hero">
      <div class="wrap">
        <h1>نحوّل فكرتك أو شركتك إلى خطة عمل قابلة للتنفيذ</h1>
        <p>دراسات متخصصة، استشارات، إعادة هيكلة، وخطط تطوير أعمال — يقدّمها فريق اتقان لخدمات الأعمال وفق احتياج مشروعك، بعرض سعر واضح قبل أي التزام.</p>
        <div class="hero-actions">
          <a href="#/request" class="btn btn-primary">اطلب عرض سعر</a>
          <a href="#/services" class="btn btn-outline-light">استعرض الخدمات</a>
        </div>
      </div>
    </section>
    <section class="trust-strip">
      <div class="wrap">
        <div class="trust-item"><span class="dot">✓</span> عرض سعر واضح قبل أي التزام</div>
        <div class="trust-item"><span class="dot">✓</span> نطاق عمل مخصص لاحتياجك</div>
        <div class="trust-item"><span class="dot">✓</span> فريق استشاري متخصص</div>
        <div class="trust-item"><span class="dot">✓</span> لا يبدأ العمل ولا يُدفع شيء إلا بعد موافقتك</div>
      </div>
    </section>
    <div class="wrap">
      <div class="section-heading"><h2>كيف تعمل الخدمة</h2></div>
      <div class="steps">
        <div class="step"><div class="num">١</div><h4>أرسل طلبك</h4><p>عرّفنا بمشروعك وهدفك، ويمكنك اختيار خدمة أو باقة.</p></div>
        <div class="step"><div class="num">٢</div><h4>نتواصل معك</h4><p>نفهم احتياجك ونحدد نطاق العمل المناسب.</p></div>
        <div class="step"><div class="num">٣</div><h4>يصلك عرض السعر</h4><p>تراجعه وتوافق عليه من صفحة طلبك.</p></div>
        <div class="step"><div class="num">٤</div><h4>تحويل وبدء العمل</h4><p>تحوّل المبلغ، ونبدأ التنفيذ فور اعتماد السداد.</p></div>
      </div>

      <div class="section-heading"><h2>خدماتنا</h2><a href="#/services" class="count">كل الخدمات ←</a></div>
      <div id="homeServices" class="product-grid"><div class="loading">جارِ التحميل…</div></div>

      <div class="section-heading"><h2>الباقات</h2><a href="#/packages" class="count">تفاصيل الباقات ←</a></div>
      <div id="homePackages" class="pkg-grid"><div class="loading">جارِ التحميل…</div></div>
      <p class="note-muted">الباقات بلا أسعار ثابتة: نحدد العرض بعد فهم احتياجك ونطاق العمل.</p>

      ${eco.length ? `
        <div class="section-heading"><h2>منظومة اتقان</h2></div>
        <div class="product-grid">
          ${eco.map((e) => `
            <a class="product-card" href="${esc(e.url)}" target="_blank" rel="noopener">
              <div class="cat">من منظومة اتقان</div>
              <h3>${esc(e.name)}</h3>
              <div class="desc">${esc(e.description)}</div>
              <div class="price" style="color:var(--brass);font-weight:500;">زيارة المنصة ←</div>
            </a>`).join("")}
        </div>` : ""}
    </div>
    <section class="cta-band">
      <h2>جاهز تبدأ؟</h2>
      <p>أرسل طلبك اليوم، وسيتواصل معك فريقنا بعرض سعر واضح.</p>
      <a href="#/request" class="btn btn-primary">اطلب عرض سعر</a>
    </section>
  `);

  const [services, packages] = await Promise.all([loadServices(), loadPackages()]);
  const sEl = document.getElementById("homeServices");
  const pEl = document.getElementById("homePackages");
  if (sEl) sEl.innerHTML = services.length ? services.map(serviceCard).join("") : `<div class="empty-state">قريبًا.</div>`;
  if (pEl) pEl.innerHTML = packages.length ? packages.map(packageCard).join("") : `<div class="empty-state">قريبًا.</div>`;
}

// ---------------- Services ----------------
async function renderServices() {
  setMeta("الخدمات | اتقان", "دراسات متخصصة واستشارية، إعادة هيكلة، خطط تطوير أعمال، وخدمات مخصصة للشركات القائمة.");
  layout(`
    <div class="wrap">
      <div class="section-heading" style="margin-top:40px;"><h2>خدماتنا</h2></div>
      <div id="list" class="product-grid"><div class="loading">جارِ التحميل…</div></div>
    </div>`);
  const services = await loadServices();
  document.getElementById("list").innerHTML = services.length
    ? services.map(serviceCard).join("")
    : `<div class="empty-state">لا توجد خدمات منشورة حاليًا.</div>`;
}

async function renderService(slug) {
  layout(`<div class="wrap"><div class="loading">جارِ التحميل…</div></div>`);
  const { data: s } = await sb.from("services").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!s) {
    layout(`<div class="wrap"><div class="empty-state" style="margin-top:40px;">هذه الخدمة غير متاحة. <a href="#/services">عودة للخدمات</a></div></div>`);
    return;
  }
  setMeta(`${s.title} | اتقان`, (s.short_description || "").slice(0, 155));
  layout(`
    <div class="wrap">
      <div class="product-detail">
        <div>
          <div class="pd-cat">خدمات اتقان</div>
          <h1 class="pd-title">${esc(s.title)}</h1>
          <p class="pd-desc">${esc(s.full_description || s.short_description)}</p>
          ${listItems(s).length ? `
            <div class="pd-block">
              <h4>ما تشمله الخدمة</h4>
              <ul class="contents-list">${listItems(s).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
            </div>` : ""}
        </div>
        <div class="buy-box">
          <h4 style="font-family:var(--font-display);margin:0 0 8px;">ابدأ بطلب عرض سعر</h4>
          <p class="includes" style="margin-top:0;">نتواصل معك لفهم احتياجك، ثم يصلك عرض بنطاق عمل وسعر واضحين. طلب العرض لا يلزمك بشيء.</p>
          <a class="btn btn-primary" href="#/request?service=${esc(s.slug)}">اطلب عرض سعر لهذه الخدمة</a>
        </div>
      </div>
    </div>`);
}

// ---------------- Packages ----------------
async function renderPackages() {
  setMeta("الباقات | اتقان", "باقات التأسيس والتطوير والجاهزية من اتقان لخدمات الأعمال.");
  layout(`
    <div class="wrap">
      <div class="section-heading" style="margin-top:40px;"><h2>الباقات</h2></div>
      <p class="note-muted" style="margin-bottom:20px;">اختر المرحلة التي تناسبك. لا توجد أسعار ثابتة؛ يُحدَّد العرض بعد فهم احتياجك ونطاق العمل.</p>
      <div id="list" class="pkg-grid"><div class="loading">جارِ التحميل…</div></div>
    </div>`);
  const packages = await loadPackages();
  document.getElementById("list").innerHTML = packages.length
    ? packages.map(packageCard).join("")
    : `<div class="empty-state">لا توجد باقات منشورة حاليًا.</div>`;
}

// ---------------- Request form ----------------
async function renderRequestForm(params) {
  setMeta("اطلب عرض سعر | اتقان", "أرسل طلبك وسيتواصل معك فريق اتقان بعرض سعر واضح.");
  layout(`<div class="wrap"><div class="loading">جارِ التحميل…</div></div>`);

  const [services, packages] = await Promise.all([loadServices(), loadPackages()]);
  const preService = params.get("service");
  const prePackage = params.get("package");
  const opt = (v, label, sel) => `<option value="${esc(v)}" ${sel ? "selected" : ""}>${esc(label)}</option>`;

  layout(`
    <div class="form-page wide">
      <h2>اطلب عرض سعر</h2>
      <div class="sub">أخبرنا عن مشروعك وسنتواصل معك. لا يُطلب منك أي دفع الآن.</div>
      <div id="formMsg"></div>
      <form id="requestForm">
        <div class="hp-field"><label>الموقع <input name="website" tabindex="-1" autocomplete="off"></label></div>

        <div class="form-row-2">
          <div class="field"><label>الاسم الكامل <span class="req">*</span></label><input required name="full_name"></div>
          <div class="field"><label>رقم الجوال <span class="req">*</span></label><input required name="phone" type="tel" placeholder="05xxxxxxxx"></div>
        </div>
        <div class="form-row-2">
          <div class="field"><label>البريد الإلكتروني <span class="req">*</span></label><input required name="email" type="email"></div>
          <div class="field"><label>اسم المنشأة (اختياري)</label><input name="company_name"></div>
        </div>

        <div class="form-row-2">
          <div class="field"><label>الخدمة المطلوبة (اختياري)</label>
            <select name="service_id">
              <option value="">— لم أحدد —</option>
              ${services.map((s) => opt(s.id, s.title, s.slug === preService)).join("")}
            </select>
          </div>
          <div class="field"><label>الباقة (اختياري)</label>
            <select name="package_id">
              <option value="">— لم أحدد —</option>
              ${packages.map((k) => opt(k.id, k.title, k.slug === prePackage)).join("")}
            </select>
          </div>
        </div>

        <div class="form-row-2">
          <div class="field"><label>وضع نشاطك</label>
            <select name="business_stage">
              <option value="">— اختر —</option>
              ${["فكرة / مشروع جديد", "شركة قائمة", "مستثمر", "أخرى"].map((x) => opt(x, x)).join("")}
            </select>
          </div>
          <div class="field"><label>حجم المنشأة</label>
            <select name="business_size">
              <option value="">— اختر —</option>
              ${["ناشئة / صغيرة جدًا", "صغيرة", "متوسطة", "كبيرة"].map((x) => opt(x, x)).join("")}
            </select>
          </div>
        </div>

        <div class="field"><label>ما الذي تريد تحقيقه؟ <span class="req">*</span></label>
          <textarea required name="goal" placeholder="مثال: أرغب بدراسة جدوى لافتتاح مشروع…، أو خطة لتوسيع شركتي القائمة…"></textarea>
        </div>
        <div class="field"><label>الميزانية التقريبية (اختياري)</label>
          <select name="budget_range">
            <option value="">— لم أحدد بعد —</option>
            ${["أقل من 10,000 ريال", "من 10,000 إلى 30,000 ريال", "من 30,000 إلى 100,000 ريال", "أكثر من 100,000 ريال"].map((x) => opt(x, x)).join("")}
          </select>
          <small>للمساعدة في اقتراح النطاق المناسب فقط، وليست التزامًا.</small>
        </div>
        <div class="field"><label>ملاحظات إضافية (اختياري)</label><textarea name="message"></textarea></div>
        <button class="btn btn-primary" type="submit">إرسال الطلب</button>
      </form>
    </div>`);

  document.getElementById("requestForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (fd.get("website")) { location.hash = "#/done/"; return; } // فخ للروبوتات

    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "جارِ الإرسال…";

    const { data, error } = await sb.rpc("create_service_request", {
      p_full_name: fd.get("full_name"),
      p_phone: fd.get("phone"),
      p_email: fd.get("email"),
      p_company_name: fd.get("company_name") || null,
      p_business_stage: fd.get("business_stage") || null,
      p_business_size: fd.get("business_size") || null,
      p_goal: fd.get("goal"),
      p_budget_range: fd.get("budget_range") || null,
      p_message: fd.get("message") || null,
      p_service_id: fd.get("service_id") || null,
      p_package_id: fd.get("package_id") || null,
      p_source: sessionStorage.getItem("itqan_src") || "store",
    });

    if (error || !data || !data.length) {
      document.getElementById("formMsg").innerHTML = `<div class="notice error">تعذّر إرسال الطلب. تأكد من البيانات وحاول مرة أخرى، أو تواصل معنا عبر واتساب.</div>`;
      btn.disabled = false; btn.textContent = "إرسال الطلب";
      return;
    }

    const row = data[0];
    sessionStorage.setItem("itqan_last_email", fd.get("email"));
    sb.functions.invoke("send-order-email", { body: { request_id: row.out_request_id, event: "request_received" } }).catch(() => {});
    location.hash = `#/done/${encodeURIComponent(row.out_request_number)}`;
  });
}

function renderDone(number) {
  setMeta("تم استلام طلبك | اتقان", "");
  layout(`
    <div class="center-page">
      <h2 style="font-family:var(--font-display);">تم استلام طلبك</h2>
      ${number ? `<div class="order-number">${esc(number)}</div>` : ""}
      <p style="color:var(--slate);">شكرًا لتواصلك مع اتقان. سيتواصل معك فريقنا قريبًا لفهم احتياجك، ثم يصلك عرض السعر.
      ${number ? "احتفظ برقم الطلب لمتابعته في أي وقت." : ""}</p>
      ${number ? `<a href="#/track/${encodeURIComponent(number)}" class="btn btn-ghost btn-inline" style="margin-top:14px;">متابعة الطلب</a>` : `<a href="#/" class="btn btn-ghost btn-inline" style="margin-top:14px;">العودة للرئيسية</a>`}
    </div>`);
}

// ---------------- Track ----------------
function stepIndex(st) {
  if (["new", "contacted"].includes(st)) return 0;
  if (st === "quote_sent") return 1;
  if (["quote_accepted", "payment_proof_submitted", "payment_rejected"].includes(st)) return 2;
  if (st === "in_progress") return 3;
  if (st === "delivered") return 4;
  return -1;
}

function timelineHtml(st) {
  const idx = stepIndex(st);
  if (idx < 0) return "";
  const labels = ["استلام الطلب", "عرض السعر", "السداد", "التنفيذ", "التسليم"];
  return `<div class="timeline">${labels
    .map((l, i) => `<div class="tl-step ${st === "delivered" || i < idx ? "done" : i === idx ? "current" : ""}">${l}</div>`)
    .join("")}</div>`;
}

async function lookup(number, email) {
  const { data, error } = await sb.rpc("get_request_status", {
    p_request_number: number.trim(),
    p_email: email.trim(),
  });
  if (error || !data || !data.length) return null;
  return data[0];
}

function renderTrack(prefNumber) {
  setMeta("تتبع طلبك | اتقان", "تابع حالة طلبك ووافق على عرض السعر وأكمل السداد.");
  const savedEmail = sessionStorage.getItem("itqan_last_email") || "";
  layout(`
    <div class="form-page wide">
      <h2>تتبع طلبك</h2>
      <div class="sub">أدخل رقم الطلب والبريد الإلكتروني المستخدم عند الطلب</div>
      <form id="trackForm">
        <div class="form-row-2">
          <div class="field"><label>رقم الطلب <span class="req">*</span></label><input required name="number" placeholder="ITQ-000001" value="${esc(prefNumber || "")}"></div>
          <div class="field"><label>البريد الإلكتروني <span class="req">*</span></label><input required type="email" name="email" value="${esc(savedEmail)}"></div>
        </div>
        <button class="btn btn-primary" type="submit">عرض الحالة</button>
      </form>
      <div id="result" style="margin-top:28px;"></div>
    </div>`);

  const form = document.getElementById("trackForm");
  const run = async () => {
    const fd = new FormData(form);
    const el = document.getElementById("result");
    el.innerHTML = `<div class="notice">جارِ البحث…</div>`;
    const row = await lookup(fd.get("number"), fd.get("email"));
    if (!row) { el.innerHTML = `<div class="notice error">لم يتم العثور على طلب بهذه البيانات. تأكد من رقم الطلب والبريد.</div>`; return; }
    sessionStorage.setItem("itqan_last_email", fd.get("email"));
    renderResult(row, fd.get("email"));
  };
  form.addEventListener("submit", (e) => { e.preventDefault(); run(); });
  if (prefNumber && savedEmail) run();
}

function quoteCard(row, canAccept) {
  const expired = row.out_quote_valid_until && new Date(row.out_quote_valid_until + "T23:59:59") < new Date();
  return `
    <div class="summary-box">
      <div class="summary-row"><span>قيمة العرض</span><span>${money(row.out_quote_amount)}</span></div>
      ${row.out_quote_duration ? `<div class="summary-row"><span>مدة التنفيذ</span><span>${esc(row.out_quote_duration)}</span></div>` : ""}
      ${row.out_quote_valid_until ? `<div class="summary-row"><span>صالح حتى</span><span>${esc(row.out_quote_valid_until)}</span></div>` : ""}
      ${row.out_quote_scope ? `<div style="padding:10px 0;"><b style="font-size:14px;">نطاق العمل</b><div class="quote-scope">${esc(row.out_quote_scope)}</div></div>` : ""}
      ${row.out_quote_notes ? `<div style="font-size:14px;color:var(--slate);white-space:pre-line;">${esc(row.out_quote_notes)}</div>` : ""}
    </div>
    ${canAccept ? (expired
      ? `<div class="notice error">انتهت صلاحية هذا العرض. تواصل معنا لتجديده.</div>`
      : `<button class="btn btn-primary" id="acceptBtn">أوافق على العرض</button>
         <p style="font-size:12.5px;color:var(--slate);margin-top:8px;">بعد الموافقة ستظهر لك بيانات الحساب البنكي لإتمام السداد.</p>`) : ""}`;
}

function paymentBox(row) {
  const bank = CFG.bank;
  return `
    <h3 style="font-family:var(--font-display);margin:28px 0 12px;">إتمام السداد</h3>
    <div class="bank-box">
      <h4>التحويل البنكي — المبلغ ${money(row.out_quote_amount)}</h4>
      <div class="bank-row"><span>اسم البنك</span><b>${esc(bank.bankName)}</b></div>
      <div class="bank-row"><span>اسم الحساب</span><b>${esc(bank.accountName)}</b></div>
      <div class="bank-row"><span>رقم الآيبان (IBAN)</span><b>${esc(bank.iban)}</b></div>
      <p style="font-size:13.5px;color:var(--slate);margin:14px 0 0;">حوّل المبلغ ثم ارفع إثبات التحويل أدناه ليبدأ العمل فور اعتماده.</p>
    </div>
    <div id="payMsg"></div>
    <form id="proofForm">
      <div class="field"><label>اسم المحوِّل <span class="req">*</span></label><input required name="transferor_name"></div>
      <div class="form-row-2">
        <div class="field"><label>البنك المحوَّل منه <span class="req">*</span></label><input required name="source_bank"></div>
        <div class="field"><label>تاريخ التحويل <span class="req">*</span></label><input required type="date" name="transfer_date"></div>
      </div>
      <div class="field"><label>رقم العملية / المرجع (اختياري)</label><input name="reference_number"></div>
      <div class="field"><label>إرفاق إثبات التحويل <span class="req">*</span></label>
        <input required type="file" name="proof_file" accept="image/*,application/pdf">
        <small>صورة أو ملف PDF لإيصال التحويل</small>
      </div>
      <button class="btn btn-primary" type="submit">إرسال إثبات السداد</button>
    </form>`;
}

function renderResult(row, email) {
  const el = document.getElementById("result");
  const st = row.out_status;
  const what = [row.out_service_title, row.out_package_title].filter(Boolean).join(" — ") || "طلب استشارة";
  const number = row.out_request_number;
  const wa = `https://wa.me/${CFG.whatsappSupportNumber}?text=${encodeURIComponent("بخصوص طلبي رقم " + number)}`;
  const quoteVisible = row.out_quote_amount != null &&
    ["quote_sent", "quote_accepted", "payment_proof_submitted", "payment_rejected", "in_progress", "delivered"].includes(st);

  let html = `
    <div class="summary-box">
      <div class="summary-row"><span>رقم الطلب</span><span>${esc(number)}</span></div>
      <div class="summary-row"><span>الخدمة</span><span>${esc(what)}</span></div>
      <div class="summary-row"><span>الحالة</span><span class="status-badge status-${esc(st)}">${esc(STATUS[st] || st)}</span></div>
    </div>
    ${timelineHtml(st)}`;

  if (st === "new" || st === "contacted") html += `<div class="notice">طلبك قيد المراجعة، وسيتواصل معك فريق اتقان قريبًا بعرض السعر.</div>`;
  if (quoteVisible) html += `<h3 style="font-family:var(--font-display);margin:8px 0 12px;">عرض السعر</h3>` + quoteCard(row, st === "quote_sent");
  if (st === "quote_accepted" || st === "payment_rejected") {
    if (st === "payment_rejected") html += `<div class="notice error">تعذّر اعتماد إثبات السداد السابق.${row.out_public_note ? " السبب: " + esc(row.out_public_note) : ""} يرجى رفع إثبات صحيح.</div>`;
    html += paymentBox(row);
  }
  if (st === "payment_proof_submitted") html += `<div class="notice success">استلمنا إثبات السداد، وسيتم التحقق منه وإبلاغك فور اعتماده.</div>`;
  if (st === "in_progress") html += `<div class="notice success">تم اعتماد السداد والعمل قيد التنفيذ. سيتواصل معك الفريق لتنسيق المراحل.</div>`;
  if (st === "delivered") html += `<div class="notice success">تم تسليم طلبك. نشكرك على ثقتك باتقان.</div>`;
  if (st === "declined" || st === "cancelled") html += `<div class="notice">تم إغلاق هذا الطلب. للاستفسار تواصل معنا.</div>`;

  html += `<p style="margin-top:22px;font-size:13.5px;"><a href="${wa}" target="_blank" rel="noopener" style="color:var(--brass);">لديك استفسار؟ تواصل معنا عبر واتساب ←</a></p>`;
  el.innerHTML = html;

  const refresh = async () => {
    const fresh = await lookup(number, email);
    if (fresh) renderResult(fresh, email);
  };

  document.getElementById("acceptBtn")?.addEventListener("click", async (e) => {
    e.target.disabled = true; e.target.textContent = "جارِ التسجيل…";
    const { data: ok, error } = await sb.rpc("accept_quote", { p_request_number: number, p_email: email });
    if (error || !ok) {
      e.target.disabled = false; e.target.textContent = "أوافق على العرض";
      el.insertAdjacentHTML("afterbegin", `<div class="notice error">تعذّر تسجيل الموافقة. قد يكون العرض منتهيًا أو تغيّرت حالة الطلب.</div>`);
      return;
    }
    sb.functions.invoke("send-order-email", { body: { request_id: row.out_request_id, event: "quote_accepted" } }).catch(() => {});
    refresh();
  });

  document.getElementById("proofForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "جارِ الرفع…";
    const fd = new FormData(e.target);
    const file = fd.get("proof_file");
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${row.out_request_id}/${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage.from("payment-proofs").upload(path, file);
      if (upErr) throw upErr;
      const { error: rpcErr } = await sb.rpc("submit_request_payment_proof", {
        p_request_number: number,
        p_email: email,
        p_transferor_name: fd.get("transferor_name"),
        p_source_bank: fd.get("source_bank"),
        p_transfer_date: fd.get("transfer_date"),
        p_reference_number: fd.get("reference_number") || null,
        p_proof_file_path: path,
      });
      if (rpcErr) throw rpcErr;
      sb.functions.invoke("send-order-email", { body: { request_id: row.out_request_id, event: "payment_proof_received" } }).catch(() => {});
      refresh();
    } catch (err) {
      document.getElementById("payMsg").innerHTML = `<div class="notice error">تعذّر إرسال إثبات السداد. حاول مرة أخرى.</div>`;
      btn.disabled = false; btn.textContent = "إرسال إثبات السداد";
    }
  });
}
