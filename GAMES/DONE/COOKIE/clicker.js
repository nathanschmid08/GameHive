// Game variables
let cookieCount = 0;
let totalCookies = 0;
let cookiesPerClick = 1;
let upgradeCost = 10;
let autoClickerCount = 0;
let autoClickerCost = 100;
let startTime = new Date();

// HTML elements
const cookieButton = document.getElementById("cookie-button");
const cookie = document.getElementById("cookie");
const cookieCountDisplay = document.getElementById("cookie-count");
const cookiesPerClickDisplay = document.getElementById("cookies-per-click");
const upgradeButton = document.getElementById("upgrade-button");
const upgradeCostDisplay = document.getElementById("upgrade-cost");
const totalCookiesDisplay = document.getElementById("total-cookies");
const playTimeDisplay = document.getElementById("play-time");
const autoClickerButton = document.getElementById("autoclicker-button");
const autoClickerCostDisplay = document.getElementById("autoclicker-cost");
const autoClickerCountDisplay = document.getElementById("autoclicker-count");

// Create chocolate chips for the cookie
function createChocolateChips() {
    // Clear existing chips first
    while (cookie.firstChild) {
        cookie.removeChild(cookie.firstChild);
    }

    // Create new chocolate chips
    for (let i = 0; i < 12; i++) {
        const chip = document.createElement("div");
        chip.className = "chocolate-chip";

        // Random position within the cookie
        const randomAngle = Math.random() * 360;
        const randomDistance = Math.random() * 55; // Distance from center (0-55px)

        const x = 75 + randomDistance * Math.cos(randomAngle * Math.PI / 180);
        const y = 75 + randomDistance * Math.sin(randomAngle * Math.PI / 180);

        chip.style.left = `${x}px`;
        chip.style.top = `${y}px`;

        // Random size for some variance
        const size = 10 + Math.random() * 10;
        chip.style.width = `${size}px`;
        chip.style.height = `${size}px`;

        cookie.appendChild(chip);
    }
}

// Cookie rain animation when clicking
function createCookieRain() {
    const cookieRain = document.createElement("div");
    cookieRain.className = "cookie-rain";

    // Create a small cookie image
    const rainCookie = document.createElement("div");
    rainCookie.className = "cookie";
    rainCookie.style.width = "30px";
    rainCookie.style.height = "30px";

    // Add chocolate chips to the rain cookie
    for (let i = 0; i < 5; i++) {
        const chip = document.createElement("div");
        chip.className = "chocolate-chip";
        chip.style.width = "3px";
        chip.style.height = "3px";

        const x = 15 + (Math.random() * 10 - 5);
        const y = 15 + (Math.random() * 10 - 5);

        chip.style.left = `${x}px`;
        chip.style.top = `${y}px`;

        rainCookie.appendChild(chip);
    }

    cookieRain.appendChild(rainCookie);

    // Random horizontal position
    const posX = Math.random() * window.innerWidth;
    cookieRain.style.left = `${posX}px`;

    // Random size and speed for animation
    const size = 20 + Math.random() * 30;
    const speed = 3 + Math.random() * 6;

    cookieRain.style.animation = `falling ${speed}s linear`;

    document.body.appendChild(cookieRain);

    // Remove the element after animation completes
    setTimeout(() => {
        document.body.removeChild(cookieRain);
    }, speed * 1000);
}

// Event Listener for clicking the cookie
cookieButton.addEventListener("click", () => {
    const gain = cookiesPerClick;
    cookieCount += gain;
    totalCookies += gain;
    createCookieRain();
    updateDisplay();

    // Show floating score
    const floatingScore = document.createElement("div");
    floatingScore.textContent = `+${gain}`;
    floatingScore.style.position = "absolute";
    floatingScore.style.color = "#8e5e24";
    floatingScore.style.fontWeight = "bold";
    floatingScore.style.pointerEvents = "none";

    // Position near the cookie
    const rect = cookieButton.getBoundingClientRect();
    floatingScore.style.left = `${rect.left + Math.random() * 50 + 50}px`;
    floatingScore.style.top = `${rect.top + Math.random() * 20 + 50}px`;

    // Animation
    floatingScore.style.animation = "floatUp 1.5s ease-out";
    floatingScore.style.opacity = "1";

    // Add to DOM
    document.body.appendChild(floatingScore);

    // Create keyframes for the animation
    if (!document.querySelector("#float-keyframes")) {
        const style = document.createElement("style");
        style.id = "float-keyframes";
        style.textContent = `
        @keyframes floatUp {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px);
            opacity: 0;
          }
        }
      `;
        document.head.appendChild(style);
    }

    // Remove after animation
    setTimeout(() => {
        document.body.removeChild(floatingScore);
    }, 1500);
});

// Event Listener for upgrade button
upgradeButton.addEventListener("click", () => {
    if (cookieCount >= upgradeCost) {
        cookieCount -= upgradeCost;
        cookiesPerClick += 1;
        upgradeCost = Math.floor(upgradeCost * 1.5); // Price increases for next upgrade
        updateDisplay();
    }
});

// Event Listener for auto-clicker button
autoClickerButton.addEventListener("click", () => {
    if (cookieCount >= autoClickerCost) {
        cookieCount -= autoClickerCost;
        autoClickerCount += 1;
        autoClickerCost = Math.floor(autoClickerCost * 1.3); // Price increases
        updateDisplay();
    }
});

// Function to update the display
function updateDisplay() {
    cookieCountDisplay.textContent = formatNumber(cookieCount);
    cookiesPerClickDisplay.textContent = formatNumber(cookiesPerClick);
    upgradeCostDisplay.textContent = formatNumber(upgradeCost);
    totalCookiesDisplay.textContent = formatNumber(totalCookies);
    autoClickerCostDisplay.textContent = formatNumber(autoClickerCost);
    autoClickerCountDisplay.textContent = autoClickerCount;

    // Check if player can afford upgrades
    upgradeButton.disabled = cookieCount < upgradeCost;
    autoClickerButton.disabled = cookieCount < autoClickerCost;
}

// Function for auto-clickers
function processAutoClickers() {
    if (autoClickerCount > 0) {
        const gain = autoClickerCount;
        cookieCount += gain;
        totalCookies += gain;
        updateDisplay();
    }
}

// Format large numbers
function formatNumber(num) {
    if (num < 1000) return num;
    if (num < 1000000) return (num / 1000).toFixed(1) + "K";
    if (num < 1000000000) return (num / 1000000).toFixed(1) + "M";
    return (num / 1000000000).toFixed(1) + "B";
}

// Update play time
function updatePlayTime() {
    const currentTime = new Date();
    const elapsedTime = Math.floor((currentTime - startTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    playTimeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Auto-clickers process every second
setInterval(processAutoClickers, 1000);

// Update play time every second
setInterval(updatePlayTime, 1000);

// Initialize the game
createChocolateChips();
updateDisplay();