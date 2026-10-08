-- ============================================================
-- اتقان — المرحلة الثالثة
-- نفّذه مرة واحدة في Supabase → SQL Editor (آمن لو تكرر تنفيذه)
-- ============================================================

-- 1) عمود السعر الاسترشادي "تبدأ من" (اختياري لكل خدمة)
alter table public.services add column if not exists price_from numeric;

-- 2) خدمة جديدة: استشارات تقييم الشركات والشركات العائلية
do $$
declare
  v_items jsonb := '[
    "تحديد الغرض من التقييم ونطاقه",
    "تحليل القوائم المالية وتسويتها",
    "التقييم بأكثر من منهجية (التدفقات النقدية المخصومة، المضاعفات السوقية، صافي الأصول)",
    "تقدير القيمة العادلة للشركة ولحصة كل شريك",
    "تحليل الحساسية والسيناريوهات",
    "مراعاة خصوصية الشركة العائلية: الحوكمة، التعاقب، ومصالح الأطراف",
    "تقرير تقييم واضح مع التوصيات",
    "جلسة عرض النتائج على الشركاء"
  ]'::jsonb;
  v_type text;
begin
  if exists (select 1 from public.services where slug = 'business-valuation') then
    raise notice 'الخدمة موجودة مسبقًا — لم يتغير شيء';
    return;
  end if;

  insert into public.services
    (slug, title, short_description, full_description, target_customer,
     duration_note, requirements_note, delivery_note, sort_order, status)
  values (
    'business-valuation',
    'استشارات تقييم الشركات والشركات العائلية',
    'تقييم مستقل ومحايد لقيمة شركتك أو حصص الشركاء، بمنهجية واضحة تراعي خصوصية الشركات العائلية.',
    'نساعدك على معرفة القيمة العادلة لشركتك أو للحصص فيها قبل أي قرار مهم: توزيع الحصص بين الورثة أو الشركاء، دخول شريك أو مستثمر جديد، تخارج أحد الشركاء، البيع أو الاندماج، أو إعادة الهيكلة. في الشركات العائلية نعمل كطرف محايد يقدّم أرقامًا يُبنى عليها الاتفاق بدل الخلاف، مع سرية تامة للبيانات.',
    'الشركات العائلية، الشركاء والورثة، الشركات القائمة المقبلة على دخول مستثمر أو تخارج أو بيع',
    'تُحدَّد ضمن عرض السعر حسب حجم الشركة وتوفر البيانات',
    'القوائم المالية لآخر ثلاث سنوات (مدققة إن وُجدت)، عقد التأسيس وتوزيع الحصص، وأي بيانات عن الأصول والالتزامات والخطط المستقبلية',
    'تقرير تقييم إلكتروني، مع جلسة لشرح النتائج للشركاء أو أفراد العائلة',
    5,
    'published'
  );

  -- عمود البنود قد يكون jsonb أو text[] حسب إعدادكم؛ نتعامل مع الحالتين
  select data_type into v_type from information_schema.columns
   where table_schema = 'public' and table_name = 'services' and column_name = 'items';
  if v_type in ('jsonb', 'json') then
    update public.services set items = v_items where slug = 'business-valuation';
  else
    execute 'update public.services set items = $1 where slug = $2'
      using (select array_agg(x) from jsonb_array_elements_text(v_items) x), 'business-valuation';
  end if;
end $$;

-- 3) حماية مخزن إثباتات السداد: مخزن خاص، حد 10 ميجابايت، صور و PDF فقط
update storage.buckets
   set public = false,
       file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','application/pdf']
 where id = 'payment-proofs';
