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

// Listen for focus changes and close the popup if it loses focus.
browser.windows.onFocusChanged.addListener(async (windowId) => {
  if (currentPopupWindowId !== null) {
    if (windowId !== currentPopupWindowId) {
      try {
        await browser.windows.remove(currentPopupWindowId);
      } catch (error) {
        console.warn("Failed to close popup window:", error);
      } finally {
        currentPopupWindowId = null;
      }
    }
  }

  // If this focus change to another app, skip the timestamp logic.
  if (windowId === browser.windows.WINDOW_ID_NONE) {
    return;
  }

  // Update the timestamp for the active tab if focusing a new window and not the popup.
  try {
    const winInfo = await browser.windows.get(windowId, { populate: true });
    if (winInfo.type === "popup") {
      return;
    }

    const activeTab = winInfo.tabs.find((tab) => tab.active);
    if (activeTab) {
      const tabId = activeTab.id;
      tabLastVisitMap[tabId] = Date.now();

      const existingIndex = visitedTabs.indexOf(tabId);
      if (existingIndex !== -1) {
        visitedTabs.splice(existingIndex, 1);
      }

      visitedTabs.unshift(tabId);

      try {
        await browser.storage.local.set({
          visitedTabs,
          tabLastVisitMap
        });
      } catch (err) {
        console.error("Error saving to storage:", err);
      }
    }
  } catch (err) {
    console.error("Failed to get or update window info:", err);
  }
});

// Visited tabs array
let visitedTabs = [];

// Map of tabId to last visit time stamps.
let tabLastVisitMap = {};

// Load the visitedTabs and tabLastVisitMap from storage.
(async function loadFromStorage() {
  try {
    // Load the visitedTabs and tabLastVisitMap from storage.
    // If the key is not found, the default value is used.
    const { 
      visitedTabs: storedVisitedTabs = [], 
      tabLastVisitMap: storedTabLastVisitMap = {} 
    } = await browser.storage.local.get({
      visitedTabs: [],
      tabLastVisitMap: {}
    });
    
    visitedTabs = storedVisitedTabs;
    tabLastVisitMap = storedTabLastVisitMap;

  } catch (err) {
    console.error("Error loading from storage:", err);
    visitedTabs = [];
    tabLastVisitMap = {};
  }
})();

/**
 * Listens for tab activation (when user switches to a tab).
 * Moving tab ID to the front of the `recentTabs`.
 */
browser.tabs.onActivated.addListener(async (activeInfo) => {
  const { tabId } = activeInfo;
  const currentWindow = await browser.windows.get(activeInfo.windowId);
  if (currentWindow.type === "popup") {
    return;
  }

  tabLastVisitMap[tabId] = Date.now();

  const existingIndex = visitedTabs.indexOf(tabId);
  if (existingIndex !== -1) {
    visitedTabs.splice(existingIndex, 1);
  }

  visitedTabs.unshift(tabId);

  try {
    await browser.storage.local.set({
      visitedTabs,
      tabLastVisitMap
    });
  } catch (err) {
    console.error("Error saving to storage:", err);
  }
});


/**
 * Gets the current visitedTabs and timestamps
 * so the popup can build the list with "time since used."
 */
async function getVisitedData() {
  const mRUTabs = await getTabsInMRUOrder();
  return {
    tabs: mRUTabs,       
    timestamps: tabLastVisitMap
  };
}

/**
 * Gets all tabs in MRU order:
 * 1. The tabs found in `visitedTabs` (most recent first).
 * 2. Then, any other tabs in default order (as returned by query).
 */
async function getTabsInMRUOrder() {
  const allTabs = await browser.tabs.query({ currentWindow: false });
  const sortedTabs = [];

  // 1) For each tabId in `visitedTabs`, if it's still open, push its tab info.
  for (const tabId of visitedTabs) {
    const t = allTabs.find((tab) => tab.id === tabId);
    if (t) {
      sortedTabs.push(t);
    }
  }

  // 2) For each tab from `allTabs`, 
  // if we haven’t added it yet: append it in the default order.
  for (const t of allTabs) {
    const alreadyIncluded = sortedTabs.some((st) => st.id === t.id);
    if (!alreadyIncluded) {
      sortedTabs.push(t);
    }
  }

  return sortedTabs;
}

/**
 * Listen for messages requesting the visited tabs data.
 */
browser.runtime.onMessage.addListener(async (message) => {
  if (message.command === "getVisitedTabs") {
    return Promise.resolve({ visitedData: await getVisitedData() });
  }
});