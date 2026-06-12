-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'RECOVERY_DRIVER', 'PROVIDER_ADMIN', 'GARAGE_TECHNICIAN', 'GARAGE_MANAGER', 'SUPPLIER', 'DELIVERY_DRIVER', 'ADMIN', 'SUPPORT_AGENT', 'QC_INSPECTOR');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('REQUEST_CREATED', 'AWAITING_RECOVERY_ASSIGNMENT', 'RECOVERY_ASSIGNED', 'RECOVERY_EN_ROUTE', 'RECOVERY_ARRIVED', 'VEHICLE_COLLECTED', 'VEHICLE_IN_TRANSIT', 'VEHICLE_AT_GARAGE', 'INSPECTION_IN_PROGRESS', 'DIAGNOSIS_SUBMITTED', 'AWAITING_CUSTOMER_APPROVAL', 'PARTS_SELECTION_REQUIRED', 'PARTS_ORDERED', 'PARTS_DISPATCHED', 'PARTS_DELIVERED', 'REPAIR_IN_PROGRESS', 'QUALITY_CHECK_IN_PROGRESS', 'REPAIR_COMPLETED', 'DELIVERY_SCHEDULED', 'VEHICLE_OUT_FOR_DELIVERY', 'VEHICLE_DELIVERED', 'CASE_CLOSED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('BREAKDOWN', 'INSPECTION_ONLY');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'PICKUP_HANDOVER', 'DELIVERY_HANDOVER', 'ACCOUNT_DELETION');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('VEHICLE_PHOTO', 'VEHICLE_VIDEO', 'PLATE_PHOTO', 'VOICE_NOTE', 'DAMAGE_PHOTO', 'EVIDENCE', 'DOCUMENT', 'BEFORE_PICKUP', 'AFTER_REPAIR');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "HandoverType" AS ENUM ('PICKUP', 'GARAGE_DELIVERY', 'CUSTOMER_DELIVERY');

-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'ADVISORY');

-- CreateEnum
CREATE TYPE "RepairItemStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PARTIALLY_APPROVED', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "QuotationItemType" AS ENUM ('LABOUR', 'PART', 'FEE');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PartCondition" AS ENUM ('OEM_GENUINE', 'AFTERMARKET_PREMIUM', 'AFTERMARKET_STANDARD', 'USED_REFURBISHED');

-- CreateEnum
CREATE TYPE "PartOrderStatus" AS ENUM ('PENDING_COMPATIBILITY', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'REJECTED', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('RECOVERY', 'DIAGNOSTIC', 'REPAIR', 'PARTS', 'DELIVERY', 'PLATFORM_FEE', 'DEPOSIT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('REQUIRES_ACTION', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PROCESSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'PAID', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "PayeeType" AS ENUM ('RECOVERY_PROVIDER', 'GARAGE', 'SUPPLIER', 'DELIVERY');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "QcResult" AS ENUM ('PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_CUSTOMER', 'RESOLVED_PROVIDER', 'CLOSED');

-- CreateEnum
CREATE TYPE "LocationSource" AS ENUM ('CUSTOMER_APP', 'DRIVER_APP', 'ADMIN', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "providerProfileId" TEXT,
    "garageId" TEXT,
    "supplierId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emiratesIdVerified" BOOLEAN NOT NULL DEFAULT false,
    "defaultEmirate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderProfile" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "tradeLicenceNo" TEXT NOT NULL,
    "tradeLicenceDocKey" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "commissionRate" DECIMAL(5,4) NOT NULL DEFAULT 0.15,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "licenceNo" TEXT NOT NULL,
    "licenceExpiry" TIMESTAMP(3),
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "lastLat" DECIMAL(9,6),
    "lastLng" DECIMAL(9,6),
    "lastLocationAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryVehicle" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "truckType" TEXT NOT NULL,
    "capacityKg" INTEGER,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Garage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeLicenceNo" TEXT NOT NULL,
    "tradeLicenceDocKey" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "emirate" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "dailyCapacity" INTEGER NOT NULL DEFAULT 10,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "commissionRate" DECIMAL(5,4) NOT NULL DEFAULT 0.10,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Garage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technician" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "garageId" TEXT NOT NULL,
    "speciality" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeLicenceNo" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "emirate" TEXT NOT NULL,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "commissionRate" DECIMAL(5,4) NOT NULL DEFAULT 0.08,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "vin" TEXT,
    "plateEmirate" TEXT NOT NULL,
    "plateCode" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "engine" TEXT,
    "color" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDocument" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "RequestType" NOT NULL DEFAULT 'BREAKDOWN',
    "status" "CaseStatus" NOT NULL DEFAULT 'REQUEST_CREATED',
    "description" TEXT,
    "canMove" BOOLEAN NOT NULL,
    "isSafeLocation" BOOLEAN NOT NULL,
    "emergencyFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pickupLat" DECIMAL(9,6) NOT NULL,
    "pickupLng" DECIMAL(9,6) NOT NULL,
    "pickupAddress" TEXT,
    "garageId" TEXT,
    "disputeFrozen" BOOLEAN NOT NULL DEFAULT false,
    "estimatedRecoveryFee" DECIMAL(12,2),
    "estimatedEtaMinutes" INTEGER,
    "diagnosticFee" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequestMedia" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "uploaderUserId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "scanStatus" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "exifLat" DECIMAL(9,6),
    "exifLng" DECIMAL(9,6),
    "capturedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRequestMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "source" "LocationSource" NOT NULL,
    "actorUserId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "fromStatus" "CaseStatus",
    "toStatus" "CaseStatus" NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "Role",
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryAssignment" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "recoveryVehicleId" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'OFFERED',
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "distanceKm" DECIMAL(8,2),
    "fee" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleHandover" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "type" "HandoverType" NOT NULL,
    "otpHash" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "overrideReason" TEXT,
    "signatureKey" TEXT,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleHandover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "checklist" JSONB,
    "odometerKm" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticFinding" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "technicalDetail" TEXT NOT NULL,
    "plainLanguageSummary" TEXT NOT NULL,
    "severity" "FindingSeverity" NOT NULL,
    "evidenceMediaIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosticFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairItem" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "labourHours" DECIMAL(6,2) NOT NULL,
    "status" "RepairItemStatus" NOT NULL DEFAULT 'PENDING',
    "requiresPart" BOOLEAN NOT NULL DEFAULT false,
    "replacedPartNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityInspection" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "inspectorUserId" TEXT NOT NULL,
    "checklist" JSONB NOT NULL,
    "result" "QcResult" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "platformFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "estimatedCompletionHours" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "type" "QuotationItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "plainLanguageSummary" TEXT,
    "repairItemId" TEXT,
    "requiresPart" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "selectedInventoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerApproval" (
    "id" TEXT NOT NULL,
    "quotationItemId" TEXT NOT NULL,
    "customerUserId" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "ipAddress" TEXT,
    "deviceInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePart" (
    "id" TEXT NOT NULL,
    "oemNumber" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "usedAllowed" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SparePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartCompatibility" (
    "id" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "yearFrom" INTEGER NOT NULL,
    "yearTo" INTEGER NOT NULL,
    "engine" TEXT,
    "verifiedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartCompatibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierInventory" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "condition" "PartCondition" NOT NULL,
    "brand" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 0,
    "deliveryEtaHours" INTEGER NOT NULL DEFAULT 24,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartOrder" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PartOrderStatus" NOT NULL DEFAULT 'PENDING_COMPATIBILITY',
    "compatibilityConfirmedByUserId" TEXT,
    "compatibilityConfirmedAt" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "garageReceiptByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "quotationItemId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "payerUserId" TEXT NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "providerIntentId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "vatAmount" DECIMAL(12,2) NOT NULL,
    "platformFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "capturedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "reason" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "providerRefundId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "payeeType" "PayeeType" NOT NULL,
    "payeeId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "gross" DECIMAL(12,2) NOT NULL,
    "commission" DECIMAL(12,2) NOT NULL,
    "net" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "lineSnapshot" JSONB NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "vatAmount" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "pdfKey" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warranty" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "terms" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "issuedByGarageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warranty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAssignment" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "driverId" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'OFFERED',
    "scheduledFor" TIMESTAMP(3),
    "dropLat" DECIMAL(9,6),
    "dropLng" DECIMAL(9,6),
    "dropAddress" TEXT,
    "fee" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageCode" TEXT NOT NULL,
    "params" JSONB,
    "channels" "NotificationChannel"[],
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mediaKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "raterUserId" TEXT NOT NULL,
    "rateeType" "PayeeType" NOT NULL,
    "rateeId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT,
    "raisedByUserId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "assignedAgentId" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "openedByUserId" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "resolutionNote" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "Role",
    "onBehalfOfUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseCode" INTEGER,
    "responseBody" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingConfig" (
    "id" TEXT NOT NULL,
    "emirate" TEXT NOT NULL,
    "baseRecoveryFee" DECIMAL(12,2) NOT NULL,
    "perKmFee" DECIMAL(12,2) NOT NULL,
    "diagnosticFee" DECIMAL(12,2) NOT NULL,
    "platformFeeRate" DECIMAL(5,4) NOT NULL DEFAULT 0.05,
    "vatRate" DECIMAL(5,4) NOT NULL DEFAULT 0.05,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StatusEvidence" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StatusEvidence_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "UserRole_role_idx" ON "UserRole"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

-- CreateIndex
CREATE INDEX "OtpCode_phone_purpose_createdAt_idx" ON "OtpCode"("phone", "purpose", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_userId_key" ON "CustomerProfile"("userId");

-- CreateIndex
CREATE INDEX "ProviderProfile_verification_idx" ON "ProviderProfile"("verification");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");

-- CreateIndex
CREATE INDEX "Driver_providerId_isAvailable_idx" ON "Driver"("providerId", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryVehicle_providerId_plateNumber_key" ON "RecoveryVehicle"("providerId", "plateNumber");

-- CreateIndex
CREATE INDEX "Garage_verification_idx" ON "Garage"("verification");

-- CreateIndex
CREATE INDEX "Garage_emirate_idx" ON "Garage"("emirate");

-- CreateIndex
CREATE UNIQUE INDEX "Technician_userId_key" ON "Technician"("userId");

-- CreateIndex
CREATE INDEX "Technician_garageId_idx" ON "Technician"("garageId");

-- CreateIndex
CREATE INDEX "Supplier_verification_idx" ON "Supplier"("verification");

-- CreateIndex
CREATE INDEX "Vehicle_ownerId_deletedAt_idx" ON "Vehicle"("ownerId", "deletedAt");

-- CreateIndex
CREATE INDEX "Vehicle_vin_idx" ON "Vehicle"("vin");

-- CreateIndex
CREATE INDEX "Vehicle_plateEmirate_plateCode_plateNumber_idx" ON "Vehicle"("plateEmirate", "plateCode", "plateNumber");

-- CreateIndex
CREATE INDEX "VehicleDocument_vehicleId_idx" ON "VehicleDocument"("vehicleId");

-- CreateIndex
CREATE INDEX "ServiceRequest_customerId_createdAt_idx" ON "ServiceRequest"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_status_createdAt_idx" ON "ServiceRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_garageId_status_idx" ON "ServiceRequest"("garageId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequestMedia_storageKey_key" ON "ServiceRequestMedia"("storageKey");

-- CreateIndex
CREATE INDEX "ServiceRequestMedia_serviceRequestId_kind_idx" ON "ServiceRequestMedia"("serviceRequestId", "kind");

-- CreateIndex
CREATE INDEX "Location_serviceRequestId_recordedAt_idx" ON "Location"("serviceRequestId", "recordedAt");

-- CreateIndex
CREATE INDEX "StatusHistory_serviceRequestId_createdAt_idx" ON "StatusHistory"("serviceRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "RecoveryAssignment_driverId_status_idx" ON "RecoveryAssignment"("driverId", "status");

-- CreateIndex
CREATE INDEX "RecoveryAssignment_serviceRequestId_status_idx" ON "RecoveryAssignment"("serviceRequestId", "status");

-- CreateIndex
CREATE INDEX "VehicleHandover_serviceRequestId_type_idx" ON "VehicleHandover"("serviceRequestId", "type");

-- CreateIndex
CREATE INDEX "Inspection_serviceRequestId_idx" ON "Inspection"("serviceRequestId");

-- CreateIndex
CREATE INDEX "DiagnosticFinding_inspectionId_idx" ON "DiagnosticFinding"("inspectionId");

-- CreateIndex
CREATE INDEX "RepairItem_findingId_idx" ON "RepairItem"("findingId");

-- CreateIndex
CREATE INDEX "QualityInspection_serviceRequestId_idx" ON "QualityInspection"("serviceRequestId");

-- CreateIndex
CREATE INDEX "Quotation_serviceRequestId_status_idx" ON "Quotation"("serviceRequestId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_serviceRequestId_version_key" ON "Quotation"("serviceRequestId", "version");

-- CreateIndex
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerApproval_quotationItemId_key" ON "CustomerApproval"("quotationItemId");

-- CreateIndex
CREATE INDEX "CustomerApproval_customerUserId_idx" ON "CustomerApproval"("customerUserId");

-- CreateIndex
CREATE INDEX "SparePart_oemNumber_idx" ON "SparePart"("oemNumber");

-- CreateIndex
CREATE INDEX "SparePart_category_idx" ON "SparePart"("category");

-- CreateIndex
CREATE INDEX "PartCompatibility_make_model_idx" ON "PartCompatibility"("make", "model");

-- CreateIndex
CREATE UNIQUE INDEX "PartCompatibility_sparePartId_make_model_yearFrom_yearTo_en_key" ON "PartCompatibility"("sparePartId", "make", "model", "yearFrom", "yearTo", "engine");

-- CreateIndex
CREATE INDEX "SupplierInventory_sparePartId_condition_idx" ON "SupplierInventory"("sparePartId", "condition");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInventory_supplierId_sparePartId_condition_key" ON "SupplierInventory"("supplierId", "sparePartId", "condition");

-- CreateIndex
CREATE INDEX "PartOrder_serviceRequestId_idx" ON "PartOrder"("serviceRequestId");

-- CreateIndex
CREATE INDEX "PartOrder_supplierId_status_idx" ON "PartOrder"("supplierId", "status");

-- CreateIndex
CREATE INDEX "PartOrderItem_orderId_idx" ON "PartOrderItem"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerIntentId_key" ON "Payment"("providerIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_serviceRequestId_kind_idx" ON "Payment"("serviceRequestId", "kind");

-- CreateIndex
CREATE INDEX "Payment_payerUserId_idx" ON "Payment"("payerUserId");

-- CreateIndex
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

-- CreateIndex
CREATE INDEX "Settlement_payeeType_payeeId_status_idx" ON "Settlement"("payeeType", "payeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_serviceRequestId_idx" ON "Invoice"("serviceRequestId");

-- CreateIndex
CREATE INDEX "Warranty_serviceRequestId_idx" ON "Warranty"("serviceRequestId");

-- CreateIndex
CREATE INDEX "DeliveryAssignment_serviceRequestId_idx" ON "DeliveryAssignment"("serviceRequestId");

-- CreateIndex
CREATE INDEX "DeliveryAssignment_driverId_status_idx" ON "DeliveryAssignment"("driverId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatConversation_serviceRequestId_key" ON "ChatConversation"("serviceRequestId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Rating_rateeType_rateeId_idx" ON "Rating"("rateeType", "rateeId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_serviceRequestId_raterUserId_rateeType_rateeId_key" ON "Rating"("serviceRequestId", "raterUserId", "rateeType", "rateeId");

-- CreateIndex
CREATE INDEX "Complaint_status_createdAt_idx" ON "Complaint"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Dispute_serviceRequestId_idx" ON "Dispute"("serviceRequestId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_key_userId_endpoint_key" ON "IdempotencyRecord"("key", "userId", "endpoint");

-- CreateIndex
CREATE INDEX "PricingConfig_emirate_isActive_idx" ON "PricingConfig"("emirate", "isActive");

-- CreateIndex
CREATE INDEX "_StatusEvidence_B_index" ON "_StatusEvidence"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "Garage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryVehicle" ADD CONSTRAINT "RecoveryVehicle_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "Garage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "Garage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestMedia" ADD CONSTRAINT "ServiceRequestMedia_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryAssignment" ADD CONSTRAINT "RecoveryAssignment_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryAssignment" ADD CONSTRAINT "RecoveryAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryAssignment" ADD CONSTRAINT "RecoveryAssignment_recoveryVehicleId_fkey" FOREIGN KEY ("recoveryVehicleId") REFERENCES "RecoveryVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleHandover" ADD CONSTRAINT "VehicleHandover_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticFinding" ADD CONSTRAINT "DiagnosticFinding_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairItem" ADD CONSTRAINT "RepairItem_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "DiagnosticFinding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityInspection" ADD CONSTRAINT "QualityInspection_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_repairItemId_fkey" FOREIGN KEY ("repairItemId") REFERENCES "RepairItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_selectedInventoryId_fkey" FOREIGN KEY ("selectedInventoryId") REFERENCES "SupplierInventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerApproval" ADD CONSTRAINT "CustomerApproval_quotationItemId_fkey" FOREIGN KEY ("quotationItemId") REFERENCES "QuotationItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerApproval" ADD CONSTRAINT "CustomerApproval_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCompatibility" ADD CONSTRAINT "PartCompatibility_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInventory" ADD CONSTRAINT "SupplierInventory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInventory" ADD CONSTRAINT "SupplierInventory_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartOrder" ADD CONSTRAINT "PartOrder_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartOrder" ADD CONSTRAINT "PartOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartOrderItem" ADD CONSTRAINT "PartOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PartOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartOrderItem" ADD CONSTRAINT "PartOrderItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "SupplierInventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartOrderItem" ADD CONSTRAINT "PartOrderItem_quotationItemId_fkey" FOREIGN KEY ("quotationItemId") REFERENCES "QuotationItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAssignment" ADD CONSTRAINT "DeliveryAssignment_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAssignment" ADD CONSTRAINT "DeliveryAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_raterUserId_fkey" FOREIGN KEY ("raterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_raisedByUserId_fkey" FOREIGN KEY ("raisedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StatusEvidence" ADD CONSTRAINT "_StatusEvidence_A_fkey" FOREIGN KEY ("A") REFERENCES "ServiceRequestMedia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StatusEvidence" ADD CONSTRAINT "_StatusEvidence_B_fkey" FOREIGN KEY ("B") REFERENCES "StatusHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
