// Setup Canvases
const fireworksCanvas = document.getElementById('fireworksCanvas');
const confettiCanvas = document.getElementById('confettiCanvas');
const ctxF = fireworksCanvas.getContext('2d');
const ctxC = confettiCanvas.getContext('2d');

let width, height;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    fireworksCanvas.width = width;
    fireworksCanvas.height = height;
    confettiCanvas.width = width;
    confettiCanvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// --------------------------------------------------------
// Fireworks Logic
// --------------------------------------------------------
class Particle {
    constructor(x, y, color, speed, angle) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.angle = angle;
        this.speed = speed;
        this.friction = 0.95;
        this.gravity = 0.05;
        this.opacity = 1;
        this.decay = 0.015;
    }

    update() {
        this.speed *= this.friction;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed + this.gravity;
        this.opacity -= this.decay;
    }

    draw(ctx) {
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// --------------------------------------------------------
// Sound Effects (Web Audio API)
// --------------------------------------------------------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const SoundManager = {
    playTone: function (freq, type, duration, startTime = 0) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);

        gain.gain.setValueAtTime(0.1, audioCtx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + startTime);
        osc.stop(audioCtx.currentTime + startTime + duration);
    },

    playNoise: function (duration) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

        noise.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start();
    },

    playIntro: function () {
        // Dramatic chord swell
        const now = audioCtx.currentTime;
        [220, 277, 329, 440].forEach((freq, i) => { // A major chord
            this.playTone(freq, 'sine', 3, i * 0.1);
        });
    },

    playFireworkLaunch: function () {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    },

    playExplosion: function () {
        this.playNoise(0.5);
    },

    playFanfare: function () {
        const now = 0;
        this.playTone(523.25, 'triangle', 0.2, now); // C
        this.playTone(659.25, 'triangle', 0.2, now + 0.2); // E
        this.playTone(783.99, 'triangle', 0.4, now + 0.4); // G
        this.playTone(1046.50, 'triangle', 0.8, now + 0.6); // High C
    }
};

// Initial interaction to unlock AudioContext
document.body.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });

class Firework {
    constructor(x, y) {
        this.x = x;
        this.y = height;
        this.targetY = y;
        this.speed = 10;
        this.angle = -Math.PI / 2;
        this.exploded = false;
        this.particles = [];
        this.hue = Math.random() * 360;

        // SoundManager.playFireworkLaunch(); // Optional: launch sound
    }

    update() {
        if (!this.exploded) {
            this.y += this.speed * Math.sin(this.angle);
            if (this.y <= this.targetY) {
                this.explode();
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].opacity <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    explode() {
        this.exploded = true;
        SoundManager.playExplosion(); // PLAY EXPLOSION SOUND
        const particleCount = 50;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i;
            const speed = Math.random() * 5 + 2;
            const color = `hsl(${this.hue}, 100%, 50%)`;
            this.particles.push(new Particle(this.x, this.y, color, speed, angle));
        }
    }

    draw(ctx) {
        if (!this.exploded) {
            ctx.fillStyle = `hsl(${this.hue}, 100%, 50%)`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        this.particles.forEach(p => p.draw(ctx));
    }
}

// Auto-launch fireworks during intro
let fireworks = [];
let autoFireworks = true;
setTimeout(() => {
    autoFireworks = false;
}, 5000);

// Play Intro Sound shortly after load (may be blocked by browser policy until interaction)
// Since we have an overlay, user might click? Or we try our best.
setTimeout(() => {
    SoundManager.playIntro();
}, 500);

// Force remove intro overlay to ensure clickability
setTimeout(() => {
    const overlay = document.getElementById('introOverlay');
    if (overlay) overlay.style.display = 'none';
}, 6000);

function loopFireworks() {
    ctxF.clearRect(0, 0, width, height);
    // Trail effect
    ctxF.globalCompositeOperation = 'destination-out';
    ctxF.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctxF.fillRect(0, 0, width, height);
    ctxF.globalCompositeOperation = 'lighter';

    if (autoFireworks && Math.random() < 0.05) {
        fireworks.push(new Firework(Math.random() * width, Math.random() * height / 2));
    }

    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        fireworks[i].draw(ctxF);
        if (fireworks[i].exploded && fireworks[i].particles.length === 0) {
            fireworks.splice(i, 1);
        }
    }
    requestAnimationFrame(loopFireworks);
}
loopFireworks();

// --------------------------------------------------------
// Confetti Logic
// --------------------------------------------------------
let confettiParticles = [];

class Confetti {
    constructor() {
        this.x = Math.random() * width;
        this.y = -10;
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        this.size = Math.random() * 10 + 5;
        this.speedY = Math.random() * 3 + 2;
        this.speedX = Math.random() * 4 - 2;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 10 - 5;
    }

    update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.rotation += this.rotationSpeed;
        if (this.y > height) {
            this.y = -10;
            this.x = Math.random() * width;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
    }
}

function startConfetti() {
    for (let i = 0; i < 100; i++) {
        confettiParticles.push(new Confetti());
    }
}

function loopConfetti() {
    ctxC.clearRect(0, 0, width, height);
    for (let p of confettiParticles) {
        p.update();
        p.draw(ctxC);
    }
    requestAnimationFrame(loopConfetti);
}
loopConfetti();

// --------------------------------------------------------
// Interactivity & Modal
// --------------------------------------------------------
const wishes = [
    "2026 will be the year you discover your true potential.",
    "A major breakthrough is waiting for you in March!",
    "Happiness is not a destination, it's a way of life. Embrace it.",
    "Your coding skills will bug-free... mostly.",
    "You will make memories that last a lifetime.",
    "Adventures are calling. Answer them!",
    "Success comes to those who wait, but better things come to those who go out and get them."
];

const modal = document.getElementById('wishModal');
const wishText = document.getElementById('wishText');
const wishTitle = document.getElementById('wishTitle');
const closeModal = document.querySelector('.close-modal');

document.getElementById('btnFireworks').addEventListener('click', () => {
    // Launch 5 random fireworks
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            fireworks.push(new Firework(Math.random() * width, Math.random() * height / 2));
        }, i * 200);
    }
    autoFireworks = !autoFireworks; // Toggle auto fireworks
});

document.getElementById('btnWish').addEventListener('click', () => {
    SoundManager.playTone(880, 'sine', 0.5); // Simple chime
    showWish();
});

document.getElementById('btnSurprise').addEventListener('click', () => {
    startConfetti();
    SoundManager.playFanfare(); // PLAY FANFARE SOUND
    // Flash effect
    document.body.style.backgroundColor = 'white';
    setTimeout(() => {
        document.body.style.backgroundColor = 'var(--bg-dark)';
    }, 100);
});

// --------------------------------------------------------
// Custom Wish Feature
// --------------------------------------------------------
const writeModal = document.getElementById('writeWishModal');
const closeWriteModal = document.getElementById('closeWriteModal');
const submitWishBtn = document.getElementById('submitWishBtn');
const userWishInput = document.getElementById('userWishInput');
const btnWriteWish = document.getElementById('btnWriteWish');

// Check if wish already cast
const checkWishStatus = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/wishes');
        const wishes = await response.json();
        // Assuming we check by a dummy username for now since there's no login
        const myWish = wishes.find(w => w.user_name === 'guest_user');
        if (myWish) {
            disableWishFeature();
            localStorage.setItem('wishContent_2026', myWish.wish_text);
        }
    } catch(err) {
        console.error('Error fetching wish status:', err);
    }
}
checkWishStatus();

document.getElementById('btnWriteWish').addEventListener('click', () => {
    if (localStorage.getItem('wishCast_2026') || document.getElementById('btnWriteWish').style.opacity === '0.7') {
        alert("You have already cast your special wish for 2026! 🌟");
        return;
    }
    writeModal.classList.add('active');
    userWishInput.focus();
});

closeWriteModal.addEventListener('click', () => {
    writeModal.classList.remove('active');
});

// Close modal on outside click
writeModal.addEventListener('click', (e) => {
    if (e.target === writeModal) {
        writeModal.classList.remove('active');
    }
});

submitWishBtn.addEventListener('click', async () => {
    const text = userWishInput.value.trim();
    if (text) {
        try {
            const response = await fetch('http://localhost:3000/api/wishes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_name: 'guest_user', wish_text: text })
            });

            if (response.ok) {
                launchWish(text);
                userWishInput.value = '';
                writeModal.classList.remove('active');

                // Save state
                localStorage.setItem('wishCast_2026', 'true');
                localStorage.setItem('wishContent_2026', text); // SAVE THE CONTENT
                disableWishFeature();
            } else {
                console.error('Failed to create wish on server');
                alert('Error submitting wish. Please try again.');
            }
        } catch(err) {
            console.error('Network error submitting wish:', err);
            alert('Network error submitting wish. Please try again.');
        }
    }
});

// Secret Admin Access: 
// 1. Click "SAATHWIKA" 5 times to SEE the wish
// 2. Click "HAPPY NEW YEAR" 5 times to RESET the wish
let nameClicks = 0;
let titleClicks = 0;

document.addEventListener('click', (e) => {
    // Reveal Logic
    if (e.target.classList.contains('cinematic-name')) {
        nameClicks++;
        titleClicks = 0; // Reset other counter
        if (nameClicks === 5) {
            const savedWish = localStorage.getItem('wishContent_2026');
            if (savedWish) {
                alert("🤫 SECRET REVEALED!\nHer wish was:\n\n" + savedWish);
            } else {
                alert("🤫 No wish has been cast yet.");
            }
            nameClicks = 0;
        }
    }
    // Reset Logic
    else if (e.target.classList.contains('cinematic-msg')) {
        titleClicks++;
        nameClicks = 0; // Reset other counter
        if (titleClicks === 5) {
            if (confirm("⚠️ SECRET ADMIN RESET\n\nAre you sure you want to DELETE the saved wish and reset the feature?")) {
                localStorage.removeItem('wishCast_2026');
                localStorage.removeItem('wishContent_2026');
                location.reload();
            }
            titleClicks = 0;
        }
    }
    else {
        nameClicks = 0;
        titleClicks = 0;
    }
});

function disableWishFeature() {
    const btnIcon = btnWriteWish.querySelector('.btn-icon');
    const btnText = btnWriteWish.querySelector('.btn-text');
    btnIcon.textContent = '🔒';
    btnText.textContent = 'Wish Cast';
    btnWriteWish.style.opacity = '0.7';
    // We don't remove event listener easily, but the click handler checks the flag
}

function launchWish(text) {
    // 1. Play sound
    SoundManager.playFireworkLaunch();

    // 2. Create floating text element
    const floatingText = document.createElement('div');
    floatingText.textContent = text;
    floatingText.style.position = 'absolute';
    floatingText.style.left = '50%';
    floatingText.style.top = '60%';
    floatingText.style.transform = 'translate(-50%, -50%)';
    floatingText.style.color = '#fff';
    floatingText.style.fontSize = '1.5rem';
    floatingText.style.fontWeight = 'bold';
    floatingText.style.textShadow = '0 0 10px gold';
    floatingText.style.pointerEvents = 'none';
    floatingText.style.transition = 'all 1.5s ease-out';
    floatingText.style.zIndex = '2000';
    document.body.appendChild(floatingText);

    // 3. Animate it going up (using requestAnimationFrame for smoothness or just CSS transition)
    // Trigger reflow
    floatingText.offsetHeight;

    floatingText.style.top = '30%';
    floatingText.style.opacity = '0';
    floatingText.style.transform = 'translate(-50%, -50%) scale(0.5)';

    // 4. When animation ends, launch firework
    setTimeout(() => {
        document.body.removeChild(floatingText);
        fireworks.push(new Firework(width / 2, height * 0.3)); // Launch at center
        SoundManager.playExplosion();
        // Console log as requested "I should get that message" - simulating persistence
        console.log("🌟 New Wish Cast: " + text);
    }, 1500);
}


document.getElementById('newWishBtn').addEventListener('click', showWish);
closeModal.addEventListener('click', () => {
    modal.classList.remove('active');
});

function showWish() {
    const randomWish = wishes[Math.floor(Math.random() * wishes.length)];
    wishText.textContent = randomWish;
    modal.classList.add('active');
}

// Close modal on outside click
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
    }
});
