/**
 * Konfiguration & Konstanten
 */
const STORAGE_KEY = 'browsergame_data_pyramid_v3';
const PIXELS_PER_METER = 3779; 
const CLICK_COOLDOWN_MS = 500; 

// PYRAMIDEN-BALANCING
const BOX_LIMITS = [500, 100, 50, 20, 5, 999999];

const translations = {
    de: {
        totalScore: "Gesamtpunktestand", 
        stone: "Stein", wood: "Holz", copper: "Kupfer",
        silver: "Silber", gold: "Gold", rhodium: "Rhodium",
        clickBtn: "KLICK!",
        cookieMsg: "Wir speichern deinen Fortschritt lokal auf diesem Gerät.",
        cookieBtn: "Alles klar",
        
        titleInfo: "SPIELREGELN",
        titleStats: "DEINE STATISTIK",
        statClicks: "Klicks", statMouse: "Strecke", statActive: "Zeit (Aktiv)", statOffline: "Zeit (Offline)", statCoins: "Münzen",
        
        lblCurrent: "Aktuell:",
        lblNextIn: "Nächste +1 in:",
        lblGoal: "Ziel:",
        lblDate: "Letzte Erhöhung:",
        valInfinite: "Unendlich",
        valMouse: "Maus/Klick",
        valNever: "Noch nie",

        // Modal Texte
        modalWelcomeBack: "Willkommen zurück!",
        modalOfflineTime: "Du warst weg für:",
        modalOfflineEarned: "In dieser Zeit gesammelt:",
        modalPoints: "Punkte",
        modalClose: "Super!",
        modalImpressumTitle: "IMPRESSUM",

        footerText: 'Points - Das Langzeit-Browsergame (c) 2026 <a href="mailto:datenschrauber@gmail.com">Datenschrauber</a> / M. Fenner',
        btnReset: "Zurücksetzen",
        btnYouTube: "YouTube",
        btnImpressum: "Impressum",
        
        // Counter Text
        counterText: "Spieler seit dem",
        
        resetConfirm: "Möchtest du wirklich den kompletten Spielstand löschen? Dies kann nicht rückgängig gemacht werden.",

        info: `
            • <span>1 Pkt</span> pro Klick<br>
            • <span>2 Pkt</span> / Min. (Aktiv)<br>
            • <span>3 Pkt</span> / Meter Maus<br>
            • <span>10 Pkt</span> / Std. (Offline)<br>
            • <span>Multiplikator:</span> Steigt bei Level-Up!<br>
            • Klicke auf Boxen für Details.
        `
    },
    en: {
        totalScore: "Total Score",
        stone: "Stone", wood: "Wood", copper: "Copper",
        silver: "Silver", gold: "Gold", rhodium: "Rhodium",
        clickBtn: "CLICK!",
        cookieMsg: "We save your progress locally on this device.",
        cookieBtn: "Got it",
        titleInfo: "GAME RULES", titleStats: "YOUR STATS",
        statClicks: "Clicks", statMouse: "Distance", statActive: "Time (Active)", statOffline: "Time (Offline)", statCoins: "Coins",
        
        lblCurrent: "Current:",
        lblNextIn: "Next +1 in:",
        lblGoal: "Goal:",
        lblDate: "Last Increase:",
        valInfinite: "Infinite",
        valMouse: "Mouse/Click",
        valNever: "Never",

        modalWelcomeBack: "Welcome Back!",
        modalOfflineTime: "You were away for:",
        modalOfflineEarned: "Earned while away:",
        modalPoints: "Points",
        modalClose: "Awesome!",
        modalImpressumTitle: "IMPRINT",

        footerText: 'Points - The Long-Term Browser Game (c) 2026 <a href="mailto:datenschrauber@gmail.com">Datenschrauber</a> / M. Fenner',
        btnReset: "Reset",
        btnYouTube: "YouTube",
        btnImpressum: "Imprint",

        // Counter Text
        counterText: "Players since",

        resetConfirm: "Do you really want to delete your entire progress? This cannot be undone.",

        info: `
            • <span>1 Pt</span> per Click<br>
            • <span>2 Pts</span> / Min. (Active)<br>
            • <span>3 Pts</span> / meter Mouse<br>
            • <span>10 Pts</span> / Hr. (Offline)<br>
            • <span>Multiplier:</span> Increases on Level-Up!<br>
            • Click boxes for details.
        `
    }
};

let gameState = {
    resources: [0, 0, 0, 0, 0, 0], 
    lastIncreaseTimes: [0, 0, 0, 0, 0, 0],
    lastSaveTime: Date.now(),
    cookieAccepted: false,
    fractionalPoints: 0,
    language: 'de',
    lastRareCoinTime: 0,
    stats: {
        clicks: 0,
        playTimeSec: 0,
        distanceMeters: 0,
        offlineHours: 0, 
        coinsClicked: 0
    }
};

let showDetails = [false, false, false, false, false, false];
let lastMouseX = 0;
let lastMouseY = 0;
let accumulatedDistance = 0;
let isClickCooldown = false;
let lastTitleUpdateTime = 0;

// NEU: Variable um den Loop zu steuern
let gameInterval; 

window.onload = function() {
    loadGame();
    updateTexts();
    
    if (!gameState.cookieAccepted) {
        document.getElementById('cookie-overlay').style.display = 'flex';
    } else {
        calculateOfflineProgress();
    }

    setupEventListeners();
    
    // NEU: Dem Loop eine Variable zuweisen, damit wir ihn stoppen können
    gameInterval = setInterval(gameLoop, 1000); 
    
    scheduleNextCoin();
    updateDisplay();
};

function toggleLanguage() {
    gameState.language = gameState.language === 'de' ? 'en' : 'de';
    updateTexts();
    saveGame();
    updateDisplay();
}

function updateTexts() {
    const t = translations[gameState.language];
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.innerText = t[key];
    });

    document.getElementById('info-text').innerHTML = t.info;
    document.getElementById('footer-text').innerHTML = t.footerText;
    document.getElementById('cookie-text').innerText = t.cookieMsg;
    document.getElementById('cookie-btn').innerText = t.cookieBtn;
    
    document.getElementById('counter-text').innerText = t.counterText;
}

function toggleBoxDetails(index) {
    showDetails[index] = !showDetails[index];
    updateDisplay();
}

function getMultiplier() {
    if (gameState.resources[4] > 0) return 500.0; // Gold
    if (gameState.resources[3] > 0) return 100.0; // Silber
    if (gameState.resources[2] > 0) return 25.0;  // Kupfer
    if (gameState.resources[1] > 0) return 5.0;   // Holz
    return 1.0; // Nur Stein
}

function manualClick() {
    if (!gameState.cookieAccepted) return;
    if (isClickCooldown) return;

    addPoints(1);
    gameState.stats.clicks++;
    
    isClickCooldown = true;
    const btn = document.getElementById('click-btn');
    btn.classList.add('disabled');

    setTimeout(() => {
        isClickCooldown = false;
        btn.classList.remove('disabled');
    }, CLICK_COOLDOWN_MS);
    updateDisplay();
}

// NEU: Korrigierte Reset Funktion
function resetGame() {
    const t = translations[gameState.language];
    if (confirm(t.resetConfirm)) {
        // 1. Stoppe den automatischen Speicher-Loop
        clearInterval(gameInterval);
        
        // 2. Lösche den Speicher
        localStorage.removeItem(STORAGE_KEY);
        
        // 3. Setze den lokalen Status sicherheitshalber zurück, falls der Reload verzögert
        gameState = { resources: [0,0,0,0,0,0], stats: {} };
        
        // 4. Seite neu laden
        location.reload();
    }
}

function openYouTube() {
    window.open('http://www.youtube.com/@Datenschrauber', '_blank');
}

function openImpressum() {
    document.getElementById('impressum-modal').style.display = 'flex';
}

function closeImpressum() {
    document.getElementById('impressum-modal').style.display = 'none';
}

function saveGame() {
    gameState.lastSaveTime = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
}

function loadGame() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            gameState = { 
                ...gameState, 
                ...parsed, 
                stats: { ...gameState.stats, ...(parsed.stats || {}) },
                lastIncreaseTimes: parsed.lastIncreaseTimes || [0,0,0,0,0,0]
            };
        } catch (e) { console.error(e); }
    }
}

function acceptCookies() {
    gameState.cookieAccepted = true;
    gameState.lastSaveTime = Date.now(); 
    document.getElementById('cookie-overlay').style.display = 'none';
    saveGame();
}

function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    const pad = (num) => num.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function calculateOfflineProgress() {
    const now = Date.now();
    if (!gameState.lastSaveTime) return;

    const diffMs = now - gameState.lastSaveTime;
    const diffSeconds = Math.floor(diffMs / 1000);
    const hoursPassed = diffMs / (1000 * 60 * 60);
    const pointsEarned = Math.floor(hoursPassed * 10);

    if (pointsEarned > 0 || diffSeconds > 10) {
        if (pointsEarned > 0) {
            addPoints(pointsEarned);
        }
        gameState.stats.offlineHours += hoursPassed;
        
        document.getElementById('modal-time-val').innerText = formatTime(diffSeconds);
        document.getElementById('modal-points-val').innerText = pointsEarned.toLocaleString();
        const modal = document.getElementById('offline-modal');
        if (modal) modal.style.display = 'flex';
    }
}

function closeOfflineModal() {
    document.getElementById('offline-modal').style.display = 'none';
}

function gameLoop() {
    if (!gameState.cookieAccepted) return;
    const mult = getMultiplier();
    const pointsPerSecond = (2 / 60) * mult; 
    gameState.fractionalPoints += pointsPerSecond;
    gameState.stats.playTimeSec += 1;

    if (gameState.fractionalPoints >= 1) {
        const wholePoints = Math.floor(gameState.fractionalPoints);
        addPoints(wholePoints);
        gameState.fractionalPoints -= wholePoints;
    }
    saveGame();
    updateDisplay();
}

function setupEventListeners() {
    document.addEventListener('mousemove', (e) => {
        if (!gameState.cookieAccepted) return;
        if (lastMouseX === 0 && lastMouseY === 0) {
            lastMouseX = e.clientX; lastMouseY = e.clientY; return;
        }
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        accumulatedDistance += distance;

        if (accumulatedDistance >= PIXELS_PER_METER) {
            const meters = Math.floor(accumulatedDistance / PIXELS_PER_METER);
            const mult = getMultiplier();
            addPoints(meters * 3 * mult); 
            gameState.stats.distanceMeters += meters;
            accumulatedDistance %= PIXELS_PER_METER;
        }
        lastMouseX = e.clientX; lastMouseY = e.clientY;
    });
}

function addPoints(amount) {
    gameState.resources[0] += amount;
    checkOverflow();
}

function checkOverflow() {
    let overflowOccurred = true;
    while (overflowOccurred) {
        overflowOccurred = false;
        for (let i = 0; i < 5; i++) { 
            const limit = BOX_LIMITS[i];
            if (gameState.resources[i] >= limit) {
                const overflow = gameState.resources[i] - limit;
                gameState.resources[i] = overflow;
                gameState.resources[i + 1] += 1;
                gameState.lastIncreaseTimes[i + 1] = Date.now();
                overflowOccurred = true; 
            }
        }
    }
}

function formatDate(timestamp) {
    if (!timestamp || timestamp === 0) return translations[gameState.language].valNever;
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function updateDisplay() {
    const t = translations[gameState.language];
    
    for (let i = 0; i < 6; i++) {
        const valEl = document.getElementById(`val-${i}`);
        const detailEl = document.getElementById(`detail-${i}`);
        
        if (!showDetails[i]) {
            valEl.style.display = 'block';
            detailEl.style.display = 'none';
            valEl.innerText = Math.floor(gameState.resources[i]);
        } else {
            valEl.style.display = 'none';
            detailEl.style.display = 'block';

            const currentVal = Math.floor(gameState.resources[i]);
            let prevNeeded = t.valMouse;
            
            if (i > 0) {
                const prevBoxLimit = BOX_LIMITS[i-1];
                const prevBoxCurrent = gameState.resources[i-1];
                const resKeys = ["stone", "wood", "copper", "silver", "gold", "rhodium"];
                prevNeeded = Math.max(0, prevBoxLimit - prevBoxCurrent) + " " + t[resKeys[i-1]];
            }

            let goalVal = (i < 5) ? BOX_LIMITS[i] : t.valInfinite;
            const dateStr = formatDate(gameState.lastIncreaseTimes[i]);

            detailEl.innerHTML = `
                <ul>
                    <li><span>${t.lblCurrent}</span> <span class="detail-val">${currentVal}</span></li>
                    <li><span>${t.lblNextIn}</span> <span class="detail-val">${prevNeeded}</span></li>
                    <li><span>${t.lblGoal}</span> <span class="detail-val">${goalVal}</span></li>
                    <li><span>${t.lblDate}</span> <br><span style="color:#888; font-size:0.75em">${dateStr}</span></li>
                </ul>
            `;
        }
    }

    let totalScore = 0;
    const values = [1, 500, 50000, 2500000, 50000000, 250000000];
    for (let i = 0; i < 6; i++) {
        totalScore += gameState.resources[i] * values[i];
    }
    
    const loc = gameState.language === 'de' ? 'de-DE' : 'en-US';
    
    document.getElementById('total-score').innerHTML = 
        `<span class="score-val">${totalScore.toLocaleString(loc)}</span> <span class="score-lbl">POINTS</span>`;

    const titleText = `${totalScore.toLocaleString(loc)} POINTS`;
    if (!document.hidden) {
        document.title = titleText;
    } else {
        const now = Date.now();
        if (now - lastTitleUpdateTime > 30000) {
            document.title = titleText;
            lastTitleUpdateTime = now;
        }
    }

    document.getElementById('s-clicks').innerText = gameState.stats.clicks.toLocaleString(loc);
    document.getElementById('s-dist').innerText = gameState.stats.distanceMeters.toLocaleString(loc) + " m";
    document.getElementById('s-active').innerText = formatTime(gameState.stats.playTimeSec);
    const offlineSeconds = Math.floor(gameState.stats.offlineHours * 3600);
    document.getElementById('s-offline').innerText = formatTime(offlineSeconds);
    document.getElementById('s-coins').innerText = gameState.stats.coinsClicked.toLocaleString(loc);
}

function scheduleNextCoin() {
    const minTime = 30000; 
    const maxTime = 120000;
    const randomTime = Math.floor(Math.random() * (maxTime - minTime + 1) + minTime);
    setTimeout(() => { spawnCoin(); scheduleNextCoin(); }, randomTime);
}

function spawnCoin() {
    if (document.hidden) return;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    let isRare = false;
    let value = 0;
    const mult = getMultiplier();

    if (now - gameState.lastRareCoinTime > oneDay) {
        isRare = true;
        value = 100 * mult; 
        gameState.lastRareCoinTime = now;
        saveGame();
    } else {
        value = (Math.floor(Math.random() * (50 - 5 + 1)) + 5) * mult;
    }

    const coin = document.createElement('div');
    coin.className = isRare ? 'coin rare' : 'coin';
    coin.innerText = Math.floor(value);
    
    const maxX = window.innerWidth - 80;
    const maxY = window.innerHeight - 80;
    coin.style.left = Math.floor(Math.random() * maxX) + 'px';
    coin.style.top = Math.floor(Math.random() * maxY) + 'px';

    coin.onclick = function() {
        addPoints(value);
        gameState.stats.coinsClicked++;
        coin.classList.add('coin-vanish');
        setTimeout(() => { if (coin.parentNode) coin.parentNode.removeChild(coin); }, 500);
    };

    document.body.appendChild(coin);
    const lifetime = isRare ? 6000 : 4000;
    setTimeout(() => {
        if (coin.parentNode && !coin.classList.contains('coin-vanish')) coin.parentNode.removeChild(coin);
    }, lifetime);
}
