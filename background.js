// Keep track of the currently open popup window.
let currentPopupWindowId = null;

// Creates a new popup window.
async function createPopupWindow() {
  const currentWindow = await browser.windows.getCurrent();

  const currentWidth = currentWindow.width ?? 800;
  const currentHeight = currentWindow.height ?? 600;
  const maxHeight = currentHeight * 0.8;
  const currentLeft = currentWindow.left ?? 0;
  const currentTop = currentWindow.top ?? 0;
  const left = currentLeft + currentWidth / 4;
  const top = currentTop + 160;
 
  const tabs = await browser.tabs.query({});
  const tabsCount = tabs.length;

  // Scale the window height depending on the number of tabs.
  const height = parseInt(Math.min((128 + 28 * tabsCount), maxHeight));
  const width = parseInt(currentWidth/2); 

  const popup = await browser.windows.create({
    url: browser.runtime.getURL("popup.html"),
    type: "popup",
    width: width,
    height: height,
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
