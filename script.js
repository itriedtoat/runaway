const character = document.getElementById('character');
const successMessage = document.getElementById('success-message');
const goAgainButton = document.getElementById('go-again-button');
const mainMenuButton = document.getElementById('main-menu-button');
const mainMenu = document.getElementById('main-menu');
const classicModeBtn = document.getElementById('classic-mode-btn');
const killerModeBtn = document.getElementById('killer-mode-btn');
const tagModeBtn = document.getElementById('tag-mode-btn');
const gameTitle = document.querySelector('h1');
const countdownTimerEl = document.getElementById('countdown-timer');
const stopwatchEl = document.getElementById('stopwatch');

// New Menu Elements
const dateEl = document.getElementById('current-date');
const navBtns = document.querySelectorAll('.nav-btn');
const menuViews = document.querySelectorAll('.menu-view');
const ballColorPicker = document.getElementById('ball-color-picker');
const themeToggle = document.getElementById('theme-toggle');
// New: christmas toggle
const christmasToggle = document.getElementById('christmas-toggle');

// Cheat menu elements
const cheatMenu = document.getElementById('cheat-menu');
const autoFollowCheat = document.getElementById('autofollow-cheat');
const teleportCheatBtn = document.getElementById('teleport-cheat-btn');
const freezeCheat = document.getElementById('freeze-cheat');
const closeCheatMenuBtn = document.getElementById('close-cheat-menu');

// Owner secret menu: open when typing "OWNERSSECRETMENU"
const ownerMenu = document.getElementById('owner-admin-menu');
const closeOwnerBtn = document.getElementById('close-owner-menu');
const adminSearchInput = document.getElementById('admin-search');
const adminSearchBtn = document.getElementById('admin-search-btn');
const adminSearchResult = document.getElementById('admin-search-result');
const adminTargetInput = document.getElementById('admin-target');
const kickBtn = document.getElementById('kick-btn');
const banBtn = document.getElementById('ban-btn');
const adminAutoFollow = document.getElementById('admin-auto-follow');
const adminFreeze = document.getElementById('admin-freeze');
const adminTeleport = document.getElementById('admin-teleport');

const ESCAPE_RADIUS = 150;
let MOVE_SPEED = 10;
let caught = false;
let gameMode = null; // 'classic' or 'killer' or 'tag'
let gameState = 'menu'; // 'menu', 'playing', 'ended'
let mousePosition = { x: 0, y: 0 };
let cheats = {
    autoFollow: false,
    freeze: false,
};
let killerModeActive = false;
let countdownInterval = null;
let stopwatchInterval = null;
let stopwatchStartTime = 0;
let ballColor = '#ff5722';
let lastGameMode = null; // track previous mode

// Triple click detection
let clickCount = 0;
let clickTimer = null;

// Set initial position in the center of the screen
let charX, charY;

let tagInterval = null;
let tagFollow = false;
let tagGameEndTs = 0;
let tagTimerInterval = null;
let inStun = false;

function showMainMenu() {
    gameState = 'menu';
    mainMenu.classList.remove('hidden');
    mainMenu.style.display = 'flex';
    character.classList.add('hidden');
    gameTitle.classList.add('hidden');
    successMessage.classList.add('hidden');
    goAgainButton.classList.add('hidden');
    mainMenuButton.classList.add('hidden');
    countdownTimerEl.classList.add('hidden');
    stopwatchEl.classList.add('hidden');
    document.body.style.cursor = 'default';

    if (countdownInterval) clearInterval(countdownInterval);
    if (stopwatchInterval) clearInterval(stopwatchInterval);
    if (tagInterval) { clearInterval(tagInterval); tagInterval = null; }
    if (tagTimerInterval) { clearInterval(tagTimerInterval); tagTimerInterval = null; }
    tagFollow = false;
    inStun = false;
    killerModeActive = false;
}

function startGame(mode) {
    gameMode = mode;
    lastGameMode = mode; // remember the mode for "Go Again"
    gameState = 'playing';

    mainMenu.classList.add('hidden');
    mainMenu.style.display = 'none';
    character.classList.remove('hidden');
    gameTitle.classList.remove('hidden');

    if (gameMode === 'classic') {
        gameTitle.textContent = "Try to catch it!";
        resetGame();
    } else if (gameMode === 'tag') {
        gameTitle.textContent = "Tag — don't let it hide!";
        resetGame();
        // Start Tag: initial 3s countdown, then 2 minute timer and ball follows player
        startTagInitialCountdown();
    } else {
        gameTitle.textContent = "Try to survive!";
        killerModeActive = false;
        resetGame();
        startKillerCountdown();
    }
    
    // Reset cheats
    autoFollowCheat.checked = false;
    freezeCheat.checked = false;
    cheats.autoFollow = false;
    cheats.freeze = false;
}

function resetGame() {
    caught = false;
    successMessage.classList.add('hidden');
    goAgainButton.classList.add('hidden');
    mainMenuButton.classList.add('hidden');
    character.style.backgroundColor = gameMode === 'classic' ? ballColor : (gameMode === 'tag' ? '#9C27B0' : '#d32f2f');
    document.body.style.cursor = 'pointer';

    charX = window.innerWidth / 2;
    charY = window.innerHeight / 2;

    character.style.left = `${charX}px`;
    character.style.top = `${charY}px`;

    if (gameState === 'ended') {
        gameState = 'playing';
    }
    // clear tag interval when resetting to ensure it restarts cleanly
    if (gameMode !== 'tag' && tagInterval) { clearInterval(tagInterval); tagInterval = null; }
}

function startKillerCountdown() {
    let count = 5;
    countdownTimerEl.textContent = count;
    countdownTimerEl.classList.remove('hidden');
    countdownTimerEl.style.top = `${parseFloat(character.style.top) + 60}px`;

    countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownTimerEl.textContent = count;
        } else {
            clearInterval(countdownInterval);
            countdownTimerEl.classList.add('hidden');
            killerModeActive = true;
            startStopwatch();
        }
    }, 1000);
}

function startStopwatch() {
    stopwatchStartTime = Date.now();
    // Position & show stopwatch for Ball Killer mode (top-left)
    stopwatchEl.style.top = '16px';
    stopwatchEl.style.left = '16px';
    stopwatchEl.classList.remove('hidden');

    // Use a slightly coarser update interval (10ms is overkill) but keep smoothness
    stopwatchInterval = setInterval(() => {
        const elapsedMs = Date.now() - stopwatchStartTime;
        const minutes = Math.floor(elapsedMs / 60000);
        const seconds = Math.floor((elapsedMs % 60000) / 1000);
        const centiseconds = Math.floor((elapsedMs % 1000) / 10);
        // Format mm:ss.cc
        const formatted = `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}.${centiseconds.toString().padStart(2,'0')}`;
        stopwatchEl.textContent = formatted;
    }, 50);
}

function checkCollision(mouseX, mouseY) {
    if (gameState !== 'playing') return false;

    const charRect = character.getBoundingClientRect();
    const charCenterX = charRect.left + charRect.width / 2;
    const charCenterY = charRect.top + charRect.height / 2;
    const characterRadius = charRect.width / 2;

    const deltaX = mouseX - charCenterX;
    const deltaY = mouseY - charCenterY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    return distance < characterRadius;
}

function endGame() {
    gameState = 'ended';
    successMessage.classList.remove('hidden');
    goAgainButton.classList.remove('hidden');
    mainMenuButton.classList.remove('hidden');
    document.body.style.cursor = 'default';
    if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
    }
    // hide stopwatch when a game ends
    stopwatchEl.classList.add('hidden');
    
    if (gameMode === 'classic') {
        successMessage.textContent = "GOOD JOB YOU SUCCESSFULLY TOUCHED IT!";
        character.style.backgroundColor = '#4CAF50';
    } else {
        successMessage.textContent = "THE BALL SUCCESSFULLY TOUCHED YOUR CURSOR!";
        character.style.backgroundColor = '#424242';
    }
}

function gameLoop() {
    if (gameState !== 'playing') return;

    const { x: mouseX, y: mouseY } = mousePosition;

    // Check collision first
    if (checkCollision(mouseX, mouseY)) {
        // Classic/Killer behavior: end immediately
        if (gameMode === 'classic' || (gameMode === 'killer' && killerModeActive)) {
            endGame();
            return;
        }
        // Tag behavior: start a 3s "tagged" countdown but do not end the game;
        if (gameMode === 'tag' && !inStun) {
            startStunCountdown();
        }
    }
    
    if (cheats.freeze || inStun) return; // Don't move if frozen or stunned

    if (cheats.autoFollow && gameMode === 'classic') {
         // In auto-follow cheat, we simulate the "killer" mode logic to move towards the mouse
        const shouldMove = true;
        const direction = 1;
        moveCharacter(mouseX, mouseY, shouldMove, direction);
    } else {
        const charRect = character.getBoundingClientRect();
        const charCenterX = charRect.left + charRect.width / 2;
        const charCenterY = charRect.top + charRect.height / 2;
        
        const deltaX = mouseX - charCenterX;
        const deltaY = mouseY - charCenterY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        const isKillerModeReady = gameMode === 'killer' && killerModeActive;
        const shouldMove = (gameMode === 'classic' && distance < ESCAPE_RADIUS) || isKillerModeReady || (gameMode === 'tag' && tagFollow);
        // Tag mode: ball follows player (towards mouse)
        const direction = gameMode === 'classic' ? -1 : 1;
        const originalSpeed = MOVE_SPEED;
        if (gameMode === 'tag') {
            // slightly faster in tag follow
            MOVE_SPEED = 14;
        }
        
        moveCharacter(mouseX, mouseY, shouldMove, direction);
        if (gameMode === 'tag') MOVE_SPEED = originalSpeed;
    }
    
    requestAnimationFrame(gameLoop);
}

function moveCharacter(targetX, targetY, shouldMove, direction) {
    if (!shouldMove) return;

    const charRect = character.getBoundingClientRect();
    const charCenterX = charRect.left + charRect.width / 2;
    const charCenterY = charRect.top + charRect.height / 2;

    const deltaX = targetX - charCenterX;
    const deltaY = targetY - charCenterY;

    const angle = Math.atan2(deltaY, deltaX);

    const moveX = Math.cos(angle) * MOVE_SPEED * direction;
    const moveY = Math.sin(angle) * MOVE_SPEED * direction;
    
    let newX = parseFloat(character.style.left) + moveX;
    let newY = parseFloat(character.style.top) + moveY;

    const charWidth = charRect.width;
    const charHeight = charRect.height;
    
    const minX = charWidth / 2;
    const maxX = window.innerWidth - charWidth / 2;
    const minY = charHeight / 2;
    const maxY = window.innerHeight - charHeight / 2;

    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));

    character.style.left = `${newX}px`;
    character.style.top = `${newY}px`;
}

document.addEventListener('mousemove', (e) => {
    mousePosition.x = e.clientX;
    mousePosition.y = e.clientY;
});

// Triple click handler
document.addEventListener('click', () => {
    clickCount++;
    if (clickCount === 1) {
        clickTimer = setTimeout(() => {
            clickCount = 0;
        }, 400); // 400ms window for triple click
    } else if (clickCount === 3) {
        clearTimeout(clickTimer);
        clickCount = 0;
        // Do not allow opening the cheat menu if the owner admin menu is visible while in classic mode
        if (!(ownerMenu && !ownerMenu.classList.contains('hidden') && gameMode === 'classic')) {
            if(gameState === 'playing') {
                cheatMenu.classList.toggle('hidden');
            }
        }
    }
});

// Recenter the character if the window is resized
window.addEventListener('resize', () => {
    if (gameState !== 'playing') return;
    charX = window.innerWidth / 2;
    charY = window.innerHeight / 2;
    character.style.left = `${charX}px`;
    character.style.top = `${charY}px`;
});

goAgainButton.addEventListener('click', () => {
    if (lastGameMode && gameState === 'ended') {
        // restart the previous gamemode
        startGame(lastGameMode);
        requestAnimationFrame(gameLoop);
    } else {
        showMainMenu();
    }
});

mainMenuButton.addEventListener('click', showMainMenu);

classicModeBtn.addEventListener('click', () => {
    startGame('classic');
    requestAnimationFrame(gameLoop);
});

killerModeBtn.addEventListener('click', () => {
    startGame('killer');
    requestAnimationFrame(gameLoop);
});

tagModeBtn.addEventListener('click', () => {
    startGame('tag');
    requestAnimationFrame(gameLoop);
});

// Cheat Menu Logic
closeCheatMenuBtn.addEventListener('click', () => {
    cheatMenu.classList.add('hidden');
});

autoFollowCheat.addEventListener('change', () => {
    cheats.autoFollow = autoFollowCheat.checked;
});

freezeCheat.addEventListener('change', () => {
    cheats.freeze = freezeCheat.checked;
});

teleportCheatBtn.addEventListener('click', () => {
    if (gameState !== 'playing') return;
    character.style.left = `${mousePosition.x}px`;
    character.style.top = `${mousePosition.y}px`;
    // Use a small timeout to allow the physics engine to detect collision on the next frame
    setTimeout(() => {
        if (checkCollision(mousePosition.x, mousePosition.y)) {
            endGame();
        }
    }, 50);
});

// --- New Menu Logic ---

// Set current date
dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// Menu navigation
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Update button active state
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Show the target view
        const targetId = btn.dataset.target;
        menuViews.forEach(view => {
            if (view.id === targetId) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });
    });
});

// Ball color customization
ballColorPicker.addEventListener('input', (e) => {
    ballColor = e.target.value;
    // You can optionally apply this to the logo or another element for preview
    document.getElementById('logo').style.backgroundColor = ballColor;
});
document.getElementById('logo').style.backgroundColor = ballColor; // Initial color

// Theme toggle (light/dark mode)
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});

// Persisted Christmas theme load
(function loadChristmasPref(){
    const val = localStorage.getItem('christmas_theme_enabled');
    if (val === 'true') {
        document.body.classList.add('christmas');
        if (christmasToggle) christmasToggle.checked = true;
    } else {
        if (christmasToggle) christmasToggle.checked = false;
    }
})();

if (christmasToggle) {
    christmasToggle.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        if (enabled) document.body.classList.add('christmas');
        else document.body.classList.remove('christmas');
        localStorage.setItem('christmas_theme_enabled', enabled ? 'true' : 'false');
    });
}

// Ensure a persistent "join" timestamp (first time visiting the game)
function getOrCreateJoinTime() {
    let joinTs = localStorage.getItem('game_join_time');
    if (!joinTs) {
        joinTs = Date.now().toString();
        localStorage.setItem('game_join_time', joinTs);
    }
    return parseInt(joinTs, 10);
}

function formatDateTime(ts) {
    const d = new Date(ts);
    return d.toLocaleString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

// Owner secret menu: open when typing "OWNERSSECRETMENU"
let secretBuffer = '';
const SECRET = 'OWNERSSECRETMENU';

function openOwnerMenu() {
    ownerMenu.classList.remove('hidden');
    ownerMenu.setAttribute('aria-hidden','false');
}
function closeOwnerMenu() {
    ownerMenu.classList.add('hidden');
    ownerMenu.setAttribute('aria-hidden','true');
}

document.addEventListener('keydown', (e) => {
    // build buffer from printable characters only
    if (e.key.length === 1) {
        secretBuffer += e.key.toUpperCase();
        if (secretBuffer.endsWith(SECRET)) {
            openOwnerMenu();
            secretBuffer = '';
        }
        // keep buffer reasonable length
        if (secretBuffer.length > 64) secretBuffer = secretBuffer.slice(-64);
    }
});

// Close button
closeOwnerBtn.addEventListener('click', closeOwnerMenu);

// Admin search: mock user lookup
adminSearchBtn.addEventListener('click', () => {
    const name = adminSearchInput.value.trim();
    if (!name) {
        adminSearchResult.textContent = 'Enter a username to search.';
        return;
    }
    // Show special owner label for 2beforgetton
    const displayLabel = name.toLowerCase() === '2beforgetton' ? 'Found (Owner aka You)' : 'Found (mock)';
    adminSearchResult.innerHTML = `<div><strong>@${name}</strong> — ${displayLabel}</div>
        <div style="margin-top:6px;">Followers: 0 · Joined: ${formatDateTime(getOrCreateJoinTime())}</div>`;
});

// Moderation actions (mock)
function showAdminNotice(msg) {
    adminSearchResult.innerHTML = `<div style="color:#c00;font-weight:700;">${msg}</div>`;
}

kickBtn.addEventListener('click', () => {
    const target = adminTargetInput.value.trim();
    if (!target) { showAdminNotice('Enter target username'); return; }
    showAdminNotice(`Kicked @${target} (mock)`);
});

banBtn.addEventListener('click', () => {
    const target = adminTargetInput.value.trim();
    if (!target) { showAdminNotice('Enter target username'); return; }
    showAdminNotice(`Banned @${target} (mock)`);
});

// Wire admin cheat toggles to existing cheat state
adminAutoFollow.addEventListener('change', (e) => {
    cheats.autoFollow = e.target.checked;
    autoFollowCheat.checked = e.target.checked;
});
adminFreeze.addEventListener('change', (e) => {
    cheats.freeze = e.target.checked;
    freezeCheat.checked = e.target.checked;
});
adminTeleport.addEventListener('click', () => {
    if (gameState !== 'playing') return;
    character.style.left = `${mousePosition.x}px`;
    character.style.top = `${mousePosition.y}px`;
    setTimeout(() => { if (checkCollision(mousePosition.x, mousePosition.y)) endGame(); }, 50);
});

// Tag-specific helpers
function startTagInitialCountdown() {
    // show 3s countdown before ball starts following
    let count = 3;
    countdownTimerEl.textContent = count;
    countdownTimerEl.classList.remove('hidden');
    tagFollow = false;
    if (tagInterval) clearInterval(tagInterval);
    tagInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownTimerEl.textContent = count;
        } else {
            clearInterval(tagInterval);
            countdownTimerEl.classList.add('hidden');
            tagFollow = true;
            // start 2-minute game timer
            tagGameEndTs = Date.now() + 2 * 60 * 1000;
            startTagGameTimer();
        }
    }, 1000);
}

function startTagGameTimer() {
    // Show remaining time in stopwatchEl as MM:SS
    stopwatchEl.classList.remove('hidden');
    if (tagTimerInterval) clearInterval(tagTimerInterval);
    tagTimerInterval = setInterval(() => {
        const remaining = Math.max(0, tagGameEndTs - Date.now());
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        stopwatchEl.textContent = `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
        if (remaining <= 0) {
            clearInterval(tagTimerInterval);
            // time up -> end game as failure (ball wins)
            endGame();
        }
    }, 250);
}

function startStunCountdown() {
    // Player was touched: begin 3s stun countdown but keep tag timer running
    inStun = true;
    let count = 3;
    countdownTimerEl.textContent = count;
    countdownTimerEl.classList.remove('hidden');
    const stunInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownTimerEl.textContent = count;
        } else {
            clearInterval(stunInterval);
            countdownTimerEl.classList.add('hidden');
            inStun = false;
        }
    }, 1000);
}

// Click handling: allow tagging the ball in tag mode (click while colliding -> end game)
document.addEventListener('mousedown', (e) => {
    // ensure normal triple-click logic remains; this is single-click tag detection
    if (gameState === 'playing' && gameMode === 'tag') {
        if (checkCollision(mousePosition.x, mousePosition.y)) {
            // Player clicked while colliding -> they "tag" the ball and win/end the game
            endGame();
        }
    }
});

// Initial setup
showMainMenu();
