currentFocusedId = "";

// Updates the tabs list with a search filter.
async function updateTabsList(searchTerm) {
    const tabs = await browser.tabs.query({ currentWindow: false });
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
        textContainer.textContent = `${tab.title} — ${domain}`;

        li.appendChild(favicon);
        li.appendChild(textContainer);

        if (currentFocusedId === "") {
            currentFocusedId = li.dataset.tabId;
            li.classList.add("focused");
        }

        //Add event listeners to the list items.
        li.addEventListener("click", () => {
            browser.tabs.update(parseInt(li.dataset.tabId, 10), { active: true });
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
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        window.close();
    } else if (event.key === "Enter") {
        const li = document.querySelector(".tab-row.focused");
        browser.tabs.update(parseInt(li.dataset.tabId, 10), { active: true });
        window.close();
    } else if (event.key === "Tab") {
        const tabsList = document.getElementById("tabs-list");
        const focusedElement = tabsList.querySelector(".focused");
        let newFocusedElement;
        event.preventDefault(); // Prevents the default tab behavior.
        if (event.shiftKey) {
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

// Initial calls to set up the popup.
updateTabsList();
setTheme();