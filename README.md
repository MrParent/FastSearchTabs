# Fastlane Tabs

**Fastlane Tabs** is a Firefox add-on that makes tab switching easier by offering a quick and intuitive popup for changing between tabs, similar to the built-in tab search found in other browsers like Chrome and Edge. It's only tested on Windows but should work on other desktop operating systems as well.

## Features

- **Quick Tab Switching:** Press the default shortcut (`Ctrl+Alt+S`, or macOS:`Command+Alt+S`) to open the tab switch dialog and search for the desired tab.
- **Direct Tab Closure:** Close tabs directly from the dialog without additional steps.
- **Customizable Shortcut:** Change the default "open dialog" shortcut in Firefox’s add-on settings for this add-on.
- **Keyboard Navigation:** Navigate through tabs using simple keybindings.
- **Simple Mouse Support:** Select a tab by clicking it with your mouse.
- **Good UI:** Clean interface with dark mode support and time-since functionality.

## Key Bindings in Tab Dialog

- **Tab / Down Arrow:** Move selection down
- **Shift + Tab / Up Arrow:** Move selection up
- **Enter:** Switch to the selected tab
- **Ctrl + Delete:** Close the selected tab
- **Mouse Click:** Select a tab by clicking it

**macOS specific**
- **Command + Backspace:** Close the selected tab

## Motivation Behind Development

Fastlane Tabs was developed to address several limitations and enhance the tab switching experience in Firefox:

1. **Improved Efficiency:**
   - **Native Limitations as of now:** In Firefox, switching tabs typically involves multiple steps—pressing `Ctrl + L`, typing `%`, searching, and then navigating with the keyboard or mouse and then press `Enter` or click with the mouse. This process requires approximately five steps.
   - **Enhanced Workflow:** Fastlane Tabs reduces this to three steps: press `Ctrl + Alt + S`, search or navigate through tabs, and press `Enter` or click with the mouse.

2. **Enhancements? Over Existing Add-ons:**
   - Existing add-ons like "TabSearch", "Fast Tab Switcher" or "Tabby - Window & Tab Manager" offer robust tab management and I recommend that you try them out. Especially if you want a tab manager. For me, clutter of functions and design, and the lack of specific features such as **dark mode** (sometimes) and **time-since functionality** made me want something else.

## Installation

1. **Download from [Mozilla Add-ons](https://addons.mozilla.org/)**

2. **Or use web-ext (https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)**

## License

This project is licensed under the [MIT License](license.txt).