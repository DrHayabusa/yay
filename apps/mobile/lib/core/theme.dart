import 'package:flutter/material.dart';

/// Sanad design language — "job ticket / road".
/// Asphalt darks, signal amber, bone paper. Tight radii (tickets, not
/// bubbles), uppercase microcopy, mono-spaced numbers.
abstract final class SanadColors {
  static const ink900 = Color(0xFF0A0D11);
  static const ink800 = Color(0xFF0F141B);
  static const ink700 = Color(0xFF151C25);
  static const ink600 = Color(0xFF1D2733);
  static const ink500 = Color(0xFF2A3848);
  static const line = Color(0xFF243140);

  static const bone = Color(0xFFECE5D8);
  static const boneDim = Color(0xFFB8B0A0);

  static const amber = Color(0xFFFFB400);
  static const amberDeep = Color(0xFFCC8800);
  static const green = Color(0xFF3ECF8E);
  static const blue = Color(0xFF5AA7FF);
  static const red = Color(0xFFFF5D5D);

  static const text = Color(0xFFDDE5EE);
  static const muted = Color(0xFF7E8FA3);
}

abstract final class SanadTheme {
  static const _radius = 6.0;

  static ThemeData dark() {
    const scheme = ColorScheme.dark(
      primary: SanadColors.amber,
      onPrimary: SanadColors.ink900,
      secondary: SanadColors.green,
      onSecondary: SanadColors.ink900,
      surface: SanadColors.ink800,
      onSurface: SanadColors.text,
      error: SanadColors.red,
      onError: SanadColors.ink900,
      outline: SanadColors.line,
    );

    final base = ThemeData(useMaterial3: true, colorScheme: scheme);

    return base.copyWith(
      scaffoldBackgroundColor: SanadColors.ink900,
      textTheme: base.textTheme
          .apply(bodyColor: SanadColors.text, displayColor: SanadColors.text)
          .copyWith(
            headlineMedium: const TextStyle(
              fontWeight: FontWeight.w700,
              letterSpacing: -0.5,
              color: SanadColors.text,
            ),
            titleMedium: const TextStyle(
              fontWeight: FontWeight.w600,
              color: SanadColors.text,
            ),
            labelSmall: const TextStyle(
              letterSpacing: 1.4,
              fontWeight: FontWeight.w600,
              color: SanadColors.muted,
            ),
          ),
      appBarTheme: const AppBarTheme(
        backgroundColor: SanadColors.ink900,
        foregroundColor: SanadColors.text,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w700,
          letterSpacing: 2.0,
          color: SanadColors.text,
        ),
      ),
      cardTheme: CardThemeData(
        color: SanadColors.ink800,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_radius),
          side: const BorderSide(color: SanadColors.line),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: SanadColors.amber,
          foregroundColor: SanadColors.ink900,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(_radius)),
          textStyle: const TextStyle(
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: SanadColors.text,
          side: const BorderSide(color: SanadColors.line),
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(_radius)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: SanadColors.ink800,
        labelStyle: const TextStyle(color: SanadColors.muted),
        hintStyle: const TextStyle(color: SanadColors.ink500),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radius),
          borderSide: const BorderSide(color: SanadColors.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radius),
          borderSide: const BorderSide(color: SanadColors.amber, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radius),
          borderSide: const BorderSide(color: SanadColors.red),
        ),
      ),
      dividerTheme: const DividerThemeData(color: SanadColors.line, thickness: 1),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: SanadColors.ink600,
        contentTextStyle: const TextStyle(color: SanadColors.text),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(_radius)),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
