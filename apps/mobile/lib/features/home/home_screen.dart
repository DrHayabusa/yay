import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../widgets/big_action.dart';
import '../../widgets/hazard_strip.dart';
import '../../widgets/sanad_logo.dart';
import '../request/new_request_screen.dart';
import '../request/timeline_screen.dart';
import '../vehicles/vehicles_screen.dart';

/// Customer home. One oversized hero for the breakdown case — the reason the
/// app exists — and quiet ticket rows for everything else.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.api});

  final ApiClient api;

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
          children: [
            // brand bar
            Row(
              children: [
                const SanadLogo(size: 30),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'SANAD',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 3,
                      ),
                    ),
                    Text(
                      s.t('roadside · repair · parts', 'سحب · إصلاح · قطع غيار'),
                      style: const TextStyle(fontSize: 10, color: SanadColors.muted, letterSpacing: 0.5),
                    ),
                  ],
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.notifications_none, color: SanadColors.muted),
                  onPressed: () {},
                  tooltip: s.t('Notifications', 'الإشعارات'),
                ),
              ],
            ),
            const SizedBox(height: 22),

            Text(
              s.t('Trouble on the road?', 'مشكلة على الطريق؟'),
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 26),
            ),
            const SizedBox(height: 14),

            BigAction(
              title: s.requestRecovery,
              subtitle: s.t('Broken down? We come to you — tracked door to garage.',
                  'تعطلت مركبتك؟ نصل إليك ونتابع كل خطوة حتى الورشة.'),
              onTap: () => Navigator.of(context).push(MaterialPageRoute(
                  builder: (_) => NewRequestScreen(api: api, type: 'BREAKDOWN'))),
            ),
            const SizedBox(height: 12),

            SecondaryAction(
              icon: Icons.content_paste_search,
              title: s.requestInspection,
              subtitle: s.t('Something feels wrong? A verified garage checks it.',
                  'تشعر بوجود خلل؟ تفحصها ورشة معتمدة.'),
              onTap: () => Navigator.of(context).push(MaterialPageRoute(
                  builder: (_) => NewRequestScreen(api: api, type: 'INSPECTION_ONLY'))),
            ),
            const SizedBox(height: 10),
            SecondaryAction(
              icon: Icons.route,
              title: s.trackActive,
              subtitle: s.t('Live journey of your current request.',
                  'مسار طلبك الحالي لحظة بلحظة.'),
              onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => TimelineScreen(api: api))),
            ),
            const SizedBox(height: 10),
            SecondaryAction(
              icon: Icons.directions_car_filled,
              title: s.myVehicles,
              subtitle: s.t('Plates, VINs and documents in one place.',
                  'اللوحات وأرقام الهيكل والمستندات في مكان واحد.'),
              onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => VehiclesScreen(api: api))),
            ),
            const SizedBox(height: 10),
            SecondaryAction(
              icon: Icons.receipt_long,
              title: s.repairHistory,
              subtitle: s.t('Past repairs, invoices and warranties.',
                  'الإصلاحات السابقة والفواتير والضمانات.'),
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(s.t('Arriving with invoicing milestone', 'يصل قريباً')))),
            ),

            const SizedBox(height: 26),
            // safety footer — always visible, never buried
            Container(
              decoration: BoxDecoration(
                color: SanadColors.ink800,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: SanadColors.line),
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                children: [
                  const HazardStrip(height: 4),
                  Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        const Icon(Icons.emergency, color: SanadColors.red, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            s.t('Accident, injury or fire? Call 999 first.',
                                'حادث أو إصابة أو حريق؟ اتصل بـ 999 أولاً.'),
                            style: const TextStyle(fontSize: 12.5, color: SanadColors.muted),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
