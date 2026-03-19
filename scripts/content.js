(() => {
  // Configuration
  const ITEM_ID = "gmap-btn-extension-item";
  const LINK_ID = "gmap-btn-extension-link";
  const IMAGES_SELECTOR =
    'a[href*="tbm=isch"], a[href*="udm=2"], [role="link"][href*="tbm=isch"], [role="link"][href*="udm=2"]';
  const ACTIVE_SELECTOR =
    '[aria-current="page"], [aria-selected="true"], .hdtb-msel';

  // URL & Page Detection
  function isGoogleSearchPage() {
    // Check Google search
    return (
      location.hostname.includes("google.") &&
      location.pathname.startsWith("/search")
    );
  }

  function getSearchParams() {
    // Cache params
    return new URLSearchParams(location.search);
  }

  function getSearchQuery() {
    // Extract search term
    return getSearchParams().get("q");
  }

  function isImagesSearchMode() {
    // Check image mode
    const params = getSearchParams();
    return params.get("tbm") === "isch" || params.get("udm") === "2";
  }

  function getMapsUrl(query) {
    // Build maps URL
    return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  }

  // DOM Navigation
  function findNavigationContainer() {
    // Locate navigation bar
    return (
      document.querySelector("#hdtb-msb") ||
      document.querySelector('[role="navigation"] div[role="list"]') ||
      document.querySelector('[role="navigation"]')
    );
  }

  function getItemLink(item) {
    // Get link element
    return item.querySelector('a[href], [role="link"][href]');
  }

  function findNavItemFromChild(nav, child) {
    // Find parent list item
    let current = child;
    while (current && current.parentElement !== nav) {
      current = current.parentElement;
    }
    return current?.parentElement === nav ? current : null;
  }

  function findImagesItem(nav) {
    // Locate images button
    const imagesLink = nav.querySelector(IMAGES_SELECTOR);
    const item = findNavItemFromChild(nav, imagesLink);
    if (item) return item;

    if (!isImagesSearchMode()) return null;

    const activeItem = nav.querySelector(ACTIVE_SELECTOR);
    return findNavItemFromChild(nav, activeItem);
  }

  function findTemplateItem(nav, imagesItem) {
    // Find button template
    if (imagesItem?.querySelector('a[href], [role="link"][href]')) {
      return imagesItem;
    }

    const imagesLink = nav.querySelector(IMAGES_SELECTOR);
    const byImagesLink = findNavItemFromChild(nav, imagesLink);
    if (byImagesLink?.querySelector('a[href], [role="link"][href]')) {
      return byImagesLink;
    }

    return Array.from(nav.children).find(
      (child) => child.nodeType === Node.ELEMENT_NODE && getItemLink(child),
    );
  }

  // DOM Manipulation
  function clearIds(root) {
    // Remove IDs recursively
    root.removeAttribute("id");
    root.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  }

  function clearActiveState(root) {
    // Deselect element
    root.querySelectorAll(ACTIVE_SELECTOR).forEach((el) => {
      el.removeAttribute("aria-current");
      el.setAttribute("aria-selected", "false");
      el.classList.remove("hdtb-msel");
    });

    if (root.classList.contains("hdtb-msel")) {
      root.classList.remove("hdtb-msel");
    }
  }

  function setLinkLabel(link, text) {
    // Update button text
    const labelNode =
      link.querySelector("span[aria-hidden], span") ||
      link.querySelector("div");
    (labelNode || link).textContent = text;
  }

  function createMapsItem(templateItem, query) {
    // Build maps button
    const item = templateItem.cloneNode(true);
    clearIds(item);
    clearActiveState(item);
    item.id = ITEM_ID;

    const link = getItemLink(item);
    if (!link) return null;

    link.id = LINK_ID;
    link.href = getMapsUrl(query);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", "Maps");
    setLinkLabel(link, "Maps");

    return item;
  }

  function placeMapsItem(nav, item) {
    // Insert after images
    const imagesItem = findImagesItem(nav);
    if (!imagesItem) return;

    if (imagesItem.nextSibling !== item) {
      nav.insertBefore(item, imagesItem.nextSibling);
    }
  }

  function updateMapsButton() {
    // Main logic
    if (!isGoogleSearchPage()) return;

    const query = getSearchQuery();
    if (!query) return;

    const nav = findNavigationContainer();
    if (!nav) return;

    const imagesItem = findImagesItem(nav);
    if (!imagesItem) return;

    const existingLink = document.getElementById(LINK_ID);
    const existingItem = document.getElementById(ITEM_ID);

    if (existingLink && existingItem) {
      existingLink.href = getMapsUrl(query);
      placeMapsItem(nav, existingItem);
      return;
    }

    const templateItem = findTemplateItem(nav, imagesItem);
    if (!templateItem) return;

    const mapsItem = createMapsItem(templateItem, query);
    if (!mapsItem) return;

    placeMapsItem(nav, mapsItem);
  }

  // Event Handling
  let isScheduled = false;

  function scheduleUpdate() {
    // Debounce updates
    if (isScheduled) return;

    isScheduled = true;
    requestAnimationFrame(() => {
      isScheduled = false;
      updateMapsButton();
    });
  }

  const observer = new MutationObserver(scheduleUpdate);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("popstate", updateMapsButton);
  window.addEventListener("hashchange", updateMapsButton);
  window.addEventListener("DOMContentLoaded", updateMapsButton);

  scheduleUpdate();
})();
