/** * DabbaDoo: Overcooked Edition
 * Includes: Parallax, Enemy AI, Level Scaling, Persistence
 */

const GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 800,
    height: 450,
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 1400 }, debug: false } },
    scene: { preload, create, update }
};

const game = new Phaser.Game(GameConfig);

// --- GLOBAL STATE ---
let state = {
    score: 0,
    highScore: localStorage.getItem('dabbaHigh') || 0,
    level: 1,
    hp: 3,
    isInvincible: false,
    input: { left: false, right: false, jump: false }
};

function preload() {
    this.load.image('bg_far', 'assets/bg.png'); // Add more layers for parallax if you have them
    this.load.image('player', 'assets/vulvian.png');
    this.load.image('enemy', 'assets/enemy.png');
    this.load.image('cage', 'assets/cage.png');
    
    // Create shapes for particles/missing assets
    let g = this.make.graphics({x:0, y:0, add:false});
    g.fillStyle(0xffffff).fillCircle(5,5,5);
    g.generateTexture('particle', 10, 10);
}

function create() {
    // 1. PARALLAX BACKGROUND
    this.bg = this.add.tileSprite(400, 225, 800, 450, 'bg_far').setScrollFactor(0).setAlpha(0.5);
    
    // 2. WORLD GROUPS
    this.platforms = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.particles = this.add.particles(0, 0, 'particle', {
        speed: 100, scale: {start: 1, end: 0}, lifespan: 500, on: false
    });

    // 3. LEVEL GENERATOR (Overcooked Logic)
    setupLevel.call(this);

    // 4. PLAYER (The Legend)
    this.player = this.physics.add.sprite(100, 300, 'player');
    this.player.setCollideWorldBounds(true).setDragX(1500).setBounce(0.1);
    
    // 5. PHYSICS & INTERACTIONS
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.overlap(this.player, this.enemies, onHitEnemy, null, this);
    this.physics.add.overlap(this.player, this.goal, nextLevel, null, this);

    // 6. UI OVERLAY (Internal)
    this.uiScore = this.add.text(20, 20, `SCORE: ${state.score}`, { font: '24px Bungee', fill: '#00f2ff' });
    this.uiHP = this.add.text(20, 55, '🍰'.repeat(state.hp), { fontSize: '24px' });

    // 7. INPUTS
    setupMobileControls();
    this.keys = this.input.keyboard.createCursorKeys();

    this.cameras.main.fadeIn(1000, 0, 0, 0);
}

function update() {
    if (state.hp <= 0) return;

    // Movement
    let speed = 320;
    if (this.keys.left.isDown || state.input.left) {
        this.player.setVelocityX(-speed);
        this.player.setFlipX(true);
    } else if (this.keys.right.isDown || state.input.right) {
        this.player.setVelocityX(speed);
        this.player.setFlipX(false);
    }

    // Pro Jump (Double Jump logic can be added here)
    if ((this.keys.up.isDown || state.input.jump) && this.player.body.touching.down) {
        this.player.setVelocityY(-680);
        this.particles.emitParticleAt(this.player.x, this.player.y + 20, 5);
    }

    // Parallax Move
    this.bg.tilePositionX += this.player.body.velocity.x * 0.0005;

    // Enemy AI: Patrol & Flight
    this.enemies.children.iterate(e => {
        if (!e) return;
        if (e.getData('type') === 'flyer') {
            e.y += Math.sin(this.time.now / 200) * 2; // Hover effect
        }
        if (e.body.blocked.left || e.body.blocked.right) {
            e.setVelocityX(e.body.velocity.x * -1);
            e.setFlipX(e.body.velocity.x > 0);
        }
    });
}

// --- FEATURE: PROCEDURAL LEVEL DESIGN ---
function setupLevel() {
    // Basic Floor
    this.platforms.create(400, 440, null).setDisplaySize(1200, 30).refreshBody();

    // Level Difficuly Scaling
    let count = state.level * 3;
    for(let i=0; i < count; i++) {
        let x = Phaser.Math.Between(200, 750);
        let y = Phaser.Math.Between(150, 350);
        
        // Add Ledges
        this.platforms.create(x, y, null).setDisplaySize(120, 15).refreshBody();
        this.add.rectangle(x, y, 120, 15, 0xff2a2a, 0.8).setStrokeStyle(2, 0xffffff);

        // Spawn Enemies with Types
        if (Math.random() > 0.5) {
            let e = this.enemies.create(x, y - 50, 'enemy');
            e.setVelocityX(Phaser.Math.Between(50, 150)).setCollideWorldBounds(true).setBounce(1, 0);
            e.setData('type', 'walker');
        }
    }

    // Goal
    this.goal = this.physics.add.staticSprite(750, 100, 'cage');
}

// --- FEATURE: COMBAT & JUICE ---
function onHitEnemy(p, e) {
    if (state.isInvincible) return;

    // Stomp Check
    if (p.body.velocity.y > 0 && p.y < e.y - 10) {
        e.destroy();
        p.setVelocityY(-500);
        state.score += 250;
        this.uiScore.setText(`SCORE: ${state.score}`);
        this.cameras.main.shake(100, 0.01);
        popText(this, e.x, e.y, "+250", "#00f2ff");
    } else {
        takeDamage.call(this);
    }
}

function takeDamage() {
    state.hp--;
    this.uiHP.setText('🍰'.repeat(state.hp));
    state.isInvincible = true;
    
    this.cameras.main.flash(200, 255, 0, 0);
    this.cameras.main.shake(300, 0.02);
    this.player.setTint(0xff0000);

    if (state.hp <= 0) {
        if (state.score > state.highScore) localStorage.setItem('dabbaHigh', state.score);
        this.add.text(400, 200, 'RETIRED', { font: '64px Bungee', fill: '#f00' }).setOrigin(0.5);
        this.time.delayedCall(2000, () => location.reload());
    } else {
        this.time.delayedCall(1000, () => {
            this.player.clearTint();
            state.isInvincible = false;
        });
    }
}

function nextLevel() {
    state.level++;
    this.scene.restart();
}

function popText(scene, x, y, msg, color) {
    let t = scene.add.text(x, y, msg, { font: 'bold 20px Bungee', fill: color });
    scene.tweens.add({ targets: t, y: y - 100, alpha: 0, duration: 800, onComplete: () => t.destroy() });
}

// --- FEATURE: PRO MOBILE INPUT ---
function setupMobileControls() {
    const bind = (id, key) => {
        const el = document.getElementById(id);
        el.onpointerdown = (e) => { e.preventDefault(); state.input[key] = true; };
        el.onpointerup = (e) => { e.preventDefault(); state.input[key] = false; };
        el.onpointerout = (e) => { e.preventDefault(); state.input[key] = false; };
    };
    bind('btn-left', 'left');
    bind('btn-right', 'right');
    bind('btn-jump', 'jump');
        }
