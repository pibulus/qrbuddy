// Copy the canonical Passport stylesheet into static/ so Fresh can serve it.
// The vendored `utils/softstack-passport/card.css` stays the single source; the
// hash in `manifest.json` catches drift, and this copy is regenerated on every
// dev start and build. Never edit `static/passport-card.css` by hand.
const source = new URL("../utils/softstack-passport/card.css", import.meta.url);
const target = new URL("../static/passport-card.css", import.meta.url);

await Deno.copyFile(source, target);
console.log("passport card css → static/passport-card.css");
