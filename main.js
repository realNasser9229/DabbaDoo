class DabbaDooFixed extends Phaser.Scene {
    constructor() { super('DabbaDooFixed'); }

    init(data) {
        this.level = data.level || 1;
        this.score = data.score || 0;
        this.hp = 3;
        this.canDoubleJump = false; // Double jump flag
        this.isInvincible = false;
        this.inputState = { left: false, right: false, jump: false };
    }

    preload() {
        this.load.image("bg", "assets/bg.png");
        this.load.image("player", "assets/vulvian.png");
        this.load.image("enemy", "assets/enemy.png");
        this.load.image("cage", "assets/cage.png");
    }

    create() {
        // 1. World Setup
        this.add.image(400, 225, "bg").setAlpha(0.3).setScale(2);
        this.platforms = this.physics.add.staticGroup();
        this.setupLevel();

        // 2. Player setup (SNAPPY PHYSICS)
        this.player = this.physics.add.sprite(100, 300, "player");
        this.player.setCollideWorldBounds(true);
        this.player.setDragX(5000); // Forces an instant stop when letting go

        // 3. UI - Inside the game canvas so it never overlaps
        this.scoreText = this.add.text(20, 20, `SCORE: ${this.score}`, { font: '24px Bungee', fill: '#00f2ff' });
        this.hpText = this.add.text(20, 55, '🍰'.repeat(this.hp), { fontSize: '24px' });

        // 4. Collisions
        this.enemies = this.physics.add.group();
        this.spawnEnemies();
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms);
        this.physics.add.overlap(this.player, this.enemies, this.handleEnemy, null, this);
        this.physics.add.overlap(this.player, this.cage, this.winLevel, null, this);

        // 5. Inputs
        this.setupButtons();
        this.cursors = this.input.keyboard.createCursorKeys();
        
        this.cameras.main.fadeIn(500);
    }

    setupLevel() {
        this.platforms.create(400, 440, null).setDisplaySize(1200, 20).refreshBody();
        // Simple platforms
        this.platforms.create(250, 320, null).setDisplaySize(150, 15).refreshBody();
        this.add.rectangle(250, 320, 150, 15, 0x4444ff);
        
        this.platforms.create(550, 220, null).setDisplaySize(150, 15).refreshBody();
        this.add.rectangle(550, 220, 150, 15, 0x4444ff);

        this.cage = this.physics.add.staticSprite(750, 380, "cage");
    }

    spawnEnemies() {
        for(let i=0; i < this.level; i++) {
            let e = this.enemies.create(400 + (i*100), 100, "enemy");
            e.setVelocityX(120).setBounce(1, 0).setCollideWorldBounds(true);
        }
    }

    update() {
        if (this.hp <= 0) return;

        const moveSpeed = 280; // MODERATE STEADY SPEED

        // Left/Right Movement
        if (this.cursors.left.isDown || this.inputState.left) {
            this.player.setVelocityX(-moveSpeed);
            this.player.setFlipX(true);
        } else if (this.cursors.right.isDown || this.inputState.right) {
            this.player.setVelocityX(moveSpeed);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        // Double Jump Logic
        const onGround = this.player.body.touching.down;
        if (onGround) {
            this.canDoubleJump = true;
        }

        // Jump Input Check
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.inputState.jump) {
            if (onGround) {
                this.performJump();
            } else if (this.canDoubleJump) {
                this.performJump();
                this.canDoubleJump = false; // Double jump spent
                this.juiceJump();
            }
            this.inputState.jump = false; // Reset mobile flag
        }
    }

    performJump() {
        this.player.setVelocityY(-550);
    }

    juiceJump() {
        // Cool visual for the double jump
        const t = this.add.text(this.player.x, this.player.y, "DABBA!!", { font: '20px Bungee', fill: '#ffcc00' }).setOrigin(0.5);
        this.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 600, onComplete: () => t.destroy() });
        this.cameras.main.shake(100, 0.005);
    }

    handleEnemy(p, e) {
        if (this.isInvincible) return;

        if (p.body.velocity.y > 0 && p.y < e.y - 10) {
            e.destroy();
            p.setVelocityY(-350);
            this.score += 100;
            this.scoreText.setText(`SCORE: ${this.score}`);
        } else {
            this.takeDamage();
        }
    }

    takeDamage() {
        this.hp--;
        this.hpText.setText('🍰'.repeat(this.hp));
        if (this.hp <= 0) {
            this.scene.restart({ level: 1, score: 0 });
        } else {
            this.isInvincible = true;
            this.player.setTint(0xff0000);
            this.time.delayedCall(1000, () => {
                this.player.clearTint();
                this.isInvincible = false;
            });
        }
    }

    winLevel() {
        this.scene.start('DabbaDooFixed', { level: this.level + 1, score: this.score + 500 });
    }

    setupButtons() {
        const bind = (id, stateKey) => {
            const btn = document.getElementById(id);
            btn.ontouchstart = (e) => { e.preventDefault(); this.inputState[stateKey] = true; };
            btn.ontouchend = (e) => { e.preventDefault(); this.inputState[stateKey] = false; };
        };

        bind('leftBtn', 'left');
        bind('rightBtn', 'right');
        bind('jumpBtn', 'jump');

        document.getElementById('restartBtn').onclick = () => this.scene.restart({ level: this.level, score: this.score });
    }
}

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: "game",
        width: 800,
        height: 450
    },
    physics: { default: "arcade", arcade: { gravity: { y: 1400 } } },
    scene: DabbaDooFixed
};

new Phaser.Game(config);
        
