// --------------------
// CONFIG
// --------------------
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: "game",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 900 }, debug: false }
  },
  scene: { preload, create, update }
};

new Phaser.Game(config);

// --------------------
// GLOBALS
// --------------------
let player, cursors, enemies, cage;
let hearts = 3;
let heartText, scoreText;
let score = 0;

// mobile input flags
let moveLeft = false;
let moveRight = false;
let jumpPressed = false;

// --------------------
// PRELOAD
// --------------------
function preload() {
  this.load.image("bg", "assets/bg.png");
  this.load.image("vulvian", "assets/vulvian.png");
  this.load.image("enemy", "assets/enemy.png");
  this.load.image("cage", "assets/cage.png");
}

// --------------------
// CREATE
// --------------------
function create() {
  // background
  this.add.image(400, 225, "bg").setScale(2);

  // camera effects
  this.cameras.main.setBounds(0, 0, 800, 450);

  // platforms
  const platforms = this.physics.add.staticGroup();
  platforms.create(400, 435, null).setDisplaySize(800, 30).refreshBody();
  platforms.create(600, 310, null).setDisplaySize(200, 18).refreshBody();
  platforms.create(150, 260, null).setDisplaySize(150, 18).refreshBody();

  // player (Vulvian)
  player = this.physics.add.sprite(100, 300, "vulvian");
  player.setBounce(0.15);
  player.setCollideWorldBounds(true);

  // enemies
  enemies = this.physics.add.group();
  enemies.create(520, 100, "enemy");
  enemies.create(700, 100, "enemy");

  // cage (Boobi Doodi)
  cage = this.physics.add.staticSprite(760, 360, "cage");

  // collisions
  this.physics.add.collider(player, platforms);
  this.physics.add.collider(enemies, platforms);
  this.physics.add.overlap(player, enemies, hitEnemy, null, this);
  this.physics.add.overlap(player, cage, rescueBro, null, this);

  // input
  cursors = this.input.keyboard.createCursorKeys();
  setupMobileControls();

  // UI
  heartText = this.add.text(10, 10, "🍰🍰🍰", { fontSize: "20px" });
  scoreText = this.add.text(10, 40, "Score: 0 💩", { fontSize: "18px" });

  // meme popup
  popText(this, 400, 20, "Alpha Jump Activated", "#00ff00");

  // hint
  this.add.text(400, 430,
    "Mobile: on-screen arrows | PC: arrow keys",
    { fontSize: "12px", color: "#aaa" }
  ).setOrigin(0.5);
}

// --------------------
// UPDATE
// --------------------
function update() {

  // movement
  if (cursors.left.isDown || moveLeft) {
    player.setVelocityX(-220);
  } else if (cursors.right.isDown || moveRight) {
    player.setVelocityX(220);
  } else {
    player.setVelocityX(0);
  }

  // jump
  if ((cursors.up.isDown || jumpPressed) && player.body.touching.down) {
    player.setVelocityY(-460);
    jumpFlash(this);
  }
}

// --------------------
// MOBILE CONTROLS
// --------------------
function setupMobileControls() {
  const leftBtn = document.getElementById("leftBtn");
  const rightBtn = document.getElementById("rightBtn");
  const jumpBtn = document.getElementById("jumpBtn");

  leftBtn.addEventListener("touchstart", () => moveLeft = true);
  leftBtn.addEventListener("touchend", () => moveLeft = false);

  rightBtn.addEventListener("touchstart", () => moveRight = true);
  rightBtn.addEventListener("touchend", () => moveRight = false);

  jumpBtn.addEventListener("touchstart", () => jumpPressed = true);
  jumpBtn.addEventListener("touchend", () => jumpPressed = false);
}

// --------------------
// GAME LOGIC
// --------------------
function hitEnemy(player, enemy) {
  enemy.disableBody(true, true);

  score += 10;
  scoreText.setText("Score: " + score + " 💩");

  hearts--;
  updateHearts();

  // effects
  this.cameras.main.shake(120, 0.01);
  player.setTint(0xff0000);
  this.time.delayedCall(120, () => player.clearTint());

  popText(this, player.x, player.y - 40, "Oof!", "#ff4444");

  if (hearts <= 0) {
    gameOver(this);
  }
}

function rescueBro(player, cage) {
  cage.disableBody(true, true);

  popText(this, player.x, player.y - 50, "Thx bro.", "#ffffff");

  this.time.delayedCall(2000, () => {
    this.scene.restart();
  });
}

function updateHearts() {
  heartText.setText("🍰".repeat(hearts));
}

function gameOver(scene) {
  scene.physics.pause();
  player.setTint(0xff0000);

  scene.cameras.main.flash(300, 255, 0, 0);

  scene.add.text(400, 225,
    "YABBA DABBA DEAD!",
    { fontSize: "32px", color: "#ff0000" }
  ).setOrigin(0.5);
}

// --------------------
// JUICE / EFFECTS
// --------------------
function popText(scene, x, y, msg, color) {
  const t = scene.add.text(x, y, msg, {
    fontSize: "16px",
    color: color
  }).setOrigin(0.5);

  scene.tweens.add({
    targets: t,
    y: y - 30,
    alpha: 0,
    duration: 900,
    onComplete: () => t.destroy()
  });
}

function jumpFlash(scene) {
  const r = scene.add.rectangle(player.x, player.y, 40, 40, 0x00ff00, 0.3);
  scene.tweens.add({
    targets: r,
    alpha: 0,
    scale: 2,
    duration: 200,
    onComplete: () => r.destroy()
  });
          }
