// ═══════════════════════════════════════════════════════════════════════════
// 🔖 stamp-version — write the commit being built into /version.json
// ═══════════════════════════════════════════════════════════════════════════
// Deno/Fresh port of ziplist/scripts/stamp-version.mjs. Same contract, same
// filename, so `fleet-check --deployed` reads every app the same way.
//
// WHY: the host cannot be asked what it is serving. Netlify returns a null
// commit_ref for CLI uploads; Deno Deploy exposes no commit at all. So the
// artifact answers for itself over plain HTTP instead.
//
// Fresh serves static/ at the root, so this lands at /version.json.
//
// GitHub source archives on Deno Deploy may omit .git. Always include a
// deterministic digest of the shipped source, so a local build can be matched
// to production without guessing a commit from a branch that can move.

async function gitSha(): Promise<string | null> {
  try {
    const cmd = new Deno.Command("git", {
      args: ["rev-parse", "HEAD"],
      stdout: "piped",
      stderr: "null",
    });
    const { code, stdout } = await cmd.output();
    if (code !== 0) return null;
    return new TextDecoder().decode(stdout).trim().slice(0, 7) || null;
  } catch {
    return null;
  }
}

async function sourceHash(): Promise<string> {
  const files: string[] = [];
  async function walk(path: string) {
    for await (const entry of Deno.readDir(path)) {
      const child = `${path}/${entry.name}`;
      if (child === "static/version.json") continue;
      if (entry.isDirectory) await walk(child);
      else if (entry.isFile) files.push(child);
    }
  }
  for (
    const dir of [
      "routes",
      "islands",
      "components",
      "hooks",
      "utils",
      "types",
      "static",
      "scripts",
    ]
  ) {
    try {
      await walk(dir);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }
  for (
    const file of [
      "deno.json",
      "deno.lock",
      "fresh.config.ts",
      "main.ts",
      "dev.ts",
      "tailwind.config.ts",
    ]
  ) {
    try {
      await Deno.stat(file);
      files.push(file);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }
  const hex = (bytes: ArrayBuffer) =>
    Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0"))
      .join("");
  const manifest: string[] = [];
  for (const file of files.sort()) {
    manifest.push(
      `${file}\0${
        hex(await crypto.subtle.digest("SHA-256", await Deno.readFile(file)))
      }`,
    );
  }
  return hex(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(manifest.join("\n")),
    ),
  );
}

const fromEnv = (Deno.env.get("COMMIT_REF") || Deno.env.get("GITHUB_SHA"))
  ?.trim();
const buildId = Deno.env.get("DENO_DEPLOY_BUILD_ID")?.trim() ?? null;

const commit =
  (fromEnv && /^[0-9a-f]{7,40}$/i.test(fromEnv) ? fromEnv.slice(0, 7) : null) ??
    (await gitSha());

const stamp = {
  commit,
  buildId,
  sourceHash: await sourceHash(),
  built: new Date().toISOString(),
};

await Deno.mkdir("static", { recursive: true });
await Deno.writeTextFile(
  "static/version.json",
  `${JSON.stringify(stamp, null, 2)}\n`,
);

console.log(`🔖 version.json → ${stamp.commit} (${stamp.built})`);
