/**
 * Monster Drag to Catch - Core Gameplay Script (GSAP Draggable Version)
 */

// Game variables
let score = 0;
let caughtCount = 0;
let timeLeft = 15;
let isGameOver = false;
let collisionFrameId = null;
let timerIntervalId = null;

let basketX = 0;
let basketDraggable = null; // GSAP Draggable instance

// Element lists
const basketElements = [
  '#Half_Basket', 
  '#a2e54f24-5b7b-4695-be49-bdbb6852ffdc_removalai_preview_1', 
  '#InBasket1', 
  '#InBasket2', 
  '#InBasket3', 
  '#Inbasket4', 
  '#InBasket5'
];
const fallingBottles = ['#fall1', '#fall2', '#fall3', '#fall4', '#fall5'];
const inBasketBottles = ['#InBasket1', '#InBasket2', '#InBasket3', '#Inbasket4', '#InBasket5'];
const caughtStates = [false, false, false, false, false];

// Setup GWD Page listeners
document.addEventListener('DOMContentLoaded', () => {
  // Register GSAP Draggable Plugin
  if (window.gsap && window.Draggable) {
    gsap.registerPlugin(Draggable);
  }

  const page1 = document.getElementById('page1');
  const page1_1 = document.getElementById('page1_1');
  const page1_2 = document.getElementById('page1_2');

  if (page1_1) {
    page1_1.addEventListener('pageactivated', startGame);
  }
  if (page1_2) {
    page1_2.addEventListener('pageactivated', startRevealPage);
  }
  if (page1) {
    page1.addEventListener('pageactivated', resetGameToStart);
  }

  // Initial setup for touch controls on game page
  if (page1_1) {
    setupDragging(page1_1);
  }
});

// Setup dragging interaction using GSAP Draggable
function setupDragging(gamePage) {
  if (!window.Draggable) {
    console.warn("GSAP Draggable is not loaded!");
    return;
  }

  const basket = document.getElementById('Half_Basket');
  if (!basket) return;

  // Create Draggable instance
  const instances = Draggable.create('#Half_Basket', {
    type: 'x',
    trigger: gamePage, // Dragging anywhere on page1_1 controls the basket
    bounds: { minX: -150, maxX: 150 },
    inertia: false,
    onDrag: function() {
      const currentX = this.x;
      basketX = currentX;

      // Sync all other basket layers and caught bottles to the exact same translation
      const syncElements = [
        '#a2e54f24-5b7b-4695-be49-bdbb6852ffdc_removalai_preview_1',
        '#InBasket1',
        '#InBasket2',
        '#InBasket3',
        '#Inbasket4',
        '#InBasket5'
      ];
      gsap.set(syncElements, { x: currentX });
    }
  });

  basketDraggable = instances[0];
  
  // Disable initially until page1_1 activates
  if (basketDraggable) {
    basketDraggable.disable();
  }
}

// Start/Reset Game state when page1_1 is activated
function startGame() {
  // Clear any existing loops/intervals
  stopGameLoops();

  // Reset variables
  score = 0;
  caughtCount = 0;
  timeLeft = 15;
  isGameOver = false;
  basketX = 0;
  caughtStates.fill(false);

  // Reset UI
  updateScoreUI();
  updateTimerUI();

  // Reset positions and opacities of basket elements
  gsap.set(basketElements, { x: 0 });
  gsap.set(inBasketBottles, { opacity: 0 });
  gsap.set(fallingBottles, { opacity: 1 });

  // Enable and update Draggable state
  if (basketDraggable) {
    basketDraggable.enable();
    basketDraggable.update();
  }

  // Start Loops
  startTimer();
  collisionFrameId = requestAnimationFrame(collisionLoop);
}

function updateScoreUI() {
  const score1 = document.getElementById('score_1');
  if (score1) score1.innerText = "SCORE: " + score;
  
  const score2 = document.getElementById('score_2');
  if (score2) score2.innerText = "SCORE: " + score;
}

function updateTimerUI() {
  const counter1 = document.getElementById('counter_1');
  if (counter1) counter1.innerText = "TIME: " + timeLeft;
}

// Timer Countdown
function startTimer() {
  timerIntervalId = setInterval(() => {
    if (isGameOver) return;
    timeLeft--;
    updateTimerUI();

    if (timeLeft <= 0) {
      gameOver();
    }
  }, 1000);
}

// Collision detection loop
function collisionLoop() {
  if (isGameOver) return;

  const basketEl = document.getElementById('Half_Basket');
  if (!basketEl) {
    collisionFrameId = requestAnimationFrame(collisionLoop);
    return;
  }
  const basketRect = basketEl.getBoundingClientRect();

  fallingBottles.forEach((id, index) => {
    if (caughtStates[index]) return;

    const bottleEl = document.querySelector(id);
    if (!bottleEl) return;

    // Check if the bottle is currently visible (GWD sets opacity to 0 or starts animation)
    const style = window.getComputedStyle(bottleEl);
    if (style.opacity === '0' || style.visibility === 'hidden') {
      return;
    }

    const bottleRect = bottleEl.getBoundingClientRect();

    // Check overlap
    if (checkOverlap(bottleRect, basketRect)) {
      catchBottle(index, id);
    }
  });

  collisionFrameId = requestAnimationFrame(collisionLoop);
}

// Check overlapping rectangles with a tighter, more realistic collision window
function checkOverlap(rect1, rect2) {
  // Calculate horizontal centers
  const bottleWidth = rect1.right - rect1.left;
  const bottleCenter = rect1.left + bottleWidth / 2;

  // The basket's visual catching area is centered (exclude outer handle margins)
  // Basket width is 252px, active area is centered leaving a 35px margin on each side
  const horizontalOverlap = (bottleCenter >= rect2.left + 35) && (bottleCenter <= rect2.right - 35);
  
  // Vertically, trigger only when the bottle's bottom edge has entered deeper into the basket
  // (between 75px deep and the bottom of the basket)
  const verticalOverlap = (rect1.bottom >= rect2.top + 75 && rect1.bottom <= rect2.bottom);

  return horizontalOverlap && verticalOverlap;
}

// Handle catching a bottle
function catchBottle(index, id) {
  caughtStates[index] = true;
  caughtCount++;
  score += 10;

  updateScoreUI();

  const fallEl = document.querySelector(id);
  const gamePage = document.getElementById('page1_1');

  // Trigger dynamic JavaScript particle slime splash
  if (fallEl && gamePage) {
    const rect = fallEl.getBoundingClientRect();
    const pageRect = gamePage.getBoundingClientRect();
    
    if (pageRect.width > 0) {
      const scaleX = pageRect.width / 320;
      
      // Calculate coordinates relative to the 320x480 container
      const localLeft = (rect.left - pageRect.left) / scaleX;
      const localTop = (rect.top - pageRect.top) / scaleX;
      
      // Center of the splash is at bottom-middle of the bottle
      const centerX = localLeft + 36;
      const centerY = localTop + 85; 
      
      createSlimeSplash(centerX, centerY, gamePage);
    }
  }

  // Hide the falling bottle animation
  if (fallEl) {
    gsap.to(fallEl, { opacity: 0, duration: 0.1 });
  }

  // Show the corresponding bottle inside the basket
  const inBasketId = inBasketBottles[index];
  const inBasketEl = document.querySelector(inBasketId);
  if (inBasketEl) {
    gsap.to(inBasketEl, { opacity: 1, duration: 0.2 });
  }

  // Win condition if all 5 are caught
  if (caughtCount === 5) {
    winGame();
  }
}

// Generates a dynamic slime particle explosion using pure CSS and GSAP
function createSlimeSplash(x, y, container) {
  // 1. Create a central shockwave pop ring
  const ring = document.createElement('div');
  ring.style.position = 'absolute';
  ring.style.left = x + 'px';
  ring.style.top = y + 'px';
  // Use transform translate so it scales outward from its absolute center
  ring.style.transform = 'translate(-50%, -50%)';
  ring.style.width = '24px';
  ring.style.height = '24px';
  ring.style.borderRadius = '50%';
  ring.style.border = '3px solid #39ff14';
  ring.style.pointerEvents = 'none';
  ring.style.zIndex = '98';
  ring.style.boxShadow = '0 0 10px #39ff14, inset 0 0 8px #39ff14';
  
  container.appendChild(ring);
  
  gsap.to(ring, {
    width: 90,
    height: 90,
    opacity: 0,
    duration: 0.35,
    ease: "power2.out",
    onComplete: () => ring.remove()
  });

  // 2. Create the flying droplets (18 particles)
  const particleCount = 18;
  const colors = ['#39ff14', '#a3e635', '#00ffcc', '#22c55e', '#84cc16'];
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const size = gsap.utils.random(5, 14);
    const color = gsap.utils.random(colors);
    
    particle.style.position = 'absolute';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.transform = 'translate(-50%, -50%)';
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particle.style.backgroundColor = color;
    particle.style.borderRadius = '50%';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '99';
    particle.style.boxShadow = `0 0 8px ${color}`;
    
    // Add organic slime shapes to some particles
    if (Math.random() > 0.4) {
      particle.style.borderRadius = `${gsap.utils.random(30, 70)}% ${gsap.utils.random(30, 70)}% ${gsap.utils.random(30, 70)}% ${gsap.utils.random(30, 70)}%`;
    }
    
    container.appendChild(particle);
    
    // Spread in a fountain shape upwards (angles between 200 and 340 degrees)
    const angleDeg = gsap.utils.random(200, 340);
    const angleRad = (angleDeg * Math.PI) / 180;
    const velocity = gsap.utils.random(40, 110);
    
    const targetX = Math.cos(angleRad) * velocity;
    const targetY = Math.sin(angleRad) * velocity;
    
    gsap.to(particle, {
      x: targetX,
      y: targetY,
      scale: 0.1,
      opacity: 0,
      duration: gsap.utils.random(0.4, 0.75),
      ease: "power2.out",
      onComplete: () => {
        particle.remove(); // Clean up from DOM
      }
    });
  }
}

// Win State
function winGame() {
  isGameOver = true;
  stopGameLoops();

  if (basketDraggable) {
    basketDraggable.disable();
  }

  const counter1 = document.getElementById('counter_1');
  if (counter1) counter1.innerText = "WIN!";

  // Wait briefly (1.5s) to display score before going to reveal page
  setTimeout(() => {
    if (window.gwd && gwd.actions && gwd.actions.gwdPagedeck) {
      gwd.actions.gwdPagedeck.goToPage('pagedeck', 'page1_2', 'none', 1000, 'linear', 'top');
    }
  }, 1500);
}

// Game Over State
function gameOver() {
  isGameOver = true;
  stopGameLoops();

  if (basketDraggable) {
    basketDraggable.disable();
  }

  const counter1 = document.getElementById('counter_1');
  if (counter1) counter1.innerText = "TIME UP!";

  // Wait briefly (1.5s) and go to end screen
  setTimeout(() => {
    if (window.gwd && gwd.actions && gwd.actions.gwdPagedeck) {
      gwd.actions.gwdPagedeck.goToPage('pagedeck', 'page1_3', 'none', 1000, 'linear', 'top');
    }
  }, 1500);
}

// Stop game loops and intervals
function stopGameLoops() {
  if (collisionFrameId) {
    cancelAnimationFrame(collisionFrameId);
    collisionFrameId = null;
  }
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

// Reveal page sequence trigger
function startRevealPage() {
  stopGameLoops();
  
  if (basketDraggable) {
    basketDraggable.disable();
  }

  // Show score on page1_2
  updateScoreUI();

  const counter2 = document.getElementById('counter_2');
  if (counter2) counter2.innerText = "COMPLETED";

  // Transition to page1_3 (the end screen) after 4s (the reveal animation duration)
  setTimeout(() => {
    if (window.gwd && gwd.actions && gwd.actions.gwdPagedeck) {
      gwd.actions.gwdPagedeck.goToPage('pagedeck', 'page1_3', 'none', 1000, 'linear', 'top');
    }
  }, 4000);
}

// Reset everything to start screen state
function resetGameToStart() {
  stopGameLoops();
  score = 0;
  caughtCount = 0;
  isGameOver = false;
  caughtStates.fill(false);
  basketX = 0;

  if (basketDraggable) {
    basketDraggable.disable();
  }

  gsap.set(basketElements, { x: 0 });
  gsap.set(inBasketBottles, { opacity: 0 });
  gsap.set(fallingBottles, { opacity: 1 });

  // Reset HUD elements on the first page
  const scoreStart = document.getElementById('score');
  if (scoreStart) scoreStart.innerText = "SCORE: 0";
  const counterStart = document.getElementById('counter');
  if (counterStart) counterStart.innerText = "TIME: 15";
}
