// --------------------
// MAIN GAME SCENE
// --------------------
class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
  }

  // --- VARIABLES ---
  init() {
    this.score = 0;
    this.hearts = 3;
    this.isGameOver = false;
    this.jumpCount = 0; // For double jump
    this.canJump = true;
    this.isInvincible = false; // "I-Frames" after getting hit

    // Input Flags
    this.inputs = { left: false, right: false, jump: false };
  }

  // --- PRELOAD ASSETS ---
  preload() {
    this.load.image("bg", "assets/bg.png");
    this.load.image("vulvian", "assets/vulvian.png");
    this.load.image("enemy", "assets/enemy.png");
    this.load.image("cage", "assets/cage.png");
    
    // Create a simple particle graphic purely in code (no image needed)
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(5, 5, 5);
    graphics.generateTexture('dust', 10, 10);
  }

  // --- CREATE WORLD ---
  create() {
    // 1. Background (Centered)
    this.add.image(400, 225, "bg").setScale(2).setScrollFactor(0.1); 

    // 2. Platforms
    this.platforms = this.physics.add.staticGroup();
    // Floor
    this.platforms.create(400, 440, null).setDisplaySize(1000, 40).refreshBody().setVisible(false); // Invisible collider for floor
    // Visual floor (if your bg doesn't have one, or just purely collision)
    
    // Ledges
    this.createPlatform(600, 310, 200, 20);
    this.createPlatform(150, 260, 150, 20);
    this.createPlatform(400, 180, 120, 20); // Added an extra platform

    // 3. Player
    this.player = this.physics.add.sprite(100, 300, "vulvian");
    this.player.setBounce(0); // No bounce on landing feels tighter
    this.player.setCollideWorldBounds(true);
    this.player.setDragX(600); // Stops the player quickly when keys released

    // 4. Particles (The Juice!)
    this.dustParticles = this.add.particles(0, 0, 'dust', {
      speed: 100,
      scale: { start: 0.5, end: 0 },
      blendMode: 'ADD',
      lifespan: 300,
      on: false // Don't emit yet
    });

    // 5. Enemies (Group)
    this.enemies = this.physics.add.group({
      bounceX: 1, 
      bounceY: 0.2,
      collideWorldBounds: true
    });
    
    // Spawn Enemies
    this.spawnEnemy(520, 100);
    this.spawnEnemy(700, 100);
    this.spawnEnemy(300, 20); // One falling from sky

    // 6. Cage / Goal
    this.cage = this.physics.add.staticSprite(750, 250, "cage"); // Moved it up slightly

    // 7. Collisions
    this.physics.add.collider(this.player, this.platforms, this.onLand, null, this);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.cage, this.rescueBro, null, this);

    // 8. Inputs
    this.cursors = this.input.keyboard.createCursorKeys();
    this.setupMobileControls();

    // 9. UI
    this.heartText = this.add.text(20, 20, "❤❤❤", { fontSize: "30px" });
    this.scoreText = this.add.text(20, 60, "Score: 0", { 
        fontSize: "24px", 
        fontFamily: 'Fredoka One',
        stroke: '#000', 
        strokeThickness: 4 
    });

    // Intro Popup
    this.popText(400, 150, "GO SAVE DOODI!", "#ffffff");
  }

  // --- HELPER: Create Platform Visuals ---
  createPlatform(x, y, w, h) {
    let p = this.platforms.create(x, y, null);
    p.setDisplaySize(w, h);
    p.refreshBody();
    // Add a rectangle so we can see it if assets fail
    let r = this.add.rectangle(x, y, w, h, 0x6666ff);
  }

  // --- HELPER: Spawn Enemy ---
  spawnEnemy(x, y) {
    let enemy = this.enemies.create(x, y, "enemy");
    enemy.setVelocityX(100); // Start moving right
    enemy.setDragX(0);
    enemy.setFrictionX(0);
  }

  // --- UPDATE LOOP ---
  update() {
    if (this.isGameOver) return;

    const speed = 260;
    const jumpForce = -550;

    // 1. Horizontal Movement
    if (this.cursors.left.isDown || this.inputs.left) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true); // Face left
      if (this.player.body.touching.down) this.emitDust(); // Run dust
    } 
    else if (this.cursors.right.isDown || this.inputs.right) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false); // Face right
      if (this.player.body.touching.down) this.emitDust(); // Run dust
    } 

    // 2. Jumping (Double Jump Logic)
    const isJumpDown = this.cursors.up.isDown || this.inputs.jump;
    
    if (isJumpDown && this.canJump) {
      if (this.player.body.touching.down) {
        // Ground Jump
        this.player.setVelocityY(jumpForce);
        this.jumpEffect();
        this.canJump = false;
        this.jumpCount = 1;
      } 
      else if (this.jumpCount < 2) {
        // Air Jump (Double Jump)
        this.player.setVelocityY(jumpForce * 0.9);
        this.jumpEffect();
        this.popText(this.player.x, this.player.y - 40, "DOUBLE!", "#ffff00");
        this.canJump = false;
        this.jumpCount = 2;
      }
    }

    // Reset jump key requirement
    if (!isJumpDown) {
      this.canJump = true;
    }

    // 3. Enemy AI (Patrol)
    this.enemies.children.iterate((enemy) => {
        if (!enemy) return;
        
        // If enemy hits a wall, flip direction
        if (enemy.body.blocked.left) {
            enemy.setVelocityX(100);
            enemy.setFlipX(false);
        } else if (enemy.body.blocked.right) {
            enemy.setVelocityX(-100);
            enemy.setFlipX(true);
        }
    });

    // 4. Fell off map check
    if (this.player.y > 500) {
        this.takeDamage();
        this.player.setPosition(100, 300);
        this.player.setVelocity(0,0);
    }
  }

  // --- LOGIC: Landing ---
  onLand() {
    this.jumpCount = 0; // Reset double jump
    // Squash effect
    if(this.player.body.velocity.y > 100) {
      this.tweens.add({
        targets: this.player,
        scaleY: 0.8,
        scaleX: 1.2,
        duration: 100,
        yoyo: true
      });
    }
  }

  // --- LOGIC: Effects ---
  jumpEffect() {
    // Stretch sprite
    this.tweens.add({
      targets: this.player,
      scaleY: 1.3,
      scaleX: 0.7,
      duration: 150,
      yoyo: true
    });
    // Create dust
    this.dustParticles.emitParticleAt(this.player.x, this.player.y + 15, 5);
  }

  emitDust() {
    if(Math.random() > 0.8) { // Don't emit every frame
       this.dustParticles.emitParticleAt(this.player.x, this.player.y + 15, 1);
    }
  }

  // --- LOGIC: Combat ---
  hitEnemy(player, enemy) {
    if (this.isInvincible) return; // Don't get hit if invincible

    // Optional: Kill enemy if jumping on head (Mario style)
    if (player.body.velocity.y > 0 && player.y < enemy.y) {
        enemy.destroy();
        player.setVelocityY(-300); // Bounce off
        this.score += 50;
        this.scoreText.setText("Score: " + this.score);
        this.popText(player.x, player.y, "STOMP!", "#fff");
        return;
    }

    this.takeDamage();
  }

  takeDamage() {
    if (this.isInvincible) return;

    this.hearts--;
    this.heartText.setText("❤".repeat(this.hearts));
    this.cameras.main.shake(200, 0.02);
    this.popText(this.player.x, this.player.y - 40, "OUCH!", "#ff0000");

    // Knockback
    this.player.setVelocityY(-300);
    this.player.setVelocityX(-300);

    if (this.hearts <= 0) {
      this.gameOver();
    } else {
      // Temporary Invincibility
      this.isInvincible = true;
      this.tweens.add({
        targets: this.player,
        alpha: 0.2,
        duration: 100,
        yoyo: true,
        repeat: 5,
        onComplete: () => {
            this.player.alpha = 1;
            this.isInvincible = false;
        }
      });
    }
  }

  rescueBro(player, cage) {
    cage.disableBody(true, true);
    this.physics.pause();
    
    // Victory Confetti (Particles)
    this.dustParticles.emitParticleAt(player.x, player.y, 50);
    
    this.add.text(400, 200, "LEVEL COMPLETE!", {
        fontSize: "40px", fontFamily: 'Fredoka One', color: "#00ff00", stroke: "#000", strokeThickness: 6
    }).setOrigin(0.5);

    this.time.delayedCall(2000, () => this.scene.restart());
  }

  gameOver() {
    this.isGameOver = true;
    this.physics.pause();
    this.player.setTint(0x555555);
    
    this.add.text(400, 225, "GAME OVER", {
        fontSize: "60px", fontFamily: 'Fredoka One', color: "#ff0000", stroke: "#000", strokeThickness: 6
    }).setOrigin(0.5);
    
    this.add.text(400, 300, "Tap to Restart", { fontSize: "20px" }).setOrigin(0.5);

    this.input.on('pointerdown', () => this.scene.restart());
  }

  popText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, { fontSize: "20px", fontFamily: 'Fredoka One', color: color, stroke: "#000", strokeThickness: 3 }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 1000, onComplete: () => t.destroy() });
  }

  // --- MOBILE CONTROLS ---
  setupMobileControls() {
    const leftBtn = document.getElementById("leftBtn");
    const rightBtn = document.getElementById("rightBtn");
    const jumpBtn = document.getElementById("jumpBtn");

    const addTouch = (elem, fnDown, fnUp) => {
        elem.addEventListener("touchstart", (e) => { e.preventDefault(); fnDown(); });
        elem.addEventListener("touchend", (e) => { e.preventDefault(); fnUp(); });
        elem.addEventListener("mousedown", (e) => { e.preventDefault(); fnDown(); });
        elem.addEventListener("mouseup", (e) => { e.preventDefault(); fnUp(); });
    };

    addTouch(leftBtn, () => this.inputs.left = true, () => this.inputs.left = false);
    addTouch(rightBtn, () => this.inputs.right = true, () => this.inputs.right = false);
    addTouch(jumpBtn, () => this.inputs.jump = true, () => this.inputs.jump = false);
  }
}

// --------------------
// GAME CONFIG
// --------------------
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: "game",
  backgroundColor: '#1d212d', // Fallback color
  pixelArt: true, // Crisp pixels
  physics: {
    default: "arcade",
    arcade: { 
        gravity: { y: 1200 }, // Stronger gravity for snappy jumps
        debug: false 
    }
  },
  scene: [MainScene]
};

const game = new Phaser.Game(config);
            
