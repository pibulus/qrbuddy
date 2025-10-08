import { useEffect, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";

interface QRData {
  short_code: string;
  destination_url: string;
  created_at: string;
  expires_at: string | null;
  max_scans: number | null;
  scan_count: number;
  is_active: boolean;
  routing_mode: string;
}

export default function EditQRForm() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [ownerToken, setOwnerToken] = useState<string>("");

  // Edit form state
  const [destinationUrl, setDestinationUrl] = useState("");
  const [maxScans, setMaxScans] = useState<number | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Get token from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    const token = params.get("token");

    if (!token) {
      setError("No owner token provided");
      setLoading(false);
      return;
    }

    setOwnerToken(token);
    loadQRData(token);
  }, []);

  const loadQRData = async (token: string) => {
    try {
      setLoading(true);
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ||
        "https://rckahvngsukzkmbpaejs.supabase.co";

      const response = await fetch(
        `${supabaseUrl}/functions/v1/get-dynamic-qr?token=${token}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load QR data");
      }

      const result = await response.json();
      const data = result.data;

      setQrData(data);
      setDestinationUrl(data.destination_url);
      setMaxScans(data.max_scans);
      setExpiryDate(
        data.expires_at
          ? new Date(data.expires_at).toISOString().slice(0, 16)
          : "",
      );
      setIsActive(data.is_active);

      setLoading(false);
    } catch (err) {
      console.error("Load QR error:", err);
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      haptics.medium();

      const supabaseUrl = Deno.env.get("SUPABASE_URL") ||
        "https://rckahvngsukzkmbpaejs.supabase.co";

      const body = {
        owner_token: ownerToken,
        destination_url: destinationUrl,
        max_scans: maxScans,
        expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
        is_active: isActive,
      };

      const response = await fetch(
        `${supabaseUrl}/functions/v1/update-dynamic-qr`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update QR");
      }

      const result = await response.json();
      setQrData(result.data);

      // Success feedback
      haptics.success();
      alert("✅ QR updated successfully!");

      setIsSaving(false);
    } catch (err) {
      console.error("Update QR error:", err);
      alert(
        `❌ Failed to update: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      haptics.error();
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div class="bg-white border-4 border-black rounded-2xl p-8 text-center">
        <div class="animate-pulse">
          <div class="text-4xl mb-4">⏳</div>
          <p class="text-gray-600">Loading QR data...</p>
        </div>
      </div>
    );
  }

  if (error || !qrData) {
    return (
      <div class="bg-red-50 border-4 border-red-400 rounded-2xl p-8 text-center">
        <div class="text-4xl mb-4">❌</div>
        <p class="text-red-800 font-semibold mb-2">
          {error || "QR code not found"}
        </p>
        <p class="text-red-600 text-sm">
          Invalid or expired owner token
        </p>
      </div>
    );
  }

  const redirectUrl = `https://qrbuddy.app/r?code=${qrData.short_code}`;
  const scansRemaining = qrData.max_scans
    ? qrData.max_scans - qrData.scan_count
    : "∞";

  return (
    <div class="space-y-6">
      {/* QR Status Card */}
      <div class="bg-gradient-to-r from-purple-50 to-pink-50 border-4 border-purple-400 rounded-2xl p-6 space-y-3">
        <h2 class="text-2xl font-black text-purple-900">QR Status</h2>

        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-600 font-semibold">Short Code:</span>
            <p class="font-mono text-purple-800">{qrData.short_code}</p>
          </div>
          <div>
            <span class="text-gray-600 font-semibold">Scans:</span>
            <p class="font-mono text-purple-800">
              {qrData.scan_count} / {qrData.max_scans || "∞"}
            </p>
          </div>
          <div>
            <span class="text-gray-600 font-semibold">Remaining:</span>
            <p class="font-mono text-purple-800">{scansRemaining}</p>
          </div>
          <div>
            <span class="text-gray-600 font-semibold">Status:</span>
            <p
              class={`font-bold ${
                qrData.is_active ? "text-green-600" : "text-red-600"
              }`}
            >
              {qrData.is_active ? "Active ✓" : "Inactive ✗"}
            </p>
          </div>
        </div>

        {/* Redirect URL */}
        <div class="pt-3 border-t-2 border-purple-200">
          <span class="text-gray-600 font-semibold text-sm">Redirect URL:</span>
          <div class="flex gap-2 mt-1">
            <input
              type="text"
              value={redirectUrl}
              readOnly
              class="flex-1 px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-xs font-mono"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(redirectUrl);
                haptics.success();
                alert("Copied!");
              }}
              class="px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold text-sm hover:bg-purple-600"
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div class="bg-white border-4 border-black rounded-2xl p-6 space-y-4">
        <h2 class="text-2xl font-black text-black">Edit QR Settings</h2>

        {/* Destination URL */}
        <div class="space-y-2">
          <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Destination URL
          </label>
          <input
            type="text"
            value={destinationUrl}
            onInput={(e) =>
              setDestinationUrl((e.target as HTMLInputElement).value)}
            class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-pink-500 focus:outline-none"
            placeholder="https://example.com"
          />
        </div>

        {/* Scan Limit */}
        <div class="space-y-2">
          <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Scan Limit
          </label>
          <div class="flex gap-2 flex-wrap">
            {[1, 5, 10, 100, null].map((limit) => (
              <button
                type="button"
                key={limit?.toString() || "unlimited"}
                onClick={() => {
                  setMaxScans(limit);
                  haptics.light();
                }}
                class={`px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all
                  ${
                  maxScans === limit
                    ? "bg-pink-500 text-white border-pink-600 scale-105"
                    : "bg-white text-gray-700 border-gray-300 hover:border-pink-400"
                }`}
              >
                {limit === null ? "∞" : limit}
              </button>
            ))}
          </div>
        </div>

        {/* Expiry Date */}
        <div class="space-y-2">
          <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Expiry Date (Optional)
          </label>
          <input
            type="datetime-local"
            value={expiryDate}
            onChange={(e) =>
              setExpiryDate((e.target as HTMLInputElement).value)}
            class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-pink-500 focus:outline-none"
          />
        </div>

        {/* Active Toggle */}
        <div class="space-y-2">
          <label class="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => {
                setIsActive((e.target as HTMLInputElement).checked);
                haptics.light();
              }}
              class="w-5 h-5 rounded border-2 border-black cursor-pointer"
            />
            <span class="text-sm font-semibold text-gray-700 group-hover:text-pink-600">
              QR is active
            </span>
          </label>
          <p class="text-xs text-gray-500 ml-8">
            Uncheck to deactivate this QR (scans will show KABOOM page)
          </p>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !destinationUrl.trim()}
          class="w-full px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-black text-lg rounded-xl border-2 border-black shadow-chunky hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isSaving ? "Saving..." : "💾 Save Changes"}
        </button>
      </div>

      {/* Privacy Note */}
      <div class="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
        <p class="text-sm text-green-800">
          🔒 <strong>Privacy First:</strong>{" "}
          No tracking, no analytics. Just editable redirects.
        </p>
      </div>
    </div>
  );
}
