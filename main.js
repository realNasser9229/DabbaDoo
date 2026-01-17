// ----------------------------------------------------
// 1. ASSET GENERATOR
// ----------------------------------------------------
class TextureGenerator {
    static generate(scene) {
        let g = scene.make.graphics({x:0, y:0, add:false});

        // PLAYER
        g.fillStyle(0x00f3ff); g.fillRect(0,0,30,30);
        g.fillStyle(0xffffff); g.fillRect(5,5,8,8); g.fillRect(17,5,8,8);
        g.generateTexture('player', 30, 30);

        // WALL
        g.clear(); g.lineStyle(2, 0x5555ff); g.fillStyle(0x111122);
        g.strokeRect(0,0,32,32); g.fillRect(0,0,32,32);
        g.generateTexture('wall', 32, 32);

        // MOVING PLATFORM (Orange)
        g.clear(); g.lineStyle(2, 0xffaa00); g.fillStyle(0x442200);
        g.strokeRect(0,0,64,20); g.fillRect(0,0,64,20);
        g.generateTexture('platform', 64, 20);

        // SPIKE
        g.clear(); g.fillStyle(0xff0000);
        g.beginPath(); g.moveTo(0,32); g.lineTo(16,0); g.lineTo(32,32); g.fillPath();
        g.generateTexture('spike', 32, 32);

        // COIN
        g.clear(); g.fillStyle(0xffcc00); g.fillCircle(10,10,8);
        g.generateTexture('coin', 20, 20);

        // ENEMY
        g.clear(); g.fillStyle(0xcc00cc); g.fillCircle(16,16,16);
        g.fillStyle(0x000000); g.fillRect(6,10,6,6); g.fillRect(20,10,6,6);
        g.generateTexture('enemy', 32, 32);

        // GOAL
        g.clear(); g.lineStyle(4, 0x00ff00); g.strokeRect(0,0,40,60);
        g.generateTexture('goal', 40, 60);

        // PARTICLE
        g.clear(); g.fillStyle(0xffffff); g.fillRect(0,0,4,4);
        g.generateTexture('pixel', 4, 4);
    }
}

// ----------------------------------------------------
// 2. LEVEL DATA (Bigger & Better)
// ----------------------------------------------------
const LEVELS = [
    [   // LVL 1: The Basics (Wide)
        ".......................................",
        "...................................G...",
        "...................................###.",
        ".@.............o......o......o.........",
        "####....####.####...####...####...#####",
        "####....####.####...####...####...#####",
        "####^^^^####^####^^^####^^^####^^^#####",
        "#######################################"
    ],
    [   // LVL 2: Moving Platforms Intro
        "...................................",
        ".........................G.........",
        ".......................#####.......",
        ".............=.....................",
        ".......=...........=...............",
        ".@.................................",
        "#####.......................###....",
        "#####^^^^^^^^^^^^^^^^^^^^^^^###^^^^",
        "###################################"
    ],
    [   // LVL 3: Vertical Climb
        ".......G.......",
        ".....#####.....",
        "...............",
        "...=.......=...",
        "...............",
        ".#...........#.",
        ".#.....=.....#.",
        ".#...........#.",
        ".#...........#.",
        ".#...X...X...#.",
        ".#####...#####.",
        "...............",
        "...............",
        ".......@.......",
        ".....#####....."
    ],
    [   // LVL 4: The Gauntlet
        "................................................",
        "G...............................................",
        "###...=..........=..........=..........=........",
        "...........o...........o..........o.............",
        "......X.........X..........X..........X.........",
        ".@..#######################################.....",
        "###.#######################################..###",
        "###.^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^..###",
        "################################################"
    ],
    [   // LVL 5: Precision Dash
        "........................................",
        ".......................................G",
        "......................................##",
        "......#......#......#......#......#..###",
        ".@....#..o...#..o...#..o...#..o...#.####",
        "###...#......#......#......#......######",
        "###^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^#####",
        "########################################"
    ],
    [   // LVL 6: The Citadel (Huge)
        ".........................G.............",
        ".......................#####...........",
        "...................=...................",
        ".............=.........................",
        ".......=.......................###.....",
        "...............................###.....",
        "..................X....X.......###.....",
        ".....####.......##########.....###.....",
        ".....####......................###.....",
        ".....####...=..........................",
        ".@...####..............................",
        "#########..............................",
        "#########^^^^^^^^^^^^^^^^^^^^^^^^^^####",
        "#######################################"
    ]
];

// ----------------------------------------------------
// 3. GAME ENGINE
// ----------------------------------------------------
class MainScene extends Phaser.Scene {
    constructor() { super('MainScene'); }

    init(data) {
        this.level = data.level || 0;
        this.score = data.score || 0;
        this.jumpCount = 0;
        this.canDash = true;
        this.isDashing = false;
        this.inputState = { left:false, right:false, jump:false, dash:false };
    }

    preload() { TextureGenerator.generate(this); }

    create() {
        this.cameras.main.setBackgroundColor('#090910');
        
        // Groups
        this.platforms = this.physics.add.staticGroup();
        this.movingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });
        this.spikes = this.physics.add.staticGroup();
        this.coins = this.physics.add.staticGroup();
        this.enemies = this.physics.add.group();
        this.goal = this.physics.add.staticGroup();

        // Build Level
        this.buildLevel(LEVELS[this.level]);

        // Player
        this.player = this.physics.add.sprite(this.startX, this.startY, 'player');
        this.player.setCollideWorldBounds(true);
        this.player.body.setGravityY(1400); // Heavy gravity for snappy feel
        this.player.setDragX(1200);

        // Camera - FIX FOR BARRIER
        const mapWidth = LEVELS[this.level][0].length * 32;
        const mapHeight = LEVELS[this.level].length * 32;
        this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(1.3);

        // Colliders
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.player, this.movingPlatforms, this.ridePlatform, null, this);
        this.physics.add.collider(this.enemies, this.platforms);
        
        this.physics.add.overlap(this.player, this.spikes, () => this.die(), null, this);
        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
        this.physics.add.overlap(this.player, this.goal, this.winLevel, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.dashKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.setupMobile();

        // UI
        this.scoreText = this.add.text(20, 20, `SCORE: ${this.score}`, { font:'20px Orbitron', fill:'#ffcc00' }).setScrollFactor(0);
        this.add.text(20, 50, `LVL: ${this.level+1}`, { font:'16px Orbitron', fill:'#fff' }).setScrollFactor(0);
    }

    buildLevel(layout) {
        layout.forEach((row, y) => {
            row.split('').forEach((char, x) => {
                let wx = x * 32, wy = y * 32;
                if (char === '#') this.platforms.create(wx, wy, 'wall').refreshBody();
                if (char === '^') this.spikes.create(wx, wy+16, 'spike').body.setSize(20,16).setOffset(6,16);
                if (char === 'o') this.coins.create(wx, wy, 'coin');
                if (char === 'G') this.goal.create(wx, wy, 'goal');
                if (char === 'X') {
                    let e = this.enemies.create(wx, wy, 'enemy');
                    e.setVelocityX(100).setBounce(1).setCollideWorldBounds(true);
                }
                if (char === '=') {
                    let mp = this.movingPlatforms.create(wx, wy, 'platform');
                    this.tweens.add({
                        targets: mp, x: wx + 150, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
                    });
                }
                if (char === '@') { this.startX = wx; this.startY = wy; }
            });
        });
    }

    update() {
        if (!this.player.active) return;
        const keys = this.inputState;
        
        // Movement
        if (this.cursors.left.isDown || keys.left) {
            this.player.setVelocityX(-250);
            this.player.setFlipX(true);
        } else if (this.cursors.right.isDown || keys.right) {
            this.player.setVelocityX(250);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        // Jump / Double Jump
        const isJump = Phaser.Input.Keyboard.JustDown(this.cursors.up) || keys.jump;
        const onFloor = this.player.body.touching.down;

        if (onFloor) this.jumpCount = 0;

        if (isJump) {
            if (onFloor) {
                this.jump(false);
            } else if (this.jumpCount < 2) {
                this.jump(true);
            }
            keys.jump = false; // Reset mobile input
        }

        // Dash
        if ((Phaser.Input.Keyboard.JustDown(this.dashKey) || keys.dash) && this.canDash) {
            this.dash();
            keys.dash = false;
        }
    }

    jump(isDouble) {
        this.player.setVelocityY(-550);
        this.jumpCount++;
        if (isDouble) {
            this.tweens.add({ targets: this.player, angle: 360, duration: 400 });
            this.spawnParticles(this.player.x, this.player.y, 0x00f3ff);
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
            this.canDash = true;
        });
    }

    ridePlatform(player, platform) {
        if (platform.body.touching.up && player.body.touching.down) {
            player.x += platform.x - platform.input.hitArea.x; // Friction hack not needed for simple tweens usually, but helps sticking
        }
    }

    collectCoin(p, coin) {
        coin.destroy();
        this.score += 50;
        this.scoreText.setText(`SCORE: ${this.score}`);
        this.spawnParticles(p.x, p.y, 0xffcc00);
    }

    hitEnemy(p, e) {
        if (p.body.velocity.y > 0 && p.y < e.y - 10) {
            e.destroy();
            p.setVelocityY(-300);
            this.score += 100;
            this.scoreText.setText(`SCORE: ${this.score}`);
            this.spawnParticles(e.x, e.y, 0xff00ff);
        } else {
            this.die();
        }
    }

    die() {
        if(!this.player.active) return;
        this.player.destroy();
        this.spawnParticles(this.player.x, this.player.y, 0xff0000);
        this.cameras.main.shake(200, 0.05);
        this.time.delayedCall(1000, () => this.scene.restart({level: this.level, score: this.score}));
    }

    winLevel() {
        if(this.hasWon) return;
        this.hasWon = true;
        this.add.text(this.player.x, this.player.y - 100, "COMPLETE!", { font:'30px Orbitron', fill:'#0f0' }).setOrigin(0.5);
        this.physics.pause();
        this.time.delayedCall(1500, () => {
            let next = (this.level + 1) % LEVELS.length;
            this.scene.restart({ level: next, score: this.score + 500 });
        });
    }

    spawnParticles(x, y, color) {
        let p = this.add.particles(0, 0, 'pixel', {
            x: x, y: y,
            speed: { min: 50, max: 200 },
            lifespan: 500,
            quantity: 15,
            tint: color
        });
        p.explode();
    }

    setupMobile() {
        const bind = (id, k) => {
            const btn = document.getElementById(id);
            btn.onpointerdown = (e) => { e.preventDefault(); this.inputState[k] = true; };
            btn.onpointerup = (e) => { e.preventDefault(); this.inputState[k] = false; };
            btn.onpointerleave = (e) => { e.preventDefault(); this.inputState[k] = false; };
        };
        bind('leftBtn', 'left'); bind('rightBtn', 'right');
        bind('jumpBtn', 'jump'); bind('dashBtn', 'dash');
        document.getElementById('restartBtn').onclick = () => this.scene.restart({level:this.level, score:this.score});
    }
}

const config = {
    type: Phaser.AUTO,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    parent: 'game',
    pixelArt: true,
    physics: { default: 'arcade', arcade: { gravity: { y: 1400 } } },
    scene: MainScene
};

new Phaser.Game(config);
                                                    
