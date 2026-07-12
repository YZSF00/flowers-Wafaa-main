"use strict";

const shakeButton = document.getElementById("shakeButton");

const BUTTON_APPEAR_DELAY = 10400;

/*
 * Lower = easier to trigger.
 * Raise this to 17 or 18 if normal movement triggers it.
 */
const SHAKE_THRESHOLD = 14;

/*
 * Number of strong movements needed.
 */
const REQUIRED_SHAKES = 3;

/*
 * All shake movements must happen within this period.
 */
const SHAKE_WINDOW = 1300;

/*
 * Prevent one movement from being counted repeatedly.
 */
const SHAKE_COOLDOWN = 180;

let surpriseStarted = false;
let motionArmed = false;
let motionDataReceived = false;

let previousAcceleration = null;
let lastShakeTime = 0;
let shakeTimes = [];

/*
 * Show the button when the envelope intro has finished.
 */
window.setTimeout(() => {
    if (!surpriseStarted) {
        shakeButton.classList.add("shake-button--visible");
    }
}, BUTTON_APPEAR_DELAY);


/*
 * Start the flower and final message.
 */
function startSurprise() {
    if (surpriseStarted) {
        return;
    }

    surpriseStarted = true;

    window.removeEventListener("devicemotion", handleDeviceMotion);

    shakeButton.classList.remove(
        "shake-button--visible",
        "shake-button--armed",
        "shake-button--fallback"
    );

    shakeButton.classList.add("shake-button--finished");

    document.body.classList.add("shake-started");

    /*
     * Vibration works on some Android devices.
     * iPhone Safari usually ignores this safely.
     */
    if (typeof navigator.vibrate === "function") {
        navigator.vibrate([70, 40, 100]);
    }
}


/*
 * Update the button after motion access is enabled.
 */
function showShakeInstructions() {
    shakeButton.classList.add("shake-button--armed");

    shakeButton.innerHTML = `
        <span class="shake-button__icon">🌸</span>
        <span class="shake-button__title">Shake your phone</span>
        <span class="shake-button__hint">
            Or tap again if shaking does not work
        </span>
    `;
}


/*
 * Show a touch fallback when motion cannot be used.
 */
function showTapFallback(message) {
    motionArmed = true;

    shakeButton.classList.add("shake-button--fallback");

    shakeButton.innerHTML = `
        <span class="shake-button__icon">💗</span>
        <span class="shake-button__title">Tap to open the flowers</span>
        <span class="shake-button__hint">
            ${message}
        </span>
    `;
}


/*
 * Detect several strong movements within a short time.
 */
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

    motionDataReceived = true;

    if (!previousAcceleration) {
        previousAcceleration = { x, y, z };
        return;
    }

    /*
     * Calculate movement between the current sensor
     * reading and the previous reading.
     */
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

    /*
     * Remove old shake movements outside the window.
     */
    shakeTimes = shakeTimes.filter(
        time => now - time <= SHAKE_WINDOW
    );

    shakeTimes.push(now);

    if (shakeTimes.length >= REQUIRED_SHAKES) {
        startSurprise();
    }
}


/*
 * Enable motion on both iPhone and Android.
 */
async function enableMotion() {
    if (surpriseStarted) {
        return;
    }

    /*
     * A second tap is always available as a fallback.
     */
    if (motionArmed) {
        startSurprise();
        return;
    }

    /*
     * Device motion requires HTTPS on supporting browsers.
     */
    if (!window.isSecureContext) {
        showTapFallback("Motion requires a secure HTTPS page");
        return;
    }

    if (typeof window.DeviceMotionEvent === "undefined") {
        showTapFallback("Motion sensors are unavailable");
        return;
    }

    try {
        /*
         * iPhone and iPad Safari expose requestPermission().
         * It must be called directly from this button click.
         */
        if (
            typeof DeviceMotionEvent.requestPermission === "function"
        ) {
            const permission =
                await DeviceMotionEvent.requestPermission();

            if (permission !== "granted") {
                showTapFallback("Motion permission was not allowed");
                return;
            }
        }

        /*
         * Android browsers normally reach this point without
         * displaying a separate motion permission window.
         */
        window.addEventListener(
            "devicemotion",
            handleDeviceMotion,
            { passive: true }
        );

        motionArmed = true;
        showShakeInstructions();

        /*
         * Some browsers claim support but provide no sensor data.
         * Keep the second-tap fallback visible.
         */
        window.setTimeout(() => {
            if (
                !motionDataReceived &&
                !surpriseStarted
            ) {
                shakeButton.innerHTML = `
                    <span class="shake-button__icon">💗</span>
                    <span class="shake-button__title">
                        Shake or tap to continue
                    </span>
                    <span class="shake-button__hint">
                        Motion data may be unavailable
                    </span>
                `;
            }
        }, 3000);

    } catch (error) {
        console.warn("Motion permission error:", error);

        showTapFallback(
            "Shake access was unavailable on this browser"
        );
    }
}

shakeButton.addEventListener("click", enableMotion);