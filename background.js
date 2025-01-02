// Keep track of the currently open popup window.
let currentPopupWindowId = null;

// Creates a new popup window.
async function createPopupWindow() {
  const popupWidth = 832;
  const popupHeight = 300;
  const currentWindow = await browser.windows.getCurrent();

  const currentLeft = currentWindow.left ?? 0;
  const currentTop = currentWindow.top ?? 0;
  const currentWidth = currentWindow.width ?? 800;
  const left = currentLeft + currentWidth / 4;
  const top = currentTop + 160;

  const popup = await browser.windows.create({
    url: browser.runtime.getURL("popup.html"),
    type: "popup",
    width: popupWidth,
    height: popupHeight,
    top: top,
    left: left
  });

  currentPopupWindowId = popup.id;
}

// Listen for the command to open the popup. Close the current one if it's open.
browser.commands.onCommand.addListener(async (command) => {
  if (command === "open-popup") {
    if (currentPopupWindowId !== null) {
      try {
        await browser.windows.remove(currentPopupWindowId);
      } catch (err) {
        console.warn("Tried to close an old window, but it may already be closed:", err);
      }

      currentPopupWindowId = null;
    }

    createPopupWindow();
  }
});

// Callback to clear the current popup window ID when it's closed.
browser.windows.onRemoved.addListener((removedWindowId) => {
  if (removedWindowId === currentPopupWindowId) {
    currentPopupWindowId = null;
  }
});
