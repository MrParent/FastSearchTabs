currentFocusedId = "";

// Updates the tabs list with a search filter.
async function updateTabsList(searchTerm, focusedIndex = 0) {
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
    tabs.forEach(async (tab) => {
        if (searchTerm && !tab.title.toLowerCase().includes(searchTerm)) {
            return;
        }

        // Get the container information
        const cookieStoreId = tab.cookieStoreId;
        let defaultContainer = 'firefox-default';
        let containerColor;
        let containerName;

        if (cookieStoreId && cookieStoreId !== defaultContainer) {
            try {
                const container = await browser.contextualIdentities.get(cookieStoreId);
                containerColor = container.color;
                containerName = container.name;
            } catch (containerError) {
                console.error(`Failed to retrieve container for Tab ID: ${tab.id}`, containerError);
            }
        }

        const li = document.createElement("li");
        li.classList.add("tab-row");

        li.dataset.tabId = tab.id;

        const favicon = document.createElement("img");
        favicon.src = tab.favIconUrl;
        favicon.alt = "";

        const textContainer = document.createElement("span");
        const domain = new URL(tab.url).host;
        const timeStamp = timestamps[tab.id];
        let timeSinceString;
        if (!timeStamp) {
            timeSinceString = "Not visited";
        } else {
            timeSinceString = timeSince(timestamps[tab.id]);
        }

        const domainSpan = document.createElement("span");
        domainSpan.textContent = domain;
        domainSpan.classList.add("domain-text");

        const containerSpan = document.createElement("span");
        containerSpan.textContent = containerName ?? "";
        if(containerColor) {
            containerSpan.style.color = containerColor;
        }
        containerSpan.classList.add("container-text");

        const timeSpan = document.createElement("span");
        timeSpan.textContent = ` (${timeSinceString})`;
        timeSpan.classList.add("time-text");

        textContainer.textContent = tab.title;

        if (domainSpan.textContent.length > 0) {
            textContainer.appendChild(domainSpan);
        }

        if (containerSpan.textContent.length > 0) {
            textContainer.appendChild(containerSpan);
        }

        textContainer.appendChild(timeSpan);

        //last index tab
        const last = tabs.indexOf(tab) === tabs.length - 1;
        if (last) {
            timeSpan.textContent = " (Current tab)";
        }

        li.appendChild(favicon);
        li.appendChild(textContainer);

        //Add event listeners to the list items.
        li.addEventListener("click", async () => {
            const tabId = parseInt(li.dataset.tabId, 10);
            try {
                const tabInfo = await browser.tabs.get(tabId);

                // Switch to tab AND focus parent window
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
    const rows = document.querySelectorAll(".tab-row");
    currentFocusedId = focusTabRow(rows, focusedIndex);
}

// Get the time since the timestamp.
function timeSince(timestamp) {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
}

// Utility function to check if the OS is macOS
async function isMacOS() {
    try {
        const platformInfo = await browser.runtime.getPlatformInfo();
        return platformInfo.os === "mac";
    } catch (error) {
        console.error("Failed to get platform info:", error);
        return false; // Default to false if there's an error
    }
}

// Adds some keydown event listening..
document.addEventListener("keydown", async(event) => {
    const isMac = await isMacOS();

    const deleteKey = isMac ? "Backspace" : "Delete";
    const modifierKey = isMac ? event.metaKey : event.ctrlKey;

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
    } else if (event.key === deleteKey && modifierKey) {
        const rows = document.querySelectorAll(".tab-row");
        const length = rows.length;
        if (length === 1) {
            return;
        }

        const li = document.querySelector(".tab-row.focused");
        const currentIndex = [...rows].indexOf(li);
        const tabId = parseInt(li.dataset.tabId, 10);
        try {
            await browser.tabs.remove(tabId);
            const searchTerm = event.target.value.toLowerCase();
            let newFocusIndex = currentIndex > 0
                ? currentIndex - 1
                : 0;
            updateTabsList(searchTerm, newFocusIndex);
        } catch (error) {
            console.error("Failed to remove tab:", error);
        }
    }
});

// Focuses the tab row at focusedIndex.
function focusTabRow(rows, focusedIndex) {
    const length = rows.length;

    // Only one row, focus that one.
    if (length === 1) {
        rows[0].classList.add("focused");
        return rows[0].dataset.tabId;
    }

    // Safeup if no rows.
    if (length === 0) {
        return "";
    }

    // If no valid focusedIndex, default to 0.
    if (focusedIndex === null || Number.isNaN(focusedIndex)) {
        focusedIndex = 0;
    }

    // Clamp the index so it's within [0, length-1].
    if (focusedIndex < 0) {
        focusedIndex = 0;
    } else if (focusedIndex >= length) {
        focusedIndex = length - 1;
    }

    rows[focusedIndex].classList.add("focused");

    return rows[focusedIndex].dataset.tabId;
}

// Listens for search input changes and updates the tabs list.
document.getElementById("search").addEventListener("input", (event) => {
    const searchTerm = event.target.value.toLowerCase();
    updateTabsList(searchTerm, 0);
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