#!/usr/bin/env python3
"""
يبني صفحات HTML ثابتة قابلة للفهرسة (جوجل وأدوات الذكاء الاصطناعي)
من ملف tools/content.json، ويحدّث sitemap.xml و llms.txt و llms-full.txt
والمحتوى الاحتياطي في index.html.

التشغيل:  python3 tools/build_pages.py
عند تعديل خدمة من لوحة التحكم، حدّث content.json ثم أعد التشغيل.
"""
import json, html, re, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = "https://store.itqanbs.sa"
TODAY = datetime.date.today().isoformat()
ORG = "اتقان لخدمات الأعمال"
ORG_EN = "Itqan Business Services"
C = json.loads((ROOT / "tools" / "content.json").read_text(encoding="utf-8"))
SVC = {s["slug"]: s for s in C["services"]}

# الأسئلة الشائعة من app.js (مصدر واحد)
app_js = (ROOT / "app.js").read_text(encoding="utf-8")
FAQ = [{"q": json.loads('"%s"' % q), "a": json.loads('"%s"' % a)}
       for q, a in re.findall(r'\{ q: "((?:[^"\\]|\\.)*)", a: "((?:[^"\\]|\\.)*)" \}', app_js)]

settings_js = (ROOT / "site-settings.js").read_text(encoding="utf-8")
SOCIAL = re.findall(r'url: "(https://(?:www\.)?(?:instagram|x|linkedin|tiktok|facebook)\.com[^"]*)"', settings_js)
EMAIL = (re.search(r'contactEmail: "([^"]+)"', settings_js) or [None, "info@itqanbs.sa"])[1]
cfg = (ROOT / "config.js").read_text(encoding="utf-8")
WA = (re.search(r'whatsappSupportNumber: "(\d+)"', cfg) or [None, ""])[1]

e = lambda s: html.escape(str(s or ""), quote=True)


def org_ld():
    return {
        "@type": ["Organization", "ProfessionalService"],
        "@id": BASE + "/#org",
        "name": ORG, "alternateName": [ORG_EN, "إتقان", "Itqan"],
        "url": BASE + "/", "logo": BASE + "/icon-512.png", "image": BASE + "/icon-512.png",
        "email": EMAIL, "telephone": "+" + WA if WA else None,
        "areaServed": {"@type": "Country", "name": "المملكة العربية السعودية"},
        "address": {"@type": "PostalAddress", "addressCountry": "SA"},
        "sameAs": SOCIAL + ["https://www.itqanbs.sa"],
        "knowsLanguage": ["ar", "en"],
        "parentOrganization": {"@type": "Organization", "name": ORG, "url": "https://www.itqanbs.sa"},
    }


def page(path, title, desc, body, ld, keywords="", og_type="website"):
    url = BASE + path
    ld_all = {"@context": "https://schema.org", "@graph": [org_ld()] + ld}
    ld_json = json.dumps(ld_all, ensure_ascii=False, indent=1).replace("</", "<\\/")
    doc = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
{f'<meta name="keywords" content="{e(keywords)}">' if keywords else ''}
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="{ORG}">
<meta property="og:locale" content="ar_SA">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{BASE}/icon-512.png">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#16233A">
<link rel="icon" href="/logo.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/static-pages.css">
<script type="application/ld+json">
{ld_json}
</script>
</head>
<body class="static-page">
<header class="site-header">
  <div class="wrap">
    <a href="/" class="brand"><span class="logo-chip"><img src="/logo.png" alt="شعار اتقان لخدمات الأعمال" width="48" height="38"></span>
      <span class="brand-text">متجر اتقان<small>استشارات ودراسات وخطط أعمال</small></span></a>
    <nav class="sp-nav" aria-label="روابط رئيسية">
      <a href="/services/">الخدمات</a>
      <a href="/stages/">ابدأ حسب وضعك</a>
      <a href="/faq/">الأسئلة الشائعة</a>
      <a href="/about/">عن إتقان</a>
      <a href="/#/request" class="btn btn-primary">اطلب عرض سعر</a>
    </nav>
  </div>
</header>
<main class="wrap sp-main">
{body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="sp-foot">
      <div><b>{ORG}</b><p>دراسات الجدوى، الاستشارات، إعادة الهيكلة وتطوير الأعمال، وتقييم الشركات — في المملكة العربية السعودية.</p></div>
      <div><a href="/services/">كل الخدمات</a> · <a href="/stages/">ابدأ حسب وضعك</a> · <a href="/faq/">الأسئلة الشائعة</a> · <a href="/about/">عن إتقان</a> · <a href="/#/track">تتبع طلبك</a></div>
      <div><a href="mailto:{EMAIL}">{EMAIL}</a>{f' · <a href="https://wa.me/{WA}" rel="noopener">واتساب</a>' if WA else ''}</div>
    </div>
    <div class="footer-bottom">© {datetime.date.today().year} {ORG}. جميع الحقوق محفوظة.</div>
  </div>
</footer>
</body>
</html>
"""
    out = ROOT / path.strip("/") / "index.html" if path != "/" else ROOT / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc, encoding="utf-8")
    return url


def crumbs(*pairs):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": BASE + u} for i, (n, u) in enumerate(pairs)]}


def steps_html():
    return """<ol class="sp-steps">
  <li><b>اختر الخدمة</b> أو أرسل احتياجك مباشرة.</li>
  <li><b>عرّفنا بمشروعك</b> وهدفك من الخدمة.</li>
  <li><b>يصلك عرض سعر واضح</b> بعد فهم النطاق — قبل أي التزام.</li>
  <li><b>تستلم المخرجات</b> إلكترونيًا بعد اعتماد السداد.</li>
</ol>"""


urls = [(BASE + "/", "1.0")]

# ---------- صفحة كل خدمة ----------
for s in C["services"]:
    path = f"/services/{s['slug']}/"
    meta = [("لمن تناسب", s.get("target")), ("مدة التنفيذ", s.get("duration")),
            ("المتطلبات منك", s.get("requirements")), ("طريقة التسليم", s.get("delivery"))]
    meta_html = "".join(f'<div class="svc-meta-item"><div class="k">{k}</div><div class="v">{e(v)}</div></div>' for k, v in meta if v)
    related = [x for x in C["services"] if x["slug"] != s["slug"]]
    stages = [st for st in C["stages"] if s["slug"] in st["services"]]
    body = f"""
<nav class="breadcrumb" aria-label="مسار التصفح"><a href="/">الرئيسية</a><span class="sep">/</span><a href="/services/">الخدمات</a><span class="sep">/</span>{e(s['title'])}</nav>
<article class="sp-article">
  <h1 class="pd-title">{e(s.get('h1') or s['title'])}</h1>
  <p class="sp-lead">{e(s['short'])}</p>
  <p class="service-lede">{e(s['full'])}</p>
  {''.join(f'<section class="pd-block"><h2 class="sp-h2">{e(h)}</h2><p class="sp-p">{e(t)}</p></section>' for h, t in s.get('sections', []))}
  {f'<div class="svc-meta">{meta_html}</div>' if meta_html else ''}
  <section class="pd-block"><h2 class="sp-h2">ماذا تشمل الخدمة؟</h2>
    <ul class="sp-list">{''.join(f'<li>{e(i)}</li>' for i in s['items'])}</ul></section>
  {f'''<section class="pd-block"><h2 class="sp-h2">مناسبة لمرحلة</h2><p>{'، '.join(f'<a href="/stages/#{st["slug"]}">{e(st["title"])}</a>' for st in stages)}</p></section>''' if stages else ''}
  <section class="pd-block"><h2 class="sp-h2">كيف نبدأ معك؟</h2>{steps_html()}</section>
  <div class="sp-cta">
    <div><b>لا توجد أسعار ثابتة</b><span>يصلك عرض سعر واضح بعد فهم احتياجك، ولا يبدأ العمل إلا بموافقتك.</span></div>
    <a class="btn btn-primary" href="/#/request?service={s['slug']}">اطلب عرض سعر لهذه الخدمة</a>
  </div>
  {('<section class="pd-block"><h2 class="sp-h2">أسئلة عن هذه الخدمة</h2>' + ''.join(f'<div class="sp-faq"><h3>{e(q)}</h3><p>{e(a)}</p></div>' for q, a in s.get('faqs', [])) + '</section>') if s.get('faqs') else ''}
  <section class="pd-block"><h2 class="sp-h2">خدمات أخرى</h2>
    <div class="related-row">{''.join(f'<a class="related-chip" href="/services/{r["slug"]}/">{e(r["title"])}</a>' for r in related)}</div></section>
</article>"""
    ld = [
        {"@type": "Service", "@id": BASE + path + "#service", "name": s["title"], "serviceType": s["title"],
         "description": s["full"], "url": BASE + path, "provider": {"@id": BASE + "/#org"},
         "areaServed": {"@type": "Country", "name": "المملكة العربية السعودية"}, "inLanguage": "ar",
         "hasOfferCatalog": {"@type": "OfferCatalog", "name": "ما تشمله الخدمة",
                             "itemListElement": [{"@type": "Offer", "itemOffered": {"@type": "Service", "name": i}} for i in s["items"]]},
         "offers": {"@type": "Offer", "availability": "https://schema.org/InStock", "priceSpecification": {"@type": "PriceSpecification", "priceCurrency": "SAR", "description": "عرض سعر حسب نطاق العمل"}, "url": BASE + f"/#/request?service={s['slug']}"}},
        crumbs(("الرئيسية", "/"), ("الخدمات", "/services/"), (s["title"], path)),
    ]
    if s.get("faqs"):
        ld.append({"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in s["faqs"]]})
    urls.append((page(path, s.get("seo_title") or f"{s['title']} | إتقان لخدمات الأعمال", s["short"][:158], body, ld, s.get("keywords", "")), "0.9"))

# ---------- فهرس الخدمات ----------
cards = "".join(f"""<a class="sp-card" href="/services/{s['slug']}/"><h2>{e(s['title'])}</h2><p>{e(s['short'])}</p><span>التفاصيل ←</span></a>""" for s in C["services"])
body = f"""<nav class="breadcrumb"><a href="/">الرئيسية</a><span class="sep">/</span>الخدمات</nav>
<h1 class="pd-title">خدمات إتقان لخدمات الأعمال</h1>
<p class="service-lede">خمس خدمات استشارية للمشاريع الجديدة والشركات القائمة في المملكة العربية السعودية. لا توجد أسعار ثابتة: يصلك عرض سعر واضح بعد فهم احتياجك.</p>
<div class="sp-grid">{cards}</div>
<p class="sp-more">لا تعرف أي خدمة تناسبك؟ <a href="/stages/">ابدأ حسب وضعك</a> أو <a href="/#/request">أرسل احتياجك مباشرة</a>.</p>"""
ld = [{"@type": "ItemList", "name": "خدمات إتقان", "itemListElement": [
    {"@type": "ListItem", "position": i + 1, "url": BASE + f"/services/{s['slug']}/", "name": s["title"]} for i, s in enumerate(C["services"])]},
    crumbs(("الرئيسية", "/"), ("الخدمات", "/services/"))]
urls.append((page("/services/", "الخدمات — دراسات الجدوى والاستشارات وتقييم الشركات | إتقان",
                  "دراسات الجدوى والسوق، تشخيص وحلول لتحديات الشركات، إعادة الهيكلة وتطوير الأعمال، تقييم الشركات والشركات العائلية، وخدمات مخصصة — في السعودية.", body, ld,
                  "دراسة جدوى, استشارات أعمال, تقييم الشركات, إعادة هيكلة, تطوير الأعمال, السعودية"), "0.9"))

# ---------- ابدأ حسب وضعك ----------
def stage_block(st, i):
    svcs = "".join(f'<li><a href="/services/{x}/">{e(SVC[x]["title"])}</a></li>' for x in st["services"] if x in SVC)
    ext = "".join(f"<li>{e(x)}</li>" for x in st["extras"])
    return f"""<section class="sp-stage" id="{st['slug']}"><span class="pkg-step">المرحلة {['الأولى','الثانية','الثالثة','الرابعة'][i]}</span>
<h2>{e(st['title'])}</h2><p>{e(st['short'])}</p><ul class="sp-list">{svcs}{ext}</ul>
<a class="btn btn-primary btn-inline" href="/#/packages">اطلب هذه الخدمات معًا</a></section>"""
body = f"""<nav class="breadcrumb"><a href="/">الرئيسية</a><span class="sep">/</span>ابدأ حسب وضعك</nav>
<h1 class="pd-title">ابدأ حسب وضعك</h1>
<p class="service-lede">اختر الوضع الأقرب لشركتك، وسنقترح عليك الخدمات المناسبة لهذه المرحلة، ويصلك عرض سعر واحد بعد فهم احتياجك.</p>
{''.join(stage_block(st, i) for i, st in enumerate(C['stages']))}"""
urls.append((page("/stages/", "ابدأ حسب وضعك: مشروع جديد، شركة تريد النمو، أو تستعد لمستثمر | إتقان",
                  "مشروع جديد، شركة قائمة تريد النمو، أو شركة تستعد لمستثمر أو تمويل أو تخارج — اختر وضعك ونقترح لك الخدمات المناسبة.", body,
                  [crumbs(("الرئيسية", "/"), ("ابدأ حسب وضعك", "/stages/"))]), "0.8"))

# ---------- الأسئلة الشائعة ----------
body = """<nav class="breadcrumb"><a href="/">الرئيسية</a><span class="sep">/</span>الأسئلة الشائعة</nav>
<h1 class="pd-title">الأسئلة الشائعة</h1>""" + "".join(
    f'<section class="sp-faq"><h2>{e(f["q"])}</h2><p>{e(f["a"])}</p></section>' for f in FAQ)
ld = [{"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": f["q"], "acceptedAnswer": {"@type": "Answer", "text": f["a"]}} for f in FAQ]},
      crumbs(("الرئيسية", "/"), ("الأسئلة الشائعة", "/faq/"))]
urls.append((page("/faq/", "الأسئلة الشائعة عن دراسات الجدوى والاستشارات وتقييم الشركات | إتقان",
                  "إجابات عن مدة الدراسة، البيانات المطلوبة، التحليل المالي، التسليم، وتقييم الشركات العائلية.", body, ld), "0.7"))

# ---------- عن إتقان ----------
founded = (re.search(r'founded: \{ year: "(\d{4})"', settings_js) or [None, ""])[1]
body = f"""<nav class="breadcrumb"><a href="/">الرئيسية</a><span class="sep">/</span>عن إتقان</nav>
<h1 class="pd-title">عن إتقان لخدمات الأعمال</h1>
<p class="service-lede">إتقان لخدمات الأعمال شركة سعودية{f' تأسست عام {founded}' if founded else ''}، تقدّم دراسات الجدوى والاستشارات وإعادة الهيكلة وتطوير الأعمال وتقييم الشركات لأصحاب المشاريع الجديدة والشركات القائمة في المملكة، بهدف مساعدتهم على اتخاذ قرارات مبنية على تحليل واضح لا على تخمين.</p>
<h2 class="sp-h2">ما يميز عملنا</h2>
<ul class="sp-list"><li>تحليل عملي يركز على ما يساعدك في اتخاذ القرار.</li><li>فهم لبيئة الأعمال والسوق في المملكة العربية السعودية.</li><li>مخرجات واضحة: تحليل وتوصيات، لا مجرد صفحات.</li><li>نطاق عمل مخصص لكل عميل، وعرض سعر قبل أي التزام.</li><li>سرية تامة لبيانات العملاء.</li></ul>
<h2 class="sp-h2">منظومة إتقان</h2>
<ul class="sp-list"><li><a href="https://www.itqanbs.sa">الموقع الرئيسي لإتقان</a></li><li><a href="https://start.itqanbs.sa">مبتدأ من إتقان</a> — خدمات الاستثمار الأجنبي وتأسيس الشركات لغير السعوديين.</li><li><a href="https://simam.itqanbs.sa">صمام من إتقان</a> — متابعة الطلبات والملفات وتنبيهات الأعمال.</li></ul>"""
urls.append((page("/about/", "عن إتقان لخدمات الأعمال — شركة استشارات سعودية",
                  "إتقان لخدمات الأعمال شركة سعودية تقدّم دراسات الجدوى والاستشارات وإعادة الهيكلة وتقييم الشركات.", body,
                  [{"@type": "AboutPage", "url": BASE + "/about/", "about": {"@id": BASE + "/#org"}}, crumbs(("الرئيسية", "/"), ("عن إتقان", "/about/"))]), "0.6"))

# ---------- sitemap ----------
(ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    "".join(f"  <url><loc>{u}</loc><lastmod>{TODAY}</lastmod><priority>{p}</priority></url>\n" for u, p in urls) + "</urlset>\n", encoding="utf-8")

# ---------- llms.txt / llms-full.txt ----------
llms = f"""# {ORG} — متجر الخدمات ({ORG_EN})

> متجر إتقان (store.itqanbs.sa) منصة سعودية لطلب الخدمات الاستشارية من {ORG}: دراسات الجدوى والسوق، تشخيص وحلول لتحديات الشركات، إعادة الهيكلة وتطوير الأعمال، تقييم الشركات والشركات العائلية، وخدمات مخصصة للشركات القائمة. لا توجد أسعار ثابتة؛ يطلب العميل عرض سعر ويصله عرض واضح بعد فهم احتياجه، ولا يبدأ العمل إلا بموافقته. الخدمة داخل المملكة العربية السعودية وباللغة العربية.

## الخدمات
""" + "".join(f"- [{s['title']}]({BASE}/services/{s['slug']}/): {s['short']}\n" for s in C["services"]) + f"""
## ابدأ حسب وضعك
""" + "".join(f"- {st['title']}: " + "، ".join([SVC[x]['title'] for x in st['services'] if x in SVC] + st['extras']) + "\n" for st in C["stages"]) + f"""
## كيف يطلب العميل
1. يختار الخدمة أو يرسل احتياجه: {BASE}/#/request
2. يتواصل الفريق لفهم النطاق ثم يرسل عرض سعر.
3. بعد الموافقة يحوّل العميل المبلغ ويرفع الإثبات، ثم يبدأ التنفيذ.
4. يتابع العميل طلبه برقم الطلب والبريد: {BASE}/#/track

## روابط
- [كل الخدمات]({BASE}/services/)
- [الأسئلة الشائعة]({BASE}/faq/)
- [عن إتقان]({BASE}/about/)
- [الموقع الرئيسي لإتقان](https://www.itqanbs.sa)
- [مبتدأ من إتقان — تأسيس الشركات للمستثمرين الأجانب](https://start.itqanbs.sa)
- [النص الكامل للخدمات]({BASE}/llms-full.txt)

## تواصل
- البريد: {EMAIL}
""" + (f"- واتساب: https://wa.me/{WA}\n" if WA else "")
(ROOT / "llms.txt").write_text(llms, encoding="utf-8")

full = llms + "\n---\n\n# تفاصيل الخدمات\n"
for s in C["services"]:
    full += f"\n## {s['title']}\nالرابط: {BASE}/services/{s['slug']}/\n\n{s['full']}\n\nتشمل:\n" + "".join(f"- {i}\n" for i in s["items"])
    for k, lab in [("target", "لمن تناسب"), ("duration", "المدة"), ("requirements", "المتطلبات"), ("delivery", "التسليم")]:
        if s.get(k): full += f"\n{lab}: {s[k]}\n"
full += "\n---\n\n# الأسئلة الشائعة\n" + "".join(f"\n## {f['q']}\n{f['a']}\n" for f in FAQ)
(ROOT / "llms-full.txt").write_text(full, encoding="utf-8")

# ---------- محتوى احتياطي في index.html (يقرؤه من لا يشغّل JavaScript) ----------
idx = (ROOT / "index.html").read_text(encoding="utf-8")
fallback = f"""<!--SEO-FALLBACK-START-->
<div class="seo-fallback wrap">
  <h1>دراسات الجدوى واستشارات الأعمال وتقييم الشركات في السعودية — {ORG}</h1>
  <p>اطلب دراسة جدوى أو استشارة أو تقييمًا لشركتك، ويصلك عرض سعر واضح قبل أي التزام.</p>
  <h2>خدماتنا</h2>
  <ul>{''.join(f'<li><a href="/services/{s["slug"]}/">{e(s["title"])}</a> — {e(s["short"])}</li>' for s in C["services"])}</ul>
  <p><a href="/stages/">ابدأ حسب وضعك</a> · <a href="/faq/">الأسئلة الشائعة</a> · <a href="/about/">عن إتقان</a> · <a href="/#/request">اطلب عرض سعر</a></p>
</div>
<!--SEO-FALLBACK-END-->"""
if "<!--SEO-FALLBACK-START-->" in idx:
    idx = re.sub(r"<!--SEO-FALLBACK-START-->.*?<!--SEO-FALLBACK-END-->", fallback, idx, flags=re.S)
else:
    idx = idx.replace('<div id="app"></div>', f'<div id="app">\n{fallback}\n</div>')
(ROOT / "index.html").write_text(idx, encoding="utf-8")

print("built", len(urls), "urls")
