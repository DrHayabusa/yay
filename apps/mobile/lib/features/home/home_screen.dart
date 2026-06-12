import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/strings.dart';
import '../request/new_request_screen.dart';
import '../request/timeline_screen.dart';

/// Customer home: the five primary actions, prominent and stress-friendly.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.api});

  final ApiClient api;

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Sanad')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _ActionCard(
            icon: Icons.car_crash,
            color: Theme.of(context).colorScheme.primary,
            title: s.requestRecovery,
            subtitle: s.t('Broken down? We will come to you.',
                'تعطلت مركبتك؟ سنصل إليك.'),
            onTap: () => Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => NewRequestScreen(api: api, type: 'BREAKDOWN'))),
          ),
          _ActionCard(
            icon: Icons.search,
            title: s.requestInspection,
            subtitle: s.t('Something feels wrong? Get it checked.',
                'تشعر بوجود مشكلة؟ افحصها الآن.'),
            onTap: () => Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => NewRequestScreen(api: api, type: 'INSPECTION_ONLY'))),
          ),
          _ActionCard(
            icon: Icons.location_on,
            title: s.trackActive,
            subtitle: s.t('Live status of your current request.',
                'الحالة المباشرة لطلبك الحالي.'),
            onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => TimelineScreen(api: api))),
          ),
          _ActionCard(
            icon: Icons.directions_car,
            title: s.myVehicles,
            subtitle: s.t('Add or manage your vehicles.', 'أضف مركباتك أو قم بإدارتها.'),
            onTap: () {
              // M8: vehicles management screen.
              ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(s.t('Coming in this milestone', 'قريباً'))));
            },
          ),
          _ActionCard(
            icon: Icons.history,
            title: s.repairHistory,
            subtitle: s.t('Past repairs, invoices and warranties.',
                'الإصلاحات السابقة والفواتير والضمانات.'),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(s.t('Coming in this milestone', 'قريباً'))));
            },
          ),
        ],
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.color,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: CircleAvatar(
          radius: 26,
          backgroundColor: (color ?? Theme.of(context).colorScheme.secondary)
              .withValues(alpha: 0.15),
          child: Icon(icon, color: color ?? Theme.of(context).colorScheme.secondary),
        ),
        title: Text(title, style: Theme.of(context).textTheme.titleMedium),
        subtitle: Text(subtitle),
        onTap: onTap,
      ),
    );
  }
}
