"use strict";

const loveLetter = document.querySelector(".love-letter");
const envelope = document.querySelector(".envelope");
const shakeButton = document.getElementById("shakeButton");

/* Swipe settings */
const OPEN_DISTANCE = 65;
const SWIPE_ENABLE_DELAY = 1600;

/* Shake settings */
const SHAKE_THRESHOLD = 13;
const REQUIRED_SHAKES = 2;
const SHAKE_WINDOW = 1200;
const SHAKE_COOLDOWN = 180;

let swipeEnabled = false;
let isDragging = false;
let envelopeOpened = false;
let surpriseStarted = false;
let motionArmed = false;

let startY = 0;
let currentY = 0;

let previousAcceleration = null;
let lastShakeTime = 0;
let shakeTimes = [];


/* Allow swiping after the entrance animation finishes */
window.setTimeout(() => {
    envelope.classList.add("entry-finished");
    swipeEnabled = true;
}, SWIPE_ENABLE_DELAY);


/* Start the upward swipe */
function startSwipe(event) {
    if (
        !swipeEnabled ||
        envelopeOpened ||
        surpriseStarted
    ) {
        return;
    }

    isDragging = true;
    startY = event.clientY;
    currentY = event.clientY;

    envelope.classList.add("is-dragging");

    if (
        typeof envelope.setPointerCapture === "function"
    ) {
        envelope.setPointerCapture(event.pointerId);
    }
}


/* Follow the finger while sliding upward */
function moveSwipe(event) {
    if (!isDragging || envelopeOpened) {
        return;
    }

    currentY = event.clientY;

    const swipeDistance = Math.max(
        0,
        startY - currentY
    );

    const visualMovement = Math.min(
        swipeDistance * 0.3,
        35
    );

    envelope.style.setProperty(
        "--drag-offset",
        `${-visualMovement}px`
    );

    envelope.classList.toggle(
        "ready-to-open",
        swipeDistance >= OPEN_DISTANCE
    );
}


/* Finish the swipe */
function finishSwipe() {
    if (!isDragging || envelopeOpened) {
        return;
    }

    isDragging = false;

    const swipeDistance = Math.max(
        0,
        startY - currentY
    );

    envelope.classList.remove(
        "is-dragging",
        "ready-to-open"
    );

    envelope.style.removeProperty("--drag-offset");

    if (swipeDistance >= OPEN_DISTANCE) {
        openEnvelope();
        return;
    }

    envelope.classList.add("swipe-cancelled");

    window.setTimeout(() => {
        envelope.classList.remove("swipe-cancelled");
    }, 350);
}


/* Open the flap and reveal "My beautiful Wafaa..." */
function openEnvelope() {
    if (envelopeOpened) {
        return;
    }

    envelopeOpened = true;
    loveLetter.classList.add("is-open");

    /*
     * Show the shake button after the message
     * finishes rising from the envelope.
     */
    window.setTimeout(() => {
        if (!surpriseStarted) {
            shakeButton.classList.add(
                "shake-button--visible"
            );
        }
    }, 1500);
}


/* Start flowers after shake or fallback click */
function startSurprise() {
    if (surpriseStarted) {
        return;
    }

    surpriseStarted = true;

    window.removeEventListener(
        "devicemotion",
        handleDeviceMotion
    );

    shakeButton.disabled = true;

    document.body.classList.add(
        "envelope-leaving"
    );

    if (typeof navigator.vibrate === "function") {
        navigator.vibrate([70, 40, 100]);
    }

    /*
     * Wait for the envelope to leave,
     * then start the flower animation.
     */
    window.setTimeout(() => {
        document.body.classList.add(
            "shake-started"
        );
    }, 900);
}


/* Detect phone shaking */
function handleDeviceMotion(event) {
    if (surpriseStarted) {
        return;
    }

    const acceleration =
        event.accelerationIncludingGravity ||
        event.acceleration;

    if (!acceleration) {
        return;
    }

    const x = Number(acceleration.x);
    const y = Number(acceleration.y);
    const z = Number(acceleration.z);

    if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(z)
    ) {
        return;
    }

    if (!previousAcceleration) {
        previousAcceleration = { x, y, z };
        return;
    }

    const deltaX = x - previousAcceleration.x;
    const deltaY = y - previousAcceleration.y;
    const deltaZ = z - previousAcceleration.z;

    const movement = Math.sqrt(
        deltaX * deltaX +
        deltaY * deltaY +
        deltaZ * deltaZ
    );

    previousAcceleration = { x, y, z };

    const now = Date.now();

    if (movement < SHAKE_THRESHOLD) {
        return;
    }

    if (now - lastShakeTime < SHAKE_COOLDOWN) {
        return;
    }

    lastShakeTime = now;

    shakeTimes = shakeTimes.filter(
        time => now - time <= SHAKE_WINDOW
    );

    shakeTimes.push(now);

    if (shakeTimes.length >= REQUIRED_SHAKES) {
        startSurprise();
    }
}


/*
 * First click:
 * Enable motion access.
 *
 * Second click:
 * Open the flowers as a fallback.
 */
async function activateShake() {
    if (
        surpriseStarted ||
        !envelopeOpened
    ) {
        return;
    }

    if (motionArmed) {
        startSurprise();
        return;
    }

    /*
     * Motion unavailable:
     * use the click as the fallback.
     */
    if (
        !window.isSecureContext ||
        !("DeviceMotionEvent" in window)
    ) {
        startSurprise();
        return;
    }

    try {
        /*
         * iPhone and iPad require permission
         * from a direct button press.
         */
        if (
            typeof DeviceMotionEvent
                .requestPermission === "function"
        ) {
            const permission =
                await DeviceMotionEvent
                    .requestPermission();

            if (permission !== "granted") {
                startSurprise();
                return;
            }
        }

        /*
         * Android normally starts listening
         * without a permission popup.
         */
        window.addEventListener(
            "devicemotion",
            handleDeviceMotion,
            { passive: true }
        );

        motionArmed = true;

        shakeButton.classList.add(
            "shake-button--armed"
        );

        shakeButton.innerHTML = `
          <span class="shake-button__icon">🌸</span>

          <span class="shake-button__title">
            Shake your phone now
          </span>

          <span class="shake-button__hint">
            Or tap here again to continue
          </span>
        `;
    } catch (error) {
        console.warn(
            "Motion permission unavailable:",
            error
        );

        startSurprise();
    }
}


/* Swipe events: iPhone, Android and desktop mouse */
envelope.addEventListener(
    "pointerdown",
    startSwipe
);

envelope.addEventListener(
    "pointermove",
    moveSwipe
);

envelope.addEventListener(
    "pointerup",
    finishSwipe
);

envelope.addEventListener(
    "pointercancel",
    finishSwipe
);

envelope.addEventListener(
    "lostpointercapture",
    finishSwipe
);


/* Shake activation button */
shakeButton.addEventListener(
    "click",
    activateShake
);