import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../widgets/hazard_strip.dart';

/// Breakdown request wizard.
/// Step 0 is ALWAYS the emergency gate — users in danger are pointed at
/// 999/997/998 before anything else, and cannot continue without
/// acknowledging it. Later steps collect the problem, photos and GPS.
class NewRequestScreen extends StatefulWidget {
  const NewRequestScreen({super.key, required this.api, required this.type});

  final ApiClient api;
  final String type; // BREAKDOWN | INSPECTION_ONLY

  @override
  State<NewRequestScreen> createState() => _NewRequestScreenState();
}

class _NewRequestScreenState extends State<NewRequestScreen> {
  int _step = 0;
  bool _isSafe = false;
  bool _canMove = false;
  final _description = TextEditingController();

  // GPS, camera and voice capture wire into geolocator / image_picker /
  // record in milestone M8; the flow, validation and submission contract
  // (POST /service-requests) are final.

  static const _steps = 3;

  void _next() {
    if (_step == 0 && !_isSafe) return;
    if (_step < _steps - 1) setState(() => _step++);
  }

  void _back() {
    if (_step == 0) {
      Navigator.of(context).pop();
    } else {
      setState(() => _step--);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text((widget.type == 'BREAKDOWN' ? s.requestRecovery : s.requestInspection)
            .toUpperCase()),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: _back),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // progress: amber road segments, one per step
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
            child: Row(
              children: [
                for (var i = 0; i < _steps; i++) ...[
                  Expanded(
                    child: Container(
                      height: 4,
                      decoration: BoxDecoration(
                        color: i <= _step ? SanadColors.amber : SanadColors.ink600,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  if (i < _steps - 1) const SizedBox(width: 6),
                ],
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [_buildStep(context, s)],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              child: FilledButton(
                onPressed: (_step == 0 && !_isSafe) ? null : _next,
                child: Text(_step == _steps - 1
                    ? s.t('SEND REQUEST', 'إرسال الطلب')
                    : s.t('CONTINUE', 'متابعة')),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStep(BuildContext context, S s) {
    switch (_step) {
      case 0:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(s.t('Your safety first.', 'سلامتك أولاً.'),
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 24)),
            const SizedBox(height: 16),
            // the emergency gate — hazard-framed, impossible to miss
            Container(
              decoration: BoxDecoration(
                color: SanadColors.ink800,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: SanadColors.amberDeep),
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const HazardStrip(height: 8),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(s.emergencyWarning,
                            style: const TextStyle(fontSize: 14.5, height: 1.5)),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            for (final e in const [
                              ('999', Icons.local_police),
                              ('998', Icons.medical_services),
                              ('997', Icons.local_fire_department),
                            ]) ...[
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                  decoration: BoxDecoration(
                                    color: SanadColors.ink600,
                                    borderRadius: BorderRadius.circular(5),
                                  ),
                                  child: Column(
                                    children: [
                                      Icon(e.$2, size: 18, color: SanadColors.red),
                                      const SizedBox(height: 4),
                                      Text(e.$1,
                                          style: const TextStyle(
                                              fontWeight: FontWeight.w800,
                                              fontSize: 16,
                                              letterSpacing: 1)),
                                    ],
                                  ),
                                ),
                              ),
                              if (e.$1 != '997') const SizedBox(width: 8),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                  const HazardStrip(height: 8),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: CheckboxListTile(
                value: _isSafe,
                activeColor: SanadColors.amber,
                checkColor: SanadColors.ink900,
                onChanged: (v) => setState(() => _isSafe = v ?? false),
                title: Text(s.iAmSafe,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(
                  s.t('Away from moving traffic, hazard lights on.',
                      'بعيداً عن حركة المرور، مع تشغيل أضواء الطوارئ.'),
                  style: const TextStyle(fontSize: 12.5, color: SanadColors.muted),
                ),
              ),
            ),
          ],
        );

      case 1:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(s.t('What happened?', 'ماذا حدث؟'),
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 24)),
            const SizedBox(height: 16),
            Card(
              child: SwitchListTile(
                value: _canMove,
                activeColor: SanadColors.amber,
                onChanged: (v) => setState(() => _canMove = v),
                title: Text(s.canVehicleMove,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(
                  s.t('This helps us choose the right tow truck.',
                      'يساعدنا هذا في اختيار شاحنة السحب المناسبة.'),
                  style: const TextStyle(fontSize: 12.5, color: SanadColors.muted),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _description,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: s.t('Describe the problem in your own words…',
                    'صف المشكلة بكلماتك…'),
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () {/* record voice note (M8 wiring) */},
              icon: const Icon(Icons.mic, color: SanadColors.amber),
              label: Text(s.t('OR RECORD A VOICE NOTE', 'أو سجل ملاحظة صوتية')),
            ),
            const SizedBox(height: 12),
            Text(
              s.t('A photo helps us document the problem — the final diagnosis always comes from the garage after inspection.',
                  'الصورة تساعدنا في توثيق المشكلة — التشخيص النهائي يصدر دائماً من الورشة بعد الفحص.'),
              style: const TextStyle(fontSize: 12, color: SanadColors.muted, height: 1.5),
            ),
          ],
        );

      default:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(s.t('Photos & location', 'الصور والموقع'),
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 24)),
            const SizedBox(height: 16),
            _CaptureTile(
              icon: Icons.photo_camera,
              title: s.t('Vehicle photo', 'صورة المركبة'),
              required: true,
              onTap: () {/* image_picker → /media/presign upload (M8) */},
            ),
            const SizedBox(height: 10),
            _CaptureTile(
              icon: Icons.pin,
              title: s.t('Number-plate photo', 'صورة لوحة الأرقام'),
              required: true,
              onTap: () {/* image_picker → /media/presign upload (M8) */},
            ),
            const SizedBox(height: 10),
            _CaptureTile(
              icon: Icons.my_location,
              title: s.t('Confirm my location', 'تأكيد موقعي'),
              required: true,
              onTap: () {/* geolocator → POST /service-requests (M8) */},
            ),
          ],
        );
    }
  }
}

class _CaptureTile extends StatelessWidget {
  const _CaptureTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.required = false,
  });

  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final bool required;

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    return Material(
      color: SanadColors.ink800,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(6),
        side: const BorderSide(color: SanadColors.line),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Row(
            children: [
              Icon(icon, color: SanadColors.amber, size: 22),
              const SizedBox(width: 14),
              Expanded(
                child: Text(title,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              ),
              if (required)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: SanadColors.amber.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(3),
                  ),
                  child: Text(
                    s.t('REQUIRED', 'مطلوب'),
                    style: const TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1,
                        color: SanadColors.amber),
                  ),
                ),
              const SizedBox(width: 10),
              const Icon(Icons.add, color: SanadColors.muted, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
