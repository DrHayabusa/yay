import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../widgets/road_timeline.dart';

/// The case journey as a road. Plain-language stops, newest pin glowing.
class TimelineScreen extends StatefulWidget {
  const TimelineScreen({super.key, required this.api});

  final ApiClient api;

  @override
  State<TimelineScreen> createState() => _TimelineScreenState();
}

class _TimelineScreenState extends State<TimelineScreen> {
  List<Map<String, dynamic>>? _entries;
  String? _vehicleLabel;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final list = await widget.api.request('GET', '/service-requests?limit=1');
      final data = (list['data'] as List).cast<Map<String, dynamic>>();
      if (data.isEmpty) {
        setState(() {
          _entries = [];
          _error = null;
        });
        return;
      }
      final first = data.first;
      final vehicle = first['vehicle'] as Map<String, dynamic>?;
      final id = first['id'] as String;
      final stops =
          await widget.api.requestList('GET', '/service-requests/$id/timeline');
      setState(() {
        _vehicleLabel = vehicle == null
            ? null
            : '${vehicle['make']} ${vehicle['model']} ${vehicle['year']}';
        _entries = stops;
        _error = null;
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  String _formatTime(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return iso;
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(dt.day)}.${two(dt.month)}.${dt.year}  ${two(dt.hour)}:${two(dt.minute)}';
  }

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(s.trackActive.toUpperCase())),
      body: RefreshIndicator(
        color: SanadColors.amber,
        onRefresh: _load,
        child: _error != null
            ? ListView(
                padding: const EdgeInsets.all(24),
                children: [Text(_error!, style: const TextStyle(color: SanadColors.red))],
              )
            : _entries == null
                ? const Center(
                    child: CircularProgressIndicator(color: SanadColors.amber))
                : _entries!.isEmpty
                    ? ListView(
                        padding: const EdgeInsets.all(24),
                        children: [
                          Text(
                            s.t('No active requests.', 'لا توجد طلبات حالية.'),
                            style: const TextStyle(color: SanadColors.muted),
                          ),
                        ],
                      )
                    : ListView(
                        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
                        children: [
                          if (_vehicleLabel != null) ...[
                            Text('YOUR VEHICLE',
                                style: Theme.of(context).textTheme.labelSmall),
                            const SizedBox(height: 4),
                            Text(_vehicleLabel!,
                                style: const TextStyle(
                                    fontSize: 19, fontWeight: FontWeight.w700)),
                            const SizedBox(height: 20),
                          ],
                          RoadTimeline(
                            stops: [
                              for (var i = 0; i < _entries!.length; i++)
                                RoadStopData(
                                  message: s.caseStatus(
                                      _entries![i]['toStatus'] as String? ?? ''),
                                  timestamp: _formatTime(
                                      _entries![i]['createdAt'] as String?),
                                  isCurrent: i == _entries!.length - 1,
                                  isSystem:
                                      _entries![i]['isSystem'] as bool? ?? false,
                                ),
                            ],
                          ),
                        ],
                      ),
      ),
    );
  }
}
