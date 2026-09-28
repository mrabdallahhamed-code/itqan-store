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

// ---------------- أيقونات مصممة (SVG أصلية، لا صور خارجية) ----------------
const ICONS = {
  "specialized-studies": `<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z" stroke-linejoin="round"/><path d="M15 3v4h4M9 12h6M9 15h6M9 9h2" stroke-linecap="round"/></svg>`,
  "advisory-studies": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  "restructuring": `<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="12" cy="18" r="2.4"/><path d="M8 7.3 11 16M16 7.3 13 16M6 8.4V12M18 8.4V12" stroke-linecap="round"/></svg>`,
  "business-development-plans": `<svg viewBox="0 0 24 24"><path d="M4 19V9M10 19V5M16 19v-7M4 19h16" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 12l4-4 4 3 6-7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  "custom-corporate-services": `<svg viewBox="0 0 24 24"><path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" stroke-linejoin="round"/><path d="M3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5" stroke-linejoin="round"/></svg>`,
  "foundation": `<svg viewBox="0 0 24 24"><path d="M4 21h16M6 21V10M18 21V10M4 10l8-6 8 6" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 21v-6h4v6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  "development": `<svg viewBox="0 0 24 24"><path d="M4 17 10 11 14 15 20 9" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 9h5v5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  "readiness": `<svg viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" stroke-linejoin="round"/><path d="m8.5 12 2.5 2.5L16 9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};
const icon = (slug) => (ICONS[slug] ? `<div class="icon-badge">${ICONS[slug]}</div>` : "");

const FAQ = [
  { q: "هل يمكن إعداد دراسة لمشروع قائم؟", a: "نعم. خدماتنا تناسب المشاريع الجديدة والشركات القائمة على حد سواء، ونحدد التفاصيل بعد فهم وضعك الحالي." },
  { q: "ما البيانات المطلوبة مني؟", a: "تختلف حسب الخدمة المطلوبة، وسنوضح لك بالضبط ما نحتاجه بعد استلام طلبك والتواصل معك." },
  { q: "كم تستغرق الدراسة؟", a: "تختلف المدة حسب نطاق العمل وطبيعة الخدمة، وستُحدَّد بوضوح ضمن عرض السعر الذي يصلك قبل أي التزام." },
  { q: "هل تشمل الدراسة تحليلًا ماليًا؟", a: "حسب الخدمة المطلوبة؛ دراسات الجدوى والدراسات الاستشارية غالبًا تتضمن تحليلًا ماليًا، وسنوضح ذلك تحديدًا ضمن نطاق العمل المرسل لك." },
  { q: "هل يمكن تخصيص الدراسة حسب مشروعي؟", a: "نعم، نطاق العمل يُبنى على احتياجك ووضع مشروعك تحديدًا، وليس نموذجًا موحدًا." },
  { q: "كيف يتم التسليم؟", a: "إلكترونيًا بعد اعتماد السداد، وتفاصيل طريقة التسليم توضَّح ضمن عرض السعر." },
  { q: "خدمتي غير موجودة ضمن القائمة، ماذا أفعل؟", a: "استخدم خدمة \"خدمات مخصصة للشركات القائمة\"، أو اذكر احتياجك بالتفصيل عند إرسال طلب عرض السعر وسنتواصل معك." },
];

const MOCKUP_MARKET = `
<svg viewBox="0 0 260 170" xmlns="http://www.w3.org/2000/svg">
  <rect width="260" height="170" fill="#FBFAF7"/>
  <rect x="0" y="0" width="260" height="34" fill="#3A584B"/>
  <rect x="16" y="12" width="90" height="10" rx="2" fill="#F2F0E9"/>
  <rect x="16" y="52" width="228" height="10" rx="2" fill="#E7E3D8"/>
  <rect x="16" y="70" width="180" height="10" rx="2" fill="#E7E3D8"/>
  <g transform="translate(16,92)">
    <rect x="0" y="40" width="26" height="30" fill="#BCA569"/>
    <rect x="34" y="24" width="26" height="46" fill="#BCA569" opacity="0.8"/>
    <rect x="68" y="10" width="26" height="60" fill="#3A584B"/>
    <rect x="102" y="30" width="26" height="40" fill="#BCA569" opacity="0.6"/>
    <rect x="136" y="4" width="26" height="66" fill="#3A584B" opacity="0.85"/>
  </g>
</svg>`;

const MOCKUP_FINANCE = `
<svg viewBox="0 0 260 170" xmlns="http://www.w3.org/2000/svg">
  <rect width="260" height="170" fill="#FBFAF7"/>
  <rect x="0" y="0" width="260" height="34" fill="#3A584B"/>
  <rect x="16" y="12" width="110" height="10" rx="2" fill="#F2F0E9"/>
  <polyline points="16,120 60,90 100,104 140,60 184,74 228,40" fill="none" stroke="#BCA569" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="228" cy="40" r="4" fill="#3A584B"/>
  <rect x="16" y="140" width="60" height="10" rx="2" fill="#E7E3D8"/>
  <rect x="90" y="140" width="60" height="10" rx="2" fill="#E7E3D8"/>
  <rect x="164" y="140" width="80" height="10" rx="2" fill="#E7E3D8"/>
</svg>`;

const MOCKUP_RECOMMEND = `
<svg viewBox="0 0 260 170" xmlns="http://www.w3.org/2000/svg">
  <rect width="260" height="170" fill="#FBFAF7"/>
  <rect x="0" y="0" width="260" height="34" fill="#3A584B"/>
  <rect x="16" y="12" width="80" height="10" rx="2" fill="#F2F0E9"/>
  <g fill="#E7E3D8">
    <circle cx="24" cy="58" r="6" fill="#BCA569"/><rect x="40" y="53" width="200" height="10" rx="2"/>
    <circle cx="24" cy="86" r="6" fill="#BCA569"/><rect x="40" y="81" width="180" height="10" rx="2"/>
    <circle cx="24" cy="114" r="6" fill="#BCA569"/><rect x="40" y="109" width="200" height="10" rx="2"/>
    <circle cx="24" cy="142" r="6" fill="#BCA569"/><rect x="40" y="137" width="150" height="10" rx="2"/>
  </g>
</svg>`;

const HERO_ILLUSTRATION = `
  <svg class="hero-illustration" viewBox="0 0 380 260" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="barG" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#C9A66B"/><stop offset="1" stop-color="#EFDDB4"/>
      </linearGradient>
      <linearGradient id="cardG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#4E6B54"/><stop offset="1" stop-color="#3B5240"/>
      </linearGradient>
    </defs>
    <circle cx="300" cy="46" r="64" fill="#ffffff" opacity="0.06"/>
    <circle cx="46" cy="220" r="40" fill="#C9A66B" opacity="0.15"/>

    <g>
      <rect x="18" y="150" width="36" height="80" rx="6" fill="url(#barG)" opacity="0.9"/>
      <rect x="64" y="118" width="36" height="112" rx="6" fill="url(#barG)"/>
      <rect x="110" y="70" width="36" height="160" rx="6" fill="#F4E6C6"/>
      <path d="M20 140 66 104 112 60 150 34" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
      <circle cx="150" cy="34" r="6" fill="#ffffff"/>
    </g>

    <g transform="translate(178,36)">
      <rect x="0" y="0" width="176" height="200" rx="16" fill="#ffffff" opacity="0.97"/>
      <rect x="0" y="0" width="176" height="40" rx="16" fill="url(#cardG)"/>
      <rect x="0" y="24" width="176" height="16" fill="url(#cardG)"/>
      <circle cx="24" cy="20" r="8" fill="#F4E6C6"/>
      <rect x="42" y="16" width="90" height="8" rx="4" fill="#ffffff" opacity="0.85"/>
      <rect x="22" y="60" width="132" height="10" rx="5" fill="#EFEADD"/>
      <rect x="22" y="80" width="132" height="10" rx="5" fill="#EFEADD"/>
      <rect x="22" y="100" width="92" height="10" rx="5" fill="#EFEADD"/>
      <g transform="translate(20,126)">
        <circle cx="10" cy="10" r="10" fill="#C9A66B"/>
        <path d="M5.5 10.2l3 3 6.5-6.6" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="28" y="4" width="100" height="12" rx="6" fill="#F7F4EC"/>
      </g>
      <g transform="translate(20,154)">
        <circle cx="10" cy="10" r="10" fill="#C9A66B"/>
        <path d="M5.5 10.2l3 3 6.5-6.6" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="28" y="4" width="76" height="12" rx="6" fill="#F7F4EC"/>
      </g>
    </g>
  </svg>`;

let SERVICES_CACHE = null;
let PACKAGES_CACHE = null;
async function loadServices() {
  if (SERVICES_CACHE) return SERVICES_CACHE;
  const { data } = await sb.from("services").select("*").eq("status", "published").order("sort_order").order("created_at");
  SERVICES_CACHE = data || [];
  return SERVICES_CACHE;
}
async function loadPackages() {
  if (PACKAGES_CACHE) return PACKAGES_CACHE;
  const { data } = await sb.from("packages").select("*").eq("status", "published").order("sort_order").order("created_at");
  PACKAGES_CACHE = data || [];
  return PACKAGES_CACHE;
}

function layout(content) {
  const svcLinks = (SERVICES_CACHE || []).slice(0, 5)
    .map((s) => `<a href="#/service/${esc(s.slug)}">${esc(s.title)}</a>`).join("");
  const social = SETTINGS.social || [];
  const legal = SETTINGS.legal || {};
  app.innerHTML = `
    <header class="site-header">
      <div class="wrap">
        <a href="#/" class="brand">
          <span class="logo-chip"><img src="logo.png" alt="شعار اتقان لخدمات الأعمال"></span>
          <span class="brand-text">اتقان<small>استشارات ودراسات وخطط أعمال</small></span>
        </a>
        <nav class="nav-links" id="navLinks">
          <a href="#/">الرئيسية</a>
          <a href="#/services">الخدمات</a>
          <a href="#/how-it-works">كيف نعمل</a>
          <a href="#/about">عن إتقان</a>
          <a href="#/faq">الأسئلة الشائعة</a>
          <a href="#/contact">تواصل معنا</a>
          <a href="#/request" class="btn btn-primary">استكشف الخدمات</a>
        </nav>
        <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="القائمة">
          <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round"/></svg>
        </button>
      </div>
    </header>
    <main>${content}</main>
    <footer class="site-footer">
      <div class="wrap">
        <div class="footer-grid">
          <div>
            <div class="footer-brand"><img src="logo.png" alt="اتقان"><span>اتقان لخدمات الأعمال</span></div>
            <p class="footer-desc">دراسات متخصصة، استشارات، إعادة هيكلة، وخطط تطوير أعمال — بعرض سعر واضح قبل أي التزام.</p>
            ${social.length ? `<div class="footer-social">${social.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.name)}">${esc(s.name)}</a>`).join("")}</div>` : ""}
          </div>
          <div class="footer-col">
            <h5>الخدمات</h5>
            ${svcLinks || `<a href="#/services">كل الخدمات</a>`}
          </div>
          <div class="footer-col">
            <h5>روابط</h5>
            <a href="#/how-it-works">كيف نعمل</a>
            <a href="#/about">عن إتقان</a>
            <a href="#/faq">الأسئلة الشائعة</a>
            <a href="#/track">تتبع طلبك</a>
          </div>
          <div class="footer-col">
            <h5>تواصل معنا</h5>
            <a href="mailto:${esc(SETTINGS.contactEmail || '')}">${esc(SETTINGS.contactEmail || '')}</a>
            <a href="https://wa.me/${esc(CFG.whatsappSupportNumber)}" target="_blank" rel="noopener">واتساب</a>
            ${legal.privacyUrl ? `<a href="${esc(legal.privacyUrl)}" target="_blank" rel="noopener">سياسة الخصوصية</a>` : ""}
            ${legal.termsUrl ? `<a href="${esc(legal.termsUrl)}" target="_blank" rel="noopener">الشروط والأحكام</a>` : ""}
          </div>
        </div>
        <div class="footer-bottom">© ${new Date().getFullYear()} اتقان لخدمات الأعمال. جميع الحقوق محفوظة.</div>
      </div>
    </footer>
    <a class="wa-float" href="https://wa.me/${esc(CFG.whatsappSupportNumber)}" target="_blank" rel="noopener" aria-label="تواصل معنا عبر واتساب" title="تواصل معنا عبر واتساب">
      <svg width="26" height="26" viewBox="0 0 32 32" fill="white"><path d="M16 3C9.4 3 4 8.4 4 15c0 2.4.7 4.6 1.9 6.5L4 29l7.7-1.9c1.8 1 3.9 1.5 6.3 1.5 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.8c-2 0-3.9-.6-5.5-1.6l-.4-.2-4.6 1.2 1.2-4.5-.3-.4C5.4 17.7 4.8 16.4 4.8 15c0-6.2 5-11.2 11.2-11.2S27.2 8.8 27.2 15 22.2 24.8 16 24.8zm6.1-8.4c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-2-1.8-2.3-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6-.1-.2-.8-1.9-1.1-2.6-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.8 5.1.8.3 1.4.6 1.9.7.8.3 1.5.2 2.1.1.6-.1 2-.8 2.3-1.6.3-.8.3-1.4.2-1.6-.1-.1-.3-.2-.6-.4z"/></svg>
    </a>
  `;
  document.getElementById("mobileMenuBtn")?.addEventListener("click", () => {
    document.getElementById("navLinks")?.classList.toggle("open");
  });
}

const serviceRow = (s) => `
  <a class="service-row" href="#/service/${esc(s.slug)}">
    <span class="row-icon">${ICONS[s.slug] || ""}</span>
    <span class="service-row-body">
      <h3 class="service-row-title">${esc(s.title)}</h3>
      <p class="service-row-desc">${esc(s.short_description)}</p>
      <span class="service-row-cta">تفاصيل الخدمة وما تشمله ←</span>
    </span>
  </a>`;

const packageCard = (k) => `
  <div class="pkg-card">
    ${icon(k.slug)}
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
  document.getElementById("navLinks")?.classList.remove("open");
  const [page, arg] = parts;
  if (!page) return renderHome();
  if (page === "services") return renderServices();
  if (page === "service") return renderService(arg);
  if (page === "packages") return renderPackages();
  if (page === "how-it-works") return renderHowItWorks();
  if (page === "about") return renderAbout();
  if (page === "faq") return renderFaqPage();
  if (page === "contact") return renderContact();
  if (page === "request") return renderRequestForm(params);
  if (page === "done") return renderDone(arg);
  if (page === "track") return renderTrack(arg);
  return renderHome();
}

// ---------------- Home ----------------
async function renderHome() {
  setMeta(
    "دراسات الجدوى واستشارات الأعمال في السعودية | إتقان",
    "دراسات متخصصة واستشارية، إعادة هيكلة، وخطط تطوير أعمال من اتقان لخدمات الأعمال. اطلب عرض سعر لمشروعك أو شركتك القائمة."
  );
  const eco = (SETTINGS.ecosystem || []).filter((e) => e.url);

  layout(`
    <section class="hero">
      <div class="wrap">
        <h1>قرارات أعمال أفضل تبدأ بتحليل واضح</h1>
        <p>دراسات واستشارات تساعدك على فهم السوق، تقييم المشروع، وتحليل الجدوى قبل اتخاذ القرار.</p>
        <div class="hero-actions">
          <a href="#/services" class="btn btn-primary">استكشف الخدمات</a>
          <a href="#/" class="btn btn-outline-light" id="seeMockupsBtn">شاهد نموذجاً من أعمالنا</a>
        </div>
        <div class="hero-illustration-wrap">${HERO_ILLUSTRATION}</div>
      </div>
    </section>

    <div class="wrap">
      <div class="section-heading" style="margin-top:44px;"><h2>اختر الخدمة التي تحتاجها</h2><a href="#/services" class="count">كل الخدمات ←</a></div>
      <div id="homeServices" class="service-index"><div class="loading">جارِ التحميل…</div></div>

      <div class="section-heading"><h2>ماذا تحصل عليه عند طلب الدراسة؟</h2></div>
      <div class="get-grid">
        ${["تحليل السوق","تحليل المنافسين","النموذج المالي","تقدير التكاليف","الإيرادات المتوقعة","نقطة التعادل","مؤشرات الجدوى","المخاطر","التوصيات"]
          .map((t) => `<div class="get-tile"><div class="g-icon">${ICONS["specialized-studies"]}</div>${esc(t)}</div>`).join("")}
      </div>

      <div class="section-heading" id="mockupsSection"><h2>شاهد نموذجاً من مخرجاتنا</h2></div>
      <p class="mockup-note">نماذج توضيحية لشكل التقرير وليست دراسة فعلية — لفهم طريقة العرض قبل الطلب.</p>
      <div class="mockup-grid">
        <div class="mockup-card">${MOCKUP_MARKET}<div class="mockup-caption">نموذج: صفحة تحليل السوق</div></div>
        <div class="mockup-card">${MOCKUP_FINANCE}<div class="mockup-caption">نموذج: التحليل المالي والرسوم البيانية</div></div>
        <div class="mockup-card">${MOCKUP_RECOMMEND}<div class="mockup-caption">نموذج: صفحة التوصيات</div></div>
      </div>

      <div class="section-heading"><h2>لماذا إتقان؟</h2></div>
      <div class="why-grid">
        <div class="why-card"><div class="icon-badge">${ICONS["advisory-studies"]}</div><h4>تحليل عملي</h4><p>نركز على المعلومات التي تساعدك في اتخاذ القرار.</p></div>
        <div class="why-card"><div class="icon-badge">${ICONS["restructuring"]}</div><h4>فهم للسوق السعودي</h4><p>نراعي بيئة الأعمال والسوق في المملكة.</p></div>
        <div class="why-card"><div class="icon-badge">${ICONS["specialized-studies"]}</div><h4>مخرجات واضحة</h4><p>الدراسة ليست مجرد صفحات؛ بل تحليل وتوصيات.</p></div>
        <div class="why-card"><div class="icon-badge">${ICONS["custom-corporate-services"]}</div><h4>حلول حسب احتياج المشروع</h4><p>يمكن تخصيص الخدمة حسب طبيعة المشروع وهدف العميل.</p></div>
      </div>

      <div class="section-heading"><h2>كيف تحصل على الخدمة؟</h2></div>
      <div class="steps">
        <div class="step"><div class="num">١</div><h4>اختر الخدمة</h4><p>تصفّح الخدمات واختر ما يناسب احتياجك، أو اطلب عرض سعر مباشرة.</p></div>
        <div class="step"><div class="num">٢</div><h4>أرسل بيانات مشروعك</h4><p>عرّفنا بمشروعك وهدفك من الخدمة.</p></div>
        <div class="step"><div class="num">٣</div><h4>نقوم بالتحليل والإعداد</h4><p>نتواصل معك لفهم النطاق، ويصلك عرض سعر واضح قبل البدء.</p></div>
        <div class="step"><div class="num">٤</div><h4>تستلم المخرجات</h4><p>بعد اعتماد السداد، يبدأ التنفيذ وتستلم دراستك إلكترونيًا.</p></div>
      </div>

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

      <div class="section-heading"><h2>أسئلة شائعة</h2></div>
      <div class="faq-section" id="faqSection">${FAQ.map((f, i) => `
        <div class="faq-item" data-i="${i}">
          <button class="faq-q">${esc(f.q)}<span class="plus">+</span></button>
          <div class="faq-a"><p>${esc(f.a)}</p></div>
        </div>`).join("")}</div>
    </div>

    <section class="cta-band">
      <h2>هل لديك مشروع وتحتاج إلى صورة أوضح قبل اتخاذ القرار؟</h2>
      <p>اختر الخدمة المناسبة وابدأ طلبك.</p>
      <a href="#/services" class="btn btn-primary">استكشف الخدمات</a>
    </section>
  `);

  document.getElementById("seeMockupsBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("mockupsSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const [services, packages] = await Promise.all([loadServices(), loadPackages()]);
  const sEl = document.getElementById("homeServices");
  const pEl = document.getElementById("homePackages");
  if (sEl) sEl.innerHTML = services.length ? services.map(serviceRow).join("") : `<div class="empty-state">قريبًا.</div>`;
  if (pEl) pEl.innerHTML = packages.length ? packages.map(packageCard).join("") : `<div class="empty-state">قريبًا.</div>`;

  document.getElementById("faqSection")?.querySelectorAll(".faq-item").forEach((item) => {
    item.querySelector(".faq-q").addEventListener("click", () => item.classList.toggle("open"));
  });
  injectSchema("faq-schema", {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });
}

function injectSchema(id, obj) {
  document.getElementById(id)?.remove();
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.id = id;
  s.textContent = JSON.stringify(obj);
  document.head.appendChild(s);
}

// ---------------- Services ----------------
async function renderServices() {
  setMeta("الخدمات | اتقان", "دراسات متخصصة واستشارية، إعادة هيكلة، خطط تطوير أعمال، وخدمات مخصصة للشركات القائمة.");
  layout(`
    <div class="wrap">
      <div class="section-heading" style="margin-top:40px;"><h2>خدماتنا</h2></div>
      <p class="note-muted">اختر ما يناسب احتياجك، أو اطلب عرض سعر وسيساعدك فريقنا في التحديد.</p>
      <div id="list" class="service-index"><div class="loading">جارِ التحميل…</div></div>
    </div>`);
  const services = await loadServices();
  document.getElementById("list").innerHTML = services.length
    ? services.map(serviceRow).join("")
    : `<div class="empty-state">لا توجد خدمات منشورة حاليًا.</div>`;
}

async function renderService(slug) {
  layout(`<div class="wrap"><div class="loading">جارِ التحميل…</div></div>`);
  const [{ data: s }, allServices] = await Promise.all([
    sb.from("services").select("*").eq("slug", slug).eq("status", "published").maybeSingle(),
    loadServices(),
  ]);
  if (!s) {
    layout(`<div class="wrap"><div class="empty-state" style="margin-top:40px;">هذه الخدمة غير متاحة. <a href="#/services">عودة للخدمات</a></div></div>`);
    return;
  }
  setMeta(`${s.title} | اتقان`, (s.short_description || "").slice(0, 155));

  const items = listItems(s);
  const related = allServices.filter((x) => x.slug !== s.slug).slice(0, 3);

  layout(`
    <div class="wrap">
      <div class="product-detail">
        <div>
          <div class="breadcrumb"><a href="#/">الرئيسية</a><span class="sep">/</span><a href="#/services">الخدمات</a><span class="sep">/</span>${esc(s.title)}</div>
          <span class="row-icon" style="display:inline-flex;width:44px;height:44px;">${ICONS[s.slug] || ""}</span>
          <h1 class="pd-title" style="margin-top:14px;">${esc(s.title)}</h1>
          <p class="service-lede">${esc(s.full_description || s.short_description)}</p>

          ${(s.target_customer || s.duration_note || s.requirements_note || s.delivery_note) ? `
            <div class="svc-meta">
              ${s.target_customer ? `<div class="svc-meta-item"><div class="k">لمن تناسب هذه الخدمة</div><div class="v">${esc(s.target_customer)}</div></div>` : ""}
              ${s.duration_note ? `<div class="svc-meta-item"><div class="k">مدة التنفيذ</div><div class="v">${esc(s.duration_note)}</div></div>` : ""}
              ${s.requirements_note ? `<div class="svc-meta-item"><div class="k">المتطلبات منك</div><div class="v">${esc(s.requirements_note)}</div></div>` : ""}
              ${s.delivery_note ? `<div class="svc-meta-item"><div class="k">طريقة التسليم</div><div class="v">${esc(s.delivery_note)}</div></div>` : ""}
            </div>` : ""}

          ${items.length ? `
            <div class="pd-block">
              <h4>ما تحصل عليه</h4>
              <div class="deliverables">${items.map((i) => `<div class="deliverable"><span class="tick">✓</span><span>${esc(i)}</span></div>`).join("")}</div>
            </div>` : ""}

          <div class="pd-block">
            <h4>كيف نبدأ معك</h4>
            <div class="mini-steps">
              <div class="mini-step"><span class="n">١</span><span>تطلب عرض سعر وتوضح لنا هدفك من هذه الخدمة.</span></div>
              <div class="mini-step"><span class="n">٢</span><span>نتواصل معك لفهم احتياجك بدقة ونحدد نطاق العمل المناسب.</span></div>
              <div class="mini-step"><span class="n">٣</span><span>يصلك عرض سعر واضح، وبعد موافقتك يبدأ التنفيذ فورًا.</span></div>
            </div>
          </div>

          ${related.length ? `
            <div class="pd-block">
              <h4>خدمات أخرى قد تهمك</h4>
              <div class="related-row">${related.map((r) => `<a class="related-chip" href="#/service/${esc(r.slug)}">${esc(r.title)}</a>`).join("")}</div>
            </div>` : ""}
        </div>
        <div class="buy-box">
          <h4 style="font-family:var(--font-display);margin:0 0 14px;">ابدأ بطلب عرض سعر</h4>
          <ul class="includes-check">
            <li>عرض سعر واضح قبل أي التزام</li>
            <li>نطاق عمل مخصص لاحتياجك</li>
            <li>لا يبدأ العمل إلا بعد موافقتك</li>
          </ul>
          <a class="btn btn-primary" href="#/request?service=${esc(s.slug)}">اطلب عرض سعر لهذه الخدمة</a>
        </div>
      </div>
    </div>`);

  injectSchema("service-schema", {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: s.title,
    name: s.title,
    description: s.short_description || s.full_description,
    provider: { "@type": "ProfessionalService", name: "اتقان لخدمات الأعمال", url: "https://store.itqanbs.sa/" },
    areaServed: "SA",
  });
}

// ---------------- Packages ----------------
async function renderPackages() {
  setMeta("الباقات | اتقان", "باقة التأسيس، باقة النمو والتوسع، وباقة الجاهزية للاستثمار والتمويل من اتقان لخدمات الأعمال.");
  layout(`
    <div class="wrap">
      <div class="section-heading" style="margin-top:40px;"><h2>الباقات</h2></div>
      <div class="distinguish-note">
        <b>الفرق بين الخدمات والباقات:</b> الخدمات توضح ماذا نقدّم بالتفصيل، أما الباقات فتجمع مجموعة خدمات متكاملة تناسب المرحلة التي تمر بها شركتك. لا توجد أسعار ثابتة؛ يُحدَّد العرض بعد فهم احتياجك ونطاق العمل.
      </div>
      <div id="list" class="pkg-grid"><div class="loading">جارِ التحميل…</div></div>
    </div>`);
  const packages = await loadPackages();
  document.getElementById("list").innerHTML = packages.length
    ? packages.map(packageCard).join("")
    : `<div class="empty-state">لا توجد باقات منشورة حاليًا.</div>`;
}

// ---------------- صفحات ثابتة (كيف نعمل / عن إتقان / الأسئلة الشائعة / تواصل معنا) ----------------
function renderHowItWorks() {
  setMeta("كيف نعمل | اتقان", "أربع خطوات بسيطة من طلب الخدمة حتى استلام المخرجات.");
  layout(`
    <div class="wrap">
      <div class="section-heading" style="margin-top:40px;"><h2>كيف تحصل على الخدمة؟</h2></div>
      <div class="steps">
        <div class="step"><div class="num">١</div><h4>اختر الخدمة</h4><p>تصفّح الخدمات واختر ما يناسب احتياجك، أو اطلب عرض سعر مباشرة.</p></div>
        <div class="step"><div class="num">٢</div><h4>أرسل بيانات مشروعك</h4><p>عرّفنا بمشروعك وهدفك من الخدمة.</p></div>
        <div class="step"><div class="num">٣</div><h4>نقوم بالتحليل والإعداد</h4><p>نتواصل معك لفهم النطاق، ويصلك عرض سعر واضح قبل البدء.</p></div>
        <div class="step"><div class="num">٤</div><h4>تستلم المخرجات</h4><p>بعد اعتماد السداد، يبدأ التنفيذ وتستلم دراستك إلكترونيًا.</p></div>
      </div>
      <div class="cta-band" style="margin-top:12px;">
        <h2>جاهز تبدأ؟</h2>
        <a href="#/services" class="btn btn-primary">استكشف الخدمات</a>
      </div>
    </div>`);
}

function renderAbout() {
  setMeta("عن إتقان | اتقان لخدمات الأعمال", "اتقان لخدمات الأعمال، دراسات واستشارات لأصحاب المشاريع والشركات القائمة في السعودية.");
  layout(`
    <div class="wrap">
      <div class="section-heading" style="margin-top:40px;"><h2>عن إتقان</h2></div>
      <p class="service-lede">اتقان لخدمات الأعمال تقدّم دراسات واستشارات لأصحاب المشاريع الجديدة والشركات القائمة في السوق السعودي، بهدف مساعدتهم على اتخاذ قرارات أعمال مبنية على تحليل واضح لا على تخمين.</p>
      <div class="why-grid">
        <div class="why-card"><div class="icon-badge">${ICONS["advisory-studies"]}</div><h4>تحليل عملي</h4><p>نركز على المعلومات التي تساعدك في اتخاذ القرار.</p></div>
        <div class="why-card"><div class="icon-badge">${ICONS["restructuring"]}</div><h4>فهم للسوق السعودي</h4><p>نراعي بيئة الأعمال والسوق في المملكة.</p></div>
        <div class="why-card"><div class="icon-badge">${ICONS["specialized-studies"]}</div><h4>مخرجات واضحة</h4><p>الدراسة ليست مجرد صفحات؛ بل تحليل وتوصيات.</p></div>
        <div class="why-card"><div class="icon-badge">${ICONS["custom-corporate-services"]}</div><h4>حلول حسب احتياج المشروع</h4><p>يمكن تخصيص الخدمة حسب طبيعة المشروع وهدف العميل.</p></div>
      </div>
      <a href="#/services" class="btn btn-primary btn-inline">استكشف الخدمات</a>
    </div>`);
}

function renderFaqPage() {
  setMeta("الأسئلة الشائعة | اتقان", "إجابات على أكثر الأسئلة شيوعًا حول خدمات اتقان وطريقة الطلب والتسليم.");
  layout(`
    <div class="wrap">
      <div class="section-heading" style="margin-top:40px;"><h2>الأسئلة الشائعة</h2></div>
      <div class="faq-section" id="faqSection">${FAQ.map((f, i) => `
        <div class="faq-item" data-i="${i}">
          <button class="faq-q">${esc(f.q)}<span class="plus">+</span></button>
          <div class="faq-a"><p>${esc(f.a)}</p></div>
        </div>`).join("")}</div>
    </div>`);
  document.getElementById("faqSection")?.querySelectorAll(".faq-item").forEach((item) => {
    item.querySelector(".faq-q").addEventListener("click", () => item.classList.toggle("open"));
  });
  injectSchema("faq-schema", {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  });
}

function renderContact() {
  setMeta("تواصل معنا | اتقان", "تواصل مع فريق اتقان لخدمات الأعمال عبر واتساب أو البريد الإلكتروني، أو أرسل طلب عرض سعر مباشرة.");
  const social = SETTINGS.social || [];
  layout(`
    <div class="center-page">
      <h2 style="font-family:var(--font-display);">تواصل معنا</h2>
      <p style="color:var(--slate);">تواصل مع فريق اتقان مباشرة، أو أرسل طلبك وسنتواصل معك.</p>
      <div class="hero-actions" style="justify-content:center;margin-top:18px;">
        <a href="https://wa.me/${esc(CFG.whatsappSupportNumber)}" target="_blank" rel="noopener" class="btn btn-primary">تواصل عبر واتساب</a>
        <a href="mailto:${esc(SETTINGS.contactEmail || '')}" class="btn btn-outline-light">${esc(SETTINGS.contactEmail || '')}</a>
      </div>
      <a href="#/request" class="btn btn-ghost btn-inline" style="margin-top:14px;">أو أرسل طلب عرض سعر مباشرة</a>
      ${social.length ? `<div class="footer-social" style="justify-content:center;margin-top:28px;">${social.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join("")}</div>` : ""}
    </div>`);
}


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
