#!/usr/bin/env python3
"""
بناء المتجر للأرشفة (Pre-rendering / SSG)

يشغّل التطبيق في متصفح حقيقي (Chromium) لكل رابط، ويحفظ الصفحة بعد اكتمال
رسمها كملف HTML ثابت في مسارها النظيف (مثل /services/business-valuation/index.html).
النتيجة: جوجل وأدوات الذكاء الاصطناعي تقرأ النص الكامل والروابط فور تحميل الصفحة
دون انتظار JavaScript، والزائر يحصل على نفس التطبيق التفاعلي.

يولّد أيضًا: seo-content.js، sitemap.xml، llms.txt، llms-full.txt، 404.html.

التشغيل:
  python3 tools/build.py          # يقرأ الخدمات من tools/content.json (بدون إنترنت)
  python3 tools/build.py --live   # يقرأ الخدمات مباشرة من قاعدة البيانات (يُستخدم في GitHub Actions)
"""
import asyncio, datetime, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = "https://store.itqanbs.sa"
LIVE = "--live" in sys.argv
C = json.loads((ROOT / "tools" / "content.json").read_text(encoding="utf-8"))
SHELL = (ROOT / "tools" / "shell.html").read_text(encoding="utf-8")
TODAY = datetime.date.today().isoformat()
ORG = "اتقان لخدمات الأعمال"

# ---------- 1) seo-content.js: المحتوى الإضافي لكل خدمة (عنوان SEO، أقسام، أسئلة) ----------
seo = {s["slug"]: {k: s[k] for k in ("seo_title", "h1", "meta_description", "sections", "faqs") if s.get(k)} for s in C["services"]}
(ROOT / "seo-content.js").write_text(
    "// مولَّد تلقائيًا من tools/content.json — لا تعدّله يدويًا\nwindow.ITQAN_SEO = "
    + json.dumps(seo, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")


# ---------- بيانات وهمية محلية بنفس شكل قاعدة البيانات ----------
def local_db():
    svcs = [{"id": f"svc-{i}", "slug": s["slug"], "title": s["title"], "short_description": s["short"],
             "full_description": s["full"], "items": s["items"], "target_customer": s.get("target"),
             "duration_note": s.get("duration"), "requirements_note": s.get("requirements"),
             "delivery_note": s.get("delivery"), "status": "published", "sort_order": i}
            for i, s in enumerate(C["services"], 1)]
    pkgs = [{"id": f"pkg-{i}", "slug": p["slug"], "title": p["title"], "short_description": p["short"],
             "audience": p.get("audience"), "service_slugs": p["services"], "items": p["extras"],
             "status": "published", "sort_order": i} for i, p in enumerate(C["stages"], 1)]
    return svcs, pkgs


STUB = """window.supabase={createClient(){const D={services:%s,packages:%s};
const q=(t)=>{let f={};const o={select(){return o},eq(k,v){f[k]=v;return o},order(){return o},
maybeSingle(){const r=(D[t]||[]).filter(x=>Object.keys(f).every(k=>x[k]===f[k]));return Promise.resolve({data:r[0]||null,error:null})},
then(res,rej){const r=(D[t]||[]).filter(x=>Object.keys(f).every(k=>x[k]===f[k]));return Promise.resolve({data:r,error:null}).then(res,rej)}};return o};
return{from:q,rpc:async()=>({data:null}),functions:{invoke:async()=>({})},storage:{from:()=>({upload:async()=>({})})}}}};"""

CTYPES = {"js": "text/javascript", "css": "text/css", "png": "image/png", "webp": "image/webp",
          "json": "application/json", "webmanifest": "application/manifest+json", "txt": "text/plain", "xml": "application/xml"}


async def prerender():
    from playwright.async_api import async_playwright
    svcs, pkgs = local_db()
    stub = STUB % (json.dumps(svcs, ensure_ascii=False), json.dumps(pkgs, ensure_ascii=False))

    routes = ["/", "/services/", "/stages/", "/how-it-works/", "/about/", "/faq/", "/contact/",
              "/request/", "/cart/", "/track-order/", "/done/"]
    live_slugs = None
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1280, "height": 900}, service_workers="block")

        async def handler(route):
            u = route.request.url
            if "supabase-js" in u and not LIVE:
                return await route.fulfill(body=stub, content_type="text/javascript")
            if u.startswith("http://prerender.local/"):
                path = u.split("prerender.local", 1)[1].split("?")[0].split("#")[0]
                f = ROOT / path.lstrip("/")
                if f.is_file() and not path.endswith("/") and f.suffix != ".html":
                    return await route.fulfill(body=f.read_bytes(), content_type=CTYPES.get(f.suffix[1:], "application/octet-stream"))
                return await route.fulfill(body=SHELL, content_type="text/html")  # كل المسارات تخدم قالب التطبيق
            if LIVE:
                return await route.continue_()
            return await route.abort()  # بلا إنترنت محليًا: الخطوط ونحوها تُتجاهل

        await ctx.route("**/*", handler)
        page = await ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        async def snap(path):
            await page.goto("http://prerender.local" + path, wait_until="networkidle")
            await page.wait_for_timeout(600)
            html = await page.evaluate("""() => {
              document.querySelectorAll('#installBanner').forEach(e => e.hidden = true);
              document.documentElement.removeAttribute('class');
              return '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
            }""")
            html = html.replace("http://prerender.local", BASE)
            out[path] = html

        # الصفحة الرئيسية أولًا لمعرفة قائمة الخدمات الفعلية (مهم في الوضع المباشر)
        await page.goto("http://prerender.local/services/", wait_until="networkidle")
        await page.wait_for_timeout(600)
        live_slugs = await page.evaluate("""() => [...new Set([...document.querySelectorAll('a[href^="/services/"]')]
            .map(a => a.getAttribute('href').split('/')[2]).filter(Boolean))]""")
        routes += [f"/services/{s}/" for s in live_slugs]
        for r in routes:
            await snap(r)
        await page.goto("http://prerender.local/__not_found__/", wait_until="networkidle")
        await page.wait_for_timeout(400)
        out["404"] = "<!DOCTYPE html>\n" + (await page.evaluate("() => document.documentElement.outerHTML")).replace("http://prerender.local", BASE)
        await b.close()
        if errors:
            print("JS errors:", errors)
    return out, live_slugs


out, slugs = asyncio.run(prerender())
for path, html in out.items():
    f = ROOT / "404.html" if path == "404" else ROOT / path.lstrip("/") / "index.html"
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(html, encoding="utf-8")

# حذف صفحات خدمات قديمة لم تعد موجودة
for d in (ROOT / "services").iterdir():
    if d.is_dir() and d.name not in slugs:
        for x in d.iterdir():
            x.unlink()
        d.rmdir()

# ---------- sitemap.xml ----------
pages = [("/", "1.0"), ("/services/", "0.9")] + [(f"/services/{s}/", "0.9") for s in slugs] + \
        [("/stages/", "0.8"), ("/how-it-works/", "0.6"), ("/faq/", "0.7"), ("/about/", "0.6"), ("/contact/", "0.5"), ("/request/", "0.6")]
(ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    "".join(f"  <url><loc>{BASE}{u}</loc><lastmod>{TODAY}</lastmod><priority>{p}</priority></url>\n" for u, p in pages) +
    "</urlset>\n", encoding="utf-8")

# ---------- llms.txt / llms-full.txt ----------
SV = {s["slug"]: s for s in C["services"]}
llms = f"""# {ORG} — متجر الخدمات (Itqan Business Services)

> متجر إتقان (store.itqanbs.sa) منصة سعودية لطلب الخدمات الاستشارية من {ORG}: دراسات الجدوى والسوق، الاستشارات الإدارية وتشخيص تحديات الشركات، إعادة الهيكلة وتطوير الأعمال، تقييم الشركات والشركات العائلية، وخدمات مخصصة للشركات القائمة. لا توجد أسعار ثابتة؛ يطلب العميل عرض سعر ويصله عرض واضح بعد فهم احتياجه، ولا يبدأ العمل إلا بموافقته. الرقم الوطني الموحد للمنشأة: 7049388205.

## الخدمات
""" + "".join(f"- [{s.get('h1') or s['title']}]({BASE}/services/{s['slug']}/): {s['short']}\n" for s in C["services"]) + """
## ابدأ حسب وضعك
""" + "".join(f"- {st['title']}: " + "، ".join([SV[x]['title'] for x in st['services'] if x in SV] + st['extras']) + "\n" for st in C["stages"]) + f"""
## كيف يطلب العميل
1. يختار الخدمة أو يرسل احتياجه: {BASE}/request/
2. يتواصل الفريق لفهم النطاق ثم يرسل عرض سعر.
3. بعد الموافقة يحوّل العميل المبلغ ويرفع الإثبات، ثم يبدأ التنفيذ.

## روابط
- [كل الخدمات]({BASE}/services/)
- [ابدأ حسب وضعك]({BASE}/stages/)
- [الأسئلة الشائعة]({BASE}/faq/)
- [عن إتقان]({BASE}/about/)
- [الموقع الرئيسي لإتقان](https://www.itqanbs.sa)
- [النص الكامل للخدمات]({BASE}/llms-full.txt)

## تواصل
- البريد: info@itqanbs.sa
- واتساب: https://wa.me/966569051686
"""
(ROOT / "llms.txt").write_text(llms, encoding="utf-8")
full = llms + "\n---\n\n# تفاصيل الخدمات\n"
for s in C["services"]:
    full += f"\n## {s.get('h1') or s['title']}\nالرابط: {BASE}/services/{s['slug']}/\n\n{s['full']}\n"
    for h, t in s.get("sections", []):
        full += f"\n### {h}\n{t}\n"
    full += "\nتشمل:\n" + "".join(f"- {i}\n" for i in s["items"])
    for q, a in s.get("faqs", []):
        full += f"\nس: {q}\nج: {a}\n"
(ROOT / "llms-full.txt").write_text(full, encoding="utf-8")

print(f"built {len(out)} pages; services: {', '.join(slugs)}")
