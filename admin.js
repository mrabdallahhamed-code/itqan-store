// ============================================================
// لوحة تحكم اتقان — للموظفين فقط
// ============================================================
const { createClient } = supabase;
const sb = createClient(window.ITQAN_CONFIG.supabaseUrl, window.ITQAN_CONFIG.supabaseAnonKey);

const app = document.getElementById("app");
document.body.classList.add("admin-body");

const STATUS_LABELS = {
  pending_payment: "بانتظار السداد",
  payment_proof_submitted: "إثبات مرفوع",
  under_review: "قيد المراجعة",
  payment_approved: "معتمد",
  delivered: "تم التسليم",
  rejected: "مرفوض",
  cancelled: "ملغي",
};

// ---------------- Auth guard ----------------
let session = null;

window.addEventListener("DOMContentLoaded", init);
window.addEventListener("hashchange", route);

async function init() {
  const { data } = await sb.auth.getSession();
  session = data.session;
  sb.auth.onAuthStateChange((_event, s) => { session = s; });
  route();
}

async function isAdmin() {
  if (!session) return false;
  const { data, error } = await sb.from("admin_users").select("id, full_name").eq("id", session.user.id).single();
  if (error || !data) return false;
  return data;
}

// ---------------- Router ----------------
async function route() {
  const hash = location.hash || "#/orders";

  if (!session) return renderLogin();

  const admin = await isAdmin();
  if (!admin) return renderLogin("هذا الحساب غير مصرّح له بالدخول للوحة التحكم.");

  if (hash === "#/orders" || hash === "#/") return renderOrders(admin);
  if (hash.startsWith("#/orders/")) return renderOrderDetail(hash.split("/")[2], admin);
  if (hash === "#/products") return renderProducts(admin);
  if (hash === "#/products/new") return renderProductForm(admin, null);
  if (hash.startsWith("#/products/")) return renderProductForm(admin, hash.split("/")[2]);
  return renderOrders(admin);
}

// ---------------- Login ----------------
function renderLogin(errorMsg) {
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-box">
        <div class="logo-chip"><img src="logo.png" alt="اتقان"></div>
        <h2>لوحة تحكم اتقان</h2>
        ${errorMsg ? `<div class="notice error">${errorMsg}</div>` : ""}
        <div id="loginMsg"></div>
        <form id="loginForm">
          <div class="field"><label>البريد الإلكتروني</label><input required type="email" name="email"></div>
          <div class="field"><label>كلمة المرور</label><input required type="password" name="password"></div>
          <button class="btn btn-primary" type="submit">دخول</button>
        </form>
      </div>
    </div>
  `;
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector("button");
    btn.disabled = true; btn.textContent = "جارِ الدخول…";
    const { data, error } = await sb.auth.signInWithPassword({
      email: fd.get("email"), password: fd.get("password"),
    });
    if (error) {
      document.getElementById("loginMsg").innerHTML = `<div class="notice error">بيانات الدخول غير صحيحة.</div>`;
      btn.disabled = false; btn.textContent = "دخول";
      return;
    }
    session = data.session;
    route();
  });
}

// ---------------- Shell (sidebar) ----------------
function shell(activeKey, content) {
  const hash = location.hash || "#/orders";
  const isActive = (k) => hash.startsWith(k) ? "active" : "";
  app.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="logo-row">
          <span class="logo-chip"><img src="logo.png" alt="اتقان"></span>
          <span>لوحة تحكم اتقان</span>
        </div>
        <nav class="admin-nav">
          <a href="#/orders" class="${isActive('#/orders')}">الطلبات</a>
          <a href="#/products" class="${isActive('#/products')}">المنتجات</a>
        </nav>
        <div class="signout"><button id="signOutBtn">تسجيل الخروج</button></div>
      </aside>
      <div class="admin-main">${content}</div>
    </div>
  `;
  document.getElementById("signOutBtn").addEventListener("click", async () => {
    await sb.auth.signOut();
    session = null;
    route();
  });
}

// ---------------- Orders list ----------------
async function renderOrders() {
  shell("orders", `
    <div class="admin-header-row"><h1>الطلبات</h1></div>
    <div id="kpis" class="kpi-row"></div>
    <div id="tabs" class="status-tabs"></div>
    <div id="ordersTableWrap"><div class="loading">جارِ التحميل…</div></div>
  `);

  const { data, error } = await sb
    .from("orders")
    .select("id, order_number, amount, currency, status, created_at, customers(full_name, email, phone), products(title)")
    .order("created_at", { ascending: false });

  const wrap = document.getElementById("ordersTableWrap");
  if (error) { wrap.innerHTML = `<div class="notice error">تعذّر تحميل الطلبات.</div>`; return; }

  const counts = {};
  data.forEach(o => counts[o.status] = (counts[o.status] || 0) + 1);
  document.getElementById("kpis").innerHTML = `
    <div class="kpi-card"><div class="num">${data.length}</div><div class="label">إجمالي الطلبات</div></div>
    <div class="kpi-card"><div class="num">${(counts.payment_proof_submitted||0) + (counts.under_review||0)}</div><div class="label">بانتظار المراجعة</div></div>
    <div class="kpi-card"><div class="num">${counts.payment_approved||0}</div><div class="label">معتمدة (بانتظار التسليم)</div></div>
    <div class="kpi-card"><div class="num">${counts.delivered||0}</div><div class="label">تم تسليمها</div></div>
  `;

  const tabsEl = document.getElementById("tabs");
  const statuses = ["", ...Object.keys(STATUS_LABELS)];
  tabsEl.innerHTML = statuses.map(s => `<div class="chip ${s===''?'active':''}" data-status="${s}">${s ? STATUS_LABELS[s] : "الكل"}</div>`).join("");

  function drawTable(filter) {
    const list = filter ? data.filter(o => o.status === filter) : data;
    if (!list.length) { wrap.innerHTML = `<div class="empty-state">لا توجد طلبات في هذا التصنيف.</div>`; return; }
    wrap.innerHTML = `
      <table class="data-table">
        <thead><tr><th>رقم الطلب</th><th>العميل</th><th>المنتج</th><th>المبلغ</th><th>الحالة</th><th>التاريخ</th></tr></thead>
        <tbody>
          ${list.map(o => `
            <tr data-id="${o.id}">
              <td>${o.order_number}</td>
              <td>${o.customers?.full_name || "—"}</td>
              <td>${o.products?.title || "—"}</td>
              <td>${Number(o.amount).toLocaleString("ar-SA")} ${o.currency}</td>
              <td><span class="status-badge status-${o.status}">${STATUS_LABELS[o.status]}</span></td>
              <td>${new Date(o.created_at).toLocaleDateString("ar-SA")}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    `;
    wrap.querySelectorAll("tr[data-id]").forEach(tr => {
      tr.addEventListener("click", () => location.hash = `#/orders/${tr.dataset.id}`);
    });
  }
  drawTable("");

  tabsEl.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    [...tabsEl.children].forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    drawTable(chip.dataset.status);
  });
}

// ---------------- Order detail ----------------
async function renderOrderDetail(orderId) {
  shell("orders", `<div class="loading">جارِ التحميل…</div>`);

  const { data: o, error } = await sb
    .from("orders")
    .select("*, customers(*), products(*), payment_proofs(*)")
    .eq("id", orderId)
    .single();

  if (error || !o) {
    shell("orders", `<div class="notice error">تعذّر العثور على الطلب. <a href="#/orders">عودة للطلبات</a></div>`);
    return;
  }

  const proof = (o.payment_proofs || [])[0];
  let proofImgUrl = null;
  if (proof) {
    const { data: signed } = await sb.storage.from("payment-proofs").createSignedUrl(proof.proof_file_path, 3600);
    proofImgUrl = signed?.signedUrl;
  }

  const canApprove = ["payment_proof_submitted", "under_review"].includes(o.status);
  const canDeliver = o.status === "payment_approved";

  shell("orders", `
    <div class="admin-header-row">
      <h1>طلب ${o.order_number}</h1>
      <span class="status-badge status-${o.status}">${STATUS_LABELS[o.status]}</span>
    </div>
    <div id="actionMsg"></div>
    <div class="detail-grid">
      <div>
        <div class="info-card">
          <h4>بيانات العميل</h4>
          <div class="info-row"><span>الاسم</span><span>${o.customers.full_name}</span></div>
          <div class="info-row"><span>الجوال</span><span>${o.customers.phone}</span></div>
          <div class="info-row"><span>البريد الإلكتروني</span><span>${o.customers.email}</span></div>
          <div class="info-row"><span>المنشأة</span><span>${o.customers.company_name || "—"}</span></div>
          ${o.notes ? `<div class="info-row"><span>ملاحظات</span><span>${o.notes}</span></div>` : ""}
        </div>

        <div class="info-card">
          <h4>المنتج</h4>
          <div class="info-row"><span>الدراسة</span><span>${o.products.title}</span></div>
          <div class="info-row"><span>المبلغ</span><span>${Number(o.amount).toLocaleString("ar-SA")} ${o.currency}</span></div>
        </div>

        ${proof ? `
        <div class="info-card">
          <h4>إثبات التحويل</h4>
          <div class="info-row"><span>اسم المحوِّل</span><span>${proof.transferor_name}</span></div>
          <div class="info-row"><span>البنك</span><span>${proof.source_bank}</span></div>
          <div class="info-row"><span>تاريخ التحويل</span><span>${proof.transfer_date}</span></div>
          <div class="info-row"><span>رقم المرجع</span><span>${proof.reference_number || "—"}</span></div>
          ${proofImgUrl ? `<a href="${proofImgUrl}" target="_blank"><img class="proof-image" src="${proofImgUrl}"></a>` : ""}
        </div>` : `<div class="notice">لم يتم رفع إثبات تحويل بعد.</div>`}
      </div>

      <div>
        <div class="info-card">
          <h4>الإجراءات</h4>
          ${canApprove ? `
            <div class="action-row">
              <button class="btn btn-success" id="approveBtn">اعتماد السداد</button>
              <button class="btn btn-danger" id="rejectBtn">رفض الإثبات</button>
            </div>` : ""}
          ${canDeliver ? `
            <p style="font-size:13.5px;color:var(--slate);margin-top:12px;">السداد معتمد. ولّد رابط تحميل آمن وأرسله للعميل يدويًا عبر البريد، ثم ضع الطلب كمُسلَّم.</p>
            <div class="action-row">
              <button class="btn btn-primary" id="genLinkBtn" style="width:auto;">توليد رابط تحميل</button>
              <button class="btn btn-success" id="deliverBtn" style="width:auto;">تحديد كمُسلَّم</button>
            </div>
            <div id="linkBox"></div>
          ` : ""}
          ${!canApprove && !canDeliver ? `<p style="font-size:13.5px;color:var(--slate);">لا توجد إجراءات متاحة لهذا الطلب في حالته الحالية.</p>` : ""}
        </div>
      </div>
    </div>
  `);

  document.getElementById("approveBtn")?.addEventListener("click", async () => {
    await updateOrderStatus(orderId, "payment_approved", "approved");
    location.hash = "#/orders/" + orderId;
    route();
  });
  document.getElementById("rejectBtn")?.addEventListener("click", async () => {
    const reason = prompt("سبب الرفض (سيظهر داخليًا فقط):");
    if (reason === null) return;
    await sb.from("orders").update({ status: "rejected", rejection_reason: reason }).eq("id", orderId);
    await sb.from("order_events").insert({ order_id: orderId, event: "rejected", actor: "admin", details: reason });
    route();
  });
  document.getElementById("genLinkBtn")?.addEventListener("click", async () => {
    const { data: signed, error: sErr } = await sb.storage.from("product-files").createSignedUrl(o.products.study_file_path, 60 * 60 * 24 * 7);
    if (sErr || !signed) {
      document.getElementById("linkBox").innerHTML = `<div class="notice error">تعذّر توليد الرابط. تأكد أن مسار ملف الدراسة صحيح في بيانات المنتج.</div>`;
      return;
    }
    document.getElementById("linkBox").innerHTML = `
      <div class="link-copy-box">
        <input readonly value="${signed.signedUrl}" id="linkInput">
        <button class="btn btn-ghost" id="copyLinkBtn">نسخ</button>
      </div>
      <small style="color:var(--slate);">الرابط صالح لمدة 7 أيام</small>
    `;
    document.getElementById("copyLinkBtn").addEventListener("click", () => {
      document.getElementById("linkInput").select();
      navigator.clipboard.writeText(signed.signedUrl);
    });
  });
  document.getElementById("deliverBtn")?.addEventListener("click", async () => {
    await updateOrderStatus(orderId, "delivered", "delivered");
    route();
  });
}

async function updateOrderStatus(orderId, status, event) {
  await sb.from("orders").update({ status }).eq("id", orderId);
  await sb.from("order_events").insert({ order_id: orderId, event, actor: "admin" });
}

// ---------------- Products list ----------------
async function renderProducts() {
  shell("products", `
    <div class="admin-header-row">
      <h1>المنتجات</h1>
      <a href="#/products/new" class="btn btn-primary" style="width:auto;padding:10px 18px;">+ إضافة دراسة</a>
    </div>
    <div id="wrap"><div class="loading">جارِ التحميل…</div></div>
  `);

  const { data, error } = await sb.from("products").select("*").order("created_at", { ascending: false });
  const wrap = document.getElementById("wrap");
  if (error) { wrap.innerHTML = `<div class="notice error">تعذّر تحميل المنتجات.</div>`; return; }
  if (!data.length) { wrap.innerHTML = `<div class="empty-state">لا توجد منتجات بعد.</div>`; return; }

  wrap.innerHTML = `
    <table class="data-table">
      <thead><tr><th>الاسم</th><th>التصنيف</th><th>السعر</th><th>الحالة</th></tr></thead>
      <tbody>
        ${data.map(p => `
          <tr data-id="${p.id}">
            <td>${p.title}</td>
            <td>${p.category}</td>
            <td>${Number(p.price).toLocaleString("ar-SA")} ${p.currency}</td>
            <td><span class="status-badge status-${p.status === 'published' ? 'payment_approved' : p.status === 'draft' ? 'pending_payment' : 'rejected'}">${p.status === 'published' ? 'منشور' : p.status === 'draft' ? 'مسودة' : 'غير متاح'}</span></td>
          </tr>`).join("")}
      </tbody>
    </table>
  `;
  wrap.querySelectorAll("tr[data-id]").forEach(tr => {
    tr.addEventListener("click", () => location.hash = `#/products/${tr.dataset.id}`);
  });
}

// ---------------- Product form (create/edit) ----------------
async function renderProductForm(admin, productId) {
  let p = {
    slug: "", title: "", category: "", short_description: "", full_description: "",
    contents: [], price: "", currency: "SAR", status: "draft",
    cover_image_path: "", sample_file_path: "", study_file_path: "",
  };
  if (productId) {
    const { data } = await sb.from("products").select("*").eq("id", productId).single();
    if (data) p = data;
  }

  shell("products", `
    <div class="admin-header-row"><h1>${productId ? "تعديل الدراسة" : "إضافة دراسة جديدة"}</h1></div>
    <div id="formMsg"></div>
    <form id="pForm" class="info-card" style="max-width:640px;">
      <div class="field"><label>اسم الدراسة *</label><input required name="title" value="${p.title || ''}"></div>
      <div class="field"><label>الرابط (slug) *</label><input required name="slug" value="${p.slug || ''}" placeholder="coffee-shop-feasibility"></div>
      <div class="field"><label>التصنيف *</label><input required name="category" value="${p.category || ''}" placeholder="دراسات الجدوى"></div>
      <div class="field"><label>وصف مختصر</label><textarea name="short_description">${p.short_description || ''}</textarea></div>
      <div class="field"><label>الوصف الكامل</label><textarea name="full_description">${p.full_description || ''}</textarea></div>
      <div class="field"><label>محتويات الدراسة (كل بند بسطر)</label><textarea name="contents_text" rows="6">${(Array.isArray(p.contents) ? p.contents : []).join("\n")}</textarea></div>
      <div class="field"><label>السعر (ريال) *</label><input required type="number" step="0.01" name="price" value="${p.price || ''}"></div>
      <div class="field"><label>الحالة</label>
        <select name="status">
          <option value="draft" ${p.status==='draft'?'selected':''}>مسودة</option>
          <option value="published" ${p.status==='published'?'selected':''}>منشور</option>
          <option value="unavailable" ${p.status==='unavailable'?'selected':''}>غير متاح</option>
        </select>
      </div>

      <div class="field"><label>ملف الدراسة الكامل (PDF — خاص)</label>
        <input type="file" id="studyFile" accept="application/pdf">
        <small>الحالي: ${p.study_file_path || "لا يوجد"}</small>
      </div>
      <div class="field"><label>عينة الدراسة (PDF — عام)</label>
        <input type="file" id="sampleFile" accept="application/pdf">
        <small>الحالي: ${p.sample_file_path || "لا يوجد"}</small>
      </div>
      <div class="field"><label>صورة الغلاف (عام)</label>
        <input type="file" id="coverFile" accept="image/*">
        <small>الحالي: ${p.cover_image_path || "لا يوجد"}</small>
      </div>

      <button class="btn btn-primary" type="submit">حفظ</button>
    </form>
  `);

  document.getElementById("pForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector("button");
    btn.disabled = true; btn.textContent = "جارِ الحفظ…";
    const msgEl = document.getElementById("formMsg");

    try {
      const slug = fd.get("slug").trim();
      let study_file_path = p.study_file_path, sample_file_path = p.sample_file_path, cover_image_path = p.cover_image_path;

      const studyFile = document.getElementById("studyFile").files[0];
      if (studyFile) {
        const path = `${slug}/${studyFile.name}`;
        const { error } = await sb.storage.from("product-files").upload(path, studyFile, { upsert: true });
        if (error) throw error;
        study_file_path = path;
      }
      const sampleFile = document.getElementById("sampleFile").files[0];
      if (sampleFile) {
        const path = `${slug}/${sampleFile.name}`;
        const { error } = await sb.storage.from("product-samples").upload(path, sampleFile, { upsert: true });
        if (error) throw error;
        sample_file_path = path;
      }
      const coverFile = document.getElementById("coverFile").files[0];
      if (coverFile) {
        const path = `${slug}/${coverFile.name}`;
        const { error } = await sb.storage.from("product-covers").upload(path, coverFile, { upsert: true });
        if (error) throw error;
        cover_image_path = path;
      }

      if (!study_file_path) throw new Error("ملف الدراسة الكامل مطلوب");

      const payload = {
        slug,
        title: fd.get("title"),
        category: fd.get("category"),
        short_description: fd.get("short_description"),
        full_description: fd.get("full_description"),
        contents: fd.get("contents_text").split("\n").map(s => s.trim()).filter(Boolean),
        price: fd.get("price"),
        currency: "SAR",
        status: fd.get("status"),
        study_file_path, sample_file_path, cover_image_path,
      };

      if (productId) {
        const { error } = await sb.from("products").update(payload).eq("id", productId);
        if (error) throw error;
      } else {
        const { error } = await sb.from("products").insert(payload);
        if (error) throw error;
      }

      location.hash = "#/products";
      route();
    } catch (err) {
      msgEl.innerHTML = `<div class="notice error">تعذّر الحفظ: ${err.message || err}</div>`;
      btn.disabled = false; btn.textContent = "حفظ";
    }
  });
}
