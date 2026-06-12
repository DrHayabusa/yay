import type { CaseStatus } from './case-status';

/**
 * Plain-language status copy for customers, in English and Arabic.
 * Clients must render from these codes — never hardcode status text.
 */
export const STATUS_MESSAGES: Record<CaseStatus, { en: string; ar: string }> = {
  REQUEST_CREATED: {
    en: 'We have received your request.',
    ar: 'لقد استلمنا طلبك.',
  },
  AWAITING_RECOVERY_ASSIGNMENT: {
    en: 'We are finding a recovery driver near you.',
    ar: 'نبحث عن سائق سحب قريب منك.',
  },
  RECOVERY_ASSIGNED: {
    en: 'A recovery driver has been assigned.',
    ar: 'تم تعيين سائق سحب لمركبتك.',
  },
  RECOVERY_EN_ROUTE: {
    en: 'The recovery driver is on the way to you.',
    ar: 'سائق السحب في الطريق إليك.',
  },
  RECOVERY_ARRIVED: {
    en: 'The recovery driver has arrived at your location.',
    ar: 'وصل سائق السحب إلى موقعك.',
  },
  VEHICLE_COLLECTED: {
    en: 'Your vehicle has been collected.',
    ar: 'تم استلام مركبتك.',
  },
  VEHICLE_IN_TRANSIT: {
    en: 'Your vehicle is on its way to the garage.',
    ar: 'مركبتك في الطريق إلى الورشة.',
  },
  VEHICLE_AT_GARAGE: {
    en: 'Your vehicle has reached the garage.',
    ar: 'وصلت مركبتك إلى الورشة.',
  },
  INSPECTION_IN_PROGRESS: {
    en: 'The garage is inspecting your vehicle.',
    ar: 'تقوم الورشة بفحص مركبتك.',
  },
  DIAGNOSIS_SUBMITTED: {
    en: 'The garage has completed its inspection.',
    ar: 'أكملت الورشة فحص مركبتك.',
  },
  AWAITING_CUSTOMER_APPROVAL: {
    en: 'Your approval is required.',
    ar: 'نحتاج إلى موافقتك للمتابعة.',
  },
  PARTS_SELECTION_REQUIRED: {
    en: 'Please choose the spare parts you prefer.',
    ar: 'يرجى اختيار قطع الغيار التي تفضلها.',
  },
  PARTS_ORDERED: {
    en: 'The selected spare part has been ordered.',
    ar: 'تم طلب قطعة الغيار المختارة.',
  },
  PARTS_DISPATCHED: {
    en: 'Your spare parts are on the way to the garage.',
    ar: 'قطع الغيار في الطريق إلى الورشة.',
  },
  PARTS_DELIVERED: {
    en: 'The spare parts have arrived at the garage.',
    ar: 'وصلت قطع الغيار إلى الورشة.',
  },
  REPAIR_IN_PROGRESS: {
    en: 'Repair work has started.',
    ar: 'بدأت أعمال الإصلاح.',
  },
  QUALITY_CHECK_IN_PROGRESS: {
    en: 'We are checking the quality of the repair.',
    ar: 'نقوم بفحص جودة الإصلاح.',
  },
  REPAIR_COMPLETED: {
    en: 'The repair is complete.',
    ar: 'اكتمل الإصلاح.',
  },
  DELIVERY_SCHEDULED: {
    en: 'Delivery of your vehicle has been scheduled.',
    ar: 'تم تحديد موعد تسليم مركبتك.',
  },
  VEHICLE_OUT_FOR_DELIVERY: {
    en: 'Your vehicle is on its way back to you.',
    ar: 'مركبتك في طريق العودة إليك.',
  },
  VEHICLE_DELIVERED: {
    en: 'Your vehicle has been delivered. Thank you!',
    ar: 'تم تسليم مركبتك. شكراً لك!',
  },
  CASE_CLOSED: {
    en: 'This request is closed. Your invoice and warranty are available.',
    ar: 'تم إغلاق هذا الطلب. الفاتورة والضمان متاحان لك.',
  },
  CANCELLED: {
    en: 'This request was cancelled.',
    ar: 'تم إلغاء هذا الطلب.',
  },
  DISPUTED: {
    en: 'This request is under review by our support team.',
    ar: 'هذا الطلب قيد المراجعة من فريق الدعم.',
  },
};

/** Emergency interstitial shown before any breakdown request. */
export const EMERGENCY_WARNING = {
  en: 'If there is an accident, injury, fire, fuel leak, or immediate danger on the road, call the Police on 999 (Ambulance 998, Fire 997) before using this app.',
  ar: 'في حال وقوع حادث أو إصابة أو حريق أو تسرب وقود أو خطر مباشر على الطريق، اتصل بالشرطة على 999 (الإسعاف 998، الإطفاء 997) قبل استخدام هذا التطبيق.',
};
