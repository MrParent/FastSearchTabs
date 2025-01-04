currentFocusedId = "";

// Updates the tabs list with a search filter.
async function updateTabsList(searchTerm) {
    const visitedData = await fetchVisitedData();
    const tabs = visitedData.tabs;
    if (!tabs) {
        return console.warn("The add-on can't find any tabs.");
    }

    const timestamps = visitedData.timestamps;
    if (!timestamps) {
        console.warn("No timestamps found. Since the timestamps are used per session and are recorded in the add-on, this might be expected.");
    }

    const firstTab = tabs.shift();
    tabs.push(firstTab);
    
    const tabsList = document.getElementById("tabs-list");
    if (!tabsList) {
        return console.error("No tabs list element found in the popup!");
    }

    tabsList.innerHTML = "";

    // Populate the list with each tab's title, image and host url.
    tabs.forEach((tab) => {
        if (searchTerm && !tab.title.toLowerCase().includes(searchTerm)) {
            return;
        }

        const li = document.createElement("li");
        li.classList.add("tab-row");

        li.dataset.tabId = tab.id;

        const favicon = document.createElement("img");
        favicon.src = tab.favIconUrl;
        favicon.alt = "";

        const textContainer = document.createElement("span");
        const domain = new URL(tab.url).host;
        const timeSinceOpenedString = getTimeStampString(timestamps[tab.id]);

        textContainer.textContent = `${tab.title} — ${domain}` + " (" + timeSinceOpenedString + ")";
        
        //last index tab
        const last = tabs.indexOf(tab) === tabs.length - 1;
        if (last) {
            textContainer.textContent = `${tab.title} — ${domain}` + " (Open now)";
        }

        li.appendChild(favicon);
        li.appendChild(textContainer);

        if (currentFocusedId === "") {
            currentFocusedId = li.dataset.tabId;
            li.classList.add("focused");
        }

        //Add event listeners to the list items.
        li.addEventListener("click", async () => {
            const tabId = parseInt(li.dataset.tabId, 10);
            try {
                // We need the tab's window ID in order to focus that window.
                // So, fetch the full tab info:
                const tabInfo = await browser.tabs.get(tabId);
                
                // Now switch to that tab AND focus its parent window
                await switchToTab(tabInfo.id, tabInfo.windowId);
              } catch (err) {
                console.error("Failed to switch tab:", err);
              }

            window.close();
        });
        li.addEventListener("mouseenter", () => {
            currentFocusedId = li.dataset.tabId;
            highlightFocusedRow();
        });

        tabsList.appendChild(li);
    });

    document.getElementById("search").focus();
}

//Get time stamp string from time stamp.
function getTimeStampString(timeStamp) {
    const timeSinceOpened = timeStamp ? Date.now() - timeStamp : 0;
    // time since opened in seconds, min if more than 60s, hour if more than 60min, day if more than 24h
    let timeSinceOpenedString = `${Math.floor(timeSinceOpened / 1000)}sec`;
    if (timeSinceOpened > 60000) {
        timeSinceOpenedString = `${Math.floor(timeSinceOpened / 60000)}min`;
    }
    if (timeSinceOpened > 3600000) {
        timeSinceOpenedString = `${Math.floor(timeSinceOpened / 3600000)}hours`;
    }
    if (timeSinceOpened > 86400000) {
        timeSinceOpenedString = `${Math.floor(timeSinceOpened / 86400000)}days`;
    }

    return timeSinceOpenedString = 'Last visited ' + timeSinceOpenedString + ' ago';
}

// Sets the theme colors if needed.
async function setTheme() {
    try {
        const currentTheme = await browser.theme.getCurrent();
        if (currentTheme && currentTheme.colors) {
            // e.g., override with the theme’s toolbar and text color
            document.documentElement.style.setProperty("--bg-color", currentTheme.colors.toolbar || "#121212");
            document.documentElement.style.setProperty("--text-color", currentTheme.colors.toolbar_text || "#fff");
        }
    } catch (e) {
        console.warn("No theme API available, or error retrieving theme:", e);
    }
};

// Adds some keydown event listening..
document.addEventListener("keydown", async(event) => {
    if (event.key === "Escape") {
        window.close();
    } else if (event.key === "Enter") {
        const li = document.querySelector(".tab-row.focused");
        const tabId = parseInt(li.dataset.tabId, 10);
            try {
                // We need the tab's window ID in order to focus that window.
                // So, fetch the full tab info:
                const tabInfo = await browser.tabs.get(tabId);
                
                // Now switch to that tab AND focus its parent window
                await switchToTab(tabInfo.id, tabInfo.windowId);
              } catch (err) {
                console.error("Failed to switch tab:", err);
              }

            window.close();
    } else if (event.key === "Tab" || event.key === "ArrowDown" || event.key === "ArrowUp") {
        const tabsList = document.getElementById("tabs-list");
        const focusedElement = tabsList.querySelector(".focused");
        let newFocusedElement;
        event.preventDefault(); // Prevents the default tab behavior.
        if (event.key === "Tab" && event.shiftKey || event.key === "ArrowUp") {
            newFocusedElement = focusedElement.previousElementSibling || focusedElement.parentElement.lastElementChild;
        } else {
            newFocusedElement = focusedElement.nextElementSibling || focusedElement.parentElement.firstElementChild;
        }

        if (newFocusedElement) {
            focusedElement.classList.remove("focused");
            newFocusedElement.classList.add("focused");
            currentFocusedId = newFocusedElement.dataset.tabId;
        }
        
        highlightFocusedRow();
    }
});

// Listens for search input changes and updates the tabs list.
document.getElementById("search").addEventListener("input", (event) => {
    const searchTerm = event.target.value.toLowerCase();
    currentFocusedId = "";
    updateTabsList(searchTerm);
});

// Toggle the focused class on the tab rows.
function highlightFocusedRow() {
    const tabsList = document.getElementById("tabs-list");
    const rows = tabsList.querySelectorAll(".tab-row");
    rows.forEach((row) => {
        row.classList.toggle("focused", row.dataset.tabId == currentFocusedId);
    });
}

// Fetches the visitedData.
async function fetchVisitedData() {
    const response = await browser.runtime.sendMessage({ command: "getVisitedTabs" });
    return response.visitedData;
}

// Switches to the tab and focuses the window.
async function switchToTab(tabId, windowId) {
    try {
      // 1) Make the tab active
      await browser.tabs.update(tabId, { active: true });
  
      // 2) Focus the window that contains that tab
      await browser.windows.update(windowId, { focused: true });
    } catch (error) {
      console.error("Failed to switch or focus:", error);
    }
}

// Initial calls to set up the popup.
updateTabsList();
setTheme();