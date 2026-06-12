import 'package:flutter/material.dart';

import '../core/theme.dart';

class RoadStopData {
  const RoadStopData({
    required this.message,
    required this.timestamp,
    this.isCurrent = false,
    this.isSystem = false,
  });

  final String message;
  final String timestamp;
  final bool isCurrent;
  final bool isSystem;
}

/// The case journey drawn as a road: an asphalt strip with a dashed
/// centerline running down the side, a pin per status stop. The current
/// stop glows amber — "your vehicle is here".
class RoadTimeline extends StatelessWidget {
  const RoadTimeline({super.key, required this.stops});

  final List<RoadStopData> stops;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < stops.length; i++)
          _RoadStop(
            data: stops[i],
            isFirst: i == 0,
            isLast: i == stops.length - 1,
          ),
      ],
    );
  }
}

class _RoadStop extends StatelessWidget {
  const _RoadStop({required this.data, required this.isFirst, required this.isLast});

  final RoadStopData data;
  final bool isFirst;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 40,
            child: CustomPaint(
              painter: _RoadSegmentPainter(
                isFirst: isFirst,
                isLast: isLast,
                isCurrent: data.isCurrent,
                isSystem: data.isSystem,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(top: 2, bottom: isLast ? 4 : 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    data.message,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: data.isCurrent ? FontWeight.w700 : FontWeight.w500,
                      color: data.isCurrent ? SanadColors.text : SanadColors.text.withOpacity(0.85),
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    data.timestamp,
                    style: const TextStyle(fontSize: 11.5, color: SanadColors.muted),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RoadSegmentPainter extends CustomPainter {
  _RoadSegmentPainter({
    required this.isFirst,
    required this.isLast,
    required this.isCurrent,
    required this.isSystem,
  });

  final bool isFirst;
  final bool isLast;
  final bool isCurrent;
  final bool isSystem;

  @override
  void paint(Canvas canvas, Size size) {
    const roadWidth = 20.0;
    final cx = size.width / 2;

    // asphalt strip — rounded at the ends of the journey
    final top = isFirst ? 4.0 : 0.0;
    final bottom = isLast ? size.height - 16 : size.height;
    final asphalt = Paint()..color = SanadColors.ink600;
    canvas.drawRRect(
      RRect.fromRectAndCorners(
        Rect.fromLTRB(cx - roadWidth / 2, top, cx + roadWidth / 2, bottom),
        topLeft: isFirst ? const Radius.circular(10) : Radius.zero,
        topRight: isFirst ? const Radius.circular(10) : Radius.zero,
        bottomLeft: isLast ? const Radius.circular(10) : Radius.zero,
        bottomRight: isLast ? const Radius.circular(10) : Radius.zero,
      ),
      asphalt,
    );

    // dashed centerline
    final dash = Paint()
      ..color = SanadColors.boneDim.withOpacity(0.7)
      ..strokeWidth = 1.6;
    for (double y = top + 14; y < bottom - 6; y += 14) {
      canvas.drawLine(Offset(cx, y), Offset(cx, y + 7), dash);
    }

    // the pin
    final pinY = 9.0;
    final ring = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..color = isCurrent
          ? SanadColors.amber
          : isSystem
              ? SanadColors.ink500
              : SanadColors.green;
    canvas.drawCircle(Offset(cx, pinY), 6, Paint()..color = SanadColors.ink900);
    canvas.drawCircle(Offset(cx, pinY), 6, ring);
    if (isCurrent) {
      canvas.drawCircle(
        Offset(cx, pinY),
        11,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 4
          ..color = SanadColors.amber.withOpacity(0.18),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _RoadSegmentPainter old) =>
      old.isCurrent != isCurrent || old.isFirst != isFirst || old.isLast != isLast;
}
