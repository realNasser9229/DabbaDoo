// ----------------------------------------------------
// 1. ASSET GENERATOR (Code-drawn Graphics)
// ----------------------------------------------------
class TextureGenerator {
    static generate(scene) {
        let g = scene.make.graphics({x:0, y:0, add:false});

        // PLAYER: Neon Box
        g.fillStyle(0x00f3ff, 1); g.fillRect(0,0,32,32);
        g.fillStyle(0xffffff, 1); g.fillRect(6,6,8,8); g.fillRect(18,6,8,8); // Eyes
        g.generateTexture('player', 32, 32);

        // GROUND: Dark Metal
        g.clear(); g.lineStyle(2, 0x4444ff, 1); g.fillStyle(0x111111, 1);
        g.strokeRect(0,0,32,32); g.fillRect(0,0,32,32);
        g.generateTexture('tile', 32, 32);

        // SPIKE: Red Death
        g.clear(); g.fillStyle(0xff3333, 1);
        g.beginPath(); g.moveTo(0,32); g.lineTo(16,0); g.lineTo(32,32); g.fillPath();
        g.generateTexture('spike', 32, 32);

        // ENEMY: Purple Blob
        g.clear(); g.fillStyle(0xff00ff, 1); g.fillCircle(16,16,16);
        g.fillStyle(0x000000, 1); g.fillRect(8,12,16,4);
        g.generateTexture('enemy', 32, 32);

        // PARTICLE: Pixels
        g.clear(); g.fillStyle(0xffffff, 1); g.fillRect(0,0,6,6);
        g.generateTexture('pixel', 6, 6);

        // GOAL: Gold Cage
        g.clear(); g.lineStyle(4, 0xffcc00); g.strokeRect(0,0,40,60);
        g.generateTexture('goal', 40, 60);
    }
}

// ----------------------------------------------------
// 2. LEVELS (ASCII Map)
// ----------------------------------------------------
const LEVELS = [
    [ // LEVEL 1: Learn to Jump
        ".......................",
        "...................G...",
        "...................###.",
        ".@.......###...........",
        "#####...........###....",
        "#####^^^^^^^^^^^#######",
        "#######################"
    ],
    [ // LEVEL 2: Double Jump Training
        ".......................",
        "G......................",
        "###....................",
        "......###..............",
        "............###........",
        ".@.....................",
        "#####...........^..^...",
        "#####^^^^^^^^^^^#^^#^^^",
        "#######################"
    ],
    [ // LEVEL 3: Enemy Patrols
        ".......................",
        "...................G...",
        "...................###.",
        "..........X...X........",
        ".......##########......",
        ".@.....................",
        "#####...^.......^...###",
        "#######################"
    ],
    [ // LEVEL 4: The Tower
        "G......................",
        "###....................",
        "........###............",
        ".......................",
        "......X.....X.....X....",
        "....################...",
        ".......................",
        "..........###..........",
        ".@...^....###....^.....",
        "#######################"
    ]
];

// ----------------------------------------------------
// 3. MAIN GAME LOGIC
// ----------------------------------------------------
class MainScene extends Phaser.Scene {
    constructor() { super('MainScene'); }

    init(data) {
        this.level = data.level || 0;
        this.jumpCount = 0; // Tracks jumps (0, 1, 2)
        this.canDash = true;
        this.isDashing = false;
        this.inputState = { left:false, right:false, jump:false, dash:false };
    }

    preload() {
        TextureGenerator.generate(this);
    }

    create() {
        // --- SETUP ---
        this.cameras.main.setBackgroundColor('#101015');
        
        this.platforms = this.physics.add.staticGroup();
        this.spikes = this.physics.add.staticGroup();
        this.enemies = this.physics.add.group();
        this.goals = this.physics.add.staticGroup();

        // --- LEVEL BUILDER ---
        this.buildLevel(LEVELS[this.level]);

        // --- PLAYER ---
        this.player = this.physics.add.sprite(this.startX || 100, this.startY || 100, 'player');
        this.player.setCollideWorldBounds(true).setDragX(1200);
        this.player.body.setGravityY(1200);

        // --- PARTICLES ---
        this.emitter = this.add.particles(0, 0, 'pixel', {
            speed: {min: 50, max: 150}, scale: {start:1, end:0}, lifespan: 400, on: false
        });

        // --- COLLISION ---
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms);
        
        // Spike Death
        this.physics.add.overlap(this.player, this.spikes, (p, s) => this.die(p), null, this);
        
        // Enemy Logic
        this.physics.add.overlap(this.player, this.enemies, (p, e) => {
            if (p.body.velocity.y > 0 && p.y < e.y - 10) {
                // STOMP
                e.destroy();
                p.setVelocityY(-400);
                this.spawnParticles(e.x, e.y, 0xff00ff);
            } else {
                this.die(p);
            }
        }, null, this);

        // Win Level
        this.physics.add.overlap(this.player, this.goals, () => {
            this.add.text(400, 200, "LEVEL COMPLETE", { font:'40px Orbitron', fill:'#0f0' }).setOrigin(0.5);
            this.physics.pause();
            this.time.delayedCall(1000, () => {
                let next = (this.level + 1) % LEVELS.length;
                this.scene.restart({ level: next });
            });
        }, null, this);

        // --- CONTROLS ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.dashKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.setupMobileControls();

        // UI
        this.add.text(20, 20, `LVL ${this.level + 1}`, { font:'20px Orbitron', fill:'#fff' });
    }

    buildLevel(map) {
        map.forEach((row, y) => {
            row.split('').forEach((char, x) => {
                let wx = x * 32, wy = y * 32;
                if (char === '#') this.platforms.create(wx, wy, 'tile').refreshBody();
                if (char === '^') this.spikes.create(wx, wy + 10, 'spike').body.setSize(20, 20).setOffset(6, 12);
                if (char === 'X') {
                    let e = this.enemies.create(wx, wy, 'enemy');
                    e.setVelocityX(100).setBounce(1, 0).setCollideWorldBounds(true);
                }
                if (char === 'G') this.goals.create(wx, wy, 'goal');
                if (char === '@') { this.startX = wx; this.startY = wy; }
            });
        });
    }

    update() {
        if (!this.player.active) return;
        const keys = this.inputState;
        const cursors = this.cursors;

        // 1. HORIZONTAL MOVE
        if (cursors.left.isDown || keys.left) {
            this.player.setVelocityX(-250);
            this.player.setFlipX(true);
        } else if (cursors.right.isDown || keys.right) {
            this.player.setVelocityX(250);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        // 2. JUMP & DOUBLE JUMP
        const onFloor = this.player.body.touching.down;
        if (onFloor) this.jumpCount = 0;

        // Check for Jump Press (Keyboard JustDown OR Mobile state change)
        const jumpPressed = Phaser.Input.Keyboard.JustDown(cursors.up) || keys.jump;
        
        if (jumpPressed) {
            if (onFloor) {
                this.jump(false);
            } else if (this.jumpCount < 2) {
                this.jump(true);
            }
            // Reset mobile jump to prevent auto-fire
            keys.jump = false; 
        }

        // 3. DASH
        if ((Phaser.Input.Keyboard.JustDown(this.dashKey) || keys.dash) && this.canDash) {
            this.dash();
            keys.dash = false;
        }
    }

    jump(isDouble) {
        this.player.setVelocityY(-500);
        this.jumpCount++;
        
        if (isDouble) {
            // Spin Animation for Double Jump
            this.tweens.add({
                targets: this.player, angle: 360, duration: 400
            });
            this.spawnParticles(this.player.x, this.player.y + 20, 0x00f3ff);
        }
    }

    dash() {
        this.isDashing = true; this.canDash = false;
        const dir = this.player.flipX ? -1 : 1;
        this.player.setVelocityX(600 * dir);
        this.player.body.allowGravity = false;
        this.cameras.main.shake(50, 0.005);
        
        this.time.delayedCall(200, () => {
            this.isDashing = false;
            this.player.body.allowGravity = true;
            this.canDash = true; // Simple cooldown logic
        });
    }

    die(player) {
        // Prevent multiple deaths
        if (!player.active) return;
        
        this.spawnParticles(player.x, player.y, 0xff0000); // Red Explosion
        this.cameras.main.shake(200, 0.05);
        player.destroy(); // Remove player instantly

        this.time.delayedCall(1000, () => {
            this.scene.restart();
        });
    }

    spawnParticles(x, y, color) {
        let p = this.add.particles(0, 0, 'pixel', {
            x: x, y: y,
            speed: { min: 50, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 500,
            gravityY: 500,
            quantity: 20,
            tint: color
        });
        p.explode();
    }

    setupMobileControls() {
        const bind = (id, k) => {
            const btn = document.getElementById(id);
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.inputState[k] = true; });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); this.inputState[k] = false; });
            btn.addEventListener('mousedown', (e) => { e.preventDefault(); this.inputState[k] = true; });
            btn.addEventListener('mouseup', (e) => { e.preventDefault(); this.inputState[k] = false; });
        };
        bind('leftBtn', 'left'); bind('rightBtn', 'right');
        bind('jumpBtn', 'jump'); bind('dashBtn', 'dash');
        
        document.getElementById('restartBtn').onclick = () => this.scene.restart();
    }
}

const config = {
    type: Phaser.AUTO,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    parent: 'game',
    pixelArt: true,
    physics: { default: 'arcade', arcade: { gravity: { y: 1600 } } }, // Higher gravity for snappy feel
    scene: MainScene
};

new Phaser.Game(config);
        
