// --- GAME CONFIGURATION ---
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 1400 }, debug: false }
    },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

let player, platforms, spikes, cage, boobi, particles;
let leftKey, rightKey, jumpKey, dashKey;
let jumpCount = 0;
let canDash = true;

function preload() {
    let g = this.make.graphics({x: 0, y: 0, add: false});

    // VULVIAN (The Hero)
    g.fillStyle(0x00f3ff); g.fillRect(0, 0, 32, 32);
    g.fillStyle(0xffffff); g.fillRect(6, 6, 6, 6); g.fillRect(20, 6, 6, 6);
    g.generateTexture('vulvian', 32, 32);

    // BOOBI DOODI (The Target)
    g.clear(); g.fillStyle(0xff00ff); g.fillCircle(16, 16, 12);
    g.generateTexture('boobi', 32, 32);

    // PLATFORM (Neon Green)
    g.clear(); g.lineStyle(2, 0x00ff66); g.strokeRect(0, 0, 32, 32);
    g.fillStyle(0x002211); g.fillRect(2, 2, 28, 28);
    g.generateTexture('tile', 32, 32);

    // SPIKE (Red Death)
    g.clear(); g.fillStyle(0xff3333);
    g.beginPath(); g.moveTo(0,32); g.lineTo(16,0); g.lineTo(32,32); g.fillPath();
    g.generateTexture('spike', 32, 32);

    // CAGE
    g.clear(); g.lineStyle(2, 0xffffff); g.strokeRect(0, 0, 48, 48);
    for(let i=1; i<4; i++) g.lineBetween(i*12, 0, i*12, 48);
    g.generateTexture('cage', 48, 48);
}

function create() {
    // 1. Level Design (Proper Adventure Map)
    platforms = this.physics.add.staticGroup();
    spikes = this.physics.add.staticGroup();
    
    // Legend: # = Platform, ^ = Spike, B = Boobi, @ = Start
    const map = [
        "########################################",
        "#......................................#",
        "#..............................B.......#",
        "#............................#####.....#",
        "#..........###.........................#",
        "#....................###...............#",
        "#..@.......^^^^......###...............#",
        "####################.....###############",
        "####################^^^^^###############"
    ];

    map.forEach((row, y) => {
        row.split('').forEach((char, x) => {
            let wx = x * 32, wy = y * 32;
            if (char === '#') platforms.create(wx, wy, 'tile').refreshBody();
            if (char === '^') spikes.create(wx, wy, 'spike').refreshBody();
            if (char === 'B') {
                boobi = this.physics.add.sprite(wx, wy, 'boobi').setImmovable(true);
                cage = this.add.image(wx, wy, 'cage');
            }
            if (char === '@') this.spawnX = wx, this.spawnY = wy;
        });
    });

    // 2. Player Setup
    player = this.physics.add.sprite(this.spawnX, this.spawnY, 'vulvian');
    player.setCollideWorldBounds(true).setDragX(1500);

    // 3. Interactions
    this.physics.add.collider(player, platforms);
    this.physics.add.overlap(player, spikes, () => this.scene.restart());
    this.physics.add.overlap(player, boobi, rescue, null, this);

    // 4. Camera & World
    this.cameras.main.startFollow(player, true, 0.1, 0.1).setZoom(1.6);
    this.physics.world.setBounds(0, 0, 1280, 600);

    // 5. INTERNAL TOUCH CONTROLS (THE FIX)
    // We divide the screen into 3 giant invisible zones
    let screenW = this.scale.width;
    let screenH = this.scale.height;

    // Left Zone
    this.add.rectangle(0, 0, screenW/3, screenH, 0xffffff, 0).setOrigin(0).setInteractive().setScrollFactor(0)
        .on('pointerdown', () => this.isLeft = true).on('pointerup', () => this.isLeft = false);

    // Right Zone
    this.add.rectangle(screenW/3, 0, screenW/3, screenH, 0xffffff, 0).setOrigin(0).setInteractive().setScrollFactor(0)
        .on('pointerdown', () => this.isRight = true).on('pointerup', () => this.isRight = false);

    // Jump/Dash Zone (Right Side)
    this.add.rectangle((screenW/3)*2, 0, screenW/3, screenH, 0x00ff00, 0.05).setOrigin(0).setInteractive().setScrollFactor(0)
        .on('pointerdown', () => handleAction.call(this));

    // UI Labels
    this.add.text(50, 500, "MOVE", { font: '20px Arial', fill: '#00f3ff' }).setScrollFactor(0);
    this.add.text(650, 500, "JUMP / DASH", { font: '20px Arial', fill: '#00ff66' }).setScrollFactor(0);
}

function handleAction() {
    if (player.body.touching.down) {
        jumpCount = 1;
        player.setVelocityY(-550);
    } else if (jumpCount === 1) { // Double Jump
        jumpCount = 2;
        player.setVelocityY(-500);
        this.tweens.add({ targets: player, angle: 360, duration: 400 });
    } else if (canDash) { // Air Dash
        canDash = false;
        const dir = player.flipX ? -1 : 1;
        player.setVelocityX(dir * 1000);
        player.body.allowGravity = false;
        this.time.delayedCall(200, () => {
            player.body.allowGravity = true;
            this.time.delayedCall(1000, () => canDash = true);
        });
    }
}

function rescue() {
    cage.destroy();
    boobi.setTint(0xffff00);
    this.add.text(player.x - 50, player.y - 100, "BOOBI SAVED!", { fontSize: '24px', fill: '#0f0' });
    this.physics.pause();
    this.time.delayedCall(2000, () => this.scene.restart());
}

function update() {
    if (this.isLeft) {
        player.setVelocityX(-250);
        player.flipX = true;
    } else if (this.isRight) {
        player.setVelocityX(250);
        player.flipX = false;
    }

    if (player.body.touching.down) {
        jumpCount = 0;
        player.setAngle(0);
    }
    
    if (player.y > 600) this.scene.restart();
                         }
    
