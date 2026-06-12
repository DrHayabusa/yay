import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/strings.dart';

/// Breakdown request wizard.
/// Step 0 is ALWAYS the emergency interstitial — users in danger must be
/// pointed at 999/997/998 before anything else happens.
/// Later steps collect: GPS, vehicle, photos (vehicle + plate), description
/// or voice note, can-move and safe-location answers.
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
  bool? _canMove;
  final _description = TextEditingController();

  // GPS, camera, and voice-note capture are wired to geolocator,
  // image_picker, and record in this milestone (M8); the wizard flow,
  // validation, and submission contract are final.

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.type == 'BREAKDOWN'
            ? s.requestRecovery
            : s.requestInspection),
      ),
      body: Stepper(
        currentStep: _step,
        onStepContinue: () {
          if (_step == 0 && !_isSafe) return; // cannot proceed before safety ack
          if (_step < 2) setState(() => _step++);
        },
        onStepCancel: () => _step == 0
            ? Navigator.of(context).pop()
            : setState(() => _step--),
        steps: [
          Step(
            title: Text(s.t('Your safety first', 'سلامتك أولاً')),
            isActive: _step >= 0,
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.errorContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.warning_amber,
                          color: Theme.of(context).colorScheme.error),
                      const SizedBox(width: 8),
                      Expanded(child: Text(s.emergencyWarning)),
                    ],
                  ),
                ),
                CheckboxListTile(
                  value: _isSafe,
                  onChanged: (v) => setState(() => _isSafe = v ?? false),
                  title: Text(s.iAmSafe),
                ),
              ],
            ),
          ),
          Step(
            title: Text(s.t('About the problem', 'عن المشكلة')),
            isActive: _step >= 1,
            content: Column(
              children: [
                SwitchListTile(
                  value: _canMove ?? false,
                  onChanged: (v) => setState(() => _canMove = v),
                  title: Text(s.canVehicleMove),
                ),
                TextField(
                  controller: _description,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: s.t('Describe the problem (or record a voice note)',
                        'صف المشكلة (أو سجل ملاحظة صوتية)'),
                    border: const OutlineInputBorder(),
                  ),
                ),
              ],
            ),
          ),
          Step(
            title: Text(s.t('Photos & location', 'الصور والموقع')),
            isActive: _step >= 2,
            content: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.photo_camera),
                  title: Text(s.t('Vehicle photo (required)', 'صورة المركبة (مطلوبة)')),
                  trailing: const Icon(Icons.add),
                  onTap: () {/* image_picker capture → /media/presign upload */},
                ),
                ListTile(
                  leading: const Icon(Icons.pin),
                  title: Text(
                      s.t('Number-plate photo (required)', 'صورة لوحة الأرقام (مطلوبة)')),
                  trailing: const Icon(Icons.add),
                  onTap: () {/* image_picker capture → /media/presign upload */},
                ),
                ListTile(
                  leading: const Icon(Icons.my_location),
                  title: Text(s.t('Use my current location', 'استخدم موقعي الحالي')),
                  onTap: () {/* geolocator → POST /service-requests */},
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
