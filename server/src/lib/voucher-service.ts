import { supabase } from "./supabase.js";

export type VoucherValidationCode =
  | "valid"
  | "not_found"
  | "expired"
  | "already_used"
  | "revoked"
  | "self_redemption"
  | "duplicate_for_intake"
  | "invalid_status";

export interface VoucherValidationResult {
  ok: boolean;
  code: VoucherValidationCode;
  message: string;
  voucherId?: string;
  discountPercent?: number;
  discountAmountPhp?: number;
  redemptionId?: string;
}

interface VoucherRow {
  id: string;
  voucher_code: string;
  owner_client_id: string | null;
  status: string;
  discount_percent: number | null;
  expires_at: string | null;
}

interface RedemptionRow {
  id: string;
  intake_id: string;
  verification_status: string;
}

interface IntakeRow {
  id: string;
  client_id: string;
}

const REJECT_MESSAGES: Record<Exclude<VoucherValidationCode, "valid">, string> = {
  not_found: "Voucher code is not recognized.",
  expired: "This voucher has expired.",
  already_used: "This voucher has already been redeemed.",
  revoked: "This voucher is no longer valid.",
  self_redemption: "A client cannot redeem their own referral voucher.",
  duplicate_for_intake: "A voucher has already been applied to this intake.",
  invalid_status: "This voucher is not currently active.",
};

function reject(code: Exclude<VoucherValidationCode, "valid">): VoucherValidationResult {
  return { ok: false, code, message: REJECT_MESSAGES[code] };
}

function computeDiscountPhp(baseAmountPhp: number, percent: number): number {
  if (!Number.isFinite(baseAmountPhp) || baseAmountPhp <= 0) return 0;
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return Math.floor((baseAmountPhp * percent) / 100);
}

export async function validateVoucher(params: {
  intakeId: string;
  submittedCode: string;
  baseAmountPhp: number;
}): Promise<VoucherValidationResult> {
  const trimmed = params.submittedCode.trim();
  if (!trimmed) return reject("not_found");

  const { data: voucherRow } = await supabase
    .from("vouchers")
    .select("id, voucher_code, owner_client_id, status, discount_percent, expires_at")
    .eq("voucher_code", trimmed)
    .maybeSingle();

  const voucher = voucherRow as VoucherRow | null;
  if (!voucher) return reject("not_found");

  if (voucher.status === "revoked") return reject("revoked");
  if (voucher.status === "used") return reject("already_used");
  if (voucher.status === "expired") return reject("expired");
  if (voucher.status !== "new" && voucher.status !== "active") return reject("invalid_status");

  if (voucher.expires_at) {
    const expiryTime = new Date(voucher.expires_at).getTime();
    if (Number.isFinite(expiryTime) && expiryTime <= Date.now()) return reject("expired");
  }

  const { data: intakeRow } = await supabase
    .from("intakes")
    .select("id, client_id")
    .eq("id", params.intakeId)
    .maybeSingle();
  const intake = intakeRow as IntakeRow | null;
  if (intake && voucher.owner_client_id && voucher.owner_client_id === intake.client_id) {
    return reject("self_redemption");
  }

  const { data: existingRedemption } = await supabase
    .from("intake_voucher_redemptions")
    .select("id, intake_id, verification_status")
    .eq("intake_id", params.intakeId)
    .maybeSingle();
  const existing = existingRedemption as RedemptionRow | null;
  if (existing && existing.verification_status === "valid") {
    return reject("duplicate_for_intake");
  }

  const percent = voucher.discount_percent ?? 0;
  const discountAmountPhp = computeDiscountPhp(params.baseAmountPhp, percent);

  return {
    ok: true,
    code: "valid",
    message: "Voucher is valid.",
    voucherId: voucher.id,
    discountPercent: percent,
    discountAmountPhp,
  };
}

export async function recordVoucherRedemption(params: {
  intakeId: string;
  submittedCode: string;
  validation: VoucherValidationResult;
  verifiedBy: string | null;
}): Promise<{ ok: boolean; redemptionId?: string; error?: string }> {
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("intake_voucher_redemptions")
    .select("id, verification_status")
    .eq("intake_id", params.intakeId)
    .maybeSingle();

  const existingRow = existing as { id: string; verification_status: string } | null;
  if (existingRow && existingRow.verification_status === "valid" && params.validation.ok) {
    return {
      ok: false,
      error: "A valid voucher redemption already exists for this intake.",
      redemptionId: existingRow.id,
    };
  }

  const statusMap: Record<VoucherValidationCode, string> = {
    valid: "valid",
    not_found: "invalid",
    expired: "expired",
    already_used: "already_used",
    revoked: "invalid",
    self_redemption: "invalid",
    duplicate_for_intake: "invalid",
    invalid_status: "invalid",
  };

  const record = {
    intake_id: params.intakeId,
    voucher_id: params.validation.voucherId ?? null,
    submitted_code: params.submittedCode.trim(),
    verification_status: statusMap[params.validation.code],
    discount_amount_php: params.validation.ok ? params.validation.discountAmountPhp ?? 0 : null,
    verified_at: now,
    verified_by: params.verifiedBy,
  };

  if (existingRow) {
    const { error } = await supabase
      .from("intake_voucher_redemptions")
      .update(record)
      .eq("id", existingRow.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, redemptionId: existingRow.id };
  }

  const { data: inserted, error } = await supabase
    .from("intake_voucher_redemptions")
    .insert(record)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  const row = inserted as { id: string } | null;
  return { ok: true, redemptionId: row?.id };
}
