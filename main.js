class DabbaDooPro extends Phaser.Scene {
  constructor() {
    super('DabbaDooPro');
  }

  init() {
    this.score = 0;
    this.hp = 3;
    this.combo = 0;
    this.isInvincible = false;
    this.inputState = { left: false, right: false, jump: false };
  }

  preload() {
    // Assets
    this.load.image("bg", "assets/bg.png");
    this.load.image("player", "assets/vulvian.png");
    this.load.image("enemy", "assets/enemy.png");
    this.load.image("cage", "assets/cage.png");
    
    // Generate Procedural Sparkle Particle
    const dot = this.make.graphics({ x: 0, y: 0, add: false });
    dot.fillStyle(0xffffff, 1);
    dot.fillCircle(4, 4, 4);
    dot.generateTexture('spark', 8, 8);
  }

  create() {
    const { width, height } = this.scale;

    // 1. DYNAMIC WORLD
    this.background = this.add.tileSprite(400, 225, 800, 450, "bg").setScale(2);
    
    // 2. PHYSICS GROUPS
    this.platforms = this.physics.add.staticGroup();
    this.setupLevel();

    // 3. PLAYER WITH TRAIL
    this.player = this.physics.add.sprite(100, 350, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setDragX(1500); // Super snappy stop
    this.player.body.setGravityY(1200);

    // 4. JUICE: PARTICLES
    this.emitter = this.add.particles(0, 0, 'spark', {
      lifespan: 400,
      scale: { start: 1, end: 0 },
      alpha: { start: 0.5, end: 0 },
      speed: 100,
      rotate: { min: 0, max: 360 },
      blendMode: 'ADD',
      on: false
    });

    // 5. ENEMIES
    this.enemies = this.physics.add.group();
    this.spawnEnemy(500, 300);
    this.spawnEnemy(700, 300);
    this.spawnEnemy(300, 100);

    // 6. GOAL
    this.cage = this.physics.add.staticSprite(750, 350, "cage");

    // 7. OVERLAPS & COLLIDERS
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.overlap(this.player, this.enemies, this.handleEnemyCollision, null, this);
    this.physics.add.overlap(this.player, this.cage, this.victory, null, this);

    // 8. INPUTS
    this.cursors = this.input.keyboard.createCursorKeys();
    this.initMobileControls();

    // 9. SCREEN EFFECTS
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  setupLevel() {
    // Floor
    this.platforms.create(400, 440, null).setDisplaySize(800, 40).refreshBody();
    // Ledges
    const ledgeColor = 0x333344;
    this.addLedge(600, 320, 200, 20, ledgeColor);
    this.addLedge(200, 250, 150, 20, ledgeColor);
    this.addLedge(450, 150, 150, 20, ledgeColor);
  }

  addLedge(x, y, w, h, color) {
    this.platforms.create(x, y, null).setDisplaySize(w, h).refreshBody();
    this.add.rectangle(x, y, w, h, color).setStrokeStyle(2, 0xffffff);
  }

  spawnEnemy(x, y) {
    const e = this.enemies.create(x, y, "enemy");
    e.setVelocityX(Phaser.Math.Between(-100, 100));
    e.setBounce(1, 0);
    e.setCollideWorldBounds(true);
  }

  update(time, delta) {
    if (this.hp <= 0) return;

    // Movement Logic
    const accel = 1800;
    if (this.cursors.left.isDown || this.inputState.left) {
      this.player.setAccelerationX(-accel);
      this.player.setFlipX(true);
    } else if (this.cursors.right.isDown || this.inputState.right) {
      this.player.setAccelerationX(accel);
      this.player.setFlipX(false);
    } else {
      this.player.setAccelerationX(0);
    }

    // Jump Logic
    if ((this.cursors.up.isDown || this.inputState.jump) && this.player.body.touching.down) {
      this.player.setVelocityY(-650);
      this.juiceJump();
    }

    // Parallax background effect
    this.background.tilePositionX += this.player.body.velocity.x * 0.001;

    // Enemy Patrol AI
    this.enemies.children.iterate(e => {
      if (e.body.blocked.left) e.setVelocityX(100);
      if (e.body.blocked.right) e.setVelocityX(-100);
    });
  }

  handleEnemyCollision(player, enemy) {
    // Check for stomp (falling on head)
    if (player.body.velocity.y > 0 && player.y < enemy.y - 10) {
      this.combo++;
      enemy.destroy();
      player.setVelocityY(-400); // Bounce up
      this.score += (100 * this.combo);
      this.updateUI();
      this.juiceStomp(enemy.x, enemy.y);
    } else {
      this.takeDamage();
    }
  }

  takeDamage() {
    if (this.isInvincible) return;
    
    this.hp--;
    this.combo = 0;
    this.updateUI();
    this.cameras.main.shake(200, 0.03);
    this.player.setTint(0xff0000);
    
    this.isInvincible = true;
    this.time.delayedCall(1000, () => {
      this.player.clearTint();
      this.isInvincible = false;
    });

    if (this.hp <= 0) this.gameOver();
  }

  updateUI() {
    document.getElementById('hearts-display').innerText = "🍰".repeat(this.hp);
    document.getElementById('score-display').innerText = this.score.toString().padStart(5, '0');
  }

  juiceJump() {
    this.emitter.emitParticleAt(this.player.x, this.player.y + 20, 10);
    this.tweens.add({
      targets: this.player,
      scaleY: 1.4, scaleX: 0.6,
      duration: 100, yoyo: true
    });
  }

  juiceStomp(x, y) {
    this.emitter.emitParticleAt(x, y, 20);
    const txt = this.add.text(x, y, `COMBO x${this.combo}`, { font: 'bold 20px Bungee', color: '#00f2ff' });
    this.tweens.add({ targets: txt, y: y - 100, alpha: 0, duration: 800 });
  }

  initMobileControls() {
    const btns = {
      'leftBtn': 'left',
      'rightBtn': 'right',
      'jumpBtn': 'jump'
    };

    Object.keys(btns).forEach(id => {
      const el = document.getElementById(id);
      const key = btns[id];
      el.addEventListener('touchstart', (e) => { e.preventDefault(); this.inputState[key] = true; });
      el.addEventListener('touchend', (e) => { e.preventDefault(); this.inputState[key] = false; });
    });
  }

  victory() {
    this.physics.pause();
    this.add.text(400, 225, 'VICTORY!', { fontSize: '64px', color: '#00ff00' }).setOrigin(0.5);
    this.time.delayedCall(2000, () => this.scene.restart());
  }

  gameOver() {
    this.physics.pause();
    this.add.text(400, 225, 'RETIRED.', { fontSize: '64px', color: '#ff0000' }).setOrigin(0.5);
    this.time.delayedCall(2000, () => this.scene.restart());
  }
}

// Final Config with Anti-Alias fix
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: "game",
  pixelArt: false, // Set to false for smoother high-dpi rendering
  roundPixels: true,
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 1000 }, debug: false }
  },
  scene: DabbaDooPro
};

const game = new Phaser.Game(config);
      
