import React, { useMemo, useState } from "react";
import { upload } from "@canva/asset";
import { addElementAtPoint } from "@canva/design";
import { requestOpenExternalUrl } from "@canva/platform";
import {
  buildQrSvgString,
  CANVA_PALETTES,
  type CanvaPalette,
  toSvgDataUrl,
} from "./qrbuddy-svg";

const SUPABASE_FUNCTIONS_URL =
  "https://aqydpibnvlhcjcwosrti.supabase.co/functions/v1";

export const App = () => {
  const [url, setUrl] = useState("https://");
  const [isEditable, setIsEditable] = useState(false);
  const [palette, setPalette] = useState<CanvaPalette>(CANVA_PALETTES[0]);
  const [caption, setCaption] = useState("SCAN ME");
  const [passportPhrase, setPassportPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastEditUrl, setLastEditUrl] = useState<string | null>(null);

  const previewDataUrl = useMemo(() => {
    const { svg } = buildQrSvgString({
      data: url.trim() || "https://qrbuddy.app",
      c1: palette.c1,
      c2: palette.c2,
      bg: palette.bg,
      caption,
    });
    return toSvgDataUrl(svg);
  }, [url, palette, caption]);

  const handleInsertToCanva = async () => {
    const cleanUrl = url.trim();
    if (!cleanUrl || busy) return;
    setBusy(true);
    setStatusMessage(null);

    try {
      let targetUrl = cleanUrl;

      if (isEditable) {
        const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-dynamic-qr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination_url: cleanUrl,
            title: cleanUrl,
            passport_phrase: passportPhrase.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (data?.redirect_url) {
          targetUrl = data.redirect_url;
          setLastEditUrl(data.edit_url || null);
          setStatusMessage("Editable QR added — destination can change anytime.");
        }
      }

      const { svg, width, height } = buildQrSvgString({
        data: targetUrl,
        c1: palette.c1,
        c2: palette.c2,
        bg: palette.bg,
        caption,
      });
      const dataUrl = toSvgDataUrl(svg);

      const asset = await upload({
        type: "image",
        mimeType: "image/svg+xml",
        url: dataUrl,
        thumbnailUrl: dataUrl,
        width,
        height,
        aiDisclosure: "none",
      });

      await addElementAtPoint({
        type: "image",
        ref: asset.ref,
      });

      if (!isEditable) {
        setStatusMessage("Static vector QR placed on canvas.");
      }
    } catch {
      setStatusMessage("Path didn't land. Check the link and try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleOpenExternal = async (target: string) => {
    await requestOpenExternalUrl({ url: target });
  };

  return (
    <div
      style={{
        padding: "14px",
        background: "#fbf1e4",
        color: "#1e1714",
        fontFamily: "Inter, system-ui, sans-serif",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      {/* Monetization Status Bar (Required by Canva Freemium Review) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          background: "#fffef7",
          border: "2px solid #1e1714",
          borderRadius: "12px",
          marginBottom: "12px",
          fontSize: "11px",
          fontWeight: 800,
        }}
      >
        <span>
          {passportPhrase.trim()
            ? "🛂 Passport Linked"
            : "Free Tier · 5 Editable QRs"}
        </span>
        <button
          type="button"
          onClick={() => handleOpenExternal("https://qrbuddy.app/compare")}
          style={{
            background: "#ec4899",
            color: "#fffef7",
            border: "1.5px solid #1e1714",
            borderRadius: "999px",
            padding: "3px 8px",
            fontSize: "10px",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Get QRBuddy Passport
        </button>
      </div>

      {/* Live SVG Preview */}
      <div
        style={{
          background: "#fffef7",
          border: "3px solid #1e1714",
          borderRadius: "18px",
          padding: "12px",
          textAlign: "center",
          marginBottom: "12px",
        }}
      >
        <img
          src={previewDataUrl}
          alt="QRBuddy vector preview"
          style={{ width: "168px", height: "auto", display: "block", margin: "0 auto" }}
        />
      </div>

      {/* Destination Input */}
      <label style={{ display: "block", marginBottom: "10px" }}>
        <span style={{ display: "block", fontSize: "11px", fontWeight: 900, marginBottom: "4px" }}>
          Destination Link or Text
        </span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-cafe.com/menu"
          style={{
            width: "100%",
            padding: "9px 10px",
            borderRadius: "10px",
            border: "2px solid #1e1714",
            background: "#fffef7",
            fontSize: "13px",
            fontWeight: 700,
            boxSizing: "border-box",
          }}
        />
      </label>

      {/* Static vs. Editable Mode Toggle */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px",
          padding: "4px",
          background: "#fffef7",
          border: "2px solid #1e1714",
          borderRadius: "12px",
          marginBottom: "12px",
        }}
      >
        <button
          type="button"
          onClick={() => setIsEditable(false)}
          style={{
            padding: "7px 6px",
            borderRadius: "8px",
            border: "none",
            background: !isEditable ? "#1e1714" : "transparent",
            color: !isEditable ? "#fffef7" : "#1e1714",
            fontSize: "11px",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          🔒 Static ($0)
        </button>
        <button
          type="button"
          onClick={() => setIsEditable(true)}
          style={{
            padding: "7px 6px",
            borderRadius: "8px",
            border: "none",
            background: isEditable ? "#5E409D" : "transparent",
            color: isEditable ? "#fffef7" : "#5E409D",
            fontSize: "11px",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          ⚡ Editable + Stats
        </button>
      </div>

      {/* Palette Picker */}
      <div style={{ marginBottom: "12px" }}>
        <span style={{ display: "block", fontSize: "11px", fontWeight: 900, marginBottom: "6px" }}>
          Print-Verified Palette (WCAG &le; 0.40)
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
          {CANVA_PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPalette(p)}
              style={{
                padding: "6px 4px",
                borderRadius: "10px",
                border: palette.id === p.id ? "2.5px solid #1e1714" : "1.5px solid #CECDC3",
                background: palette.id === p.id ? "#fde68a" : "#fffef7",
                fontSize: "10px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: "18px",
                  height: "18px",
                  borderRadius: "999px",
                  margin: "0 auto 3px",
                  background: `linear-gradient(135deg, ${p.c1}, ${p.c2})`,
                }}
              />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Frame Caption */}
      <label style={{ display: "block", marginBottom: "12px" }}>
        <span style={{ display: "block", fontSize: "11px", fontWeight: 900, marginBottom: "4px" }}>
          Frame Caption (Leave blank for frameless)
        </span>
        <input
          type="text"
          maxLength={18}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="SCAN ME"
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "10px",
            border: "2px solid #1e1714",
            background: "#fffef7",
            fontSize: "12px",
            fontWeight: 800,
            boxSizing: "border-box",
          }}
        />
      </label>

      {/* Optional 4-word Passport Phrase */}
      {isEditable && (
        <label style={{ display: "block", marginBottom: "12px" }}>
          <span style={{ display: "block", fontSize: "11px", fontWeight: 900, marginBottom: "4px" }}>
            4-Word QRBuddy Passport Phrase (Optional)
          </span>
          <input
            type="text"
            value={passportPhrase}
            onChange={(e) => setPassportPhrase(e.target.value)}
            placeholder="velvet-otter-sunset-mint"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "10px",
              border: "2px solid #1e1714",
              background: "#fffef7",
              fontSize: "12px",
              fontWeight: 700,
              boxSizing: "border-box",
            }}
          />
        </label>
      )}

      {/* Primary CTA */}
      <button
        type="button"
        disabled={busy}
        onClick={handleInsertToCanva}
        style={{
          width: "100%",
          padding: "11px",
          borderRadius: "999px",
          border: "3px solid #1e1714",
          background: "#1e1714",
          color: "#fffef7",
          fontSize: "13px",
          fontWeight: 900,
          cursor: busy ? "wait" : "pointer",
        }}
      >
        {busy ? "Placing Vector QR…" : "Add Vector QR to Design ✨"}
      </button>

      {statusMessage && (
        <p style={{ fontSize: "11px", fontWeight: 700, textAlign: "center", marginTop: "8px" }}>
          {statusMessage}
        </p>
      )}

      {lastEditUrl && (
        <button
          type="button"
          onClick={() => handleOpenExternal(lastEditUrl)}
          style={{
            width: "100%",
            marginTop: "8px",
            padding: "8px",
            borderRadius: "10px",
            border: "2px solid #1e1714",
            background: "#fffef7",
            color: "#1e1714",
            fontSize: "11px",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Open Edit & Scan Stats Dashboard ↗
        </button>
      )}
    </div>
  );
};
