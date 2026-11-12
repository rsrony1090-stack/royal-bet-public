import React from "react";

const trialUrl = "https://jiligames.com/PlusTrial/223/en-us";

export default function JiliFortuneGems2Trial() {
  return (
    <section style={{ width: "100%", minWidth: 0, color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: "0 0 5px" }}>Fortune Gems 2</h2>
          <p style={{ margin: 0, color: "#a9b8c0", fontSize: 13 }}>Original JILI public demo · Virtual trial credits only</p>
        </div>
        <a href={trialUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "11px 16px", borderRadius: 8, background: "linear-gradient(#ffe18a,#c88a27)", color: "#211607", fontWeight: 900, textDecoration: "none" }}>OPEN ORIGINAL GAME ↗</a>
      </div>
      <div style={{ width: "100%", height: "min(78vh, 780px)", minHeight: 520, overflow: "hidden", border: "1px solid #b88a3d", borderRadius: 12, background: "#07131c" }}>
        <iframe
          title="Original JILI Fortune Gems 2 public demo"
          src={trialUrl}
          allow="fullscreen; autoplay"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ display: "block", width: "100%", height: "100%", border: 0, background: "#07131c" }}
        />
      </div>
      <p style={{ margin: "10px 0 0", color: "#9eabb7", fontSize: 12, lineHeight: 1.5 }}>
        This loads the provider's original public trial. If JILI blocks third-party embedding, use the OPEN ORIGINAL GAME button. The provider trial uses its own demo credits and does not connect to the ROYAL BET demo wallet.
      </p>
    </section>
  );
}
