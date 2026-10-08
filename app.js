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

// ---------------- السلة ----------------
function loadCart() {
  try { return JSON.parse(localStorage.getItem("itqan_cart") || "[]"); } catch (_) { return []; }
}
let CART = loadCart();
function saveCart() {
  try { localStorage.setItem("itqan_cart", JSON.stringify(CART)); } catch (_) {}
  updateCartBadge();
}
function addToCart(service) {
  if (CART.some((i) => i.id === service.id)) return false;
  CART.push({ id: service.id, slug: service.slug, title: service.title });
  saveCart();
  return true;
}
function removeFromCart(id) {
  CART = CART.filter((i) => i.id !== id);
  saveCart();
}
function updateCartBadge() {
  const el = document.getElementById("cartCount");
  if (!el) return;
  if (CART.length) { el.textContent = CART.length; el.style.display = "inline-flex"; }
  else { el.style.display = "none"; }
}

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
  "business-valuation": `<svg viewBox="0 0 24 24"><path d="M12 3v18M5 7h14" stroke-linecap="round"/><path d="M5 7l-3 6a3 3 0 0 0 6 0L5 7ZM19 7l-3 6a3 3 0 0 0 6 0l-3-6Z" stroke-linejoin="round"/><path d="M8 21h8" stroke-linecap="round"/></svg>`,
  "family-business": `<svg viewBox="0 0 24 24"><circle cx="8" cy="7" r="2.5"/><circle cx="16" cy="7" r="2.5"/><circle cx="12" cy="13" r="2"/><path d="M3.5 20c0-3 2-5 4.5-5M20.5 20c0-3-2-5-4.5-5M8.5 20c0-2 1.6-3.5 3.5-3.5s3.5 1.5 3.5 3.5" stroke-linecap="round"/></svg>`,
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
  { q: "هل تقدمون تقييمًا للشركات العائلية؟", a: "نعم. نقدّم تقييمًا مستقلًا للشركات والشركات العائلية لأغراض مثل توزيع الحصص بين الورثة أو الشركاء، دخول شريك أو مستثمر، التخارج، أو إعادة الهيكلة، مع مراعاة خصوصية العلاقات العائلية وسرية البيانات." },
  { q: "خدمتي غير موجودة ضمن القائمة، ماذا أفعل؟", a: "استخدم خدمة \"خدمات مخصصة للشركات القائمة\"، أو اذكر احتياجك بالتفصيل عند إرسال طلب عرض السعر وسنتواصل معك." },
];

const LOAD_ERR = `<div class="notice error">تعذّر تحميل المحتوى. حدّث الصفحة أو تواصل معنا عبر واتساب.</div>`;

// خطوات العمل — مصدر واحد تستخدمه الرئيسية وصفحة "كيف نعمل"
const STEPS_HTML = `
  <div class="steps">
    <div class="step"><div class="num">١</div><h4>اختر الخدمة</h4><p>تصفّح الخدمات وأضف ما يناسبك لقائمة طلبك، أو اطلب عرض سعر مباشرة.</p></div>
    <div class="step"><div class="num">٢</div><h4>أرسل بيانات مشروعك</h4><p>عرّفنا بمشروعك وهدفك من الخدمة.</p></div>
    <div class="step"><div class="num">٣</div><h4>يصلك عرض سعر واضح</h4><p>نتواصل معك لفهم النطاق، ثم يصلك عرض سعر قبل أي التزام.</p></div>
    <div class="step"><div class="num">٤</div><h4>تستلم المخرجات</h4><p>بعد اعتماد السداد يبدأ التنفيذ وتستلم المخرجات إلكترونيًا.</p></div>
  </div>`;

const faqHtml = () => `<div class="faq-section" id="faqSection">${FAQ.map((f, i) => `
  <div class="faq-item" data-i="${i}">
    <button class="faq-q">${esc(f.q)}<span class="plus">+</span></button>
    <div class="faq-a"><p>${esc(f.a)}</p></div>
  </div>`).join("")}</div>`;

function wireFaq() {
  document.getElementById("faqSection")?.querySelectorAll(".faq-item").forEach((item) => {
    item.querySelector(".faq-q").addEventListener("click", () => item.classList.toggle("open"));
  });
  injectSchema("faq-schema", {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  });
}

const priceFrom = (s) => (s.price_from ? `<div class="price-from">تبدأ من <b>${money(s.price_from)}</b></div>` : "");

let SERVICES_CACHE = null;
let PACKAGES_CACHE = null;
async function loadServices() {
  if (SERVICES_CACHE) return SERVICES_CACHE;
  const { data, error } = await sb.from("services").select("*").eq("status", "published").order("sort_order").order("created_at");
  if (error) { console.error(error); return null; }
  SERVICES_CACHE = data || [];
  return SERVICES_CACHE;
}
async function loadPackages() {
  if (PACKAGES_CACHE) return PACKAGES_CACHE;
  const { data, error } = await sb.from("packages").select("*").eq("status", "published").order("sort_order").order("created_at");
  if (error) { console.error(error); return null; }
  PACKAGES_CACHE = data || [];
  return PACKAGES_CACHE;
}

function layout(content) {
  const svcLinks = (SERVICES_CACHE || []).slice(0, 5)
    .map((s) => `<a href="#/service/${esc(s.slug)}">${esc(s.title)}</a>`).join("");
  const social = SETTINGS.social || [];
  const legal = SETTINGS.legal || {};
  const eco = (SETTINGS.ecosystem || []).filter((e) => e.url);
  app.innerHTML = `
    <header class="site-header">
      <div class="wrap">
        <a href="#/" class="brand">
          <span class="logo-chip"><img src="logo.png" alt="شعار اتقان لخدمات الأعمال"></span>
          <span class="brand-text">متجر اتقان<small>استشارات ودراسات وخطط أعمال</small></span>
        </a>
        <nav class="nav-links" id="navLinks">
          <a href="#/">الرئيسية</a>
          <a href="#/services">الخدمات</a>
          <a href="#/packages">ابدأ حسب وضعك</a>
          <a href="#/how-it-works">كيف نعمل</a>
          <a href="#/about">عن إتقان</a>
          <a href="#/contact">تواصل معنا</a>
          <a href="#/request" class="btn btn-primary">اطلب عرض سعر</a>
          <a href="#/cart" class="cart-link" aria-label="قائمة طلبي" title="قائمة طلبي">
            <svg viewBox="0 0 24 24"><path d="M4 6h2l2 11h10l2-8H7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>
            <span class="cart-badge" id="cartCount" style="display:none;">0</span>
          </a>
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
            <a href="#/packages">ابدأ حسب وضعك</a>
            <a href="#/about">عن إتقان</a>
            <a href="#/faq">الأسئلة الشائعة</a>
            <a href="#/track">تتبع طلبك</a>
          </div>
          <div class="footer-col">
            <h5>منظومة اتقان</h5>
            ${SETTINGS.mainSiteUrl ? `<a href="${esc(SETTINGS.mainSiteUrl)}" target="_blank" rel="noopener">الموقع الرئيسي</a>` : ""}
            ${eco.map((e) => `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.name)}</a>`).join("")}
          </div>
          <div class="footer-col">
            <h5>تواصل معنا</h5>
            <a href="mailto:${esc(SETTINGS.contactEmail || '')}">${esc(SETTINGS.contactEmail || '')}</a>
            <a href="https://wa.me/${esc(CFG.whatsappSupportNumber)}" target="_blank" rel="noopener">واتساب</a>
            ${legal.privacyUrl ? `<a href="${esc(legal.privacyUrl)}" target="_blank" rel="noopener">سياسة الخصوصية</a>` : ""}
            ${legal.termsUrl ? `<a href="${esc(legal.termsUrl)}" target="_blank" rel="noopener">الشروط والأحكام</a>` : ""}
          </div>
        </div>
        <div class="footer-bottom">
          © ${new Date().getFullYear()} اتقان لخدمات الأعمال. جميع الحقوق محفوظة.
          ${SETTINGS.crNumber ? ` · سجل تجاري: ${esc(SETTINGS.crNumber)}` : ""}
          ${SETTINGS.vatNumber ? ` · الرقم الضريبي: ${esc(SETTINGS.vatNumber)}` : ""}
          ${SETTINGS.businessCenterUrl ? ` · <a href="${esc(SETTINGS.businessCenterUrl)}" target="_blank" rel="noopener">موثّق في المركز السعودي للأعمال</a>` : ""}
        </div>
      </div>
    </footer>
    <a class="wa-float" href="https://wa.me/${esc(CFG.whatsappSupportNumber)}" target="_blank" rel="noopener" aria-label="تواصل معنا عبر واتساب" title="تواصل معنا عبر واتساب">
      <svg width="26" height="26" viewBox="0 0 32 32" fill="white"><path d="M16 3C9.4 3 4 8.4 4 15c0 2.4.7 4.6 1.9 6.5L4 29l7.7-1.9c1.8 1 3.9 1.5 6.3 1.5 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.8c-2 0-3.9-.6-5.5-1.6l-.4-.2-4.6 1.2 1.2-4.5-.3-.4C5.4 17.7 4.8 16.4 4.8 15c0-6.2 5-11.2 11.2-11.2S27.2 8.8 27.2 15 22.2 24.8 16 24.8zm6.1-8.4c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-2-1.8-2.3-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6-.1-.2-.8-1.9-1.1-2.6-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.8 5.1.8.3 1.4.6 1.9.7.8.3 1.5.2 2.1.1.6-.1 2-.8 2.3-1.6.3-.8.3-1.4.2-1.6-.1-.1-.3-.2-.6-.4z"/></svg>
    </a>
  `;
  document.getElementById("mobileMenuBtn")?.addEventListener("click", () => {
    document.getElementById("navLinks")?.classList.toggle("open");
  });
  updateCartBadge();
}

const serviceTile = (s) => `
  <div class="shop-tile" data-id="${esc(s.id)}">
    <a href="#/service/${esc(s.slug)}" class="shop-tile-link">
      <div class="shop-tile-top"><span class="row-icon">${ICONS[s.slug] || ""}</span></div>
      <div class="shop-tile-body">
        <h3 class="service-row-title">${esc(s.title)}</h3>
        <p class="service-row-desc">${esc(s.short_description)}</p>
        ${priceFrom(s)}
      </div>
    </a>
    <div class="shop-tile-actions">
      <a href="#/service/${esc(s.slug)}" class="shop-tile-cta">التفاصيل ←</a>
      <button class="add-cart-btn" data-add="${esc(s.id)}" data-title="${esc(s.title)}" data-slug="${esc(s.slug)}">+ أضف للطلب</button>
    </div>
  </div>`;

function wireAddToCartButtons(container) {
  container.querySelectorAll(".add-cart-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ok = addToCart({ id: btn.dataset.add, slug: btn.dataset.slug, title: btn.dataset.title });
      btn.textContent = ok ? "أُضيفت لطلبك ✓" : "موجودة في طلبك ✓";
      btn.disabled = true;
    });
  });
}

// "ابدأ حسب وضعك": كل مرحلة تشير إلى خدمات فعلية (service_slugs) بدل منتج موازٍ
const stageServices = (k) => {
  const all = SERVICES_CACHE || [];
  const slugs = Array.isArray(k.service_slugs) ? k.service_slugs : [];
  return slugs.map((sl) => all.find((x) => x.slug === sl)).filter(Boolean);
};
const packageCard = (k) => {
  const svcs = stageServices(k);
  return `
  <div class="pkg-card">
    ${icon(k.slug)}
    <h3>${esc(k.title)}</h3>
    <p class="pkg-sub">${esc(k.short_description)}</p>
    ${k.audience ? `<div class="pkg-aud"><b>إذا كنت:</b> ${esc(k.audience)}</div>` : ""}
    ${svcs.length ? `
      <div class="stage-label">الخدمات المقترحة لك</div>
      <div class="stage-svcs">
        ${svcs.map((x) => `<a href="#/service/${esc(x.slug)}" class="stage-svc"><span class="tick">✓</span>${esc(x.title)}</a>`).join("")}
        ${listItems(k).map((i) => `<div class="stage-svc stage-extra"><span class="tick">✓</span>${esc(i)}</div>`).join("")}
      </div>`
    : `<ul class="contents-list">${listItems(k).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`}
    ${svcs.length
      ? `<button class="btn btn-primary stage-btn" data-stage="${esc(k.slug)}">اطلب هذه الخدمات معًا</button>
         <small class="stage-hint">تُضاف لقائمة طلبك ويمكنك حذف أو إضافة ما تشاء قبل الإرسال.</small>`
      : `<a class="btn btn-primary" href="#/request?package=${esc(k.slug)}">اطلب عرض سعر</a>`}
  </div>`;
};

function wireStageButtons(container, packages) {
  container.querySelectorAll(".stage-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const k = packages.find((p) => p.slug === btn.dataset.stage);
      if (!k) return;
      stageServices(k).forEach((x) => addToCart({ id: x.id, slug: x.slug, title: x.title }));
      const extras = listItems(k);
      const label = k.title + (extras.length ? ` — يشمل أيضًا: ${extras.join("، ")}` : "");
      try { sessionStorage.setItem("itqan_stage", label); } catch (_) {}
      location.hash = "#/cart";
    });
  });
}

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
  if (page === "cart") return renderCart();
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

  layout(`
    <section class="hero">
      <div class="wrap">
        <h1>قرارات أعمال أفضل تبدأ بتحليل واضح</h1>
        <p>دراسات واستشارات تساعدك على فهم السوق، تقييم المشروع، وتحليل الجدوى قبل اتخاذ القرار.</p>
        <div class="hero-actions">
          <a href="#/services" class="btn btn-primary">تصفح الخدمات</a>
          <a href="#/service/business-valuation" class="btn btn-outline-light">تقييم الشركات العائلية</a>
        </div>
      </div>
    </section>

    <div class="wrap">
      <div class="section-heading" style="margin-top:36px;"><h2>خدماتنا</h2><a href="#/services" class="count">عرض الكل ←</a></div>
      <div id="homeServices" class="shop-grid"><div class="loading">جارِ التحميل…</div></div>

      <div class="section-heading"><h2>لا تعرف من أين تبدأ؟ ابدأ حسب وضعك</h2><a href="#/packages" class="count">التفاصيل ←</a></div>
      <p class="note-muted">اختر الوضع الأقرب لك، وسنقترح عليك الخدمات المناسبة لمرحلتك.</p>
      <div id="homePackages" class="pkg-grid"><div class="loading">جارِ التحميل…</div></div>

      <div class="section-heading"><h2>مثال: ماذا تتضمن دراسة الجدوى؟</h2></div>
      <p class="note-muted">لكل خدمة مخرجاتها الخاصة الموضحة في صفحتها؛ هذا مثال لما تشمله دراسة الجدوى عادةً.</p>
      <div class="get-panel">
        <div class="get-list">
          ${["تحليل السوق","تحليل المنافسين","النموذج المالي","تقدير التكاليف","الإيرادات المتوقعة","نقطة التعادل","مؤشرات الجدوى","المخاطر","التوصيات"]
            .map((t) => `<div class="get-item"><span class="tick">✓</span>${esc(t)}</div>`).join("")}
        </div>
      </div>

      <div class="trust-bar">
        <div class="trust-bar-text">
          <b>اتقان لخدمات الأعمال</b> — تأسست عام ${esc(SETTINGS.founded?.year || "")}، ${esc(SETTINGS.founded?.note || "")}.
        </div>
        ${SETTINGS.mainSiteUrl ? `<a href="${esc(SETTINGS.mainSiteUrl)}" target="_blank" rel="noopener" class="trust-bar-link">تعرّف على اتقان ←</a>` : ""}
      </div>

      <div class="section-heading"><h2>كيف تحصل على الخدمة؟</h2></div>
      ${STEPS_HTML}

      <div class="section-heading"><h2>أسئلة شائعة</h2></div>
      ${faqHtml()}
    </div>

    <section class="cta-band">
      <h2>هل لديك مشروع وتحتاج إلى صورة أوضح قبل اتخاذ القرار؟</h2>
      <p>اختر الخدمة المناسبة وابدأ طلبك.</p>
      <a href="#/request" class="btn btn-primary">اطلب عرض سعر</a>
    </section>
  `);


  const [services, packages] = await Promise.all([loadServices(), loadPackages()]);
  const sEl = document.getElementById("homeServices");
  const pEl = document.getElementById("homePackages");
  if (sEl) sEl.innerHTML = !services ? LOAD_ERR : services.length ? services.map(serviceTile).join("") : `<div class="empty-state">قريبًا.</div>`;
  if (pEl) pEl.innerHTML = !packages ? LOAD_ERR : packages.length ? packages.map(packageCard).join("") : `<div class="empty-state">قريبًا.</div>`;
  if (sEl) wireAddToCartButtons(sEl);
  if (pEl && packages) wireStageButtons(pEl, packages);
  wireFaq();
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
  setMeta("الخدمات | اتقان", "دراسات متخصصة واستشارية، تقييم الشركات والشركات العائلية، إعادة هيكلة، خطط تطوير أعمال، وخدمات مخصصة للشركات القائمة.");
  layout(`
    <div class="wrap">
      <div class="section-heading" style="margin-top:40px;"><h2>الخدمات</h2></div>
      <p class="note-muted">اختر الخدمة، واطلبها مباشرة — سيصلك عرض سعر واضح قبل أي التزام.</p>
      <div id="list" class="shop-grid"><div class="loading">جارِ التحميل…</div></div>
    </div>`);
  const services = await loadServices();
  const listEl = document.getElementById("list");
  listEl.innerHTML = !services ? LOAD_ERR : services.length
    ? services.map(serviceTile).join("")
    : `<div class="empty-state">لا توجد خدمات منشورة حاليًا.</div>`;
  wireAddToCartButtons(listEl);
}

async function renderService(slug) {
  layout(`<div class="wrap"><div class="loading">جارِ التحميل…</div></div>`);
  const [{ data: s }, allServices] = await Promise.all([
    sb.from("services").select("*").eq("slug", slug).eq("status", "published").maybeSingle(),
    loadServices().then((x) => x || []),
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
          ${priceFrom(s)}
          <ul class="includes-check">
            <li>عرض سعر واضح قبل أي التزام</li>
            <li>نطاق عمل مخصص لاحتياجك</li>
            <li>لا يبدأ العمل إلا بعد موافقتك</li>
          </ul>
          <a href="#/request?service=${esc(s.slug)}" class="btn btn-primary" style="display:block;text-align:center;">اطلب عرض سعر لهذه الخدمة</a>
          <button class="btn btn-ghost" id="detailAddCartBtn" style="width:100%;margin-top:10px;" data-add="${esc(s.id)}" data-title="${esc(s.title)}" data-slug="${esc(s.slug)}">+ أضفها لطلب يضم عدة خدمات</button>
          <a href="#/cart" style="display:block;text-align:center;margin-top:10px;font-size:13px;color:var(--slate);">عرض قائمة طلبي</a>
        </div>
      </div>
    </div>`);

  document.getElementById("detailAddCartBtn")?.addEventListener("click", (e) => {
    const btn = e.target;
    const ok = addToCart({ id: btn.dataset.add, slug: btn.dataset.slug, title: btn.dataset.title });
    btn.textContent = ok ? "أُضيفت لقائمة طلبك ✓" : "موجودة في قائمة طلبك ✓";
    btn.disabled = true;
  });

  injectSchema("service-schema", {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: s.title,
    name: s.title,
    description: s.short_description || s.full_description,
    provider: { "@type": "ProfessionalService", name: "اتقان لخدمات الأعمال", url: "https://store.itqanbs.sa/" },
    areaServed: "SA",
    ...(s.price_from ? { offers: { "@type": "Offer", priceCurrency: "SAR", price: s.price_from } } : {}),
  });
}

// ---------------- Packages ----------------
async function renderPackages() {
  setMeta("ابدأ حسب وضعك | اتقان", "مشروع جديد، شركة قائمة تريد النمو، شركة تستعد لمستثمر أو تمويل، أو شركة عائلية — اختر وضعك ونقترح لك الخدمات المناسبة.");
  layout(`
    <div class="wrap">
      <div class="section-heading" style="margin-top:40px;"><h2>ابدأ حسب وضعك</h2></div>
      <div class="distinguish-note">
        اختر الوضع الأقرب لشركتك، وسنقترح عليك الخدمات المناسبة لهذه المرحلة. يمكنك طلبها معًا، أو فتح أي خدمة لمعرفة تفاصيلها، ويصلك عرض سعر واحد بعد فهم احتياجك.
      </div>
      <div id="list" class="pkg-grid"><div class="loading">جارِ التحميل…</div></div>
    </div>`);
  const [, packages] = await Promise.all([loadServices(), loadPackages()]);
  const el = document.getElementById("list");
  el.innerHTML = !packages ? LOAD_ERR : packages.length
    ? packages.map(packageCard).join("")
    : `<div class="empty-state">لا توجد مراحل منشورة حاليًا.</div>`;
  if (packages) wireStageButtons(el, packages);
}

// ---------------- صفحات ثابتة (كيف نعمل / عن إتقان / الأسئلة الشائعة / تواصل معنا) ----------------
function renderHowItWorks() {
  setMeta("كيف نعمل | اتقان", "أربع خطوات بسيطة من طلب الخدمة حتى استلام المخرجات.");
  layout(`
    <div class="wrap">
      <div class="section-heading" style="margin-top:40px;"><h2>كيف تحصل على الخدمة؟</h2></div>
      ${STEPS_HTML}
      <div class="cta-band" style="margin-top:12px;">
        <h2>جاهز تبدأ؟</h2>
        <a href="#/request" class="btn btn-primary">اطلب عرض سعر</a>
      </div>
    </div>`);
}

function renderAbout() {
  setMeta("عن إتقان | اتقان لخدمات الأعمال", "اتقان لخدمات الأعمال، شركة سعودية تأسست عام 2024، تقدّم دراسات واستشارات لأصحاب المشاريع والشركات القائمة.");
  layout(`
    <div class="wrap">
      <div class="section-heading" style="margin-top:40px;"><h2>عن إتقان</h2></div>
      <p class="service-lede">اتقان لخدمات الأعمال — شركة سعودية تأسست عام ${esc(SETTINGS.founded?.year || "2024")}، تقدّم دراسات واستشارات لأصحاب المشاريع الجديدة والشركات القائمة في السوق السعودي، بهدف مساعدتهم على اتخاذ قرارات أعمال مبنية على تحليل واضح لا على تخمين. ومن خدماتنا تقييم الشركات والشركات العائلية بحياد وسرية تامة.</p>
      ${(SETTINGS.crNumber || SETTINGS.vatNumber) ? `<p class="note-muted">${SETTINGS.crNumber ? `سجل تجاري: ${esc(SETTINGS.crNumber)}` : ""}${SETTINGS.crNumber && SETTINGS.vatNumber ? " · " : ""}${SETTINGS.vatNumber ? `الرقم الضريبي: ${esc(SETTINGS.vatNumber)}` : ""}</p>` : ""}
      <div class="why-grid">
        <div class="why-card"><div class="icon-badge">${ICONS["advisory-studies"]}</div><h4>تحليل عملي</h4><p>نركز على المعلومات التي تساعدك في اتخاذ القرار.</p></div>
        <div class="why-card"><div class="icon-badge">${ICONS["restructuring"]}</div><h4>فهم للسوق السعودي</h4><p>نراعي بيئة الأعمال والسوق في المملكة.</p></div>
        <div class="why-card"><div class="icon-badge">${ICONS["specialized-studies"]}</div><h4>مخرجات واضحة</h4><p>الدراسة ليست مجرد صفحات؛ بل تحليل وتوصيات.</p></div>
        <div class="why-card"><div class="icon-badge">${ICONS["custom-corporate-services"]}</div><h4>حلول حسب احتياج المشروع</h4><p>يمكن تخصيص الخدمة حسب طبيعة المشروع وهدف العميل.</p></div>
      </div>
      <div class="hero-actions">
        <a href="#/services" class="btn btn-primary">تصفح الخدمات</a>
        ${SETTINGS.mainSiteUrl ? `<a href="${esc(SETTINGS.mainSiteUrl)}" target="_blank" rel="noopener" class="btn btn-outline-light" style="color:var(--ink);border-color:var(--ink);">الموقع الرئيسي لاتقان ←</a>` : ""}
      </div>
    </div>`);
}

function renderFaqPage() {
  setMeta("الأسئلة الشائعة | اتقان", "إجابات على أكثر الأسئلة شيوعًا حول خدمات اتقان وطريقة الطلب والتسليم.");
  layout(`
    <div class="wrap">
      <div class="section-heading" style="margin-top:40px;"><h2>الأسئلة الشائعة</h2></div>
      ${faqHtml()}
    </div>`);
  wireFaq();
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
        <a href="mailto:${esc(SETTINGS.contactEmail || '')}" class="btn btn-outline-light" style="color:var(--ink);border-color:var(--ink);">${esc(SETTINGS.contactEmail || '')}</a>
      </div>
      <a href="#/request" class="btn btn-ghost btn-inline" style="margin-top:14px;">أو أرسل طلب عرض سعر مباشرة</a>
      ${social.length ? `<div class="footer-social" style="justify-content:center;margin-top:28px;">${social.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join("")}</div>` : ""}
    </div>`);
}


async function renderRequestForm(params) {
  setMeta("اطلب عرض سعر | اتقان", "أرسل طلبك وسيتواصل معك فريق اتقان بعرض سعر واضح.");
  layout(`<div class="wrap"><div class="loading">جارِ التحميل…</div></div>`);

  const [services, packages] = (await Promise.all([loadServices(), loadPackages()])).map((x) => x || []);
  const preService = params.get("service");
  const prePackage = params.get("package");
  const cartMode = !prePackage && !preService && CART.length > 0;
  const opt = (v, label, sel) => `<option value="${esc(v)}" ${sel ? "selected" : ""}>${esc(label)}</option>`;

  layout(`
    <div class="form-page wide">
      <h2>اطلب عرض سعر</h2>
      <div class="sub">أخبرنا عن مشروعك وسنتواصل معك. لا يُطلب منك أي دفع الآن.</div>

      ${cartMode ? `
        <div class="summary-box" style="margin-bottom:22px;">
          <div style="font-weight:600;margin-bottom:8px;">طلبك يشمل:</div>
          ${CART.map((i) => `<div class="summary-row"><span>${esc(i.title)}</span><a href="#/cart" style="color:var(--alert);font-size:12.5px;">إزالة</a></div>`).join("")}
        </div>` : ""}

      <div id="formMsg"></div>
      <form id="requestForm">
        <div class="hp-field"><label>الموقع <input name="website" tabindex="-1" autocomplete="off"></label></div>

        <div class="form-row-2">
          <div class="field"><label>الاسم الكامل <span class="req">*</span></label><input required name="full_name"></div>
          <div class="field"><label>رقم الجوال <span class="req">*</span></label><input required name="phone" type="tel" inputmode="tel" placeholder="05xxxxxxxx" pattern="(\+?966|0)?5[0-9]{8}" title="أدخل رقم جوال سعودي صحيح مثل 05xxxxxxxx"></div>
        </div>
        <div class="form-row-2">
          <div class="field"><label>البريد الإلكتروني <span class="req">*</span></label><input required name="email" type="email"></div>
          <div class="field"><label>اسم المنشأة (اختياري)</label><input name="company_name"></div>
        </div>

        ${cartMode ? "" : `
        <div class="form-row-2" style="grid-template-columns:1fr;">
          <div class="field"><label>الخدمة المطلوبة (اختياري)</label>
            <select name="service_id">
              <option value="">— لم أحدد —</option>
              ${services.map((s) => opt(s.id, s.title, s.slug === preService)).join("")}
            </select>
          </div>
          ${prePackage ? `<input type="hidden" name="package_id" value="${esc((packages.find((k) => k.slug === prePackage) || {}).id || "")}">` : ""}
        </div>`}

        <div class="form-row-2">
          <div class="field"><label>وضع نشاطك</label>
            <select name="business_stage">
              <option value="">— اختر —</option>
              ${["فكرة / مشروع جديد", "شركة قائمة", "شركة عائلية", "مستثمر", "أخرى"].map((x) => opt(x, x)).join("")}
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

    const basePayload = {
      p_full_name: fd.get("full_name"),
      p_phone: fd.get("phone"),
      p_email: fd.get("email"),
      p_company_name: fd.get("company_name") || null,
      p_business_stage: fd.get("business_stage") || null,
      p_business_size: fd.get("business_size") || null,
      p_goal: fd.get("goal"),
      p_budget_range: fd.get("budget_range") || null,
      p_message: (() => {
        let st = null; try { st = sessionStorage.getItem("itqan_stage"); } catch (_) {}
        const m = fd.get("message") || "";
        return (cartMode && st ? `[المسار المختار: ${st}]\n` : "") + m || null;
      })(),
      p_source: sessionStorage.getItem("itqan_src") || "store",
    };

    const { data, error } = cartMode
      ? await sb.rpc("create_service_request_cart", { ...basePayload, p_service_ids: CART.map((i) => i.id) })
      : await sb.rpc("create_service_request", { ...basePayload, p_service_id: fd.get("service_id") || null, p_package_id: fd.get("package_id") || null });

    if (error || !data || !data.length) {
      document.getElementById("formMsg").innerHTML = `<div class="notice error">تعذّر إرسال الطلب. تأكد من البيانات وحاول مرة أخرى، أو تواصل معنا عبر واتساب.</div>`;
      btn.disabled = false; btn.textContent = "إرسال الطلب";
      return;
    }

    const row = data[0];
    sessionStorage.setItem("itqan_last_email", fd.get("email"));
    if (cartMode) { CART = []; saveCart(); try { sessionStorage.removeItem("itqan_stage"); } catch (_) {} }
    sb.functions.invoke("send-order-email", { body: { request_id: row.out_request_id, event: "request_received" } }).catch(() => {});
    location.hash = `#/done/${encodeURIComponent(row.out_request_number)}`;
  });
}

function renderCart() {
  setMeta("قائمة طلبي | اتقان", "الخدمات التي اخترتها قبل إرسال طلب عرض السعر.");
  layout(`
    <div class="wrap">
      <div class="section-heading" style="margin-top:40px;"><h2>قائمة طلبي</h2></div>
      <p class="note-muted">اجمع الخدمات التي تحتاجها في طلب واحد، وسيصلك عرض سعر واحد يشملها. لا دفع الآن.</p>
      <div id="cartWrap"></div>
    </div>`);

  function draw() {
    const wrap = document.getElementById("cartWrap");
    if (!CART.length) {
      wrap.innerHTML = `<div class="empty-state">قائمة طلبك فارغة. <a href="#/services">تصفح الخدمات</a></div>`;
      return;
    }
    let st = null; try { st = sessionStorage.getItem("itqan_stage"); } catch (_) {}
    wrap.innerHTML = `
      ${st ? `<div class="notice" style="margin-bottom:12px;">المسار المختار: ${esc(st)}</div>` : ""}
      <div class="summary-box" style="margin-bottom:20px;">
        ${CART.map((i) => `
          <div class="summary-row">
            <span>${esc(i.title)}</span>
            <button class="btn btn-ghost" data-remove="${esc(i.id)}" style="width:auto;padding:6px 14px;font-size:12.5px;">إزالة</button>
          </div>`).join("")}
      </div>
      <a href="#/request" class="btn btn-primary btn-inline">اطلب عرض سعر (${CART.length} خدمة)</a>
      <a href="#/services" class="btn btn-ghost btn-inline" style="margin-right:10px;">إضافة خدمة أخرى</a>
    `;
    wrap.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => { removeFromCart(b.dataset.remove); draw(); }));
  }
  draw();
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
        <small>صورة أو ملف PDF لإيصال التحويل (حتى 10 ميجابايت)</small>
      </div>
      <button class="btn btn-primary" type="submit">إرسال إثبات السداد</button>
    </form>`;
}

function renderResult(row, email) {
  const el = document.getElementById("result");
  const st = row.out_status;
  const cartTitles = (row.out_items || []).map((i) => i.title).filter(Boolean);
  const what = [row.out_service_title, row.out_package_title, ...cartTitles].filter(Boolean).join("، ") || "طلب استشارة";
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
    if (!file || file.size > 10 * 1024 * 1024) {
      document.getElementById("payMsg").innerHTML = `<div class="notice error">حجم الملف يجب ألا يتجاوز 10 ميجابايت.</div>`;
      btn.disabled = false; btn.textContent = "إرسال إثبات السداد";
      return;
    }
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
