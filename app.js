document.addEventListener("DOMContentLoaded", () => {
    const html = document.documentElement;
    const canvas = document.getElementById("animation-canvas");
    const context = canvas.getContext("2d");

    const preloader = document.getElementById("preloader");
    const loaderBar = document.getElementById("loader-bar");
    const loaderText = document.getElementById("loader-text");

    const frameCount = 240;
    const images = new Array(frameCount + 1); // 1-indexed to match filenames
    let loadedCount = 0;
    let appInitialized = false;

    // Load every 2nd frame to save bandwidth and memory (151 frames total)
    const frameStep = 2;
    const framesToLoad = [];
    framesToLoad.push(1); // Always load the first critical frame
    for (let i = 3; i < frameCount; i += frameStep) {
        framesToLoad.push(i);
    }
    if (!framesToLoad.includes(frameCount)) {
        framesToLoad.push(frameCount); // Always load the last frame
    }

    const totalToLoad = framesToLoad.length;
    let queueIndex = 0;
    const maxConcurrent = 4; // limit concurrent connections to prevent network congestion

    // Helper to format frame path to upscaled folder
    const getFramePath = (index) => {
        const frameNum = index.toString().padStart(3, "0");
        return `upscaled_frames/ezgif-frame-${frameNum}.jpg`;
    };

    // Find the closest loaded frame to a requested index using an outward search
    function getClosestLoadedFrame(index) {
        for (let offset = 0; offset < frameCount; offset++) {
            const left = index - offset;
            const right = index + offset;

            if (left >= 1 && images[left]) {
                return left;
            }
            if (right <= frameCount && images[right]) {
                return right;
            }
            if (left < 1 && right > frameCount) {
                break;
            }
        }
        return -1;
    }

    // Queue-based sequential background preloader
    function preloadFrames() {
        // Disable body scroll during initial load
        document.body.style.overflow = "hidden";

        // Kick off initial concurrent loaders
        for (let i = 0; i < Math.min(maxConcurrent, totalToLoad); i++) {
            loadNext();
        }
    }

    function loadNext() {
        if (queueIndex >= totalToLoad) return;

        const index = framesToLoad[queueIndex++];
        const img = new Image();
        img.src = getFramePath(index);

        img.onload = () => {
            // Decode image asynchronously off the main thread before drawing
            img.decode().then(() => {
                images[index] = img;
                handleFrameLoaded(index);
            }).catch(err => {
                console.warn(`Off-thread decoding failed for frame ${index}, falling back`, err);
                images[index] = img;
                handleFrameLoaded(index);
            });
        };

        img.onerror = () => {
            console.error(`Failed to load frame ${index}`);
            handleFrameLoaded(index);
        };
    }

    function handleFrameLoaded(index) {
        loadedCount++;

        // Initialize app as soon as frame 1 (or any critical frame) loads
        const criticalIndices = [1, 3, 5];
        const loadedCritical = criticalIndices.filter(idx => images[idx]).length;

        if (loadedCritical >= 1 && !appInitialized) {
            initApp();
        }

        // Update progress bar during the initial critical phase
        if (!appInitialized) {
            const progress = Math.min(Math.round((loadedCount / 3) * 100), 100);
            loaderBar.style.width = `${progress}%`;
            loaderText.textContent = `Preparing Cinematic Experience...`;
        }

        // Fetch next frame in queue
        loadNext();
    }

    // Canvas scaling to match viewport layout and pixel density (retina)
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        context.resetTransform();
        context.scale(dpr, dpr);
        
        // Update dimensions and positions that change when resized
        updateMaxScroll();
        if (typeof updateSectionPositions === "function") {
            updateSectionPositions();
        }
        
        drawCurrentFrame();
    }

    // Cover drawing logic (similar to background-size: cover)
    function drawCurrentFrame() {
        const frameIndex = Math.round(currentFrameIndex);
        const closestIndex = getClosestLoadedFrame(frameIndex);
        if (closestIndex === -1) return;

        const img = images[closestIndex];
        if (!img) return;

        const canvasWidth = window.innerWidth;
        const canvasHeight = window.innerHeight;

        const hRatio = canvasWidth / img.width;
        const vRatio = canvasHeight / img.height;
        const ratio = Math.max(hRatio, vRatio);

        const centerShift_x = (canvasWidth - img.width * ratio) / 2;
        const centerShift_y = (canvasHeight - img.height * ratio) / 2;

        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.drawImage(
            img,
            0, 0, img.width, img.height,
            centerShift_x, centerShift_y, img.width * ratio, img.height * ratio
        );
    }

    // Scroll Control Variables
    let currentFrameIndex = 0;
    let targetFrameIndex = 0;
    let isAnimating = false;
    const lerpFactor = 0.08; // Adjusted to 0.08 for extra buttery inertia

    let maxScrollTop = 0;
    let sectionPositions = [];
    const navLinks = document.querySelectorAll(".nav-link");

    // Recalculates maximum scroll to avoid reading scrollHeight during scroll events
    function updateMaxScroll() {
        maxScrollTop = html.scrollHeight - window.innerHeight;
    }

    // Recalculates positions and offsets of the sections to avoid reflows during scroll
    function updateSectionPositions() {
        const sections = [
            document.getElementById("section-hero"),
            document.getElementById("section-signature"),
            document.getElementById("section-location")
        ].filter(Boolean);

        sectionPositions = sections.map(section => ({
            id: section.getAttribute("id"),
            top: section.offsetTop,
            height: section.offsetHeight
        }));
    }

    function updateTargetFrame() {
        if (maxScrollTop <= 0) return;

        const scrollTop = window.scrollY || html.scrollTop;
        const scrollFraction = scrollTop / maxScrollTop;
        targetFrameIndex = scrollFraction * (frameCount - 1);

        // Start animating loop if not already running
        if (!isAnimating) {
            isAnimating = true;
            requestAnimationFrame(tick);
        }
    }

    // Buttery-smooth interpolation loop
    function tick() {
        const diff = targetFrameIndex - currentFrameIndex;

        // If very close to target, snap and stop animation loop
        if (Math.abs(diff) < 0.005) {
            currentFrameIndex = targetFrameIndex;
            drawCurrentFrame();
            isAnimating = false;
        } else {
            currentFrameIndex += diff * lerpFactor;
            drawCurrentFrame();
            requestAnimationFrame(tick);
        }
    }

    // Active Card Intersection Observer
    function setupIntersectionObserver() {
        const elements = document.querySelectorAll(".content-card, .offering-item, .location-container, .cta-card, .section-location");
        const options = {
            threshold: 0.1,
            rootMargin: "0px 0px -10% 0px"
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("active");
                }
            });
        }, options);

        elements.forEach(el => observer.observe(el));
    }

    // Navigation Active Link Highlighting on Scroll (Uses cached section positions to avoid layout thrashing)
    function setupNavHighlight() {
        window.addEventListener("scroll", () => {
            let currentSectionId = "";
            const scrollPos = window.scrollY + 200; // Offset for header height

            for (const section of sectionPositions) {
                if (scrollPos >= section.top && scrollPos < section.top + section.height) {
                    currentSectionId = section.id;
                    break;
                }
            }

            navLinks.forEach(link => {
                const href = link.getAttribute("href");
                if (href === `#${currentSectionId}`) {
                    link.style.color = "var(--text-primary)";
                    link.classList.add("active");
                } else if (href && href.startsWith("#")) {
                    link.style.color = "var(--text-secondary)";
                    link.classList.remove("active");
                }
            });
        });
    }

    // Mobile Navigation Menu Toggle
    function setupMobileMenu() {
        const menuToggle = document.getElementById("mobile-menu-toggle");
        const navMenu = document.getElementById("nav-menu");
        if (menuToggle && navMenu) {
            menuToggle.addEventListener("click", () => {
                navMenu.classList.toggle("open");
                const icon = menuToggle.querySelector(".material-symbols-outlined");
                if (icon) {
                    icon.textContent = navMenu.classList.contains("open") ? "close" : "menu";
                }
            });
            
            // Close menu when a link is clicked
            const navLinks = navMenu.querySelectorAll(".nav-link, .btn-primary-nav");
            navLinks.forEach(link => {
                link.addEventListener("click", () => {
                    navMenu.classList.remove("open");
                    const icon = menuToggle.querySelector(".material-symbols-outlined");
                    if (icon) {
                        icon.textContent = "menu";
                    }
                });
            });
        }
    }

    // Initialize application after loading resources
    function initApp() {
        if (appInitialized) return;
        appInitialized = true;

        // Fade out preloader
        preloader.style.opacity = "0";
        preloader.style.visibility = "hidden";
        
        // Re-enable scrolling
        document.body.style.overflow = "auto";
        
        // Setup event handlers and listeners
        window.addEventListener("resize", resizeCanvas);
        window.addEventListener("scroll", updateTargetFrame);
        
        // Initial setup calls
        updateMaxScroll();
        updateSectionPositions();
        resizeCanvas();
        updateTargetFrame();
        setupIntersectionObserver();
        setupNavHighlight();
        setupMobileMenu();
    }

    // Kick off image preloading
    preloadFrames();
});
