import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/api_client.dart';
import 'core/theme.dart';
import 'features/auth/login_screen.dart';
import 'features/home/home_screen.dart';

/// Single Flutter codebase, customer-first. Driver/garage roles are added as
/// role-aware navigation in milestone M9.
void main() {
  runApp(SanadApp(
    api: ApiClient(baseUrl: const String.fromEnvironment(
      'API_URL',
      defaultValue: 'http://10.0.2.2:3000', // Android-emulator loopback
    )),
  ));
}

class SanadApp extends StatelessWidget {
  const SanadApp({super.key, required this.api});

  final ApiClient api;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sanad',
      theme: SanadTheme.dark(),
      // RTL-ready from day one.
      supportedLocales: const [Locale('en'), Locale('ar')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: FutureBuilder<bool>(
        future: api.isLoggedIn,
        builder: (context, snap) {
          if (!snap.hasData) {
            return const Scaffold(body: Center(child: CircularProgressIndicator()));
          }
          return snap.data!
              ? HomeScreen(api: api)
              : LoginScreen(api: api);
        },
      ),
    );
  }
}
