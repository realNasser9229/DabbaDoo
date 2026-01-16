class DabbaDooUltimate extends Phaser.Scene {
    constructor() { super('DabbaDooUltimate'); }

    init(data) {
        this.level = data.level || 1;
        this.hp = 3;
        this.score = data.score || 0;
        this.isInvincible = false;
        this.jumpCount = 0; // For double jump
        this.inputState = { left: false, right: false, jump: false };
    }

    preload() {
        this.load.image("bg", "assets/bg.png");
        this.load.image("player", "assets/vulvian.png");
        this.load.image("enemy", "assets/enemy.png");
        this.load.image("cage", "assets/cage.png");
    }

    create() {
        const { width, height } = this.scale;

        // 1. SCENE SETUP
        this.add.image(400, 225, "bg").setAlpha(0.3).setScale(2).setScrollFactor(0);
        this.platforms = this.physics.add.staticGroup();
        this.setupMap();

        // 2. PLAYER (Snappy Physics)
        this.player = this.physics.add.sprite(100, 300, "player");
        this.player.setCollideWorldBounds(true);
        this.player.setDragX(2000); // Instant stop
        
        // 3. JUICE: TRAIL EFFECT
        this.trailTimer = this.time.addEvent({
            delay: 50,
            callback: this.createTrail,
            callbackScope: this,
            loop: true
        });

        // 4. ENEMIES & OBJECTS
        this.enemies = this.physics.add.group();
        this.spawnEnemies();
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms);
        this.physics.add.overlap(this.player, this.enemies, this.onHitEnemy, null, this);
        this.physics.add.overlap(this.player, this.cage, this.nextLevel, null, this);

        // 5. UI (Internal)
        this.add.text(20, 20, `LVL ${this.level} | SCORE: ${this.score}`, { font: '20px Bungee', fill: '#00f2ff' });
        this.hpText = this.add.text(20, 50, '🍰'.repeat(this.hp), { fontSize: '24px' });

        this.setupControls();
        this.cameras.main.fadeIn(500);
        this.cameras.main.setZoom(1.2); // Closer action
        this.cameras.main.pan(400, 225, 500, 'Power2');
        this.cameras.main.zoomTo(1, 1000);
    }

    setupMap() {
        this.platforms.create(400, 440, null).setDisplaySize(1200, 20).refreshBody();
        // Dynamic platforms based on level
        for(let i=0; i<this.level + 2; i++) {
            let x = 200 + (i * 150);
            let y = 350 - (i * 50);
            this.platforms.create(x, y, null).setDisplaySize(120, 15).refreshBody();
            this.add.rectangle(x, y, 120, 15, 0xff2a2a).setStrokeStyle(2, 0xffffff);
        }
        this.cage = this.physics.add.staticSprite(750, 100, "cage");
    }

    spawnEnemies() {
        for(let i=0; i<this.level; i++) {
            let e = this.enemies.create(Phaser.Math.Between(300, 700), 100, "enemy");
            e.setVelocityX(150).setBounce(1, 0).setCollideWorldBounds(true);
        }
    }

    update() {
        if (this.hp <= 0) return;

        const cursors = this.input.keyboard.createCursorKeys();
        const speed = 300; // Moderate, snappy speed

        // Snappy Movement (No acceleration)
        if (cursors.left.isDown || this.inputState.left) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true);
        } else if (cursors.right.isDown || this.inputState.right) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        // Double Jump Logic
        if (this.player.body.touching.down) {
            this.jumpCount = 0;
        }

        const canJump = (this.input.keyboard.checkDown(cursors.up, 250) || this.inputState.jump);
        
        if (canJump && this.jumpCount < 2) {
            this.jump();
        }
    }

    jump() {
        this.player.setVelocityY(-550);
        this.jumpCount++;
        this.inputState.jump = false; // Reset mobile trigger
        
        // Squash and Stretch juice
        this.tweens.add({
            targets: this.player,
            scaleY: 1.5, scaleX: 0.5,
            duration: 100, yoyo: true
        });

        if (this.jumpCount === 2) {
            this.cameras.main.shake(100, 0.005);
            this.popText(this.player.x, this.player.y, "DOUBLE!", "#ffcc00");
        }
    }

    createTrail() {
        // Only create trail if moving fast or in air
        if (Math.abs(this.player.body.velocity.x) > 100 || !this.player.body.touching.down) {
            let trail = this.add.image(this.player.x, this.player.y, "player");
            trail.setAlpha(0.4).setTint(0x00f2ff).setFlipX(this.player.flipX);
            this.tweens.add({
                targets: trail,
                alpha: 0,
                scale: 0.5,
                duration: 300,
                onComplete: () => trail.destroy()
            });
        }
    }

    onHitEnemy(p, e) {
        if (this.isInvincible) return;

        if (p.body.velocity.y > 0 && p.y < e.y - 10) {
            e.destroy();
            p.setVelocityY(-400);
            this.score += 100;
            this.cameras.main.shake(100, 0.02);
            this.popText(e.x, e.y, "+100", "#fff");
        } else {
            this.takeDamage();
        }
    }

    takeDamage() {
        this.hp--;
        this.hpText.setText('🍰'.repeat(this.hp));
        this.isInvincible = true;
        this.player.setTint(0xff0000);
        this.cameras.main.flash(200, 255, 0, 0);

        if (this.hp <= 0) {
            this.add.text(400, 225, 'STUCK?', { font: '60px Bungee', fill: '#f00' }).setOrigin(0.5);
            this.time.delayedCall(2000, () => this.scene.restart({level: 1, score: 0}));
        } else {
            this.time.delayedCall(1000, () => { this.player.clearTint(); this.isInvincible = false; });
        }
    }

    nextLevel() {
        this.scene.start('DabbaDooUltimate', { level: this.level + 1, score: this.score + 500 });
    }

    popText(x, y, msg, color) {
        let t = this.add.text(x, y, msg, { font: 'bold 20px Bungee', fill: color });
        this.tweens.add({ targets: t, y: y-50, alpha: 0, duration: 600, onComplete: () => t.destroy() });
    }

    setupControls() {
        const bind = (id, key) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.ontouchstart = (e) => { e.preventDefault(); this.inputState[key] = true; };
            el.ontouchend = (e) => { e.preventDefault(); this.inputState[key] = false; };
        };
        bind('btn-left', 'left');
        bind('btn-right', 'right');
        bind('btn-jump', 'jump');

        // RESTART BUTTON
        document.getElementById('btn-restart').onclick = () => {
            this.cameras.main.fade(300, 0, 0, 0);
            this.time.delayedCall(300, () => this.scene.restart({level: this.level, score: this.score}));
        };
    }
}

const config = {
    type: Phaser.AUTO,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 800, height: 450 },
    parent: "game-container",
    physics: { default: "arcade", arcade: { gravity: { y: 1400 }, debug: false } },
    scene: DabbaDooUltimate
};

new Phaser.Game(config);
    
