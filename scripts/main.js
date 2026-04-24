const root = document.documentElement;
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

const userAgent = navigator.userAgent || "";
const platform = navigator.platform || "";
const isIPadOS = platform === "MacIntel" && navigator.maxTouchPoints > 1;
const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent) || /iPhone|iPad|iPod/i.test(platform) || isIPadOS;
const isSafari =
  /^((?!chrome|android|crios|fxios|edgios|opr|opera).)*safari/i.test(userAgent) ||
  (isAppleMobile && /AppleWebKit/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS/i.test(userAgent));

root.classList.toggle("is-ios", isAppleMobile);
root.classList.toggle("is-safari", isSafari);

const breakpoints = {
  mobileMax: 767,
  tabletMax: 1199,
};

const sceneStates = {
  mobilePortrait: {
    bgWidth: 4.12,
    bgLeft: -2.58,
    bgTop: 0,
    bgScale: 1.27,
    signBoxLeft: -0.285,
    signBoxTop: 0.13,
    signBoxWidth: 1,
    signBoxHeight: 1.48,
    signImageWidth: 0.61,
    signImageOffsetX: 0.175,
    signImageOffsetY: 0.014,
    signRotation: 7.45,
    glitchLeft: 0.57,
    glitchTop: 0.515,
    glitchSize: 0.318,
    glitchRotation: -7.2,
    telegramLeft: 0.32,
    telegramTop: 0.765,
    telegramSize: 0.435,
    telegramRotation: 4.7,
    backgroundShiftX: 10,
    backgroundShiftY: 14,
    signShiftX: 15,
    signShiftY: 22,
  },
  mobileLandscape: {
    bgWidth: 2.28,
    bgLeft: -0.78,
    bgTop: -0.04,
    bgScale: 1.3,
    signBoxLeft: -0.13,
    signBoxTop: 0.04,
    signBoxWidth: 0.58,
    signBoxHeight: 2.06,
    signImageWidth: 0.34,
    signImageOffsetX: 0.105,
    signImageOffsetY: 0.01,
    signRotation: 7.8,
    glitchLeft: 0.61,
    glitchTop: 0.28,
    glitchSize: 0.27,
    glitchRotation: -6.9,
    telegramLeft: 0.36,
    telegramTop: 0.6,
    telegramSize: 0.25,
    telegramRotation: 5.1,
    backgroundShiftX: 12,
    backgroundShiftY: 10,
    signShiftX: 18,
    signShiftY: 15,
  },
  tabletPortrait: {
    bgWidth: 2.72,
    bgLeft: -1.44,
    bgTop: 0,
    bgScale: 1.21,
    signBoxLeft: -0.235,
    signBoxTop: 0.085,
    signBoxWidth: 0.9,
    signBoxHeight: 1.82,
    signImageWidth: 0.535,
    signImageOffsetX: 0.18,
    signImageOffsetY: 0.018,
    signRotation: 7.9,
    glitchLeft: 0.61,
    glitchTop: 0.425,
    glitchSize: 0.285,
    glitchRotation: -6.9,
    telegramLeft: 0.32,
    telegramTop: 0.73,
    telegramSize: 0.325,
    telegramRotation: 5.2,
    backgroundShiftX: 13,
    backgroundShiftY: 13,
    signShiftX: 22,
    signShiftY: 22,
  },
  tabletLandscape: {
    bgWidth: 1.78,
    bgLeft: -0.46,
    bgTop: -0.02,
    bgScale: 1.2,
    signBoxLeft: -0.11,
    signBoxTop: 0.035,
    signBoxWidth: 0.55,
    signBoxHeight: 1.95,
    signImageWidth: 0.325,
    signImageOffsetX: 0.105,
    signImageOffsetY: 0.018,
    signRotation: 7.9,
    glitchLeft: 0.6,
    glitchTop: 0.31,
    glitchSize: 0.235,
    glitchRotation: -6.85,
    telegramLeft: 0.39,
    telegramTop: 0.62,
    telegramSize: 0.235,
    telegramRotation: 5.25,
    backgroundShiftX: 14,
    backgroundShiftY: 11,
    signShiftX: 23,
    signShiftY: 18,
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
const motionPromptDebugEnabled = urlParams.get("debug-motion-prompt") === "1";

const pointerTarget = { x: 0, y: 0 };
const pointerCurrent = { x: 0, y: 0 };

let currentProfile = sceneStates.desktop;
let currentViewport = { width: window.innerWidth || 1, height: window.innerHeight || 1 };
let orientationListening = false;
let gyroPermissionState = "prompt";
let rafId = 0;
let motionDismissed = false;
let glitchPreviewAvailable = true;
let orientationBaseline = null;

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

function normalizeDelta(value) {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function toDegrees(value) {
  return (value * 180) / Math.PI;
}

function canRequestDeviceOrientationPermission() {
  return (
    typeof window.DeviceOrientationEvent !== "undefined" &&
    typeof window.DeviceOrientationEvent.requestPermission === "function"
  );
}

function getViewportSize() {
  const visualViewport = window.visualViewport;
  const width = Math.round(visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 1);
  const height = Math.round(visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 1);

  return { width, height };
}

function syncViewportHeight() {
  currentViewport = getViewportSize();
  root.style.setProperty("--app-height", `${currentViewport.height}px`);
}

function getViewportAngle() {
  if (screen.orientation && typeof screen.orientation.angle === "number") {
    return normalizeAngle(screen.orientation.angle);
  }

  if (typeof window.orientation === "number") {
    return normalizeAngle(window.orientation);
  }

  return currentViewport.width > currentViewport.height ? 90 : 0;
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

function resetOrientationBaseline() {
  orientationBaseline = null;
}

function resolveLayout(width, height) {
  const isPortrait = height >= width;
  const isTouchViewport = !finePointerQuery.matches;
  const shortTouchLandscape = isTouchViewport && !isPortrait && height <= 480 && width <= 960;

  if (width <= breakpoints.mobileMax) {
    if (isPortrait) {
      const amount = clamp((width - 360) / (breakpoints.mobileMax - 360), 0, 1);
      return {
        label: "mobile-portrait",
        profile: mixState(sceneStates.mobilePortrait, sceneStates.tabletPortrait, amount * 0.34),
      };
    }

    return {
      label: "mobile-landscape",
      profile: sceneStates.mobileLandscape,
    };
  }

  if (shortTouchLandscape) {
    return {
      label: "mobile-landscape",
      profile: sceneStates.mobileLandscape,
    };
  }

  if (width <= breakpoints.tabletMax || (isTouchViewport && Math.min(width, height) <= 1024)) {
    return {
      label: isPortrait ? "tablet-portrait" : "tablet-landscape",
      profile: isPortrait ? sceneStates.tabletPortrait : sceneStates.tabletLandscape,
    };
  }

  return {
    label: "desktop",
    profile: sceneStates.desktop,
  };
}

function clampTopToViewport(top, size, height, bottomGutter) {
  return clamp(top, 0, Math.max(0, height - size - bottomGutter));
}

function applyLayout() {
  syncViewportHeight();

  const { width, height } = currentViewport;
  const isLandscapeTouch = width > height && !finePointerQuery.matches;
  const auxiliarySignUnit = Math.min(width, height * (isLandscapeTouch ? 1.18 : 1.3));
  const { label, profile } = resolveLayout(width, height);
  const glitchSize = profile.glitchSize * auxiliarySignUnit;
  const telegramSize = profile.telegramSize * auxiliarySignUnit;
  const mobileBottomGutter = !finePointerQuery.matches ? Math.max(18, Math.min(42, height * 0.055)) : 0;
  const telegramTop = clampTopToViewport(profile.telegramTop * height, telegramSize, height, mobileBottomGutter);

  currentProfile = profile;
  scene.dataset.breakpoint = label;

  scene.style.setProperty("--bg-width", `${profile.bgWidth * width}px`);
  scene.style.setProperty("--bg-scale", String(profile.bgScale + (isLandscapeTouch ? 0.08 : 0)));
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
  scene.style.setProperty("--telegram-box-top", `${telegramTop}px`);
  scene.style.setProperty("--telegram-box-width", `${telegramSize}px`);
  scene.style.setProperty("--telegram-box-height", `${telegramSize}px`);
  scene.style.setProperty("--telegram-image-width", `${telegramSize}px`);
  scene.style.setProperty("--telegram-image-offset-x", "0px");
  scene.style.setProperty("--telegram-image-offset-y", "0px");
  scene.style.setProperty("--telegram-rotation", `${profile.telegramRotation}deg`);

  resetOrientationBaseline();
  syncMotionMode();
}

function updatePointerTarget(clientX, clientY) {
  const width = currentViewport.width || 1;
  const height = currentViewport.height || 1;

  pointerTarget.x = clamp((clientX / width - 0.5) * 2, -1, 1);
  pointerTarget.y = clamp((clientY / height - 0.5) * 2, -1, 1);
}

function resetPointerTarget() {
  pointerTarget.x = 0;
  pointerTarget.y = 0;
}

function handlePointerMove(event) {
  if (prefersReducedMotion.matches) {
    return;
  }

  if (finePointerQuery.matches || (!orientationListening && event.pointerType !== "mouse")) {
    updatePointerTarget(event.clientX, event.clientY);
  }
}

function handlePointerLeave() {
  if (finePointerQuery.matches || !orientationListening) {
    resetPointerTarget();
  }
}

function handleOrientation(event) {
  if (!orientationListening || prefersReducedMotion.matches) {
    return;
  }

  if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) {
    return;
  }

  const angle = getViewportAngle();
  const gamma = clamp(event.gamma, -89.5, 89.5);
  const beta = clamp(event.beta, -179.5, 179.5);
  const tilt = resolveOrientationTilt(beta, gamma, angle);

  if (!orientationBaseline) {
    orientationBaseline = tilt;
    return;
  }

  const xDivisor = currentViewport.width > currentViewport.height ? 16 : 18;
  const yDivisor = currentViewport.width > currentViewport.height ? 14 : 13;
  const nextX = clamp(normalizeDelta(tilt.x - orientationBaseline.x) / xDivisor, -1, 1);
  const nextY = clamp(normalizeDelta(tilt.y - orientationBaseline.y) / yDivisor, -1, 1);
  const sensorBlend = 0.24;

  pointerTarget.x = lerp(pointerTarget.x, nextX, sensorBlend);
  pointerTarget.y = lerp(pointerTarget.y, nextY, sensorBlend);
}

function startGyroParallax() {
  if (orientationListening || typeof window.DeviceOrientationEvent === "undefined") {
    return;
  }

  resetOrientationBaseline();
  window.addEventListener("deviceorientation", handleOrientation, { passive: true });
  orientationListening = true;
  scene.dataset.motion = "gyro";
  root.classList.add("is-gyro-active");
}

function stopGyroParallax() {
  if (!orientationListening) {
    return;
  }

  window.removeEventListener("deviceorientation", handleOrientation);
  orientationListening = false;
  resetOrientationBaseline();
  scene.dataset.motion = "pointer";
  root.classList.remove("is-gyro-active");
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

function shouldUseIOSPermissionFlow() {
  return (
    !prefersReducedMotion.matches &&
    canRequestDeviceOrientationPermission() &&
    isAppleMobile
  );
}

function syncMotionMode() {
  if (prefersReducedMotion.matches) {
    hideMotionOverlay();
    stopGyroParallax();
    setGlitchPreviewState(false);
    resetPointerTarget();
    return;
  }

  if (finePointerQuery.matches && !motionPromptDebugEnabled && !shouldUseIOSPermissionFlow()) {
    hideMotionOverlay();
    stopGyroParallax();
    return;
  }

  setGlitchPreviewState(false);

  if (shouldUseIOSPermissionFlow()) {
    if (gyroPermissionState === "granted") {
      hideMotionOverlay();
      startGyroParallax();
      return;
    }

    stopGyroParallax();
    resetPointerTarget();

    if (!motionDismissed || gyroPermissionState === "denied" || motionPromptDebugEnabled) {
      showMotionOverlay();
    }

    return;
  }

  if (typeof window.DeviceOrientationEvent !== "undefined" && !finePointerQuery.matches) {
    hideMotionOverlay();
    startGyroParallax();
    return;
  }

  hideMotionOverlay();
  stopGyroParallax();
}

async function requestGyroPermission() {
  motionDismissed = false;

  if (!canRequestDeviceOrientationPermission()) {
    hideMotionOverlay();
    return;
  }

  try {
    const permission = await window.DeviceOrientationEvent.requestPermission();
    gyroPermissionState = permission === "granted" ? "granted" : "denied";

    if (gyroPermissionState === "granted") {
      hideMotionOverlay();
      startGyroParallax();
      return;
    }
  } catch (error) {
    gyroPermissionState = "denied";
    console.error("Unable to request device orientation permission.", error);
  }

  stopGyroParallax();
  resetPointerTarget();
  showMotionOverlay();
}

function animateScene() {
  const damping = prefersReducedMotion.matches ? 0.16 : 0.085;

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
  }, prefersReducedMotion.matches ? 80 : 480);

  shakeTimeouts.set(targetSign, shakeTimeout);
}

function handleSignPointerDown(event) {
  if (event.button !== undefined && event.button !== 0) {
    return;
  }

  triggerShake(event.currentTarget);
}

function addMediaQueryListener(query, listener) {
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", listener);
    return;
  }

  query.addListener(listener);
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
window.addEventListener("pageshow", applyLayout, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    resetPointerTarget();
  } else {
    syncMotionMode();
  }
});
addMediaQueryListener(prefersReducedMotion, applyLayout);
addMediaQueryListener(finePointerQuery, applyLayout);

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", applyLayout, { passive: true });
  window.visualViewport.addEventListener("scroll", syncViewportHeight, { passive: true });
}

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

allowMotionButton.addEventListener("click", requestGyroPermission);
dismissMotionButton.addEventListener("click", () => {
  motionDismissed = true;
  hideMotionOverlay();
  stopGyroParallax();
  resetPointerTarget();
});

applyLayout();

if (!rafId) {
  rafId = window.requestAnimationFrame(animateScene);
}
