// ============================================================
// إعدادات المحتوى العام للموقع
// هنا تضيف منصات اتقان الأخرى لتظهر في الصفحة الرئيسية.
// المنصة لا تظهر إلا إذا وضعت لها رابطًا (url).
//
// لمعرفة مصدر العملاء القادمين من منصة أخرى، ضع في تلك المنصة رابطًا لهذا الموقع بهذا الشكل:
//   https://store.itqanbs.sa/?src=samam
// وسيظهر "samam" كمصدر للطلب في لوحة التحكم.
// ============================================================
window.ITQAN_SETTINGS = {
  contactEmail: "info@itqanbs.sa",
  mainSiteUrl: "https://www.itqanbs.sa",
  founded: { year: "2024", note: "شركة سعودية" },

  // بيانات الثقة — تظهر في الفوتر وصفحة "عن إتقان" فقط إذا عُبّئت
  crNumber: "",        // رقم السجل التجاري
  vatNumber: "",       // الرقم الضريبي
  businessCenterUrl: "", // رابط توثيق المركز السعودي للأعمال
  legal: {
    privacyUrl: "https://www.itqanbs.sa/privacy/",
    termsUrl: "https://www.itqanbs.sa/terms/",
  },
  social: [
    { name: "انستقرام", url: "https://www.instagram.com/itqan.business?igsh=MzQ2N2RxaHZtYm84" },
    { name: "X", url: "https://x.com/infoitqanbs?s=21" },
    { name: "لينكدإن", url: "https://www.linkedin.com/company/itqan-business-services" },
    { name: "تيك توك", url: "https://www.tiktok.com/@itqanbs?_r=1&_t=ZS-97sogmCe3Gc" },
    { name: "فيسبوك", url: "https://www.facebook.com/share/1HTgwCNa7R/?mibextid=wwXIfr" },
  ],
  ecosystem: [
    { name: "صمام",  description: "تابع طلباتك وملفاتك وتنبيهات أعمالك في مكان واحد.", url: "https://simam.itqanbs.sa" },
    { name: "مبتدأ", description: "خدمات الاستثمار الأجنبي وتأسيس الشركات لغير السعوديين.", url: "https://start.itqanbs.sa" },
  ],
};
