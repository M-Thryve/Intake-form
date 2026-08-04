import type { SanitizedIntakeContext } from "./mcp-contracts.js";
import { sanitizedIntakeContextSchema } from "./mcp-contracts.js";
import { supabase } from "./supabase.js";

export async function buildSanitizedContext(intakeId: string): Promise<SanitizedIntakeContext> {
  const { data: intake, error: intakeErr } = await supabase
    .from("intakes")
    .select("id, build_reference_number, tier, client_id")
    .eq("id", intakeId)
    .maybeSingle();

  if (intakeErr || !intake) throw new Error(`Intake not found: ${intakeErr?.message}`);

  const { data: client } = await supabase
    .from("clients")
    .select("company")
    .eq("id", (intake as Record<string, unknown>).client_id)
    .maybeSingle();

  const { data: project } = await supabase
    .from("intakes")
    .select("project_name, industry, project_type, business_description")
    .eq("id", intakeId)
    .maybeSingle();

  const { data: features } = await supabase
    .from("intake_features")
    .select("feature_name, priority, source")
    .eq("intake_id", intakeId);

  const { data: pages } = await supabase
    .from("intake_page_contents")
    .select("page_name, field_key")
    .eq("intake_id", intakeId);

  const { data: assetQual } = await supabase
    .from("intake_asset_qualifications")
    .select("qualification")
    .eq("intake_id", intakeId)
    .maybeSingle();

  const { data: assetSvc } = await supabase
    .from("intake_asset_services")
    .select("service_key")
    .eq("intake_id", intakeId);

  const { data: templateData } = await supabase
    .from("intake_template_selections")
    .select("template_id, project_version, color_preset")
    .eq("intake_id", intakeId)
    .maybeSingle();

  const { data: enterpriseData } = await supabase
    .from("intake_enterprise_requirements")
    .select("project_vision, target_users, data_security_requirements, scalability_requirements")
    .eq("intake_id", intakeId)
    .maybeSingle();

  const { data: payment } = await supabase
    .from("intake_payment_preferences")
    .select("payment_plan, voucher_code")
    .eq("intake_id", intakeId)
    .maybeSingle();

  const { data: designData } = await supabase
    .from("intake_design_preferences")
    .select("style_key")
    .eq("intake_id", intakeId);

  const tier = (intake as Record<string, unknown>).tier as "template" | "custom" | "enterprise";

  const pageMap = new Map<string, number>();
  for (const p of (pages || [])) {
    const name = (p as Record<string, unknown>).page_name as string;
    pageMap.set(name, (pageMap.get(name) || 0) + 1);
  }

  const featureNames = new Set<string>();
  const uniqueNamedFeatures: Array<Record<string, unknown>> = [];
  for (const f of (features || [])) {
    const name = (f as Record<string, unknown>).name as string;
    if (!featureNames.has(name)) {
      featureNames.add(name);
      uniqueNamedFeatures.push(f as Record<string, unknown>);
    }
  }

  const context: unknown = {
    intakeId,
    buildReferenceNumber: (intake as Record<string, unknown>).build_reference_number as string,
    tier,
    client: {
      company: (client as Record<string, unknown>)?.company || "",
    },
    project: {
      projectName: (project as Record<string, unknown>)?.project_name || "",
      industry: (project as Record<string, unknown>)?.industry || "",
      projectType: (project as Record<string, unknown>)?.project_type || "",
      businessDescription: (project as Record<string, unknown>)?.business_description || "",
    },
    assets: {
      qualification: (assetQual as Record<string, unknown>)?.qualification || "unknown",
      serviceRequestedCount: (assetSvc || []).length,
      hasRequestedServices: (assetSvc || []).length > 0,
    },
    template: templateData as Record<string, unknown> | null,
    enterprise: enterpriseData as Record<string, unknown> | null,
    content: {
      featureCount: uniqueNamedFeatures.length,
      pageCount: pageMap.size,
      features: uniqueNamedFeatures.map((f) => ({
        name: f.name,
        priority: f.priority,
        source: f.source,
      })),
      pages: Array.from(pageMap.entries()).map(([name, fieldCount]) => ({
        name,
        fieldCount,
      })),
    },
    design: {
      styleCount: (designData || []).length,
    },
    payment: {
      plan: (payment as Record<string, unknown>)?.payment_plan || "",
      voucherCode: (payment as Record<string, unknown>)?.voucher_code || "",
    },
  };

  const parsed = sanitizedIntakeContextSchema.parse(context);
  return parsed;
}

export async function buildAssetSnapshots(intakeId: string) {
  const { data: assets } = await supabase
    .from("uploaded_assets")
    .select("id, original_filename, asset_status, scan_status, mime_type, file_size_bytes, rejection_reason, uploaded_at, storage_bucket")
    .eq("intake_id", intakeId)
    .order("uploaded_at", { ascending: true });

  return (assets || []).map((a) => ({
    id: a.id,
    filename: a.original_filename,
    assetStatus: a.asset_status,
    scanStatus: a.scan_status,
    mimeType: a.mime_type,
    fileSizeBytes: a.file_size_bytes,
    rejectionReason: a.rejection_reason,
    uploadedAt: a.uploaded_at,
    bucket: a.storage_bucket,
  }));
}