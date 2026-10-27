// QRBuddy Figma Plugin — Main Thread (`code.js`)
// Receives standalone SVG 1.1 markup from `ui.html` and drops a true vector
// node onto the active Figma or FigJam canvas via `figma.createNodeFromSvg`.

figma.showUI(__html__, {
  width: 340,
  height: 520,
  title: "QRBuddy Vector QR Studio",
});

figma.ui.onmessage = (msg) => {
  if (msg.type === "insert-svg" && typeof msg.svg === "string") {
    const node = figma.createNodeFromSvg(msg.svg);
    node.name = msg.name || "QRBuddy Vector QR";
    node.x = figma.viewport.center.x - node.width / 2;
    node.y = figma.viewport.center.y - node.height / 2;
    figma.currentPage.appendChild(node);
    figma.currentPage.selection = [node];
    figma.viewport.scrollAndZoomIntoView([node]);
    figma.notify("✨ QRBuddy vector placed on canvas");
  } else if (msg.type === "open-url" && typeof msg.url === "string") {
    figma.openExternal(msg.url);
  }
};
