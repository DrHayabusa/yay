import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../widgets/plate_chip.dart';

/// "My vehicles" — each car is a garage card with its physical plate.
class VehiclesScreen extends StatefulWidget {
  const VehiclesScreen({super.key, required this.api});

  final ApiClient api;

  @override
  State<VehiclesScreen> createState() => _VehiclesScreenState();
}

class _VehiclesScreenState extends State<VehiclesScreen> {
  List<Map<String, dynamic>>? _vehicles;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final rows = await widget.api.requestList('GET', '/vehicles');
      setState(() {
        _vehicles = rows;
        _error = null;
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _openAddSheet() async {
    final added = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: SanadColors.ink800,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(10)),
      ),
      builder: (_) => _AddVehicleSheet(api: widget.api),
    );
    if (added == true) await _load();
  }

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(s.myVehicles.toUpperCase())),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAddSheet,
        backgroundColor: SanadColors.amber,
        foregroundColor: SanadColors.ink900,
        icon: const Icon(Icons.add),
        label: Text(s.t('ADD VEHICLE', 'إضافة مركبة'),
            style: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1)),
      ),
      body: _error != null
          ? Center(child: Text(_error!, style: const TextStyle(color: SanadColors.red)))
          : _vehicles == null
              ? const Center(child: CircularProgressIndicator(color: SanadColors.amber))
              : _vehicles!.isEmpty
                  ? Center(
                      child: Text(
                        s.t('No vehicles yet — add your first.',
                            'لا توجد مركبات بعد — أضف مركبتك الأولى.'),
                        style: const TextStyle(color: SanadColors.muted),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(18, 16, 18, 96),
                      itemCount: _vehicles!.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, i) {
                        final v = _vehicles![i];
                        return Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${v['make']} ${v['model']}',
                                        style: const TextStyle(
                                            fontSize: 16, fontWeight: FontWeight.w700),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${v['year']}${v['color'] != null ? ' · ${v['color']}' : ''}',
                                        style: const TextStyle(
                                            fontSize: 12.5, color: SanadColors.muted),
                                      ),
                                      if (v['vin'] != null) ...[
                                        const SizedBox(height: 6),
                                        Text(
                                          'VIN ${v['vin']}',
                                          style: const TextStyle(
                                              fontSize: 11, color: SanadColors.muted),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                PlateChip(
                                  emirate: v['plateEmirate'] as String? ?? '',
                                  code: v['plateCode'] as String?,
                                  number: v['plateNumber'] as String? ?? '',
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}

class _AddVehicleSheet extends StatefulWidget {
  const _AddVehicleSheet({required this.api});

  final ApiClient api;

  @override
  State<_AddVehicleSheet> createState() => _AddVehicleSheetState();
}

class _AddVehicleSheetState extends State<_AddVehicleSheet> {
  final _make = TextEditingController();
  final _model = TextEditingController();
  final _year = TextEditingController();
  final _plateCode = TextEditingController();
  final _plateNumber = TextEditingController();
  final _vin = TextEditingController();
  String _emirate = 'Dubai';
  bool _busy = false;
  String? _error;

  Future<void> _save() async {
    final year = int.tryParse(_year.text.trim());
    if (_make.text.trim().isEmpty ||
        _model.text.trim().isEmpty ||
        year == null ||
        _plateCode.text.trim().isEmpty ||
        _plateNumber.text.trim().isEmpty) {
      setState(() => _error = S.of(context).t(
          'Please fill make, model, year and plate.',
          'يرجى إدخال النوع والطراز والسنة واللوحة.'));
      return;
    }
    setState(() => _busy = true);
    try {
      await widget.api.request('POST', '/vehicles', body: {
        'make': _make.text.trim(),
        'model': _model.text.trim(),
        'year': year,
        'plateEmirate': _emirate,
        'plateCode': _plateCode.text.trim().toUpperCase(),
        'plateNumber': _plateNumber.text.trim(),
        if (_vin.text.trim().isNotEmpty) 'vin': _vin.text.trim().toUpperCase(),
      });
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 18, 20, 20 + bottomInset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(s.t('ADD VEHICLE', 'إضافة مركبة'),
              style: Theme.of(context).textTheme.labelSmall),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _make,
                  decoration: InputDecoration(hintText: s.t('Make — Toyota', 'النوع')),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _model,
                  decoration: InputDecoration(hintText: s.t('Model — Camry', 'الطراز')),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              SizedBox(
                width: 110,
                child: TextField(
                  controller: _year,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(hintText: s.t('Year', 'السنة')),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _emirate,
                  dropdownColor: SanadColors.ink700,
                  items: const [
                    'Dubai', 'Sharjah', 'Abu Dhabi', 'Ajman',
                    'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah',
                  ].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                  onChanged: (v) => setState(() => _emirate = v ?? 'Dubai'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              SizedBox(
                width: 110,
                child: TextField(
                  controller: _plateCode,
                  maxLength: 3,
                  decoration: InputDecoration(
                      counterText: '', hintText: s.t('Code — A', 'الرمز')),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _plateNumber,
                  keyboardType: TextInputType.number,
                  maxLength: 5,
                  decoration: InputDecoration(
                      counterText: '', hintText: s.t('Plate number', 'رقم اللوحة')),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _vin,
            maxLength: 17,
            decoration: InputDecoration(
                counterText: '', hintText: s.t('VIN — optional', 'رقم الهيكل — اختياري')),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: Text(s.t('SAVE VEHICLE', 'حفظ المركبة')),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(_error!,
                  style: const TextStyle(color: SanadColors.red, fontSize: 13)),
            ),
        ],
      ),
    );
  }
}
