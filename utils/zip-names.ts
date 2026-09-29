/** Sanitize archive paths and keep same-named uploads as separate entries. */
export function safeZipEntryNames(names: unknown[]): string[] {
  const used = new Set<string>();

  return names.map((value, index) => {
    const fallback = `file-${index + 1}`;
    const name = typeof value === "string"
      ? value.replace(/[/\\:\0\r\n]/g, "_").trim()
      : "";
    const base = name && name !== "." && name !== ".." ? name : fallback;
    const extensionIndex = base.lastIndexOf(".");
    const hasExtension = extensionIndex > 0;
    const stem = hasExtension ? base.slice(0, extensionIndex) : base;
    const extension = hasExtension ? base.slice(extensionIndex) : "";

    let candidate = base;
    let suffix = 2;
    while (used.has(candidate.toLowerCase())) {
      candidate = `${stem} (${suffix})${extension}`;
      suffix++;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  });
}
