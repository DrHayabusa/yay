import 'package:flutter/material.dart';

import '../core/theme.dart';

/// The Sanad mark: a tow hook curling out of a road chevron,
/// painted by hand — identical geometry to the web SVG.
class SanadLogo extends StatelessWidget {
  const SanadLogo({super.key, this.size = 34});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _LogoPainter()),
    );
  }
}

class _LogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 32; // designed on a 32-unit grid

    final tile = Paint()..color = SanadColors.amber;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(s, s, 30 * s, 30 * s),
        Radius.circular(4 * s),
      ),
      tile,
    );

    final ink = Paint()
      ..color = SanadColors.ink900
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.2 * s
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    // chevron — the road
    final chevron = Path()
      ..moveTo(7 * s, 22 * s)
      ..lineTo(14 * s, 15 * s)
      ..lineTo(7 * s, 8 * s);
    canvas.drawPath(chevron, ink);

    // hook — the tow
    final hook = Path()
      ..moveTo(24 * s, 8 * s)
      ..lineTo(24 * s, 16 * s)
      ..arcToPoint(
        Offset(15 * s, 16 * s),
        radius: Radius.circular(4.5 * s),
        clockwise: true,
      )
      ..lineTo(15 * s, 15 * s);
    canvas.drawPath(hook, ink);

    canvas.drawCircle(
      Offset(24 * s, 6.5 * s),
      1.8 * s,
      Paint()..color = SanadColors.ink900,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
