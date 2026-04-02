document.addEventListener("DOMContentLoaded", async () => {
  const extensionToggle = document.getElementById("extensionToggle");
  const toggleContainer = document.getElementById("extensionToggleContainer");
  const focusableElements = document.querySelectorAll(
    "a.btn, [role='button'][tabindex='0']",
  );

  // Load state
  const result = await browser.storage.local.get("extensionEnabled");
  const isEnabled = result.extensionEnabled !== false;
  extensionToggle.checked = isEnabled;
  updateToggleLabel();

  // Toggle change
  extensionToggle.addEventListener("change", async (event) => {
    const enabled = event.target.checked;
    await browser.storage.local.set({ extensionEnabled: enabled });
    updateToggleLabel();

    // Notify tabs
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      try {
        await browser.tabs.sendMessage(tab.id, {
          action: "extensionStatusChanged",
          enabled: enabled,
        });
      } catch (error) {}
    }
  });

  // Click support
  toggleContainer.addEventListener("click", (event) => {
    if (event.target !== extensionToggle) {
      extensionToggle.click();
    }
  });

  // Keyboard support
  toggleContainer.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      extensionToggle.click();
    }
  });

  // Tab navigation
  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      const activeElement = document.activeElement;
      const currentIndex = Array.from(focusableElements).indexOf(activeElement);

      if (event.shiftKey && currentIndex === 0) {
        event.preventDefault();
        focusableElements[focusableElements.length - 1].focus();
      } else if (
        !event.shiftKey &&
        currentIndex === focusableElements.length - 1
      ) {
        event.preventDefault();
        focusableElements[0].focus();
      }
    }
  });

  // Update label
  function updateToggleLabel() {
    const status = extensionToggle.checked ? "Enabled" : "Disabled";
    toggleContainer.setAttribute("aria-pressed", extensionToggle.checked);
  }
});
