(() => {
  // Constants
  const ITEM_ID = "gmap-btn-extension-item";
  const LINK_ID = "gmap-btn-extension-link";
  const NO_FLASH_STYLE_ID = "gmap-btn-no-flash-style";
  const IMAGES_SELECTOR =
    'a[href*="tbm=isch"], a[href*="udm=2"], [role="link"][href*="tbm=isch"], [role="link"][href*="udm=2"]';
  const ACTIVE_SELECTOR =
    '[aria-current="page"], [aria-selected="true"], .hdtb-msel';
  const LINK_SELECTOR = 'a[href], [role="link"][href]';

  let isScheduled = false;
  let isObserverInitialized = false;

  // Page detection
  function isGoogleSearchPage() {
    return (
      location.hostname.includes("google.") &&
      location.pathname.startsWith("/search")
    );
  }

  // Get query
  function getSearchQuery() {
    return new URLSearchParams(location.search).get("q");
  }

  // Hide native maps
  function hideNativeMaps() {
    if (document.getElementById(NO_FLASH_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = NO_FLASH_STYLE_ID;
    style.textContent = `#hdtb-msb a[href*="maps.google."]:not(#${LINK_ID}),
      #hdtb-msb a[href*="/maps"]:not(#${LINK_ID}),
      [role="navigation"] a[href*="maps.google."]:not(#${LINK_ID}),
      [role="navigation"] a[href*="/maps"]:not(#${LINK_ID}),
      #hdtb-msb [role="link"][href*="maps.google."]:not(#${LINK_ID}),
      #hdtb-msb [role="link"][href*="/maps"]:not(#${LINK_ID}),
      [role="navigation"] [role="link"][href*="maps.google."]:not(#${LINK_ID}),
      [role="navigation"] [role="link"][href*="/maps"]:not(#${LINK_ID}) { display: none !important; }`;
    (document.head || document.documentElement).appendChild(style);
  }

  // Find nav container
  function findNav() {
    return (
      document.querySelector("#hdtb-msb") ||
      document.querySelector('[role="navigation"] div[role="list"]') ||
      document.querySelector('[role="navigation"]')
    );
  }

  // Find parent item
  function findParentItem(nav, child) {
    let current = child;
    while (current && current.parentElement !== nav) {
      current = current.parentElement;
    }
    return current?.parentElement === nav ? current : null;
  }

  // Find images
  function findImagesItem(nav) {
    const imagesLink = nav.querySelector(IMAGES_SELECTOR);
    if (imagesLink) return findParentItem(nav, imagesLink);

    const params = new URLSearchParams(location.search);
    if (params.get("tbm") === "isch" || params.get("udm") === "2") {
      const activeItem = nav.querySelector(ACTIVE_SELECTOR);
      if (activeItem) return findParentItem(nav, activeItem);
    }
    return null;
  }

  // Clean item
  function cleanItem(item) {
    item.removeAttribute("id");
    item.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    item.querySelectorAll(ACTIVE_SELECTOR).forEach((el) => {
      el.removeAttribute("aria-current");
      el.setAttribute("aria-selected", "false");
      el.classList.remove("hdtb-msel");
    });
    if (item.classList.contains("hdtb-msel"))
      item.classList.remove("hdtb-msel");
  }

  // Create maps item
  function createMapsItem(template, query) {
    const item = template.cloneNode(true);
    cleanItem(item);
    item.id = ITEM_ID;

    const link = item.querySelector(LINK_SELECTOR);
    if (!link) return null;

    link.id = LINK_ID;
    link.href = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", "Maps");
    (
      link.querySelector("span[aria-hidden], span") ||
      link.querySelector("div") ||
      link
    ).textContent = "Maps";

    return item;
  }

  // Remove maps buttons
  function removeMapsButtons(nav) {
    nav
      .querySelectorAll(
        'a[href*="maps.google."], a[href*="/maps"], [role="link"][href*="maps.google."], [role="link"][href*="/maps"]',
      )
      .forEach((link) => {
        if (link.id !== LINK_ID) {
          const parent = link.closest('[role="listitem"], li, div');
          (parent || link).remove();
        }
      });
  }

  // Update maps button
  function updateMapsButton() {
    if (!isGoogleSearchPage()) return;
    const query = getSearchQuery();
    if (!query) return;

    const nav = findNav();
    if (!nav) return;

    removeMapsButtons(nav);
    const imagesItem = findImagesItem(nav);
    if (!imagesItem) return;

    const existingItem = document.getElementById(ITEM_ID);
    const existingLink = document.getElementById(LINK_ID);

    // Update URL
    if (existingLink && existingItem) {
      const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
      if (existingLink.href !== mapsUrl) existingLink.href = mapsUrl;
      if (imagesItem.nextSibling !== existingItem) {
        nav.insertBefore(existingItem, imagesItem.nextSibling);
      }
      return;
    }

    // Create new item
    let template = null;
    if (imagesItem.querySelector(LINK_SELECTOR)) {
      template = imagesItem;
    } else {
      for (const child of nav.children) {
        if (
          child.nodeType === Node.ELEMENT_NODE &&
          child.querySelector(LINK_SELECTOR)
        ) {
          template = child;
          break;
        }
      }
    }

    if (!template) return;
    const newItem = createMapsItem(template, query);
    if (newItem) nav.insertBefore(newItem, imagesItem.nextSibling);
  }

  // Schedule update
  function scheduleUpdate() {
    if (isScheduled) return;
    isScheduled = true;
    requestAnimationFrame(() => {
      isScheduled = false;
      updateMapsButton();
    });
  }

  // Watch mutations
  function initObserver() {
    if (isObserverInitialized) return;
    isObserverInitialized = true;
    new MutationObserver(scheduleUpdate).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  // Initialize
  hideNativeMaps();
  updateMapsButton();
  initObserver();

  window.addEventListener("popstate", scheduleUpdate);
  window.addEventListener("hashchange", scheduleUpdate);

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", scheduleUpdate, { once: true });
  }
})();
