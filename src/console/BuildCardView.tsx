import { styles } from "./styles";

interface BuildCardViewProps {
  buildCard: Record<string, unknown> | null;
}

export default function BuildCardView({ buildCard }: BuildCardViewProps) {
  if (!buildCard) {
    return <div style={{ color: "#64748B", fontSize: "13px" }}>Build Card not yet generated</div>;
  }

  const bc = buildCard;
  const pricing = bc.preliminaryPricing as Record<string, unknown> | undefined;
  const timeline = bc.preliminaryTimeline as Record<string, unknown> | undefined;
  const stack = bc.recommendedStack as string | undefined;

  return (
    <div>
      <div style={{ fontSize: "12px", color: "#F59E0B", marginBottom: "16px", padding: "8px 12px", background: "#F59E0B10", border: "1px solid #F59E0B30", borderRadius: "6px" }}>
        Preliminary \u2014 subject to owner review
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Status</div>
          <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "100px", fontWeight: 600, background: "#A78BFA22", color: "#A78BFA", border: "1px solid #A78BFA44" }}>Owner Review Required</span>
        </div>
        <div>
          <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Version</div>
          <span style={{ fontSize: "13px", color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{bc.buildCardVersion as string || "1.0.0"}</span>
        </div>
      </div>

      {pricing && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Preliminary Pricing</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <BuildCardField label="Range (PHP)" value={pricing.rangePhp as string} />
            <BuildCardField label="Confidence" value={pricing.confidence as string} />
            <BuildCardField label="Estimated Weeks" value={timeline ? `${timeline.minWeeks} \u2013 ${timeline.maxWeeks} weeks` : "N/A"} />
            <BuildCardField label="Confidence" value={timeline?.confidence as string} />
          </div>
        </div>
      )}

      {stack && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Recommended Stack (Preliminary)</div>
          <BuildCardField label="Stack" value={stack} />
        </div>
      )}

      <div style={{ fontSize: "11px", color: "#F59E0B", marginTop: "12px", fontStyle: "italic" }}>
        All prices, timelines, and stack suggestions are preliminary and subject to owner review.
      </div>
    </div>
  );
}

function BuildCardField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span style={{ color: "#64748B", fontSize: "11px", display: "block" }}>{label}</span>
      <span style={{ color: "#E2E8F0", fontSize: "13px" }}>{value || "\u2014"}</span>
    </div>
  );
}