import 'package:flutter/material.dart';

import '../core/theme.dart';
import 'hazard_strip.dart';

/// The hero action — "I broke down". A ticket-shaped slab with a clipped
/// corner and a hazard strip along its base. Built to be hit with a thumb
/// by a stressed person at the roadside.
class BigAction extends StatelessWidget {
  const BigAction({
    super.key,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: title,
      child: GestureDetector(
        onTap: onTap,
        child: ClipPath(
          clipper: _NotchClipper(),
          child: Container(
            color: SanadColors.amber,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 22, 20, 18),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              style: const TextStyle(
                                color: SanadColors.ink900,
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.3,
                                height: 1.1,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              subtitle,
                              style: TextStyle(
                                color: SanadColors.ink900.withOpacity(0.75),
                                fontSize: 13.5,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_forward, color: SanadColors.ink900, size: 28),
                    ],
                  ),
                ),
                const HazardStrip(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Clips the top-right corner at 45° — the "torn ticket" silhouette.
class _NotchClipper extends CustomClipper<Path> {
  static const notch = 22.0;

  @override
  Path getClip(Size size) {
    return Path()
      ..moveTo(0, 0)
      ..lineTo(size.width - notch, 0)
      ..lineTo(size.width, notch)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}

/// Secondary action: a flat ticket row with an amber keyline on press.
class SecondaryAction extends StatelessWidget {
  const SecondaryAction({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: SanadColors.ink800,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(6),
        side: const BorderSide(color: SanadColors.line),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        highlightColor: SanadColors.amber.withOpacity(0.06),
        splashColor: SanadColors.amber.withOpacity(0.08),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: SanadColors.ink600,
                  borderRadius: BorderRadius.circular(5),
                ),
                child: Icon(icon, size: 20, color: SanadColors.amber),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        style: const TextStyle(fontSize: 12.5, color: SanadColors.muted)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: SanadColors.muted, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
