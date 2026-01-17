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
        arcade: { gravity: { y: 1500 }, debug: false } 
    },
    scene: { preload, create, update }
};

let player, platforms, spikes, goal;
let leftZone, rightZone, jumpZone, dashZone;
let isLeft = false, isRight = false, isJump = false;
const game = new Phaser.Game(config);

function preload() {
    let g = this.make.graphics({x: 0, y: 0, add: false});
    
    // 1. PLAYER (Neon Blue)
    g.fillStyle(0x00f3ff); g.fillRect(0, 0, 32, 32);
    g.generateTexture('player', 32, 32);

    // 2. PLATFORM (Neon Green)
    g.clear(); g.lineStyle(2, 0x00ff00); g.strokeRect(0, 0, 32, 32);
    g.fillStyle(0x004400); g.fillRect(0,0,32,32);
    g.generateTexture('tile', 32, 32);

    // 3. BUTTONS (UI)
    g.clear(); g.fillStyle(0xffffff, 0.2); g.fillCircle(50, 50, 50);
    g.generateTexture('btnCircle', 100, 100);
}

function create() {
    platforms = this.physics.add.staticGroup();
    spikes = this.physics.add.staticGroup();
    goal = this.physics.add.staticGroup();

    // CUSTOM LEVEL MAP (Visible Platforms)
    const map = [
        "########################",
        "#......................#",
        "#.......G..............#",
        "#########..............#",
        "#...........####.......#",
        "#..@...................#",
        "#####.......^^^^.......#",
        "########################"
    ];

    map.forEach((row, y) => {
        row.split('').forEach((char, x) => {
            let wx = x * 32, wy = y * 32;
            if (char === '#') platforms.create(wx, wy, 'tile').refreshBody();
            if (char === 'G') goal.create(wx, wy, 'tile').setTint(0xffff00).refreshBody();
            if (char === '@') { this.startX = wx; this.startY = wy; }
        });
    });

    player = this.physics.add.sprite(this.startX, this.startY, 'player');
    player.setCollideWorldBounds(true);
    this.physics.add.collider(player, platforms);

    // CAMERA
    this.cameras.main.startFollow(player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.8);

    // --- VIRTUAL BUTTONS (IN-SCREEN) ---
    // These are placed relative to the CAMERA/SCREEN, not the world.
    const uiY = 520;
    
    // Left Button
    leftZone = this.add.image(80, uiY, 'btnCircle').setScrollFactor(0).setInteractive().setAlpha(0.5);
    this.add.text(65, uiY-10, "L", {fontSize:'30px', color:'#fff'}).setScrollFactor(0);
    
    // Right Button
    rightZone = this.add.image(200, uiY, 'btnCircle').setScrollFactor(0).setInteractive().setAlpha(0.5);
    this.add.text(185, uiY-10, "R", {fontSize:'30px', color:'#fff'}).setScrollFactor(0);

    // Jump Button (Huge on the right side)
    jumpZone = this.add.image(700, uiY, 'btnCircle').setScrollFactor(0).setInteractive().setAlpha(0.8).setTint(0x00ff00);
    this.add.text(660, uiY-10, "JUMP", {fontSize:'20px', color:'#fff', fontWeight:'bold'}).setScrollFactor(0);

    // Input Listeners
    leftZone.on('pointerdown', () => isLeft = true);
    leftZone.on('pointerup', () => isLeft = false);
    leftZone.on('pointerout', () => isLeft = false);

    rightZone.on('pointerdown', () => isRight = true);
    rightZone.on('pointerup', () => isRight = false);
    rightZone.on('pointerout', () => isRight = false);

    jumpZone.on('pointerdown', () => isJump = true);
}

function update() {
    // Left/Right Logic
    if (isLeft) {
        player.setVelocityX(-250);
    } else if (isRight) {
        player.setVelocityX(250);
    } else {
        player.setVelocityX(0);
    }

    // Jump Logic
    if (isJump) {
        if (player.body.touching.down) {
            player.setVelocityY(-600);
        }
        isJump = false; // Reset jump trigger
    }

    // Reset if you fall off
    if (player.y > 600) this.scene.restart();
        }
