// ---------------------------------------------------------
// 1. CHARACTER & WORLD ASSET GENERATOR
// ---------------------------------------------------------
class GraphicsGen {
    static generate(scene) {
        let g = scene.make.graphics({x: 0, y: 0, add: false});

        // VULVIAN (The Hero) - Neon Cyan with Headband
        g.fillStyle(0x00f3ff); g.fillRect(0, 0, 32, 32);
        g.fillStyle(0xff00ff); g.fillRect(0, 4, 32, 6); // Headband
        g.fillStyle(0xffffff); g.fillRect(6, 12, 6, 6); g.fillRect(20, 12, 6, 6); // Eyes
        g.generateTexture('vulvian', 32, 32);

        // BOOBI DOODI (The Target) - Pink and Small
        g.clear(); g.fillStyle(0xff00ff); g.fillCircle(16, 16, 12);
        g.fillStyle(0xffffff); g.fillCircle(12, 12, 3); g.fillCircle(20, 12, 3);
        g.generateTexture('boobi', 32, 32);

        // THE CAGE
        g.clear(); g.lineStyle(3, 0xff0000); g.strokeRect(2, 2, 44, 44);
        for(let i=0; i<5; i++) { g.lineBetween(8 + (i*8), 2, 8 + (i*8), 46); }
        g.generateTexture('cage', 48, 48);

        // NEON BRICK
        g.clear(); g.lineStyle(2, 0x00ff66); g.strokeRect(0, 0, 32, 32);
        g.fillStyle(0x002211); g.fillRect(2, 2, 28, 28);
        g.generateTexture('brick', 32, 32);

        // UI BUTTON CIRCLE
        g.clear(); g.fillStyle(0xffffff, 0.15); g.fillCircle(60, 60, 60);
        g.lineStyle(4, 0xffffff, 0.3); g.strokeCircle(60, 60, 60);
        g.generateTexture('ui-btn', 120, 120);
    }
}

// ---------------------------------------------------------
// 2. ADVENTURE SCENE
// ---------------------------------------------------------
class AdventureScene extends Phaser.Scene {
    constructor() { super('AdventureScene'); }

    init() {
        this.jumps = 0;
        this.isMovingLeft = false;
        this.isMovingRight = false;
        this.score = 0;
    }

    preload() { GraphicsGen.generate(this); }

    create() {
        // --- THE WORLD MAP ---
        // #=Wall, @=Vulvian, B=Boobi in Cage, ^=Spike
        const map = [
            "##########################################",
            "#........................................#",
            "#...................................B....#",
            "#.................................#####..#",
            "#..........................###...........#",
            "#..........####..........................#",
            "#...................####.................#",
            "####.....................................#",
            "#.........######...........^^^^..........#",
            "#..@...............#######################",
            "##########################################"
        ];

        this.platforms = this.physics.add.staticGroup();
        this.rescueTarget = this.physics.add.sprite(0, 0, 'boobi');
        this.cage = this.physics.add.staticImage(0, 0, 'cage');

        map.forEach((row, y) => {
            row.split('').forEach((char, x) => {
                let wx = x * 32, wy = y * 32;
                if (char === '#') this.platforms.create(wx, wy, 'brick').refreshBody();
                if (char === '@') { this.startX = wx; this.startY = wy; }
                if (char === 'B') { 
                    this.rescueTarget.setPosition(wx, wy); 
                    this.cage.setPosition(wx, wy);
                }
            });
        });

        // --- THE VULVIAN ---
        this.player = this.physics.add.sprite(this.startX, this.startY, 'vulvian');
        this.player.setCollideWorldBounds(true).setDragX(1500);
        this.physics.add.collider(this.player, this.platforms);

        // Rescue Logic
        this.physics.add.overlap(this.player, this.rescueTarget, this.rescueSuccess, null, this);

        // --- CAMERA ---
        this.cameras.main.setBounds(0, 0, map[0].length * 32, map.length * 32);
        this.physics.world.setBounds(0, 0, map[0].length * 32, map.length * 32);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1).setZoom(1.5);

        // --- INTERNAL CONTROLS (THE PERMANENT FIX) ---
        this.createMobileControls();

        // UI Text
        this.add.text(20, 20, "MISSION: RESCUE BOOBI DOODI", { 
            font: 'bold 18px Arial', fill: '#00f3ff' 
        }).setScrollFactor(0);
    }

    createMobileControls() {
        const screenW = this.scale.width;
        const screenH = this.scale.height;
        const btnY = screenH - 80;

        // LEFT
        let btnL = this.add.image(80, btnY, 'ui-btn').setInteractive().setScrollFactor(0).setAlpha(0.6);
        this.add.text(65, btnY - 15, "◀", { fontSize: '40px' }).setScrollFactor(0);
        btnL.on('pointerdown', () => this.isMovingLeft = true);
        btnL.on('pointerup', () => this.isMovingLeft = false);
        btnL.on('pointerout', () => this.isMovingLeft = false);

        // RIGHT
        let btnR = this.add.image(220, btnY, 'ui-btn').setInteractive().setScrollFactor(0).setAlpha(0.6);
        this.add.text(205, btnY - 15, "▶", { fontSize: '40px' }).setScrollFactor(0);
        btnR.on('pointerdown', () => this.isMovingRight = true);
        btnR.on('pointerup', () => this.isMovingRight = false);
        btnR.on('pointerout', () => this.isMovingRight = false);

        // JUMP
        let btnJ = this.add.image(screenW - 100, btnY, 'ui-btn').setInteractive().setScrollFactor(0).setAlpha(0.8).setTint(0x00ff00);
        this.add.text(screenW - 140, btnY - 10, "JUMP", { fontSize: '24px', fontWeight: 'bold' }).setScrollFactor(0);
        btnJ.on('pointerdown', () => this.handleJump());
    }

    handleJump() {
        if (this.player.body.touching.down) {
            this.jumps = 1;
            this.player.setVelocityY(-550);
        } else if (this.jumps < 2) { // DOUBLE JUMP
            this.jumps = 2;
            this.player.setVelocityY(-500);
            this.tweens.add({ targets: this.player, angle: 360, duration: 400 });
        }
    }

    rescueSuccess() {
        this.physics.pause();
        this.cage.destroy();
        this.rescueTarget.setTint(0xffff00);
        
        const winText = this.add.text(this.player.x, this.player.y - 100, "BOOBI DOODI SAVED!", {
            fontSize: '32px', fill: '#0f0', backgroundColor: '#000'
        }).setOrigin(0.5);

        this.time.delayedCall(2000, () => {
            this.scene.restart();
        });
    }

    update() {
        if (this.isMovingLeft) {
            this.player.setVelocityX(-250);
            this.player.flipX = true;
        } else if (this.isMovingRight) {
            this.player.setVelocityX(250);
            this.player.flipX = false;
        } else {
            this.player.setVelocityX(0);
        }

        // Falling out of bounds reset
        if (this.player.y > 1000) this.scene.restart();
    }
}

// ---------------------------------------------------------
// 3. LAUNCHER
// ---------------------------------------------------------
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.ENVELOP,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600
    },
    physics: { default: 'arcade', arcade: { gravity: { y: 1500 } } },
    scene: AdventureScene
};

new Phaser.Game(config);
                                  
