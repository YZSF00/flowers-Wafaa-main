"use strict";

function initializeGiftAnimation() {
    /* =============================================
       ELEMENTS
    ============================================= */

    const loveLetter =
        document.querySelector(".love-letter");

    const envelope =
        document.querySelector(".envelope");

    const swipeZone =
        document.getElementById("swipeZone");

    const shakeButton =
        document.getElementById("shakeButton");

    if (
        !loveLetter ||
        !envelope ||
        !swipeZone ||
        !shakeButton
    ) {
        console.error(
            "Missing .love-letter, .envelope, " +
            "#swipeZone, or #shakeButton."
        );

        return;
    }


    /* =============================================
       SETTINGS
    ============================================= */

    /*
     * How far the finger must move upward.
     */
    const OPEN_DISTANCE = 40;

    /*
     * Allow swiping after the envelope entrance.
     */
    const SWIPE_ENABLE_DELAY = 1500;

    /*
     * Phone shake settings.
     */
    const SHAKE_THRESHOLD = 13;
    const REQUIRED_SHAKES = 2;
    const SHAKE_WINDOW = 1300;
    const SHAKE_COOLDOWN = 180;


    /* =============================================
       STATE
    ============================================= */

    let swipeEnabled = false;
    let touchDragging = false;
    let mouseDragging = false;

    let envelopeOpened = false;
    let surpriseStarted = false;
    let motionArmed = false;

    let activeTouchId = null;
    let touchStartY = 0;
    let touchCurrentY = 0;
    let maximumSwipeDistance = 0;

    let mouseStartY = 0;
    let mouseCurrentY = 0;
    let maximumMouseDistance = 0;

    let lastTouchTimestamp = 0;

    let previousAcceleration = null;
    let lastShakeTime = 0;
    let shakeTimes = [];


    /* =============================================
       ENABLE THE SWIPE
    ============================================= */

    window.setTimeout(() => {
        if (envelopeOpened) {
            return;
        }

        swipeEnabled = true;
        envelope.classList.add("entry-finished");
        swipeZone.classList.add("swipe-zone--ready");
    }, SWIPE_ENABLE_DELAY);


    /* =============================================
       SHARED SWIPE VISUALS
    ============================================= */

    function updateSwipeVisual(distance) {
        const safeDistance = Math.max(0, distance);

        const visualOffset = Math.min(
            safeDistance * 0.35,
            42
        );

        envelope.style.setProperty(
            "--drag-offset",
            `${-visualOffset}px`
        );

        envelope.classList.toggle(
            "ready-to-open",
            safeDistance >= OPEN_DISTANCE
        );

        swipeZone.classList.toggle(
            "swipe-zone--complete",
            safeDistance >= OPEN_DISTANCE
        );
    }


    function resetSwipeVisual() {
        envelope.style.removeProperty(
            "--drag-offset"
        );

        envelope.classList.remove(
            "is-dragging",
            "ready-to-open"
        );

        swipeZone.classList.remove(
            "swipe-zone--complete"
        );
    }


    function showCancelledSwipe() {
        resetSwipeVisual();

        envelope.classList.add(
            "swipe-cancelled"
        );

        window.setTimeout(() => {
            envelope.classList.remove(
                "swipe-cancelled"
            );
        }, 350);
    }


    /* =============================================
       OPEN THE ENVELOPE
    ============================================= */

    function openEnvelope() {
        if (envelopeOpened) {
            return;
        }

        envelopeOpened = true;
        swipeEnabled = false;
        touchDragging = false;
        mouseDragging = false;
        activeTouchId = null;

        resetSwipeVisual();

        loveLetter.classList.add("is-open");
        swipeZone.classList.add(
            "swipe-zone--disabled"
        );

        /*
         * Display the shake button after the letter
         * has risen from the envelope.
         */
        window.setTimeout(() => {
            if (!surpriseStarted) {
                shakeButton.classList.add(
                    "shake-button--visible"
                );
            }
        }, 1550);
    }


    /* =============================================
       TOUCH HELPERS
    ============================================= */

    function findTouchById(touchList, id) {
        for (
            let index = 0;
            index < touchList.length;
            index += 1
        ) {
            if (
                touchList[index].identifier === id
            ) {
                return touchList[index];
            }
        }

        return null;
    }


    /* =============================================
       REAL MOBILE TOUCH EVENTS
    ============================================= */

    swipeZone.addEventListener(
        "touchstart",
        event => {
            if (
                !swipeEnabled ||
                envelopeOpened ||
                surpriseStarted ||
                event.changedTouches.length === 0
            ) {
                return;
            }

            /*
             * Stop Safari and Chrome from interpreting
             * this gesture as page scrolling.
             */
            if (event.cancelable) {
                event.preventDefault();
            }

            const touch =
                event.changedTouches[0];

            lastTouchTimestamp = Date.now();

            activeTouchId = touch.identifier;
            touchStartY = touch.clientY;
            touchCurrentY = touch.clientY;
            maximumSwipeDistance = 0;
            touchDragging = true;

            envelope.classList.add(
                "is-dragging"
            );
        },
        {
            passive: false
        }
    );


    window.addEventListener(
        "touchmove",
        event => {
            if (
                !touchDragging ||
                activeTouchId === null ||
                envelopeOpened
            ) {
                return;
            }

            const touch =
                findTouchById(
                    event.touches,
                    activeTouchId
                ) ||
                findTouchById(
                    event.changedTouches,
                    activeTouchId
                );

            if (!touch) {
                return;
            }

            if (event.cancelable) {
                event.preventDefault();
            }

            touchCurrentY = touch.clientY;

            const distance = Math.max(
                0,
                touchStartY - touchCurrentY
            );

            maximumSwipeDistance = Math.max(
                maximumSwipeDistance,
                distance
            );

            updateSwipeVisual(
                maximumSwipeDistance
            );
        },
        {
            passive: false
        }
    );


    window.addEventListener(
        "touchend",
        event => {
            if (
                !touchDragging ||
                activeTouchId === null ||
                envelopeOpened
            ) {
                return;
            }

            const touch =
                findTouchById(
                    event.changedTouches,
                    activeTouchId
                );

            if (touch) {
                touchCurrentY = touch.clientY;

                maximumSwipeDistance = Math.max(
                    maximumSwipeDistance,
                    Math.max(
                        0,
                        touchStartY - touchCurrentY
                    )
                );
            }

            if (event.cancelable) {
                event.preventDefault();
            }

            touchDragging = false;
            activeTouchId = null;

            if (
                maximumSwipeDistance >=
                OPEN_DISTANCE
            ) {
                openEnvelope();
                return;
            }

            showCancelledSwipe();
        },
        {
            passive: false
        }
    );


    window.addEventListener(
        "touchcancel",
        event => {
            if (!touchDragging) {
                return;
            }

            if (event.cancelable) {
                event.preventDefault();
            }

            touchDragging = false;
            activeTouchId = null;

            /*
             * A browser can cancel the touch sequence
             * after the finger already passed the
             * required distance. Open it in that case.
             */
            if (
                maximumSwipeDistance >=
                OPEN_DISTANCE
            ) {
                openEnvelope();
                return;
            }

            showCancelledSwipe();
        },
        {
            passive: false
        }
    );


    /* =============================================
       DESKTOP MOUSE SUPPORT
    ============================================= */

    swipeZone.addEventListener(
        "mousedown",
        event => {
            /*
             * Ignore synthetic mouse events generated
             * immediately after a phone touch.
             */
            if (
                Date.now() -
                lastTouchTimestamp <
                1000
            ) {
                return;
            }

            if (
                event.button !== 0 ||
                !swipeEnabled ||
                envelopeOpened ||
                surpriseStarted
            ) {
                return;
            }

            event.preventDefault();

            mouseDragging = true;
            mouseStartY = event.clientY;
            mouseCurrentY = event.clientY;
            maximumMouseDistance = 0;

            envelope.classList.add(
                "is-dragging"
            );
        }
    );


    window.addEventListener(
        "mousemove",
        event => {
            if (
                !mouseDragging ||
                envelopeOpened
            ) {
                return;
            }

            event.preventDefault();

            mouseCurrentY = event.clientY;

            const distance = Math.max(
                0,
                mouseStartY - mouseCurrentY
            );

            maximumMouseDistance = Math.max(
                maximumMouseDistance,
                distance
            );

            updateSwipeVisual(
                maximumMouseDistance
            );
        }
    );


    window.addEventListener(
        "mouseup",
        event => {
            if (
                !mouseDragging ||
                envelopeOpened
            ) {
                return;
            }

            mouseCurrentY = event.clientY;

            maximumMouseDistance = Math.max(
                maximumMouseDistance,
                Math.max(
                    0,
                    mouseStartY - mouseCurrentY
                )
            );

            mouseDragging = false;

            if (
                maximumMouseDistance >=
                OPEN_DISTANCE
            ) {
                openEnvelope();
                return;
            }

            showCancelledSwipe();
        }
    );


    /* =============================================
       START THE FLOWER SURPRISE
    ============================================= */

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

        shakeButton.classList.remove(
            "shake-button--visible",
            "shake-button--armed"
        );

        document.body.classList.add(
            "envelope-leaving"
        );

        if (
            typeof navigator.vibrate ===
            "function"
        ) {
            navigator.vibrate([
                70,
                40,
                100
            ]);
        }

        window.setTimeout(() => {
            document.body.classList.add(
                "shake-started"
            );
        }, 900);
    }


    /* =============================================
       SHAKE DETECTION
    ============================================= */

    function handleDeviceMotion(event) {
        if (
            surpriseStarted ||
            !motionArmed
        ) {
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
            previousAcceleration = {
                x,
                y,
                z
            };

            return;
        }

        const deltaX =
            x - previousAcceleration.x;

        const deltaY =
            y - previousAcceleration.y;

        const deltaZ =
            z - previousAcceleration.z;

        previousAcceleration = {
            x,
            y,
            z
        };

        const movement = Math.sqrt(
            deltaX * deltaX +
            deltaY * deltaY +
            deltaZ * deltaZ
        );

        const now = Date.now();

        if (movement < SHAKE_THRESHOLD) {
            return;
        }

        if (
            now - lastShakeTime <
            SHAKE_COOLDOWN
        ) {
            return;
        }

        lastShakeTime = now;

        shakeTimes = shakeTimes.filter(
            time =>
                now - time <= SHAKE_WINDOW
        );

        shakeTimes.push(now);

        if (
            shakeTimes.length >=
            REQUIRED_SHAKES
        ) {
            startSurprise();
        }
    }


    /* =============================================
       ACTIVATE SHAKE
    ============================================= */

    async function activateShake(event) {
        event.preventDefault();
        event.stopPropagation();

        if (
            surpriseStarted ||
            !envelopeOpened
        ) {
            return;
        }

        /*
         * The second tap opens the flowers as a
         * fallback.
         */
        if (motionArmed) {
            startSurprise();
            return;
        }

        if (
            !window.isSecureContext ||
            typeof window.DeviceMotionEvent ===
                "undefined"
        ) {
            startSurprise();
            return;
        }

        try {
            /*
             * iPhone and iPad motion permission.
             */
            if (
                typeof window.DeviceMotionEvent
                    .requestPermission ===
                "function"
            ) {
                const permission =
                    await window
                        .DeviceMotionEvent
                        .requestPermission();

                if (permission !== "granted") {
                    startSurprise();
                    return;
                }
            }

            window.addEventListener(
                "devicemotion",
                handleDeviceMotion,
                {
                    passive: true
                }
            );

            motionArmed = true;
            previousAcceleration = null;
            shakeTimes = [];

            shakeButton.classList.add(
                "shake-button--armed"
            );

            shakeButton.innerHTML = `
                <span class="shake-button__icon">
                    🌸
                </span>

                <span class="shake-button__title">
                    Shake your phone now
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


    shakeButton.addEventListener(
        "click",
        activateShake
    );
}


/* Run whether the script is placed in the head or body. */
if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeGiftAnimation
    );
} else {
    initializeGiftAnimation();
}