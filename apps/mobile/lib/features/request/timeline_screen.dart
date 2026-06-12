import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/strings.dart';

/// Case timeline: plain-language status messages, newest at the bottom,
/// rendered from message codes so en/ar copy stays consistent everywhere.
class TimelineScreen extends StatefulWidget {
  const TimelineScreen({super.key, required this.api});

  final ApiClient api;

  @override
  State<TimelineScreen> createState() => _TimelineScreenState();
}

class _TimelineScreenState extends State<TimelineScreen> {
  List<Map<String, dynamic>>? _entries;
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
        setState(() => _entries = []);
        return;
      }
      final id = data.first['id'] as String;
      final res = await widget.api.request('GET', '/service-requests/$id/timeline');
      // Single-object responses come back as maps; timeline is a list envelope.
      setState(() => _entries =
          ((res as dynamic) is List ? res as List : res['data'] ?? [])
              .cast<Map<String, dynamic>>());
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(s.trackActive)),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _error != null
            ? Center(child: Text(_error!))
            : _entries == null
                ? const Center(child: CircularProgressIndicator())
                : _entries!.isEmpty
                    ? Center(
                        child: Text(s.t('No active requests.', 'لا توجد طلبات حالية.')))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _entries!.length,
                        itemBuilder: (context, i) {
                          final e = _entries![i];
                          final isLast = i == _entries!.length - 1;
                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Column(
                                children: [
                                  Icon(
                                    isLast
                                        ? Icons.radio_button_checked
                                        : Icons.check_circle,
                                    color: Theme.of(context).colorScheme.primary,
                                  ),
                                  if (!isLast)
                                    Container(
                                        width: 2,
                                        height: 40,
                                        color: Theme.of(context).dividerColor),
                                ],
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.only(bottom: 16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        s.caseStatus(e['toStatus'] as String? ?? ''),
                                        style:
                                            Theme.of(context).textTheme.titleMedium,
                                      ),
                                      Text(
                                        (e['createdAt'] as String? ?? '')
                                            .replaceFirst('T', '  ')
                                            .split('.')
                                            .first,
                                        style: Theme.of(context).textTheme.bodySmall,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          );
                        },
                      ),
      ),
    );
  }
}
