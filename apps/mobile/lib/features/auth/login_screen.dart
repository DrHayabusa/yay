import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../widgets/hazard_strip.dart';
import '../../widgets/sanad_logo.dart';
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const HazardStrip(),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 40, 24, 24),
                children: [
                  Row(
                    children: [
                      const SanadLogo(size: 44),
                      const SizedBox(width: 14),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'SANAD',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 4,
                            ),
                          ),
                          Text(
                            s.t('roadside · repair · parts', 'سحب · إصلاح · قطع غيار'),
                            style: const TextStyle(
                                fontSize: 11, color: SanadColors.muted, letterSpacing: 0.6),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 36),
                  Text(
                    s.t('Stuck is temporary.', 'التوقف مؤقت.'),
                    style: Theme.of(context)
                        .textTheme
                        .headlineMedium
                        ?.copyWith(fontSize: 30, height: 1.15),
                  ),
                  Text(
                    s.t('Sign in with your phone — no passwords.',
                        'سجل الدخول برقم هاتفك — بدون كلمات مرور.'),
                    style: const TextStyle(color: SanadColors.muted, fontSize: 14.5),
                  ),
                  const SizedBox(height: 30),
                  Text(s.t('PHONE NUMBER', 'رقم الهاتف'),
                      style: Theme.of(context).textTheme.labelSmall),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    enabled: !_codeSent,
                    decoration: const InputDecoration(hintText: '+9715XXXXXXXX'),
                  ),
                  if (_codeSent) ...[
                    const SizedBox(height: 18),
                    Text(s.t('ONE-TIME CODE', 'الرمز المؤقت'),
                        style: Theme.of(context).textTheme.labelSmall),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _code,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      autofocus: true,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 22,
                        letterSpacing: 12,
                        fontWeight: FontWeight.w700,
                      ),
                      decoration: const InputDecoration(counterText: '', hintText: '······'),
                    ),
                    const SizedBox(height: 14),
                    Text(s.t('FULL NAME — NEW ACCOUNTS ONLY', 'الاسم الكامل — للحسابات الجديدة'),
                        style: Theme.of(context).textTheme.labelSmall),
                    const SizedBox(height: 8),
                    TextField(controller: _name),
                  ],
                  const SizedBox(height: 26),
                  FilledButton(
                    onPressed: _busy ? null : (_codeSent ? _verify : _requestCode),
                    child: Text(_codeSent
                        ? s.t('SIGN IN', 'تسجيل الدخول')
                        : s.t('SEND CODE', 'إرسال الرمز')),
                  ),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(_error!,
                          style: const TextStyle(color: SanadColors.red, fontSize: 13)),
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
