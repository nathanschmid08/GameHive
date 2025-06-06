const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Verbesserte Spielkonstanten
const FROG_SIZE = 40;
const CAR_WIDTH = 70;
const CAR_HEIGHT = 35;
const LANE_HEIGHT = 50;
const WATER_HEIGHT = 200;

// Spielvariablen
const game = {
    lives: 3,
    score: 0,
    level: 1,
    gameOver: false,
    paused: false
};

// Frosch mit Animation
const frog = {
    x: canvas.width / 2 - FROG_SIZE / 2,
    y: canvas.height - FROG_SIZE - 10,
    width: FROG_SIZE,
    height: FROG_SIZE,
    jumping: false,
    jumpHeight: 0,
    startY: 0
};

// Verschiedene Fahrzeugtypen
const vehicleTypes = [
    { width: 70, height: 35, color: "#ff4444", speed: 2, name: "car" },
    { width: 100, height: 40, color: "#4444ff", speed: 1.5, name: "truck" },
    { width: 60, height: 30, color: "#ffff44", speed: 3, name: "sports" }
];

// Mehr Fahrzeuge in verschiedenen Bahnen
const vehicles = [];
const numLanes = 4;

for (let lane = 0; lane < numLanes; lane++) {
    const y = canvas.height - 100 - (lane * LANE_HEIGHT);
    const vehiclesInLane = 3;
    const direction = lane % 2 === 0 ? 1 : -1;
    
    for (let i = 0; i < vehiclesInLane; i++) {
        const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
        vehicles.push({
            x: (canvas.width / vehiclesInLane) * i,
            y: y,
            width: vehicleType.width,
            height: vehicleType.height,
            speed: vehicleType.speed * direction,
            color: vehicleType.color,
            type: vehicleType.name
        });
    }
}

// Schwimmende Objekte
const logs = [];
const numLogLanes = 3;

for (let lane = 0; lane < numLogLanes; lane++) {
    const y = 50 + (lane * LANE_HEIGHT);
    const logsInLane = 2;
    const direction = lane % 2 === 0 ? 1 : -1;
    
    for (let i = 0; i < logsInLane; i++) {
        logs.push({
            x: (canvas.width / logsInLane) * i,
            y: y,
            width: 150,
            height: 40,
            speed: 1.5 * direction,
            color: "#8B4513"
        });
    }
}

// Zeichenfunktionen
function drawFrog() {
    ctx.save();
    
    // Sprunghöhe berechnen
    if (frog.jumping) {
        const jumpProgress = Math.sin((frog.jumpHeight / 10) * Math.PI);
        const elevation = jumpProgress * 20;
        ctx.translate(0, -elevation);
    }

    // Körper-Grundform
    ctx.fillStyle = "#2d5a27";
    ctx.beginPath();
    ctx.ellipse(
        frog.x + frog.width/2, 
        frog.y + frog.height/2, 
        frog.width/2, 
        frog.height/2.2, 
        0, 0, Math.PI * 2
    );
    ctx.fill();

    // Kopf
    ctx.fillStyle = "#3d7a37";
    ctx.beginPath();
    ctx.ellipse(
        frog.x + frog.width/2, 
        frog.y + frog.height/3, 
        frog.width/2.5, 
        frog.height/3, 
        0, 0, Math.PI * 2
    );
    ctx.fill();

    // Augen (Grundform - weiß)
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.ellipse(
        frog.x + frog.width/4, 
        frog.y + frog.height/3, 
        8, 10, 
        0, 0, Math.PI * 2
    );
    ctx.ellipse(
        frog.x + (frog.width*3)/4, 
        frog.y + frog.height/3, 
        8, 10, 
        0, 0, Math.PI * 2
    );
    ctx.fill();

    // Augen (Iris - gelb)
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.ellipse(
        frog.x + frog.width/4, 
        frog.y + frog.height/3, 
        6, 8, 
        0, 0, Math.PI * 2
    );
    ctx.ellipse(
        frog.x + (frog.width*3)/4, 
        frog.y + frog.height/3, 
        6, 8, 
        0, 0, Math.PI * 2
    );
    ctx.fill();

    // Pupillen
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.ellipse(
        frog.x + frog.width/4, 
        frog.y + frog.height/3, 
        3, 4, 
        0, 0, Math.PI * 2
    );
    ctx.ellipse(
        frog.x + (frog.width*3)/4, 
        frog.y + frog.height/3, 
        3, 4, 
        0, 0, Math.PI * 2
    );
    ctx.fill();

    // Glanzpunkte in den Augen
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.ellipse(
        frog.x + frog.width/4 - 1, 
        frog.y + frog.height/3 - 1, 
        1, 1, 
        0, 0, Math.PI * 2
    );
    ctx.ellipse(
        frog.x + (frog.width*3)/4 - 1, 
        frog.y + frog.height/3 - 1, 
        1, 1, 
        0, 0, Math.PI * 2
    );
    ctx.fill();

    // Mund
    ctx.strokeStyle = "#1a4721";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
        frog.x + frog.width/2,
        frog.y + frog.height/2,
        frog.width/4,
        0.1 * Math.PI,
        0.9 * Math.PI
    );
    ctx.stroke();

    // Vordere Beine
    ctx.fillStyle = "#2d5a27";
    // Linkes Bein
    ctx.beginPath();
    ctx.ellipse(
        frog.x + frog.width/4,
        frog.y + frog.height*0.8,
        8, 12,
        -Math.PI/4,
        0, Math.PI * 2
    );
    ctx.fill();
    // Rechtes Bein
    ctx.beginPath();
    ctx.ellipse(
        frog.x + frog.width*0.75,
        frog.y + frog.height*0.8,
        8, 12,
        Math.PI/4,
        0, Math.PI * 2
    );
    ctx.fill();

    // Hintere Beine (größer)
    // Linkes Bein
    ctx.beginPath();
    ctx.ellipse(
        frog.x + frog.width*0.2,
        frog.y + frog.height*0.9,
        10, 15,
        -Math.PI/3,
        0, Math.PI * 2
    );
    ctx.fill();
    // Rechtes Bein
    ctx.beginPath();
    ctx.ellipse(
        frog.x + frog.width*0.8,
        frog.y + frog.height*0.9,
        10, 15,
        Math.PI/3,
        0, Math.PI * 2
    );
    ctx.fill();

    // Farbverlauf für glänzende Haut
    const gradient = ctx.createRadialGradient(
        frog.x + frog.width/2,
        frog.y + frog.height/2,
        0,
        frog.x + frog.width/2,
        frog.y + frog.height/2,
        frog.width/2
    );
    gradient.addColorStop(0, "rgba(255,255,255,0.1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(
        frog.x + frog.width/2,
        frog.y + frog.height/2,
        frog.width/2,
        frog.height/2,
        0, 0, Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
}

function drawVehicle(vehicle) {
    ctx.fillStyle = vehicle.color;
    ctx.fillRect(vehicle.x, vehicle.y, vehicle.width, vehicle.height);
    
    // Fenster und Details
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    if (vehicle.type === "car") {
        ctx.fillRect(vehicle.x + 10, vehicle.y + 5, 20, 10);
    } else if (vehicle.type === "truck") {
        ctx.fillRect(vehicle.x + 70, vehicle.y + 5, 25, 15);
    }
    
    // Räder
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(vehicle.x + 15, vehicle.y + vehicle.height, 5, 0, Math.PI * 2);
    ctx.arc(vehicle.x + vehicle.width - 15, vehicle.y + vehicle.height, 5, 0, Math.PI * 2);
    ctx.fill();
}

function drawLog(log) {
    // Holzstamm Textur
    const gradient = ctx.createLinearGradient(log.x, log.y, log.x, log.y + log.height);
    gradient.addColorStop(0, "#8B4513");
    gradient.addColorStop(0.5, "#A0522D");
    gradient.addColorStop(1, "#8B4513");
    
    ctx.fillStyle = gradient;
    ctx.fillRect(log.x, log.y, log.width, log.height);
    
    // Holzringe
    ctx.strokeStyle = "#6B3E26";
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(log.x + 30 + (i * 45), log.y + log.height/2, 10, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawWater() {
    const gradient = ctx.createLinearGradient(0, 0, 0, WATER_HEIGHT);
    gradient.addColorStop(0, "#4FA4E8");
    gradient.addColorStop(1, "#2E8BC0");
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, WATER_HEIGHT);
    
    // Wellen-Effekt
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    for (let i = 0; i < canvas.width; i += 30) {
        ctx.moveTo(i, 20);
        ctx.quadraticCurveTo(i + 15, 10, i + 30, 20);
    }
    ctx.stroke();
}

function drawBackground() {
    // Gras
    ctx.fillStyle = "#90EE90";
    ctx.fillRect(0, WATER_HEIGHT, canvas.width, 50);
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
    
    // Straße
    ctx.fillStyle = "#505050";
    ctx.fillRect(0, WATER_HEIGHT + 50, canvas.width, canvas.height - WATER_HEIGHT - 110);
    
    // Straßenmarkierungen
    ctx.strokeStyle = "#FFFFFF";
    ctx.setLineDash([20, 20]);
    for (let y = WATER_HEIGHT + LANE_HEIGHT; y < canvas.height - 60; y += LANE_HEIGHT) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    ctx.setLineDash([]);
}

// Spiellogik
function moveVehicles() {
    vehicles.forEach(vehicle => {
        vehicle.x += vehicle.speed;
        if (vehicle.speed > 0 && vehicle.x > canvas.width) {
            vehicle.x = -vehicle.width;
        } else if (vehicle.speed < 0 && vehicle.x + vehicle.width < 0) {
            vehicle.x = canvas.width;
        }
    });
}

function moveLogs() {
    logs.forEach(log => {
        log.x += log.speed;
        if (log.speed > 0 && log.x > canvas.width) {
            log.x = -log.width;
        } else if (log.speed < 0 && log.x + log.width < 0) {
            log.x = canvas.width;
        }
    });
}

function checkCollisions() {
    // Fahrzeugkollisionen
    for (const vehicle of vehicles) {
        if (
            frog.x < vehicle.x + vehicle.width &&
            frog.x + frog.width > vehicle.x &&
            frog.y < vehicle.y + vehicle.height &&
            frog.y + frog.height > vehicle.y
        ) {
            handleDeath();
            return;
        }
    }

    // Wasserkollision
    if (frog.y < WATER_HEIGHT) {
        let onLog = false;
        for (const log of logs) {
            if (
                frog.x < log.x + log.width &&
                frog.x + frog.width > log.x &&
                frog.y < log.y + log.height &&
                frog.y + frog.height > log.y
            ) {
                onLog = true;
                frog.x += log.speed; // Bewege den Frosch mit dem Stamm
            }
        }
        if (!onLog) {
            handleDeath();
        }
    }

    // Siegbedingung
    if (frog.y < 10) {
        handleWin();
    }
}

function handleDeath() {
    game.lives--;
    document.getElementById('lives').textContent = `Leben: ${game.lives}`;
    
    if (game.lives <= 0) {
        game.gameOver = true;
    } else {
        resetFrog();
    }
}

function handleWin() {
    game.score += 100;
    document.getElementById('score').textContent = `Punkte: ${game.score}`;
    resetFrog();
}

function resetFrog() {
    frog.x = canvas.width / 2 - FROG_SIZE / 2;
    frog.y = canvas.height - FROG_SIZE - 10;
    frog.jumping = false;
    frog.jumpHeight = 0;
}

// Bewegungssteuerung
window.addEventListener("keydown", (e) => {
    if (game.gameOver) return;

    const moveDistance = 40;
    switch(e.key) {
        case "ArrowUp":
            if (frog.y > 0) {
                frog.y -= moveDistance;
                frog.jumping = true;
                frog.jumpHeight = 10;
            }
            break;
        case "ArrowDown":
            if (frog.y + frog.height < canvas.height) {
                frog.y += moveDistance;
                frog.jumping = true;
                frog.jumpHeight = 10;
            }
            break;
        case "ArrowLeft":
            if (frog.x > 0) {
                frog.x -= moveDistance;
                frog.jumping = true;
                frog.jumpHeight = 10;
            }
            break;
        case "ArrowRight":
            if (frog.x + frog.width < canvas.width) {
                frog.x += moveDistance;
                frog.jumping = true;
                frog.jumpHeight = 10;
            }
            break;
    }
});

// Sprunganimation
function updateJump() {
    if (frog.jumping) {
        frog.jumpHeight--;
        if (frog.jumpHeight <= 0) {
            frog.jumping = false;
        }
    }
}

// Spielschleife
function gameLoop() {
    if (game.gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.font = "48px Arial";
        ctx.fillStyle = "red";
        ctx.textAlign = "center";
        ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2);
        
        ctx.font = "24px Arial";
        ctx.fillStyle = "white";
        ctx.fillText(`Endpunktzahl: ${game.score}`, canvas.width / 2, canvas.height / 2 + 40);
        ctx.fillText(`Drücke LEERTASTE zum Neustarten`, canvas.width / 2, canvas.height / 2 + 80);
        return;
    }

    // Spiel-Canvas löschen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Hintergrund zeichnen
    drawBackground();
    drawWater();

    // Spielobjekte aktualisieren und zeichnen
    moveLogs();
    moveVehicles();
    updateJump();
    
    // Baumstämme zeichnen
    logs.forEach(drawLog);
    
    // Fahrzeuge zeichnen
    vehicles.forEach(drawVehicle);
    
    // Frosch zeichnen
    drawFrog();
    
    // Kollisionen überprüfen
    checkCollisions();

    // Nächsten Frame anfordern
    requestAnimationFrame(gameLoop);
}

// Neustart-Funktion
function restartGame() {
    game.lives = 3;
    game.score = 0;
    game.gameOver = false;
    document.getElementById('score').textContent = `Punkte: ${game.score}`;
    document.getElementById('lives').textContent = `Leben: ${game.lives}`;
    resetFrog();
}

// Leertaste zum Neustarten
window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && game.gameOver) {
        restartGame();
        gameLoop();
    }
});

// Spiel starten
gameLoop();