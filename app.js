// ============================================================
// متجر اتقان — منطق الواجهة (Vanilla JS + Supabase)
// ============================================================
const { createClient } = supabase;
const sb = createClient(window.ITQAN_CONFIG.supabaseUrl, window.ITQAN_CONFIG.supabaseAnonKey);

const app = document.getElementById("app");
let currentOrder = null; // {order_id, order_number, amount, currency, product_title}

// ---------------- Router ----------------
window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);

function route() {
  const hash = location.hash || "#/";
  window.scrollTo(0, 0);

  if (hash === "#/" ) return renderHome();
  if (hash === "#/store") return renderStore();
  if (hash.startsWith("#/product/")) return renderProduct(hash.split("/")[2]);
  if (hash.startsWith("#/order/")) return renderOrderForm(hash.split("/")[2]);
  if (hash.startsWith("#/payment/")) return renderPayment(hash.split("/")[2]);
  if (hash === "#/track") return renderTrack();
  return renderHome();
}

// ---------------- Helpers ----------------
function fmtPrice(amount, currency) {
  return `${Number(amount).toLocaleString("ar-SA")} ${currency === "SAR" ? "ريال" : currency}`;
}

function statusLabel(status) {
  const map = {
    pending_payment: "بانتظار السداد",
    payment_proof_submitted: "تم استلام إثبات التحويل — قيد المراجعة",
    under_review: "قيد المراجعة",
    payment_approved: "تم اعتماد السداد",
    delivered: "تم التسليم",
    rejected: "تم رفض إثبات التحويل",
    cancelled: "ملغي",
  };
  return map[status] || status;
}

function setMeta(title, description) {
  document.title = title;
  let m = document.querySelector('meta[name="description"]');
  if (m && description) m.setAttribute("content", description);
}

function layout(content) {
  app.innerHTML = `
    <header class="site-header">
      <div class="wrap">
        <a href="#/" class="brand">
          <span class="logo-chip"><img src="logo.png" alt="شعار اتقان لخدمات الأعمال"></span>
          <span class="brand-text">اتقان<small>دراسات جدوى واستشارات أعمال</small></span>
        </a>
        <nav class="nav-links">
          <a href="#/">الرئيسية</a>
          <a href="#/store">المتجر</a>
          <a href="#/track">تتبع طلبك</a>
          <a href="#/store" class="btn btn-primary">تصفّح الدراسات</a>
        </nav>
      </div>
    </header>
    <main>${content}</main>
    <footer class="site-footer">
      <div class="wrap">
        متجر دراسات الجدوى والنماذج المالية الجاهزة — تابع لـ <a href="https://itqanbs.sa" target="_blank" rel="noopener">اتقان لخدمات الأعمال</a><br>
        © ${new Date().getFullYear()} جميع الحقوق محفوظة.
      </div>
    </footer>
    <a class="wa-float" href="https://wa.me/${window.ITQAN_CONFIG.whatsappSupportNumber}" target="_blank" rel="noopener" aria-label="تواصل معنا عبر واتساب" title="تواصل معنا عبر واتساب">
      <svg width="26" height="26" viewBox="0 0 32 32" fill="white"><path d="M16 3C9.4 3 4 8.4 4 15c0 2.4.7 4.6 1.9 6.5L4 29l7.7-1.9c1.8 1 3.9 1.5 6.3 1.5 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.8c-2 0-3.9-.6-5.5-1.6l-.4-.2-4.6 1.2 1.2-4.5-.3-.4C5.4 17.7 4.8 16.4 4.8 15c0-6.2 5-11.2 11.2-11.2S27.2 8.8 27.2 15 22.2 24.8 16 24.8zm6.1-8.4c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-2-1.8-2.3-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6-.1-.2-.8-1.9-1.1-2.6-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.8 5.1.8.3 1.4.6 1.9.7.8.3 1.5.2 2.1.1.6-.1 2-.8 2.3-1.6.3-.8.3-1.4.2-1.6-.1-.1-.3-.2-.6-.4z"/></svg>
    </a>
  `;
}

function productCardHtml(p) {
  return `
    <a class="product-card" href="#/product/${p.id}">
      <div class="cat">${p.category}</div>
      <h3>${p.title}</h3>
      <div class="desc">${p.short_description || ""}</div>
      <div class="price">${fmtPrice(p.price, p.currency)} <small>شامل الدراسة كاملة</small></div>
    </a>
  `;
}

// ---------------- Home ----------------
async function renderHome() {
  setMeta(
    "متجر اتقان | دراسات جدوى جاهزة وموثوقة للمستثمرين",
    "دراسات جدوى ودراسات سوق ونماذج مالية جاهزة من اتقان لخدمات الأعمال. تحليل دقيق يساعدك تتخذ قرار الاستثمار بثقة."
  );
  layout(`
    <section class="hero">
      <div class="wrap">
        <h1>لا تستثمر على تخمين — استثمر على دراسة</h1>
        <p>دراسات جدوى ونماذج مالية جاهزة من اتقان لخدمات الأعمال، معدّة باحتراف لتساعدك تقيّم فرصتك الاستثمارية وتتخذ قرارك بثقة وأرقام واضحة — تصل إليك إلكترونيًا خلال دقائق من اعتماد الطلب.</p>
        <a href="#/store" class="btn btn-primary" style="width:auto;display:inline-block;margin-top:24px;padding:13px 28px;">تصفّح الدراسات المتاحة</a>
      </div>
    </section>
    <section class="trust-strip">
      <div class="wrap">
        <div class="trust-item"><span class="dot">✓</span> دراسات معدّة من فريق استشاري متخصص</div>
        <div class="trust-item"><span class="dot">✓</span> تحليل سوقي ومالي وتشغيلي كامل</div>
        <div class="trust-item"><span class="dot">✓</span> عينة مجانية قبل الشراء</div>
        <div class="trust-item"><span class="dot">✓</span> تسليم إلكتروني فوري بعد اعتماد السداد</div>
      </div>
    </section>
    <div class="wrap">
      <div class="section-heading">
        <h2>دراسات مختارة</h2>
        <a href="#/store" class="count">عرض كل الدراسات ←</a>
      </div>
      <div id="featured" class="product-grid"><div class="loading">جارِ التحميل…</div></div>
    </div>
  `);

  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(8);

  const grid = document.getElementById("featured");
  if (error) { grid.innerHTML = `<div class="empty-state">تعذّر تحميل الدراسات حاليًا.</div>`; return; }
  if (!data.length) { grid.innerHTML = `<div class="empty-state">لا توجد دراسات منشورة بعد.</div>`; return; }
  grid.innerHTML = data.map(productCardHtml).join("");
}

// ---------------- Store ----------------
async function renderStore() {
  setMeta(
    "المتجر | كل دراسات الجدوى — اتقان",
    "تصفّح كل دراسات الجدوى ودراسات السوق والنماذج المالية الجاهزة من اتقان لخدمات الأعمال."
  );
  layout(`
    <div class="wrap">
      <div class="section-heading" style="margin-top:40px;">
        <h2>كل الدراسات</h2>
      </div>
      <div id="cats" class="category-rail"><div class="chip active" data-cat="">الكل</div></div>
      <div id="grid" class="product-grid"><div class="loading">جارِ التحميل…</div></div>
    </div>
  `);

  const { data, error } = await sb.from("products").select("*").eq("status", "published").order("created_at", { ascending: false });
  const grid = document.getElementById("grid");
  const catsEl = document.getElementById("cats");
  if (error || !data) { grid.innerHTML = `<div class="empty-state">تعذّر تحميل الدراسات حاليًا.</div>`; return; }
  if (!data.length) { grid.innerHTML = `<div class="empty-state">لا توجد دراسات منشورة بعد.</div>`; return; }

  const cats = [...new Set(data.map(p => p.category))];
  catsEl.innerHTML += cats.map(c => `<div class="chip" data-cat="${c}">${c}</div>`).join("");

  function draw(filter) {
    const list = filter ? data.filter(p => p.category === filter) : data;
    grid.innerHTML = list.length ? list.map(productCardHtml).join("") : `<div class="empty-state">لا توجد دراسات في هذا التصنيف حاليًا.</div>`;
  }
  draw("");

  catsEl.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    [...catsEl.children].forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    draw(chip.dataset.cat);
  });
}

// ---------------- Product detail ----------------
async function renderProduct(id) {
  layout(`<div class="wrap"><div class="loading">جارِ التحميل…</div></div>`);

  const { data: p, error } = await sb.from("products").select("*").eq("id", id).eq("status", "published").single();
  if (error || !p) {
    layout(`<div class="wrap"><div class="empty-state" style="margin-top:40px;">هذه الدراسة غير متاحة حاليًا. <a href="#/store">عودة إلى المتجر</a></div></div>`);
    return;
  }

  const contents = Array.isArray(p.contents) ? p.contents : [];
  setMeta(
    `${p.title} | اتقان`,
    (p.short_description || p.full_description || "").slice(0, 155)
  );
  const sampleUrl = p.sample_file_path
    ? sb.storage.from("product-samples").getPublicUrl(p.sample_file_path).data.publicUrl
    : null;
  const coverUrl = p.cover_image_path
    ? sb.storage.from("product-covers").getPublicUrl(p.cover_image_path).data.publicUrl
    : null;

  layout(`
    <div class="wrap">
      <div class="product-detail">
        <div>
          <div class="pd-cat">${p.category}</div>
          <h1 class="pd-title">${p.title}</h1>
          ${coverUrl ? `<img src="${coverUrl}" alt="${p.title}" style="width:100%;border:1px solid var(--line);margin-bottom:24px;">` : ""}
          <p class="pd-desc">${p.full_description || p.short_description || ""}</p>
          ${contents.length ? `
            <div class="pd-block">
              <h4>محتويات الدراسة</h4>
              <ul class="contents-list">${contents.map(c => `<li>${c}</li>`).join("")}</ul>
            </div>` : ""}
        </div>
        <div class="buy-box">
          <div class="price">${fmtPrice(p.price, p.currency)}</div>
          ${sampleUrl ? `<a class="sample-link" href="${sampleUrl}" target="_blank">شاهد عينة من الدراسة قبل الشراء</a>` : ""}
          <ul class="includes">
            <li>— ملف الدراسة كاملاً (PDF)</li>
            <li>— النموذج المالي (إن وُجد ضمن المنتج)</li>
            <li>— تسليم إلكتروني فوري بعد اعتماد السداد</li>
          </ul>
          <a class="btn btn-primary" href="#/order/${p.id}">اطلب الدراسة الآن</a>
          <p style="font-size:12.5px;color:var(--slate);text-align:center;margin-top:10px;">دفع آمن عبر تحويل بنكي مباشر لحساب اتقان</p>
        </div>
      </div>
    </div>
  `);
}

// ---------------- Order form ----------------
async function renderOrderForm(productId) {
  const { data: p } = await sb.from("products").select("id,title,price,currency").eq("id", productId).single();
  if (!p) { location.hash = "#/store"; return; }

  layout(`
    <div class="form-page">
      <h2>بيانات الطلب</h2>
      <div class="sub">${p.title} — ${fmtPrice(p.price, p.currency)}</div>
      <div id="formMsg"></div>
      <form id="orderForm">
        <div class="field"><label>الاسم الكامل <span class="req">*</span></label><input required name="full_name"></div>
        <div class="field"><label>رقم الجوال <span class="req">*</span></label><input required name="phone" type="tel" placeholder="05xxxxxxxx"></div>
        <div class="field"><label>البريد الإلكتروني <span class="req">*</span></label><input required name="email" type="email"></div>
        <div class="field"><label>اسم المنشأة (اختياري)</label><input name="company_name"></div>
        <div class="field"><label>ملاحظات (اختياري)</label><textarea name="notes"></textarea></div>
        <button class="btn btn-primary" type="submit">متابعة الطلب</button>
      </form>
    </div>
  `);

  document.getElementById("orderForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true; btn.textContent = "جارِ الإرسال…";
    const fd = new FormData(e.target);

    const { data, error } = await sb.rpc("create_order", {
      p_full_name: fd.get("full_name"),
      p_phone: fd.get("phone"),
      p_email: fd.get("email"),
      p_company_name: fd.get("company_name") || null,
      p_notes: fd.get("notes") || null,
      p_product_id: productId,
    });

    if (error || !data || !data.length) {
      document.getElementById("formMsg").innerHTML = `<div class="notice error">تعذّر إنشاء الطلب. حاول مرة أخرى.</div>`;
      btn.disabled = false; btn.textContent = "متابعة الطلب";
      return;
    }

    const order = data[0];
    currentOrder = { ...order, product_title: p.title, customer_email: fd.get("email") };
    sessionStorage.setItem("itqan_current_order", JSON.stringify(currentOrder));
    sb.functions.invoke("send-order-email", { body: { order_id: order.order_id, event: "order_created" } }).catch(() => {});
    location.hash = `#/payment/${order.order_id}`;
  });
}

// ---------------- Payment + proof upload ----------------
async function renderPayment(orderId) {
  if (!currentOrder || currentOrder.order_id !== orderId) {
    const saved = sessionStorage.getItem("itqan_current_order");
    if (saved) currentOrder = JSON.parse(saved);
  }
  if (!currentOrder || currentOrder.order_id !== orderId) {
    layout(`<div class="wrap"><div class="empty-state" style="margin-top:40px;">لا يمكن الوصول لهذه الصفحة مباشرة. <a href="#/track">تتبع طلبك من هنا</a></div></div>`);
    return;
  }

  const bank = window.ITQAN_CONFIG.bank;

  layout(`
    <div class="form-page">
      <h2>إتمام طلبك</h2>
      <div class="sub">رقم الطلب: <b>${currentOrder.order_number}</b></div>

      <div class="summary-box">
        <div class="summary-row"><span>المنتج</span><span>${currentOrder.product_title}</span></div>
        <div class="summary-row"><span>المبلغ المطلوب</span><span>${fmtPrice(currentOrder.amount, currentOrder.currency)}</span></div>
      </div>

      <div class="bank-box">
        <h4>التحويل البنكي</h4>
        <div class="bank-row"><span>اسم البنك</span><b>${bank.bankName}</b></div>
        <div class="bank-row"><span>اسم الحساب</span><b>${bank.accountName}</b></div>
        <div class="bank-row"><span>رقم الآيبان (IBAN)</span><b>${bank.iban}</b></div>
        <p style="font-size:13.5px;color:var(--slate);margin-top:14px;">
          يرجى تحويل المبلغ الموضح أعلاه إلى حساب اتقان لخدمات الأعمال، ثم رفع إثبات التحويل أدناه لإكمال الطلب.
        </p>
      </div>

      <div id="formMsg"></div>
      <form id="proofForm">
        <div class="field"><label>اسم المحوِّل <span class="req">*</span></label><input required name="transferor_name"></div>
        <div class="field"><label>البنك المحوَّل منه <span class="req">*</span></label><input required name="source_bank"></div>
        <div class="field"><label>تاريخ التحويل <span class="req">*</span></label><input required type="date" name="transfer_date"></div>
        <div class="field"><label>رقم العملية / المرجع (اختياري)</label><input name="reference_number"></div>
        <div class="field">
          <label>إرفاق إثبات التحويل <span class="req">*</span></label>
          <input required type="file" name="proof_file" accept="image/*,application/pdf">
          <small>صورة أو ملف PDF لإيصال التحويل</small>
        </div>
        <button class="btn btn-primary" type="submit">إرسال إثبات السداد</button>
      </form>
    </div>
  `);

  document.getElementById("proofForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true; btn.textContent = "جارِ الرفع…";
    const fd = new FormData(e.target);
    const file = fd.get("proof_file");

    try {
      const path = `${currentOrder.order_id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await sb.storage.from("payment-proofs").upload(path, file);
      if (upErr) throw upErr;

      const { error: rpcErr } = await sb.rpc("submit_payment_proof", {
        p_order_id: currentOrder.order_id,
        p_transferor_name: fd.get("transferor_name"),
        p_source_bank: fd.get("source_bank"),
        p_transfer_date: fd.get("transfer_date"),
        p_reference_number: fd.get("reference_number") || null,
        p_proof_file_path: path,
      });
      if (rpcErr) throw rpcErr;

      sessionStorage.removeItem("itqan_current_order");
      layout(`
        <div class="center-page">
          <h2 style="font-family:var(--font-display);">تم استلام طلبك بنجاح</h2>
          <div class="order-number">${currentOrder.order_number}</div>
          <p style="color:var(--slate);">تم استلام إثبات السداد وسيتم التحقق منه من قبل فريق اتقان.
          بعد اعتماد السداد سيتم إرسال رابط تحميل الدراسة إلى بريدك الإلكتروني المسجل.</p>
          <a href="#/track" class="btn btn-ghost" style="width:auto;display:inline-block;margin-top:18px;padding:11px 22px;">تتبع حالة طلبك</a>
        </div>
      `);
    } catch (err) {
      document.getElementById("formMsg").innerHTML = `<div class="notice error">تعذّر إرسال إثبات السداد. حاول مرة أخرى.</div>`;
      btn.disabled = false; btn.textContent = "إرسال إثبات السداد";
    }
  });
}

// ---------------- Track order ----------------
async function renderTrack() {
  layout(`
    <div class="form-page">
      <h2>تتبع طلبك</h2>
      <div class="sub">أدخل رقم الطلب والبريد الإلكتروني المستخدم عند الطلب</div>
      <div id="result"></div>
      <form id="trackForm">
        <div class="field"><label>رقم الطلب <span class="req">*</span></label><input required name="order_number" placeholder="ITQ-000001"></div>
        <div class="field"><label>البريد الإلكتروني <span class="req">*</span></label><input required type="email" name="email"></div>
        <button class="btn btn-primary" type="submit">عرض الحالة</button>
      </form>
    </div>
  `);

  document.getElementById("trackForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const resultEl = document.getElementById("result");
    resultEl.innerHTML = `<div class="notice">جارِ البحث…</div>`;

    const { data, error } = await sb.rpc("get_order_status", {
      p_order_number: fd.get("order_number").trim(),
      p_email: fd.get("email").trim(),
    });

    if (error || !data || !data.length) {
      resultEl.innerHTML = `<div class="notice error">لم يتم العثور على طلب بهذه البيانات.</div>`;
      return;
    }
    const o = data[0];
    resultEl.innerHTML = `
      <div class="summary-box">
        <div class="summary-row"><span>الدراسة</span><span>${o.product_title}</span></div>
        <div class="summary-row"><span>المبلغ</span><span>${fmtPrice(o.amount, o.currency)}</span></div>
        <div class="summary-row"><span>الحالة</span><span class="status-badge status-${o.status}">${statusLabel(o.status)}</span></div>
      </div>
    `;
  });
}
