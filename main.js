// ----------------------------------------------------
// 1. ASSET GENERATOR (No more PNG files needed!)
// ----------------------------------------------------
class TextureGenerator {
    static generate(scene) {
        // PLAYER (Vulvian): A Neon Cube with a Headband
        let g = scene.make.graphics({x:0, y:0, add:false});
        g.fillStyle(0x00f3ff, 1); // Body
        g.fillRect(4, 4, 24, 24);
        g.fillStyle(0xff00ff, 1); // Headband
        g.fillRect(4, 8, 24, 6);
        g.fillStyle(0xffffff, 1); // Eyes
        g.fillRect(8, 10, 6, 6); g.fillRect(20, 10, 6, 6);
        g.generateTexture('player', 32, 32);

        // TILE (Ground): Sci-fi block
        g.clear();
        g.lineStyle(2, 0x00ff66, 1);
        g.fillStyle(0x052211, 1);
        g.strokeRect(0,0,32,32);
        g.fillRect(0,0,32,32);
        g.lineStyle(1, 0x00ff66, 0.3);
        g.beginPath(); g.moveTo(0,0); g.lineTo(32,32); g.strokePath();
        g.generateTexture('tile', 32, 32);

        // SPIKE: Red Triangle
        g.clear();
        g.fillStyle(0xff2a2a, 1);
        g.beginPath();
        g.moveTo(0, 32); g.lineTo(16, 0); g.lineTo(32, 32);
        g.closePath();
        g.fillPath();
        g.generateTexture('spike', 32, 32);

        // ENEMY: Angry Blob
        g.clear();
        g.fillStyle(0xff0000, 1);
        g.fillCircle(16, 16, 14);
        g.fillStyle(0x000000, 1); // Angry eyes
        g.fillRect(8, 12, 6, 4); g.fillRect(18, 12, 6, 4);
        g.generateTexture('enemy', 32, 32);

        // PARTICLE: Dust
        g.clear();
        g.fillStyle(0xffffff, 1);
        g.fillRect(0,0,4,4);
        g.generateTexture('dust', 4, 4);

        // CAGE (Goal)
        g.clear();
        g.lineStyle(2, 0xffcc00, 1);
        g.strokeRect(0,0,32,48);
        g.generateTexture('goal', 32, 48);
    }
}

// ----------------------------------------------------
// 2. LEVEL DESIGNS (ASCII ART)
// #=Wall, @=Start, X=Enemy, ^=Spike, G=Goal, !=Boss
// ----------------------------------------------------
const LEVELS = [
    [ // LEVEL 1: Basics
        ".........................",
        ".........................",
        "...................G.....",
        "...................###...",
        ".@.............###.......",
        "#####...####.............",
        "#####....................",
        "#####^^^^^^^^^^^^^^^#####",
        "#########################"
    ],
    [ // LEVEL 2: Verticality
        ".........................",
        "G........................",
        "###..........####........",
        ".....###.................",
        "..........X..............",
        ".......######.......###..",
        ".@.......................",
        "#####..........^..^......",
        "#####^^^^^^^^^^#..#^^^^^^",
        "#########################"
    ],
    [ // LEVEL 3: The Pit
        "G.......................",
        "###.....................",
        ".........X....X.........",
        "......##########........",
        "........................",
        "...##..............##...",
        "........................",
        ".@....^..........^......",
        "#####.#.^^^^^^^^.#.#####",
        "#####.##########.#.#####"
    ]
];

// ----------------------------------------------------
// 3. MAIN GAME SCENE
// ----------------------------------------------------
class MainScene extends Phaser.Scene {
    constructor() { super('MainScene'); }

    init(data) {
        this.levelIdx = data.level || 0;
        this.score = data.score || 0;
        this.hp = 3;
        
        // Advanced Movement Flags
        this.canDash = true;
        this.isDashing = false;
        this.wallJumpTimer = 0;
        
        this.inputState = { left:false, right:false, jump:false, dash:false };
    }

    preload() {
        TextureGenerator.generate(this); // <--- GENERATES SPRITES
    }

    create() {
        // --- VISUALS ---
        this.cameras.main.setBackgroundColor('#050510');
        
        // Grid Background
        let grid = this.add.grid(400, 225, 800, 450, 32, 32, 0x050510, 1, 0x111133, 1);
        grid.setScrollFactor(0);

        // --- GROUPS ---
        this.platforms = this.physics.add.staticGroup();
        this.spikes = this.physics.add.staticGroup();
        this.enemies = this.physics.add.group();
        this.goal = this.physics.add.staticGroup();

        // --- LEVEL PARSER ---
        this.parseLevel(LEVELS[this.levelIdx] || LEVELS[0]);

        // --- PLAYER ---
        // If no @ found, default to 100,100
        if(!this.playerStartX) { this.playerStartX = 100; this.playerStartY = 100; }
        
        this.player = this.physics.add.sprite(this.playerStartX, this.playerStartY, 'player');
        this.player.setCollideWorldBounds(true);
        this.player.setDragX(1000); // Snappy stop
        this.player.body.setGravityY(1000);

        // --- PARTICLES ---
        this.emitter = this.add.particles(0, 0, 'dust', {
            speed: {min: 50, max: 100}, scale: {start:1, end:0}, lifespan: 300, blendMode: 'ADD', on: false
        });

        // --- COLLISIONS ---
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms);
        this.physics.add.overlap(this.player, this.spikes, this.die, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.handleEnemy, null, this);
        this.physics.add.overlap(this.player, this.goal, this.win, null, this);

        // --- CAMERAS ---
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(1.5);
        this.cameras.main.setBounds(0, 0, 1200, 800); // Larger world bounds

        // --- UI ---
        this.ui = this.add.text(this.cameras.main.width/2, 30, `LVL ${this.levelIdx+1}`, {
            font: '20px Orbitron', fill: '#00f3ff'
        }).setScrollFactor(0).setOrigin(0.5);

        // --- CONTROLS ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.dashKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.setupMobile();
    }

    parseLevel(layout) {
        const TILE_SIZE = 32;
        layout.forEach((row, y) => {
            row.split('').forEach((char, x) => {
                const worldX = x * TILE_SIZE;
                const worldY = y * TILE_SIZE;

                if (char === '#') this.platforms.create(worldX, worldY, 'tile').refreshBody();
                if (char === '^') {
                    let s = this.spikes.create(worldX, worldY + 16, 'spike'); // Offset for smaller hitbox
                    s.body.setSize(20, 16).setOffset(6, 16);
                } 
                if (char === 'X') {
                    let e = this.enemies.create(worldX, worldY, 'enemy');
                    e.setVelocityX(100).setBounce(1, 0).setCollideWorldBounds(true);
                }
                if (char === 'G') this.goal.create(worldX, worldY, 'goal');
                if (char === '@') { this.playerStartX = worldX; this.playerStartY = worldY; }
            });
        });
    }

    update() {
        if (!this.player.active) return;

        const { left, right, up } = this.cursors;
        const keys = this.inputState; // Mobile keys

        // 1. DASH LOGIC
        const isDashPressed = Phaser.Input.Keyboard.JustDown(this.dashKey) || keys.dash;
        if (isDashPressed && this.canDash && !this.isDashing) {
            this.doDash();
            keys.dash = false; // Reset mobile trigger
        }

        if (this.isDashing) return; // Don't allow movement while dashing

        // 2. STANDARD MOVEMENT
        if (left.isDown || keys.left) {
            this.player.setVelocityX(-200);
            this.player.setFlipX(true);
        } else if (right.isDown || keys.right) {
            this.player.setVelocityX(200);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        // 3. JUMPING & WALL JUMPING
        const onFloor = this.player.body.blocked.down;
        
        // Reset Dash on floor
        if (onFloor) this.canDash = true;

        if ((up.isDown || keys.jump) && onFloor) {
            this.player.setVelocityY(-450);
            this.createDust(this.player.x, this.player.y + 16);
        }
    }

    doDash() {
        this.isDashing = true;
        this.canDash = false;
        
        // Dash Direction
        const dir = this.player.flipX ? -1 : 1;
        this.player.setVelocityX(600 * dir);
        this.player.setVelocityY(0);
        this.player.body.allowGravity = false;

        // Visuals
        this.cameras.main.shake(100, 0.005);
        this.tweens.add({
            targets: this.player, alpha: 0.5, duration: 50, yoyo: true, repeat: 3
        });

        // End Dash
        this.time.delayedCall(200, () => {
            this.isDashing = false;
            this.player.body.allowGravity = true;
            this.player.setVelocityX(0);
        });
    }

    handleEnemy(player, enemy) {
        if (player.body.velocity.y > 0 && player.y < enemy.y - 10) {
            // STOMP
            enemy.destroy();
            player.setVelocityY(-300);
            this.cameras.main.shake(50, 0.01);
            this.createDust(enemy.x, enemy.y);
        } else {
            this.die();
        }
    }

    createDust(x, y) {
        this.emitter.emitParticleAt(x, y, 10);
    }

    die() {
        this.physics.pause();
        this.player.setTint(0xff0000);
        this.cameras.main.shake(300, 0.05);
        
        let txt = this.add.text(this.player.x, this.player.y - 50, "WASTED", {
            font: '20px Orbitron', fill: '#ff0000', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        this.time.delayedCall(1000, () => this.scene.restart());
    }

    win() {
        this.physics.pause();
        let txt = this.add.text(this.player.x, this.player.y - 50, "CLEARED!", {
            font: '20px Orbitron', fill: '#00ff00', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        this.time.delayedCall(1500, () => {
            let next = this.levelIdx + 1;
            if (next >= LEVELS.length) next = 0; // Loop back
            this.scene.restart({ level: next });
        });
    }

    setupMobile() {
        const bind = (id, k) => {
            let b = document.getElementById(id);
            b.ontouchstart = (e) => { e.preventDefault(); this.inputState[k] = true; };
            b.ontouchend = (e) => { e.preventDefault(); this.inputState[k] = false; };
            b.onmousedown = (e) => { e.preventDefault(); this.inputState[k] = true; };
            b.onmouseup = (e) => { e.preventDefault(); this.inputState[k] = false; };
        };
        bind('leftBtn', 'left'); bind('rightBtn', 'right');
        bind('jumpBtn', 'jump'); bind('dashBtn', 'dash');
        
        document.getElementById('restartBtn').onclick = () => this.scene.restart();
    }
}

const config = {
    type: Phaser.AUTO,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }, // Fullscreen resize
    parent: 'game',
    pixelArt: true,
    physics: { default: 'arcade', arcade: { gravity: { y: 1400 } } },
    scene: MainScene
};

new Phaser.Game(config);
    
