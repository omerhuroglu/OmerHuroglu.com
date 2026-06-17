(() => {
  "use strict";

  const OPEN_CLASS = "is-open";

  const SELECTORS = {
    currentYear: "[data-current-year]",
    information: ".information",
    informationLink: ".information__link",
    informationLinks: "[data-information-links]",
    informationToggle: "[data-information-toggle]",
    messageContent: "[data-message-content]",
    messageCursor: "[data-message-cursor]",
    messageDisplay: "[data-message-display]",
    messageItem: "[data-message-item]",
    messageStatic: "[data-message-static]",
    messageStatus: "[data-message-status]",
  };

  const TIMING = {
    informationCascadeDelay: 100,
    messageDeleteDelay: 50,
    messageHoldDelay: 3000,
    messageTypeDelay: 100,
    motionPreferenceCheckDelay: 250,
  };

  const elements = {
    currentYear: getRequiredElement(SELECTORS.currentYear),
    informationLinks: getRequiredElement(SELECTORS.informationLinks),
    informationToggle: getRequiredElement(SELECTORS.informationToggle),
    messageContent: getRequiredElement(SELECTORS.messageContent),
    messageCursor: getRequiredElement(SELECTORS.messageCursor),
    messageDisplay: getRequiredElement(SELECTORS.messageDisplay),
    messageStatus: getRequiredElement(SELECTORS.messageStatus),
  };

  const messageItems = getRequiredElements(SELECTORS.messageItem);
  const messages = getMessages(messageItems);
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const staticMessageIndex = getStaticMessageIndex(messageItems);

  const messageState = {
    characterIndex: 0,
    isDeleting: false,
    messageIndex: 0,
    timeoutId: null,
  };

  const motionState = {
    isReducedMotion: null,
  };

  function getRequiredElement(selector) {
    const element = document.querySelector(selector);

    if (!element) {
      throw new Error(`Missing required element: ${selector}`);
    }

    return element;
  }

  function getRequiredElements(selector) {
    const elements = Array.from(document.querySelectorAll(selector));

    if (elements.length === 0) {
      throw new Error(`Missing required elements: ${selector}`);
    }

    return elements;
  }

  function getClosestEventTarget(event, selector) {
    if (!(event.target instanceof Element)) {
      return null;
    }

    return event.target.closest(selector);
  }

  function prefersReducedMotion() {
    return motionQuery.matches;
  }

  function getMessages(messageItems) {
    const messageTexts = messageItems
      .map((messageItem) => messageItem.textContent.trim())
      .filter(Boolean);

    if (messageTexts.length === 0) {
      throw new Error(`Missing message text: ${SELECTORS.messageItem}`);
    }

    return messageTexts;
  }

  function getStaticMessageIndex(messageItems) {
    const staticMessage = getRequiredElement(SELECTORS.messageStatic);
    const staticMessageIndex = messageItems.indexOf(staticMessage);

    if (staticMessageIndex === -1) {
      throw new Error(`Static message must also match: ${SELECTORS.messageItem}`);
    }

    return staticMessageIndex;
  }

  function getCurrentMessage() {
    return messages[messageState.messageIndex];
  }

  function setMessageText(text) {
    elements.messageContent.textContent = text;
  }

  function setMessageStatus() {
    elements.messageStatus.textContent = getCurrentMessage();
  }

  function resetMessageState(messageIndex = 0) {
    messageState.characterIndex = 0;
    messageState.isDeleting = false;
    messageState.messageIndex = messageIndex;
  }

  function clearMessageTimeout() {
    window.clearTimeout(messageState.timeoutId);
    messageState.timeoutId = null;
  }

  function scheduleMessageTimeout(delay) {
    clearMessageTimeout();
    messageState.timeoutId = window.setTimeout(typeMessage, delay);
  }

  function showStaticMessage() {
    clearMessageTimeout();
    resetMessageState(staticMessageIndex);
    setMessageText(getCurrentMessage());
    setMessageStatus();
    elements.messageCursor.hidden = true;
  }

  function startAnimatedMessage(delay = TIMING.messageHoldDelay) {
    clearMessageTimeout();
    resetMessageState();
    setMessageStatus();
    setMessageText("");
    elements.messageCursor.hidden = false;
    scheduleMessageTimeout(delay);
  }

  function typeMessage() {
    const currentMessage = getCurrentMessage();

    messageState.timeoutId = null;
    messageState.characterIndex += messageState.isDeleting ? -1 : 1;
    setMessageText(currentMessage.slice(0, messageState.characterIndex));

    if (!messageState.isDeleting && messageState.characterIndex === currentMessage.length) {
      messageState.isDeleting = true;
      scheduleMessageTimeout(TIMING.messageHoldDelay);
      return;
    }

    if (messageState.isDeleting && messageState.characterIndex === 0) {
      messageState.isDeleting = false;
      messageState.messageIndex = (messageState.messageIndex + 1) % messages.length;
      setMessageStatus();
      scheduleMessageTimeout(TIMING.messageHoldDelay);
      return;
    }

    scheduleMessageTimeout(
      messageState.isDeleting ? TIMING.messageDeleteDelay : TIMING.messageTypeDelay
    );
  }

  function initializeMessage() {
    elements.messageDisplay.setAttribute("aria-hidden", "true");
    motionState.isReducedMotion = prefersReducedMotion();

    if (motionState.isReducedMotion) {
      showStaticMessage();
      return;
    }

    startAnimatedMessage();
  }

  function applyMotionPreference(isReducedMotion, animationDelay = TIMING.messageTypeDelay) {
    if (motionState.isReducedMotion === isReducedMotion) {
      return;
    }

    motionState.isReducedMotion = isReducedMotion;

    if (isReducedMotion) {
      showStaticMessage();
      return;
    }

    startAnimatedMessage(animationDelay);
  }

  function checkMotionPreference() {
    applyMotionPreference(prefersReducedMotion());
  }

  function handleMotionPreferenceChange(event) {
    applyMotionPreference(event.matches);
  }

  function bindMotionPreferenceChange() {
    if (typeof motionQuery.addEventListener === "function") {
      motionQuery.addEventListener("change", handleMotionPreferenceChange);
    } else {
      motionQuery.addListener(handleMotionPreferenceChange);
    }

    window.setInterval(checkMotionPreference, TIMING.motionPreferenceCheckDelay);
  }

  function getInformationLinks() {
    return Array.from(elements.informationLinks.querySelectorAll(SELECTORS.informationLink));
  }

  function getCenterDistance(index, totalItems) {
    return Math.abs(index - (totalItems - 1) / 2);
  }

  function updateInformationLinkOrder() {
    const links = getInformationLinks();

    if (links.length === 0) {
      elements.informationLinks.style.setProperty("--information-link-max-delay", "0ms");
      return;
    }

    const distances = links.map((_, index) => getCenterDistance(index, links.length));
    const closestDistanceToCenter = Math.min(...distances);
    let maxDelay = 0;

    links.forEach((link, index) => {
      const centerDistance = distances[index] - closestDistanceToCenter;
      const delay = Math.round(centerDistance * TIMING.informationCascadeDelay);

      maxDelay = Math.max(maxDelay, delay);
      link.style.setProperty("--information-link-delay", `${delay}ms`);
    });

    elements.informationLinks.style.setProperty("--information-link-max-delay", `${maxDelay}ms`);
  }

  function isInformationOpen() {
    return elements.informationLinks.classList.contains(OPEN_CLASS);
  }

  function setInformationOpen(isOpen) {
    elements.informationLinks.classList.toggle(OPEN_CLASS, isOpen);
    elements.informationToggle.classList.toggle(OPEN_CLASS, isOpen);
    elements.informationToggle.setAttribute("aria-expanded", String(isOpen));
    elements.informationToggle.setAttribute(
      "aria-label",
      isOpen ? "Close information menu" : "Open information menu"
    );
  }

  function toggleInformation() {
    setInformationOpen(!isInformationOpen());
  }

  function closeInformation() {
    setInformationOpen(false);
  }

  function handleInformationToggleClick() {
    toggleInformation();
  }

  function handleDocumentKeyDown(event) {
    if (event.key !== "Escape" || !isInformationOpen()) {
      return;
    }

    closeInformation();
    elements.informationToggle.focus();
  }

  function handleDocumentPointerDown(event) {
    const clickedInformation = getClosestEventTarget(event, SELECTORS.information);

    if (isInformationOpen() && !clickedInformation) {
      closeInformation();
    }
  }

  function initializeFooter() {
    elements.currentYear.textContent = `${new Date().getFullYear()} `;
  }

  function bindEvents() {
    elements.informationToggle.addEventListener("click", handleInformationToggleClick);
    bindMotionPreferenceChange();

    document.addEventListener("keydown", handleDocumentKeyDown);
    document.addEventListener("pointerdown", handleDocumentPointerDown);
  }

  function initialize() {
    initializeFooter();
    initializeMessage();
    updateInformationLinkOrder();
    bindEvents();
  }

  initialize();
})();
