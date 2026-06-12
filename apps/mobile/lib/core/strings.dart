import 'package:flutter/widgets.dart';

/// Plain-language copy in English and Arabic. Status messages mirror
/// packages/shared/src/status-messages.ts — keep the two in sync.
class S {
  S(this.locale);

  final Locale locale;
  bool get isAr => locale.languageCode == 'ar';

  static S of(BuildContext context) =>
      S(Localizations.maybeLocaleOf(context) ?? const Locale('en'));

  String t(String en, String ar) => isAr ? ar : en;

  // Home actions
  String get requestRecovery => t('Request recovery', 'اطلب سحب المركبة');
  String get requestInspection => t('Request vehicle inspection', 'اطلب فحص المركبة');
  String get trackActive => t('Track active request', 'تتبع طلبك الحالي');
  String get myVehicles => t('My vehicles', 'مركباتي');
  String get repairHistory => t('Repair history', 'سجل الإصلاحات');

  // Safety
  String get emergencyWarning => t(
        'If there is an accident, injury, fire, fuel leak, or immediate danger on the road, call the Police on 999 (Ambulance 998, Fire 997) before using this app.',
        'في حال وقوع حادث أو إصابة أو حريق أو تسرب وقود أو خطر مباشر على الطريق، اتصل بالشرطة على 999 (الإسعاف 998، الإطفاء 997) قبل استخدام هذا التطبيق.',
      );
  String get iAmSafe => t('I am in a safe place', 'أنا في مكان آمن');
  String get canVehicleMove => t('Can the vehicle move?', 'هل يمكن للمركبة التحرك؟');

  // Status messages keyed by CaseStatus (subset; same codes as the backend).
  String caseStatus(String status) {
    const en = <String, String>{
      'REQUEST_CREATED': 'We have received your request.',
      'AWAITING_RECOVERY_ASSIGNMENT': 'We are finding a recovery driver near you.',
      'RECOVERY_ASSIGNED': 'A recovery driver has been assigned.',
      'RECOVERY_EN_ROUTE': 'The recovery driver is on the way to you.',
      'RECOVERY_ARRIVED': 'The recovery driver has arrived at your location.',
      'VEHICLE_COLLECTED': 'Your vehicle has been collected.',
      'VEHICLE_IN_TRANSIT': 'Your vehicle is on its way to the garage.',
      'VEHICLE_AT_GARAGE': 'Your vehicle has reached the garage.',
      'INSPECTION_IN_PROGRESS': 'The garage is inspecting your vehicle.',
      'DIAGNOSIS_SUBMITTED': 'The garage has completed its inspection.',
      'AWAITING_CUSTOMER_APPROVAL': 'Your approval is required.',
      'PARTS_SELECTION_REQUIRED': 'Please choose the spare parts you prefer.',
      'PARTS_ORDERED': 'The selected spare part has been ordered.',
      'PARTS_DISPATCHED': 'Your spare parts are on the way to the garage.',
      'PARTS_DELIVERED': 'The spare parts have arrived at the garage.',
      'REPAIR_IN_PROGRESS': 'Repair work has started.',
      'QUALITY_CHECK_IN_PROGRESS': 'We are checking the quality of the repair.',
      'REPAIR_COMPLETED': 'The repair is complete.',
      'DELIVERY_SCHEDULED': 'Delivery of your vehicle has been scheduled.',
      'VEHICLE_OUT_FOR_DELIVERY': 'Your vehicle is on its way back to you.',
      'VEHICLE_DELIVERED': 'Your vehicle has been delivered. Thank you!',
      'CASE_CLOSED': 'This request is closed.',
      'CANCELLED': 'This request was cancelled.',
      'DISPUTED': 'This request is under review by our support team.',
    };
    const ar = <String, String>{
      'REQUEST_CREATED': 'لقد استلمنا طلبك.',
      'AWAITING_RECOVERY_ASSIGNMENT': 'نبحث عن سائق سحب قريب منك.',
      'RECOVERY_ASSIGNED': 'تم تعيين سائق سحب لمركبتك.',
      'RECOVERY_EN_ROUTE': 'سائق السحب في الطريق إليك.',
      'RECOVERY_ARRIVED': 'وصل سائق السحب إلى موقعك.',
      'VEHICLE_COLLECTED': 'تم استلام مركبتك.',
      'VEHICLE_IN_TRANSIT': 'مركبتك في الطريق إلى الورشة.',
      'VEHICLE_AT_GARAGE': 'وصلت مركبتك إلى الورشة.',
      'INSPECTION_IN_PROGRESS': 'تقوم الورشة بفحص مركبتك.',
      'DIAGNOSIS_SUBMITTED': 'أكملت الورشة فحص مركبتك.',
      'AWAITING_CUSTOMER_APPROVAL': 'نحتاج إلى موافقتك للمتابعة.',
      'PARTS_SELECTION_REQUIRED': 'يرجى اختيار قطع الغيار التي تفضلها.',
      'PARTS_ORDERED': 'تم طلب قطعة الغيار المختارة.',
      'PARTS_DISPATCHED': 'قطع الغيار في الطريق إلى الورشة.',
      'PARTS_DELIVERED': 'وصلت قطع الغيار إلى الورشة.',
      'REPAIR_IN_PROGRESS': 'بدأت أعمال الإصلاح.',
      'QUALITY_CHECK_IN_PROGRESS': 'نقوم بفحص جودة الإصلاح.',
      'REPAIR_COMPLETED': 'اكتمل الإصلاح.',
      'DELIVERY_SCHEDULED': 'تم تحديد موعد تسليم مركبتك.',
      'VEHICLE_OUT_FOR_DELIVERY': 'مركبتك في طريق العودة إليك.',
      'VEHICLE_DELIVERED': 'تم تسليم مركبتك. شكراً لك!',
      'CASE_CLOSED': 'تم إغلاق هذا الطلب.',
      'CANCELLED': 'تم إلغاء هذا الطلب.',
      'DISPUTED': 'هذا الطلب قيد المراجعة من فريق الدعم.',
    };
    final table = isAr ? ar : en;
    return table[status] ?? status;
  }
}
