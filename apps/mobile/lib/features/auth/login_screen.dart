import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/strings.dart';
import '../home/home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.api});

  final ApiClient api;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phone = TextEditingController(text: '+971');
  final _code = TextEditingController();
  final _name = TextEditingController();
  bool _codeSent = false;
  bool _busy = false;
  String? _error;

  Future<void> _requestCode() async {
    setState(() => _busy = true);
    try {
      await widget.api
          .request('POST', '/auth/otp/request', body: {'phone': _phone.text.trim()});
      setState(() {
        _codeSent = true;
        _error = null;
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    setState(() => _busy = true);
    try {
      final body = {
        'phone': _phone.text.trim(),
        'code': _code.text.trim(),
        if (_name.text.trim().isNotEmpty) 'fullName': _name.text.trim(),
      };
      final res = await widget.api.request('POST', '/auth/otp/verify', body: body);
      await widget.api.saveTokens(
        res['accessToken'] as String,
        res['refreshToken'] as String,
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => HomeScreen(api: widget.api)),
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 48),
              Text(s.t('Welcome to Sanad', 'مرحباً بك في سند'),
                  style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 8),
              Text(
                s.t('Roadside help, honest repairs.', 'مساعدة على الطريق وإصلاح موثوق.'),
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 32),
              TextField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                enabled: !_codeSent,
                decoration: InputDecoration(
                  labelText: s.t('Phone number', 'رقم الهاتف'),
                  border: const OutlineInputBorder(),
                ),
              ),
              if (_codeSent) ...[
                const SizedBox(height: 16),
                TextField(
                  controller: _code,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  decoration: InputDecoration(
                    labelText: s.t('6-digit code', 'الرمز المكون من 6 أرقام'),
                    border: const OutlineInputBorder(),
                  ),
                ),
                TextField(
                  controller: _name,
                  decoration: InputDecoration(
                    labelText: s.t('Full name (new accounts)', 'الاسم الكامل (للحسابات الجديدة)'),
                    border: const OutlineInputBorder(),
                  ),
                ),
              ],
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _busy ? null : (_codeSent ? _verify : _requestCode),
                child: Text(_codeSent
                    ? s.t('Sign in', 'تسجيل الدخول')
                    : s.t('Send code', 'إرسال الرمز')),
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(_error!,
                      style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
