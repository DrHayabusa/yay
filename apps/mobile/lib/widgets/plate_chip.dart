import 'package:flutter/material.dart';

import '../core/theme.dart';

/// A UAE number plate rendered as the physical object.
class PlateChip extends StatelessWidget {
  const PlateChip({
    super.key,
    required this.emirate,
    required this.number,
    this.code,
  });

  final String emirate;
  final String? code;
  final String number;

  @override
  Widget build(BuildContext context) {
    const numStyle = TextStyle(
      color: Color(0xFF14181D),
      fontSize: 14,
      fontWeight: FontWeight.w700,
      letterSpacing: 1.2,
      fontFeatures: [FontFeature.tabularFigures()],
    );

    return Container(
      decoration: BoxDecoration(
        color: SanadColors.bone,
        border: Border.all(color: const Color(0xFF9AA4B0), width: 1.5),
        borderRadius: BorderRadius.circular(3),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            color: const Color(0xFF14181D),
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 6),
            child: Text(
              emirate.length > 3 ? emirate.substring(0, 3).toUpperCase() : emirate.toUpperCase(),
              style: const TextStyle(
                color: SanadColors.bone,
                fontSize: 9,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.6,
              ),
            ),
          ),
          if (code != null && code!.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
              child: Text(code!, style: numStyle),
            ),
            Container(width: 1.5, height: 20, color: const Color(0xFF9AA4B0)),
          ],
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: Text(number, style: numStyle),
          ),
        ],
      ),
    );
  }
}
