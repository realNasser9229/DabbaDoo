class TextureGen {
    static init(scene) {
        let g = scene.make.graphics({x:0, y:0, add:false});
        // Player
        g.fillStyle(0x00f3ff); g.fillRect(0,0,32,32);
        g.fillStyle(0xffffff); g.fillRect(6,6,6,6); g.fillRect(20,6,6,6);
        g.generateTexture('player', 32, 32);
        // Ground (VISIBLE PURPLE NEON)
        g.clear(); g.lineStyle(3, 0xff00ff); g.fillStyle(0x220022);
        g.strokeRect(0,0,32,32); g.fillRect(0,0,32,32);
        g.generateTexture('block', 32, 32);
        // Spike
        g.clear(); g.fillStyle(0xff3333); 
        g.beginPath(); g.moveTo(0,32); g.lineTo(16,0); g.lineTo(32,32); g.fillPath();
        g.generateTexture('spike', 32, 32);
    }
}

// LEVEL LEGEND: # = Block, ^ = Spike, @ = You, G = Exit
const LEVELS = [
    [
        "#########################",
        "#.......................#",
        "#......G................#",
        "####...###..............#",
        "#............###........#",
        "#..................###..#",
        "#..@..###..^...^........#",
        "#########################"
    ],
    [
        "##########",
        "#G.......#",
        "####.....#",
        "#....###.#",
        "#........#",
        "#.###....#",
        "#........#",
        "#...###..#",
        "#@.......#",
        "##########"
    ]
];

class MainScene extends Phaser.Scene {
    constructor() { super('MainScene'); }

    init(data) {
        this.lvl = data.lvl || 0;
        this.jumpCount = 0;
        this.inputState = { left: false, right: false, jump: false, dash: false };
    }

    preload() { TextureGen.init(this); }

    create() {
        const map = LEVELS[this.lvl];
        this.platforms = this.physics.add.staticGroup();
        this.spikes = this.physics.add.staticGroup();
        this.goal = this.physics.add.staticGroup();

        // Build Level based on the Map array
        map.forEach((row, y) => {
            row.split('').forEach((char, x) => {
                let wx = x * 32, wy = y * 32;
                if(char === '#') this.platforms.create(wx, wy, 'block').refreshBody();
                if(char === '^') this.spikes.create(wx, wy+10, 'spike').refreshBody();
                if(char === 'G') this.goal.create(wx, wy, 'block').setTint(0x00ff00).refreshBody();
                if(char === '@') { this.startX = wx; this.startY = wy; }
            });
        });

        this.player = this.physics.add.sprite(this.startX, this.startY, 'player');
        this.player.setCollideWorldBounds(true).setDragX(2000); // Super snappy stop

        // Camera & World setup
        const worldWidth = map[0].length * 32;
        const worldHeight = map.length * 32;
        this.physics.world.setBounds(0,0, worldWidth, worldHeight);
        this.cameras.main.setBounds(0,0, worldWidth, worldHeight);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1).setZoom(1.8);

        // Collisions
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.overlap(this.player, this.spikes, () => this.scene.restart({lvl:this.lvl}), null, this);
        this.physics.add.overlap(this.player, this.goal, () => {
            let next = (this.lvl + 1) % LEVELS.length;
            this.scene.start('MainScene', {lvl: next});
        }, null, this);

        this.setupControls();
    }

    update() {
        // Horizontal Move (Constant Speed, No Sliding)
        if(this.inputState.left) { this.player.setVelocityX(-250); this.player.flipX = true; }
        else if(this.inputState.right) { this.player.setVelocityX(250); this.player.flipX = false; }
        else { this.player.setVelocityX(0); }

        // Double Jump Logic
        if(this.player.body.touching.down) {
            this.jumpCount = 0;
            this.player.setAngle(0);
        }

        if(this.inputState.jump) {
            if(this.player.body.touching.down || this.jumpCount < 2) {
                this.player.setVelocityY(-450);
                this.jumpCount++;
                // Flip animation on double jump
                if(this.jumpCount === 2) this.tweens.add({targets:this.player, angle:360, duration:400});
            }
            this.inputState.jump = false; // Prevent hold-to-fly
        }

        if(this.inputState.dash) {
            const dir = this.player.flipX ? -1 : 1;
            this.player.setVelocityX(dir * 800);
            this.inputState.dash = false;
        }
    }

    setupControls() {
        const bind = (id, k) => {
            const el = document.getElementById(id);
            el.onpointerdown = (e) => { e.preventDefault(); this.inputState[k] = true; };
            el.onpointerup = (e) => { e.preventDefault(); this.inputState[k] = false; };
        };
        bind('leftBtn', 'left'); bind('rightBtn', 'right'); 
        bind('jumpBtn', 'jump'); bind('dashBtn', 'dash');
        document.getElementById('restartBtn').onclick = () => this.scene.restart();
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 1400 } } },
    scene: MainScene
};
new Phaser.Game(config);
