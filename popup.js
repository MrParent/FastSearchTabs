// Updates the tabs list with a search filter.
async function updateTabsList(searchTerm) {
    const tabs = await browser.tabs.query({});
    const tabsList = document.getElementById("tabs-list");
    if (!tabsList) {
        return console.error("No tabs list element found in the popup!");
    }

    tabsList.innerHTML = "";

    // Populate the list with each tab's title, image and host url.
    tabs.forEach(tab => {
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
        textContainer.textContent = `${tab.title} — ${domain}`;

        li.appendChild(favicon);
        li.appendChild(textContainer);

        li.addEventListener("click", () => {
            browser.tabs.update(parseInt(li.dataset.tabId, 10), { active: true });
            window.close();
        });

        tabsList.appendChild(li);
    });

    document.getElementById("search").focus();
}

// Listens for search input changes and updates the tabs list.
document.getElementById("search").addEventListener("input", (event) => {
    const searchTerm = event.target.value.toLowerCase();
    updateTabsList(searchTerm);
});

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

// Close the popup window since commands can't register "escape".
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        window.close();
    }
});

// Initial calls to set up the popup.
updateTabsList();
setTheme();