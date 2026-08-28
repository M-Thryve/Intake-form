import { useState, useEffect } from "react";
import ReviewQueue from "./ReviewQueue";
import IntakeDetailView from "./IntakeDetail";
import { styles } from "./styles";

const IS_OWNER = true;

export default function ConsoleApp() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    setAuthError(url.searchParams.get("error") === "unauthorized");
  }, []);

  if (authError) {
    return (
      <div style={{ ...styles.container, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", color: "#EF4444" }}>403</div>
          <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>Access Denied</div>
          <div style={{ fontSize: "14px", color: "#64748B" }}>
            You do not have permission to access the Factory Console. This area is restricted to owner and admin roles.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <img src="/logo.png" alt="M-THRYVE" style={{ height: '24px', width: 'auto' }} />
          <span style={styles.title}>Factory Console</span>
          <span style={{ fontSize: "12px", color: "#64748B" }}>M-THRYVE Internal</span>
        </div>
      </header>

      <div style={{ display: "flex", height: "calc(100vh - 73px)" }}>
        <ReviewQueue onSelectIntake={setSelectedId} selectedId={selectedId} />

        {selectedId && (
          <div style={{ flex: 1, overflow: "auto" }}>
            <IntakeDetailView intakeId={selectedId} isOwner={IS_OWNER} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>
    </div>
  );
}