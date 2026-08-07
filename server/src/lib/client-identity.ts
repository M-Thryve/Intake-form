import { supabase } from "./supabase.js"

export interface ClientIdentityInput {
  fullName: string
  company: string
  email: string
  phone: string
}

export interface ClientIdentityResult {
  clientId: string
  identityConflict: boolean
}

/**
 * Normalisation is used only for matching. The submitted email remains the
 * value stored on the client row and is never rewritten to the normalised one.
 */
export function normalizeClientEmail(email: string): string {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf("@")
  if (at <= 0 || at === trimmed.length - 1) return trimmed
  const local = trimmed.slice(0, at).split("+")[0]
  return `${local}@${trimmed.slice(at + 1)}`
}

export async function resolveOrCreateClient(
  input: ClientIdentityInput,
): Promise<ClientIdentityResult> {
  const normalizedEmail = normalizeClientEmail(input.email)
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error(
      "A valid client email is required to establish portal identity",
    )
  }

  const { data: existing, error: lookupError } = await supabase
    .from("clients")
    .select("id, email, company")
    .eq("normalized_email", normalizedEmail)
    .maybeSingle()

  if (lookupError) throw lookupError

  if (existing) {
    const existingCompany = String(existing.company || "")
      .trim()
      .toLowerCase()
    const submittedCompany = input.company.trim().toLowerCase()
    const identityConflict = Boolean(
      existingCompany &&
        submittedCompany &&
        existingCompany !== submittedCompany,
    )

    const { error: updateError } = await supabase
      .from("clients")
      .update({
        full_name: input.fullName,
        phone: input.phone,
        last_intake_at: new Date().toISOString(),
      })
      .eq("id", existing.id)

    if (updateError) throw updateError
    return { clientId: existing.id as string, identityConflict }
  }

  const { data: created, error: insertError } = await supabase
    .from("clients")
    .insert({
      full_name: input.fullName,
      company: input.company,
      email: input.email,
      normalized_email: normalizedEmail,
      phone: input.phone,
      status: "prospect",
      first_intake_at: new Date().toISOString(),
      last_intake_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (insertError) {
    // The unique normalised-email index is the concurrency guard. Retry the
    // read so two simultaneous draft saves converge on one client row.
    if (insertError.code === "23505") {
      const { data: raced, error: retryError } = await supabase
        .from("clients")
        .select("id")
        .eq("normalized_email", normalizedEmail)
        .single()
      if (!retryError && raced)
        return { clientId: raced.id as string, identityConflict: false }
    }
    throw insertError
  }

  return { clientId: created.id as string, identityConflict: false }
}
