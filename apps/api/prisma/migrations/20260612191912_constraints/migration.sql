-- Constraints Prisma cannot express in the schema DSL.

-- VIN must be unique among active (non-deleted) vehicles only.
CREATE UNIQUE INDEX "Vehicle_vin_active_key"
  ON "Vehicle" ("vin")
  WHERE "vin" IS NOT NULL AND "deletedAt" IS NULL;

-- Ratings are 1..5 stars.
ALTER TABLE "Rating"
  ADD CONSTRAINT "Rating_stars_range" CHECK ("stars" BETWEEN 1 AND 5);

-- Compatibility gate: an order may not be CONFIRMED (or further) without a
-- recorded compatibility confirmation.
ALTER TABLE "PartOrder"
  ADD CONSTRAINT "PartOrder_compatibility_gate" CHECK (
    "status" IN ('PENDING_COMPATIBILITY', 'REJECTED', 'CANCELLED')
    OR ("compatibilityConfirmedByUserId" IS NOT NULL AND "compatibilityConfirmedAt" IS NOT NULL)
  );

-- One active recovery assignment per case.
CREATE UNIQUE INDEX "RecoveryAssignment_one_active_per_case"
  ON "RecoveryAssignment" ("serviceRequestId")
  WHERE "status" IN ('OFFERED', 'ACCEPTED');

-- Money sanity: no negative amounts.
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amounts_nonneg"
  CHECK ("subtotal" >= 0 AND "vatAmount" >= 0 AND "platformFee" >= 0 AND "total" >= 0);
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_price_nonneg"
  CHECK ("unitPrice" >= 0 AND "lineTotal" >= 0 AND "quantity" > 0);
