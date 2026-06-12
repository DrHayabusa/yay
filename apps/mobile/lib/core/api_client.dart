import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

/// Thin API client: bearer auth, automatic refresh-token rotation,
/// consistent error surface. Tokens live only in secure storage.
class ApiClient {
  ApiClient({required this.baseUrl});

  final String baseUrl;
  final _storage = const FlutterSecureStorage();
  String? _accessToken;

  static const _refreshKey = 'sanad_refresh_token';

  Future<void> saveTokens(String access, String refresh) async {
    _accessToken = access;
    await _storage.write(key: _refreshKey, value: refresh);
  }

  Future<void> clearTokens() async {
    _accessToken = null;
    await _storage.delete(key: _refreshKey);
  }

  Future<bool> get isLoggedIn async =>
      _accessToken != null || await _storage.read(key: _refreshKey) != null;

  Future<Map<String, dynamic>> request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
    bool retried = false,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1$path');
    final req = http.Request(method, uri);
    req.headers['Content-Type'] = 'application/json';
    if (_accessToken != null) {
      req.headers['Authorization'] = 'Bearer $_accessToken';
    }
    if (headers != null) req.headers.addAll(headers);
    if (body != null) req.body = jsonEncode(body);

    final res = await http.Response.fromStream(await req.send());

    if (res.statusCode == 401 && !retried && await _tryRefresh()) {
      return request(method, path, body: body, headers: headers, retried: true);
    }

    final decoded = res.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 400) {
      throw ApiException(
        statusCode: res.statusCode,
        code: decoded['error'] as String? ?? 'ERROR',
        message: decoded['message'] as String? ?? 'Something went wrong',
      );
    }
    return decoded;
  }

  Future<bool> _tryRefresh() async {
    final refresh = await _storage.read(key: _refreshKey);
    if (refresh == null) return false;
    final res = await http.post(
      Uri.parse('$baseUrl/api/v1/auth/refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': refresh}),
    );
    if (res.statusCode != 200) {
      await clearTokens();
      return false;
    }
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    await saveTokens(body['accessToken'] as String, body['refreshToken'] as String);
    return true;
  }
}

class ApiException implements Exception {
  ApiException({required this.statusCode, required this.code, required this.message});

  final int statusCode;
  final String code;
  final String message;

  @override
  String toString() => message;
}
