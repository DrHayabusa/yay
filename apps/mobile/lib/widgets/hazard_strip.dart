import 'package:flutter/material.dart';

import '../core/theme.dart';

/// The brand signature: diagonal amber/asphalt hazard stripes.
/// Used as a thin strip under app bars and on safety-critical surfaces.
class HazardStrip extends StatelessWidget {
  const HazardStrip({super.key, this.height = 6, this.width});

  final double height;
  final double? width;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      width: width ?? double.infinity,
      child: CustomPaint(painter: _HazardPainter()),
    );
  }
}

class _HazardPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final bg = Paint()..color = SanadColors.ink900;
    canvas.drawRect(Offset.zero & size, bg);

    final stripe = Paint()..color = SanadColors.amber;
    const band = 14.0;
    // 45° stripes drawn as slanted parallelograms across the strip.
    for (double x = -size.height; x < size.width + band; x += band * 2) {
      final path = Path()
        ..moveTo(x, size.height)
        ..lineTo(x + size.height, 0)
        ..lineTo(x + size.height + band, 0)
        ..lineTo(x + band, size.height)
        ..close();
      canvas.drawPath(path, stripe);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
