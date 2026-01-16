// --------------------
// GAME DATA & LEVELS
// --------------------
const GAME_DATA = {
    score: 0,
    currentLevel: 1,
    maxLevels: 2
};

class MainScene extends Phaser.Scene {
    constructor() { super('MainScene'); }

    init(data) {
        this.level = data.level || 1;
        this.hp = 3;
        this.isInvincible = false;
        this.inputState = { left: false, right: false, jump: false };
    }

    preload() {
        this.load.image("bg", "assets/bg.png");
        this.load.image("player", "assets/vulvian.png");
        this.load.image("enemy", "assets/enemy.png");
        this.load.image("cage", "assets/cage.png");
        
        // Procedural Particles
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('p', 8, 8);
    }

    create() {
        const { width, height } = this.scale;

        // 1. Setup World
        this.add.image(400, 225, "bg").setAlpha(0.4).setScale(2).setScrollFactor(0);
        this.platforms = this.physics.add.staticGroup();
        this.movingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });

        this.buildLevel(this.level);

        // 2. Player Setup
        this.player = this.physics.add.sprite(100, 300, "player");
        this.player.setCollideWorldBounds(true).setDragX(1200);
        
        // 3. UI (Internal to Phaser for scaling fix)
        this.hudScore = this.add.text(20, 20, `SCORE: ${GAME_DATA.score}`, { font: '24px Bungee', fill: '#fff' }).setScrollFactor(0);
        this.hudHP = this.add.text(20, 50, '🍰'.repeat(this.hp), { fontSize: '24px' }).setScrollFactor(0);
        this.levelText = this.add.text(400, 30, `LEVEL ${this.level}`, { font: '20px Bungee', fill: '#ff2a2a' }).setOrigin(0.5).setScrollFactor(0);

        // 4. Effects
        this.emitter = this.add.particles(0, 0, 'p', {
            speed: 100, scale: { start: 1, end: 0 }, lifespan: 400, on: false
        });

        // 5. Physics logic
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.player, this.movingPlatforms);
        
        this.enemies = this.physics.add.group();
        this.setupEnemies(this.level);
        this.physics.add.collider(this.enemies, this.platforms);
        this.physics.add.collider(this.enemies, this.movingPlatforms);
        
        this.physics.add.overlap(this.player, this.enemies, this.handleHit, null, this);
        this.physics.add.overlap(this.player, this.cage, this.nextLevel, null, this);

        this.setupMobileControls();
        this.cameras.main.fadeIn(400);
    }

    buildLevel(lvl) {
        // Shared Floor
        this.platforms.create(400, 440, null).setDisplaySize(800, 20).refreshBody();

        if (lvl === 1) {
            this.platforms.create(200, 300, null).setDisplaySize(150, 20).refreshBody();
            this.platforms.create(600, 250, null).setDisplaySize(200, 20).refreshBody();
            this.cage = this.physics.add.staticSprite(750, 200, "cage");
        } 
        else if (lvl === 2) {
            // Level 2: Moving Platforms!
            let mp = this.movingPlatforms.create(400, 300, null);
            mp.setDisplaySize(150, 20).refreshBody();
            this.tweens.add({
                targets: mp.body.velocity,
                x: 150, duration: 2000, yoyo: true, repeat: -1
            });

            this.platforms.create(100, 200, null).setDisplaySize(100, 20).refreshBody();
            this.platforms.create(700, 150, null).setDisplaySize(100, 20).refreshBody();
            this.cage = this.physics.add.staticSprite(750, 100, "cage");
        }
    }

    setupEnemies(lvl) {
        const count = lvl * 2;
        for(let i=0; i<count; i++) {
            let e = this.enemies.create(Phaser.Math.Between(300, 700), 100, "enemy");
            e.setVelocityX(lvl === 2 ? 180 : 100).setBounce(1, 0).setCollideWorldBounds(true);
        }
    }

    update() {
        if (this.hp <= 0) return;

        const cursors = this.input.keyboard.createCursorKeys();
        
        // Movement
        if (cursors.left.isDown || this.inputState.left) {
            this.player.setAccelerationX(-1600);
            this.player.setFlipX(true);
        } else if (cursors.right.isDown || this.inputState.right) {
            this.player.setAccelerationX(1600);
            this.player.setFlipX(false);
        } else {
            this.player.setAccelerationX(0);
        }

        // Jump
        if ((cursors.up.isDown || this.inputState.jump) && this.player.body.touching.down) {
            this.player.setVelocityY(-600);
            this.emitter.emitParticleAt(this.player.x, this.player.y + 20, 10);
        }
    }

    handleHit(p, e) {
        if (this.isInvincible) return;

        // Stomp Logic
        if (p.body.velocity.y > 0 && p.y < e.y - 10) {
            e.destroy();
            p.setVelocityY(-400);
            GAME_DATA.score += 100;
            this.hudScore.setText(`SCORE: ${GAME_DATA.score}`);
            this.cameras.main.shake(100, 0.01);
        } else {
            this.hp--;
            this.hudHP.setText('🍰'.repeat(this.hp));
            this.isInvincible = true;
            p.setTint(0xff0000);
            this.cameras.main.shake(300, 0.02);
            
            if (this.hp <= 0) {
                this.add.text(400, 225, 'GAME OVER', { font: '60px Bungee', fill: '#f00' }).setOrigin(0.5);
                this.time.delayedCall(2000, () => { GAME_DATA.score = 0; this.scene.restart({level: 1}); });
            } else {
                this.time.delayedCall(1000, () => { p.clearTint(); this.isInvincible = false; });
            }
        }
    }

    nextLevel() {
        if (this.level < GAME_DATA.maxLevels) {
            this.scene.start('MainScene', { level: this.level + 1 });
        } else {
            this.add.text(400, 225, 'YOU WON!', { font: '60px Bungee', fill: '#0f0' }).setOrigin(0.5);
            this.time.delayedCall(3000, () => { GAME_DATA.score = 0; this.scene.restart({level: 1}); });
        }
    }

    setupMobileControls() {
        const map = { 'leftBtn': 'left', 'rightBtn': 'right', 'jumpBtn': 'jump' };
        Object.keys(map).forEach(id => {
            const el = document.getElementById(id);
            el.ontouchstart = (e) => { e.preventDefault(); this.inputState[map[id]] = true; };
            el.ontouchend = (e) => { e.preventDefault(); this.inputState[map[id]] = false; };
        });
    }
}

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 450
    },
    parent: "game",
    physics: { default: "arcade", arcade: { gravity: { y: 1200 }, debug: false } },
    scene: MainScene
};

new Phaser.Game(config);
          
