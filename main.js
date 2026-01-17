class TextureGen {
    static init(scene) {
        let g = scene.make.graphics({x:0, y:0, add:false});
        // Player
        g.fillStyle(0x00f3ff); g.fillRect(0,0,32,32); g.fillStyle(0xffffff); g.fillRect(6,6,6,6); g.fillRect(20,6,6,6);
        g.generateTexture('player', 32, 32);
        // Tiles
        g.clear(); g.lineStyle(2, 0x00f3ff); g.strokeRect(0,0,32,32); g.generateTexture('tile', 32, 32);
        // Powerup
        g.clear(); g.fillStyle(0x00ff00); g.fillCircle(16,16,12); g.generateTexture('power', 32, 32);
        // Coin
        g.clear(); g.fillStyle(0xffcc00); g.fillCircle(8,8,8); g.generateTexture('coin', 16, 16);
        // Spike
        g.clear(); g.fillStyle(0xff0000); g.beginPath(); g.moveTo(0,32); g.lineTo(16,0); g.lineTo(32,32); g.fillPath();
        g.generateTexture('spike', 32, 32);
    }
}

const LEVELS = [
    ["....................", ".@...o...o...o...G..", "####################"], // Level 1
    ["....G...", "....#...", "........", "...=....", "........", ".@......", "####...."], // Level 2 (Vert)
    [".......G", "....####", ".P..####", ".#..####", ".#..####", "@#..####", "########"]  // Level 3 (Wall Climb)
];

class MainScene extends Phaser.Scene {
    constructor() { super('MainScene'); }

    init(data) {
        this.lvl = data.lvl || 0;
        this.score = data.score || 0;
        this.maxJumps = 2; // Default Double Jump
        this.jumpCount = 0;
        this.inputState = { left: false, right: false, jump: false, dash: false };
    }

    preload() { TextureGen.init(this); }

    create() {
        const map = LEVELS[this.lvl];
        this.platforms = this.physics.add.staticGroup();
        this.coins = this.physics.add.staticGroup();
        this.spikes = this.physics.add.staticGroup();
        this.powerups = this.physics.add.staticGroup();
        this.goal = this.physics.add.staticGroup();

        map.forEach((row, y) => {
            row.split('').forEach((char, x) => {
                let wx = x*32, wy = y*32;
                if(char === '#') this.platforms.create(wx, wy, 'tile').refreshBody();
                if(char === 'o') this.coins.create(wx, wy, 'coin');
                if(char === 'P') this.powerups.create(wx, wy, 'power');
                if(char === '^') this.spikes.create(wx, wy+10, 'spike').refreshBody();
                if(char === 'G') this.goal.create(wx, wy, 'tile').setTint(0x00ff00);
                if(char === '@') { this.pX = wx; this.pY = wy; }
            });
        });

        this.player = this.physics.add.sprite(this.pX, this.pY, 'player');
        this.player.setCollideWorldBounds(true).setDragX(1500);
        
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.overlap(this.player, this.coins, (p,c)=>{c.destroy(); this.score+=10; this.updateUI();}, null, this);
        this.physics.add.overlap(this.player, this.powerups, (p,pu)=>{pu.destroy(); this.maxJumps=3; this.toast("TRIPLE JUMP!");}, null, this);
        this.physics.add.overlap(this.player, this.spikes, ()=>this.scene.restart({lvl:this.lvl, score:this.score}), null, this);
        this.physics.add.overlap(this.player, this.goal, ()=>this.scene.start('MainScene', {lvl:this.lvl+1, score:this.score}), null, this);

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1).setZoom(1.5);
        this.physics.world.setBounds(0,0, 2000, 2000);

        this.setupBtns();
    }

    update() {
        if(this.inputState.left) { this.player.setVelocityX(-250); this.player.flipX=true; }
        else if(this.inputState.right) { this.player.setVelocityX(250); this.player.flipX=false; }
        else { this.player.setVelocityX(0); }

        if(this.player.body.touching.down) this.jumpCount = 0;

        if(this.inputState.jump) {
            if(this.player.body.touching.down || this.jumpCount < this.maxJumps) {
                this.player.setVelocityY(-450);
                this.jumpCount++;
                if(this.jumpCount > 1) this.tweens.add({targets:this.player, angle:this.player.angle+360, duration:300});
            }
            this.inputState.jump = false;
        }

        if(this.inputState.dash) {
            this.player.setVelocityX(this.player.flipX ? -800 : 800);
            this.inputState.dash = false;
        }
    }

    updateUI() {
        document.getElementById('score-val').innerText = `BITS: ${this.score}`;
        document.getElementById('lvl-val').innerText = `LVL: ${this.lvl+1}`;
    }

    toast(txt) {
        let t = this.add.text(this.player.x, this.player.y-50, txt, {font:'12px Orbitron', fill:'#0f0'}).setOrigin(0.5);
        this.tweens.add({targets:t, y:t.y-50, alpha:0, onComplete:()=>t.destroy()});
    }

    setupBtns() {
        const b = (id, k) => {
            const el = document.getElementById(id);
            el.onpointerdown = (e) => { e.preventDefault(); this.inputState[k] = true; };
            el.onpointerup = (e) => { e.preventDefault(); this.inputState[k] = false; };
        };
        b('leftBtn', 'left'); b('rightBtn', 'right'); b('jumpBtn', 'jump'); b('dashBtn', 'dash');
        document.getElementById('restartBtn').onclick = () => this.scene.restart();
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 1200 } } },
    scene: MainScene
};
new Phaser.Game(config);
                    
