const scene = document.querySelector(".scene");
const backgroundLayer = document.querySelector(".scene__parallax--background");
const signLayer = document.querySelector(".scene__parallax--sign");
const baseBackgroundImage = document.querySelector(".scene__background--base");
const glitchBackgroundImage = document.querySelector(".scene__background--glitch");
const glitchSign = document.querySelector(".sign--glitch");
const signElements = Array.from(document.querySelectorAll(".sign"));
const permissionOverlay = document.querySelector(".motion-permission");
const allowMotionButton = document.querySelector('[data-action="allow"]');
const dismissMotionButton = document.querySelector('[data-action="dismiss"]');
const urlParams = new URLSearchParams(window.location.search);

const breakpoints = {
  mobileMax: 767,
  desktopMin: 1200,
};

const sceneStates = {
  mobile: {
    bgWidth: 3.8958333333,
    bgLeft: -2.4100378788,
    bgTop: 0,
    bgScale: 1.18,
    signBoxLeft: -0.27,
    signBoxTop: 0.1576655052,
    signBoxWidth: 1.0862002872,
    signBoxHeight: 1.5199452591,
    signImageWidth: 0.6686972161,
    signImageOffsetX: 0.2087528409,
    signImageOffsetY: 0.0136808362,
    signRotation: 7.49,
    glitchLeft: 0.563,
    glitchTop: 0.6,
    glitchSize: 0.362,
    glitchRotation: -7.2,
    telegramLeft: 0.231,
    telegramTop: 0.739,
    telegramSize: 0.418,
    telegramRotation: 4.6,
    backgroundShiftX: 12,
    backgroundShiftY: 10,
    signShiftX: 20,
    signShiftY: 18,
  },
  middle: {
    bgWidth: 2.5646523717,
    bgLeft: -1.3203378817,
    bgTop: 0,
    bgScale: 1.17,
    signBoxLeft: -0.255,
    signBoxTop: 0.0866999546,
    signBoxWidth: 0.991638656,
    signBoxHeight: 2.0626745349,
    signImageWidth: 0.5971290371,
    signImageOffsetX: 0.1972559454,
    signImageOffsetY: 0.0191068997,
    signRotation: 7.94,
    glitchLeft: 0.597,
    glitchTop: 0.418,
    glitchSize: 0.314,
    glitchRotation: -6.9,
    telegramLeft: 0.214,
    telegramTop: 0.716,
    telegramSize: 0.294,
    telegramRotation: 5.2,
    backgroundShiftX: 14,
    backgroundShiftY: 12,
    signShiftX: 24,
    signShiftY: 22,
  },
  desktop: {
    bgWidth: 1,
    bgLeft: 0,
    bgTop: 0,
    bgScale: 1.15,
    signBoxLeft: 0,
    signBoxTop: 0.03515625,
    signBoxWidth: 0.3838557632,
    signBoxHeight: 2.0477532556,
    signImageWidth: 0.2311432632,
    signImageOffsetX: 0.0763561773,
    signImageOffsetY: 0.0189677734,
    signRotation: 7.94,
    glitchLeft: 0.497,
    glitchTop: 0.176,
    glitchSize: 0.236,
    glitchRotation: -6.8,
    telegramLeft: 0.65,
    telegramTop: 0.558,
    telegramSize: 0.244,
    telegramRotation: 5.4,
    backgroundShiftX: 18,
    backgroundShiftY: 16,
    signShiftX: 30,
    signShiftY: 26,
  },
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
const motionPermissionCookieName = "portfolio_motion_permission";
const motionPromptDebugEnabled = urlParams.get("debug-motion-prompt") === "1";

const pointerTarget = { x: 0, y: 0 };
const pointerCurrent = { x: 0, y: 0 };

let currentProfile = sceneStates.desktop;
let orientationListening = false;
let rafId = 0;
let motionDismissed = false;
let glitchPreviewAvailable = true;

const shakeTimeouts = new WeakMap();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function mixState(fromState, toState, amount) {
  const output = {};

  for (const key of Object.keys(fromState)) {
    output[key] = lerp(fromState[key], toState[key], amount);
  }

  return output;
}

function normalizeAngle(value) {
  return ((value % 360) + 360) % 360;
}

function getCookie(name) {
  const pattern = new RegExp(`(?:^|; )${name}=([^;]*)`);
  const match = document.cookie.match(pattern);
  return match ? decodeURIComponent(match[1]) : "";
}

function setCookie(name, value, maxAgeSeconds) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function isAppleMobileDevice() {
  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const appleMobilePattern = /iPhone|iPad|iPod/i;
  const isIPadOS = platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return appleMobilePattern.test(userAgent) || appleMobilePattern.test(platform) || isIPadOS;
}

function shouldForceMotionPromptDebug() {
  return motionPromptDebugEnabled;
}

function canRequestDeviceOrientationPermission() {
  return (
    typeof window.DeviceOrientationEvent !== "undefined" &&
    typeof window.DeviceOrientationEvent.requestPermission === "function"
  );
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function toDegrees(value) {
  return (value * 180) / Math.PI;
}

function getViewportAngle() {
  if (screen.orientation && typeof screen.orientation.angle === "number") {
    return normalizeAngle(screen.orientation.angle);
  }

  if (typeof window.orientation === "number") {
    return normalizeAngle(window.orientation);
  }

  return window.innerWidth > window.innerHeight ? 90 : 0;
}

function getGravityVector(beta, gamma) {
  const betaRad = toRadians(beta);
  const gammaRad = toRadians(gamma);
  const cosGamma = Math.cos(gammaRad);

  return {
    x: Math.sin(gammaRad),
    y: -Math.sin(betaRad) * cosGamma,
    z: -Math.cos(betaRad) * cosGamma,
  };
}

function rotateToScreenSpace(x, y, angle) {
  const angleRad = toRadians(angle);
  const cosAngle = Math.cos(angleRad);
  const sinAngle = Math.sin(angleRad);

  return {
    x: x * cosAngle - y * sinAngle,
    y: x * sinAngle + y * cosAngle,
  };
}

function resolveOrientationTilt(beta, gamma, angle) {
  const gravity = getGravityVector(beta, gamma);
  const screenGravity = rotateToScreenSpace(gravity.x, gravity.y, angle);

  return {
    x: toDegrees(Math.atan2(screenGravity.x, -screenGravity.y)),
    y: toDegrees(Math.atan2(-gravity.z, -screenGravity.y)),
  };
}

function resolveLayout(width) {
  if (width < breakpoints.desktopMin) {
    if (width <= breakpoints.mobileMax) {
      const amount = clamp((width - 360) / (768 - 360), 0, 1);
      return {
        label: "mobile",
        profile: mixState(sceneStates.mobile, sceneStates.middle, amount),
      };
    }

    const amount = clamp((width - 768) / (1200 - 768), 0, 1);
    return {
      label: "middle",
      profile: mixState(sceneStates.middle, sceneStates.desktop, amount),
    };
  }

  return {
    label: "desktop",
    profile: sceneStates.desktop,
  };
}

function applyLayout() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const auxiliarySignUnit = Math.min(width, height * 1.3);
  const { label, profile } = resolveLayout(width);
  const glitchSize = profile.glitchSize * auxiliarySignUnit;
  const telegramSize = profile.telegramSize * auxiliarySignUnit;

  currentProfile = profile;
  scene.dataset.breakpoint = label;

  scene.style.setProperty("--bg-width", `${profile.bgWidth * width}px`);
  scene.style.setProperty("--bg-scale", String(profile.bgScale + (width > height && !finePointerQuery.matches ? 0.11 : 0)));
  scene.style.setProperty("--bg-right", `${width - (profile.bgLeft * width + profile.bgWidth * width)}px`);
  scene.style.setProperty("--bg-top", `${profile.bgTop * height}px`);
  scene.style.setProperty("--sign-box-left", `${profile.signBoxLeft * width}px`);
  scene.style.setProperty("--sign-box-top", `${profile.signBoxTop * height}px`);
  scene.style.setProperty("--sign-box-width", `${profile.signBoxWidth * width}px`);
  scene.style.setProperty("--sign-box-height", `${profile.signBoxHeight * height}px`);
  scene.style.setProperty("--sign-image-width", `${profile.signImageWidth * width}px`);
  scene.style.setProperty("--sign-image-offset-x", `${profile.signImageOffsetX * width}px`);
  scene.style.setProperty("--sign-image-offset-y", `${profile.signImageOffsetY * height}px`);
  scene.style.setProperty("--sign-rotation", `${profile.signRotation}deg`);
  scene.style.setProperty("--glitch-box-left", `${profile.glitchLeft * width}px`);
  scene.style.setProperty("--glitch-box-top", `${profile.glitchTop * height}px`);
  scene.style.setProperty("--glitch-box-width", `${glitchSize}px`);
  scene.style.setProperty("--glitch-box-height", `${glitchSize}px`);
  scene.style.setProperty("--glitch-image-width", `${glitchSize}px`);
  scene.style.setProperty("--glitch-image-offset-x", "0px");
  scene.style.setProperty("--glitch-image-offset-y", "0px");
  scene.style.setProperty("--glitch-rotation", `${profile.glitchRotation}deg`);
  scene.style.setProperty("--telegram-box-left", `${profile.telegramLeft * width}px`);
  scene.style.setProperty("--telegram-box-top", `${profile.telegramTop * height}px`);
  scene.style.setProperty("--telegram-box-width", `${telegramSize}px`);
  scene.style.setProperty("--telegram-box-height", `${telegramSize}px`);
  scene.style.setProperty("--telegram-image-width", `${telegramSize}px`);
  scene.style.setProperty("--telegram-image-offset-x", "0px");
  scene.style.setProperty("--telegram-image-offset-y", "0px");
  scene.style.setProperty("--telegram-rotation", `${profile.telegramRotation}deg`);

  syncMotionMode();
}

function updatePointerTarget(clientX, clientY) {
  const width = window.innerWidth || 1;
  const height = window.innerHeight || 1;

  pointerTarget.x = (clientX / width - 0.5) * 2;
  pointerTarget.y = (clientY / height - 0.5) * 2;
}

function resetPointerTarget() {
  pointerTarget.x = 0;
  pointerTarget.y = 0;
}

function handlePointerMove(event) {
  if (!finePointerQuery.matches || prefersReducedMotion.matches) {
    return;
  }

  updatePointerTarget(event.clientX, event.clientY);
}

function handlePointerLeave() {
  if (!finePointerQuery.matches) {
    return;
  }

  resetPointerTarget();
}

function handleOrientation(event) {
  if (!orientationListening || prefersReducedMotion.matches) {
    return;
  }

  if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) {
    return;
  }

  const angle = getViewportAngle();
  const betaClamp = 179.5;
  const gammaClamp = 89.5;
  const gammaDivisor = 22;
  const betaDivisor = 28;
  const gamma = clamp(event.gamma, -gammaClamp, gammaClamp);
  const beta = clamp(event.beta, -betaClamp, betaClamp);
  const tilt = resolveOrientationTilt(beta, gamma, angle);
  const nextX = clamp(tilt.x / gammaDivisor, -1, 1);
  const nextY = clamp(tilt.y / betaDivisor, -1, 1);
  const sensorBlend = 0.28;

  pointerTarget.x = lerp(pointerTarget.x, nextX, sensorBlend);
  pointerTarget.y = lerp(pointerTarget.y, nextY, sensorBlend);
}

function startOrientationListener() {
  if (orientationListening || typeof window.DeviceOrientationEvent === "undefined") {
    return;
  }

  window.addEventListener("deviceorientation", handleOrientation, { passive: true });
  orientationListening = true;
}

function stopOrientationListener() {
  if (!orientationListening) {
    return;
  }

  window.removeEventListener("deviceorientation", handleOrientation);
  orientationListening = false;
}

function hideMotionOverlay() {
  permissionOverlay.hidden = true;
}

function showMotionOverlay() {
  permissionOverlay.hidden = false;
}

function setGlitchPreviewState(isActive) {
  scene.classList.toggle("scene--glitch-preview", glitchPreviewAvailable && finePointerQuery.matches && isActive);
}

function needsPermissionRequest() {
  return (
    !prefersReducedMotion.matches &&
    canRequestDeviceOrientationPermission() &&
    isAppleMobileDevice()
  );
}

function shouldShowMotionPrompt() {
  return (
    !prefersReducedMotion.matches &&
    (shouldForceMotionPromptDebug() || needsPermissionRequest())
  );
}

function syncMotionMode() {
  const motionPermissionState = getCookie(motionPermissionCookieName);
  const forcePromptDebug = shouldForceMotionPromptDebug();

  if (prefersReducedMotion.matches) {
    hideMotionOverlay();
    stopOrientationListener();
    setGlitchPreviewState(false);
    resetPointerTarget();
    return;
  }

  if (finePointerQuery.matches && !shouldForceMotionPromptDebug()) {
    hideMotionOverlay();
    stopOrientationListener();
    return;
  }

  setGlitchPreviewState(false);

  if (shouldShowMotionPrompt()) {
    if (motionPermissionState === "granted" && !forcePromptDebug) {
      hideMotionOverlay();
      startOrientationListener();
      return;
    }

    if (forcePromptDebug || (!motionDismissed && motionPermissionState !== "dismissed")) {
      showMotionOverlay();
    }
    stopOrientationListener();
    resetPointerTarget();
    return;
  }

  hideMotionOverlay();
  startOrientationListener();
}

async function requestMotionPermission() {
  motionDismissed = false;

  if (!canRequestDeviceOrientationPermission()) {
    hideMotionOverlay();
    return;
  }

  try {
    const permission = await window.DeviceOrientationEvent.requestPermission();

    if (permission === "granted") {
      setCookie(motionPermissionCookieName, "granted", 60 * 60 * 24 * 365);
      hideMotionOverlay();
      startOrientationListener();
      return;
    }
  } catch (error) {
    console.error("Не удалось запросить доступ к датчикам движения.", error);
  }

  hideMotionOverlay();
  resetPointerTarget();
}

function animateScene() {
  const damping = prefersReducedMotion.matches ? 0.16 : 0.075;

  pointerCurrent.x = lerp(pointerCurrent.x, pointerTarget.x, damping);
  pointerCurrent.y = lerp(pointerCurrent.y, pointerTarget.y, damping);

  backgroundLayer.style.transform = `translate3d(${pointerCurrent.x * currentProfile.backgroundShiftX}px, ${
    pointerCurrent.y * currentProfile.backgroundShiftY
  }px, 0)`;
  signLayer.style.transform = `translate3d(${pointerCurrent.x * currentProfile.signShiftX}px, ${
    pointerCurrent.y * currentProfile.signShiftY
  }px, 0)`;

  rafId = window.requestAnimationFrame(animateScene);
}

function triggerShake(targetSign) {
  if (!targetSign) {
    return;
  }

  targetSign.classList.remove("is-shaking");
  window.clearTimeout(shakeTimeouts.get(targetSign));
  void targetSign.offsetWidth;
  targetSign.classList.add("is-shaking");

  const shakeTimeout = window.setTimeout(() => {
    targetSign.classList.remove("is-shaking");
    shakeTimeouts.delete(targetSign);
  }, prefersReducedMotion.matches ? 180 : 420);

  shakeTimeouts.set(targetSign, shakeTimeout);
}

function handleSignPointerDown(event) {
  if (event.button !== undefined && event.button !== 0) {
    return;
  }

  triggerShake(event.currentTarget);
}

baseBackgroundImage.addEventListener("error", (event) => {
  const target = event.currentTarget;
  if (!target.dataset.fallbackApplied) {
    target.dataset.fallbackApplied = "true";
    target.src = "assets/scene/conc-lq.png";
  }
});

glitchBackgroundImage.addEventListener("error", () => {
  glitchPreviewAvailable = false;
  setGlitchPreviewState(false);
});

window.addEventListener("resize", applyLayout, { passive: true });
window.addEventListener("orientationchange", applyLayout, { passive: true });
window.addEventListener("pointermove", handlePointerMove, { passive: true });
scene.addEventListener("pointerleave", handlePointerLeave, { passive: true });
window.addEventListener("blur", () => {
  resetPointerTarget();
  setGlitchPreviewState(false);
});
prefersReducedMotion.addEventListener("change", applyLayout);
finePointerQuery.addEventListener("change", applyLayout);

if (screen.orientation && typeof screen.orientation.addEventListener === "function") {
  screen.orientation.addEventListener("change", applyLayout);
}

signElements.forEach((signElement) => {
  signElement.addEventListener("pointerdown", handleSignPointerDown, { passive: true });
  signElement.addEventListener("click", (event) => {
    if (event.detail === 0) {
      triggerShake(event.currentTarget);
    }
  });
});

glitchSign.addEventListener("pointerenter", () => {
  setGlitchPreviewState(true);
});
glitchSign.addEventListener("pointerleave", () => {
  setGlitchPreviewState(false);
});
glitchSign.addEventListener("focus", () => {
  setGlitchPreviewState(true);
});
glitchSign.addEventListener("blur", () => {
  setGlitchPreviewState(false);
});

allowMotionButton.addEventListener("click", requestMotionPermission);
dismissMotionButton.addEventListener("click", () => {
  motionDismissed = true;
  setCookie(motionPermissionCookieName, "dismissed", 60 * 60 * 24 * 365);
  hideMotionOverlay();
  stopOrientationListener();
  resetPointerTarget();
});

applyLayout();

if (!rafId) {
  rafId = window.requestAnimationFrame(animateScene);
}
