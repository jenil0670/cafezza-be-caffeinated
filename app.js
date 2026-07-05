document.addEventListener("DOMContentLoaded", () => {
    const html = document.documentElement;
    const canvas = document.getElementById("animation-canvas");
    const preloader = document.getElementById("preloader");
    const loaderBar = document.getElementById("loader-bar");
    const loaderText = document.getElementById("loader-text");

    // Detect mobile viewport
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        // Fast-path for mobile: immediately hide preloader and skip canvas animation
        if (preloader) {
            preloader.style.opacity = "0";
            preloader.style.visibility = "hidden";
        }
        document.body.style.overflow = "auto";
        if (canvas) {
            canvas.style.display = "none";
        }
        
        // Initialize mobile elements
        setupIntersectionObserver();
        setupMobileMenu();
        return;
    }

    const context = canvas.getContext("2d");
    const frameCount = 300;
    const images = [];
    let loadedCount = 0;

    // Helper to format frame path to upscaled folder
    const getFramePath = (index) => {
        const frameNum = index.toString().padStart(3, "0");
        return `upscaled_frames/ezgif-frame-${frameNum}.jpg`;
    };

    // Preload all frames
    function preloadFrames() {
        // Disable body scroll during loading
        document.body.style.overflow = "hidden";

        for (let i = 1; i <= frameCount; i++) {
            const img = new Image();
            img.src = getFramePath(i);
            img.onload = () => {
                loadedCount++;
                const progress = Math.round((loadedCount / frameCount) * 100);
                
                // Update Loader GUI
                loaderBar.style.width = `${progress}%`;
                loaderText.textContent = `Loading Cinematic Experience ${progress}%`;

                if (loadedCount === frameCount) {
                    initApp();
                }
            };
            img.onerror = () => {
                // If a frame fails to load, count it anyway so we don't block app launch
                loadedCount++;
                const progress = Math.round((loadedCount / frameCount) * 100);
                loaderBar.style.width = `${progress}%`;
                loaderText.textContent = `Loading Cinematic Experience ${progress}%`;

                if (loadedCount === frameCount) {
                    initApp();
                }
            };
            images.push(img);
        }
    }

    // Canvas scaling to match viewport layout and pixel density (retina)
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        context.resetTransform();
        context.scale(dpr, dpr);
        drawCurrentFrame();
    }

    // Cover drawing logic (similar to background-size: cover)
    function drawCurrentFrame() {
        const frameToDraw = Math.round(currentFrameIndex);
        const img = images[frameToDraw];
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
    const lerpFactor = 0.12; // Controls the scroll animation inertia

    function updateTargetFrame() {
        const scrollTop = window.scrollY || html.scrollTop;
        const maxScrollTop = html.scrollHeight - window.innerHeight;
        
        if (maxScrollTop <= 0) return;

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

    // Navigation Active Link Highlighting on Scroll
    function setupNavHighlight() {
        const sections = document.querySelectorAll("section");
        const navLinks = document.querySelectorAll(".nav-link");

        window.addEventListener("scroll", () => {
            let currentSectionId = "";
            const scrollPos = window.scrollY + 200; // Offset for header height

            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                
                if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                    currentSectionId = section.getAttribute("id");
                }
            });

            navLinks.forEach(link => {
                link.classList.remove("active");
                if (link.getAttribute("href") === `#${currentSectionId}`) {
                    link.style.color = "var(--text-primary)";
                } else {
                    link.style.color = "var(--text-secondary)";
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
        // Fade out preloader
        preloader.style.opacity = "0";
        preloader.style.visibility = "hidden";
        
        // Re-enable scrolling
        document.body.style.overflow = "auto";
        
        // Setup event handlers and listeners
        window.addEventListener("resize", resizeCanvas);
        window.addEventListener("scroll", updateTargetFrame);
        
        // Initial setup calls
        resizeCanvas();
        updateTargetFrame();
        setupIntersectionObserver();
        setupNavHighlight();
        setupMobileMenu();
    }

    // Kick off image preloading
    preloadFrames();
});
