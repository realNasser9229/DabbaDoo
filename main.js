const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: "game",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 900 },
      debug: false
    }
  },
  scene: {
    preload,
    create,
    update
  }
};

const game = new Phaser.Game(config);

let player;
let cursors;
let enemies;
let cage;
let hearts = 3;
let heartText;
let score = 0;
let scoreText;

function preload() {
  this.load.image("bg", "assets/bg.png");
  this.load.image("vulvian", "assets/vulvian.png");
  this.load.image("enemy", "assets/enemy.png");
  this.load.image("cage", "assets/cage.png");
}

function create() {
  this.add.image(400, 225, "bg").setScale(2);

  // Platforms
  const platforms = this.physics.add.staticGroup();
  platforms.create(400, 430, null).setDisplaySize(800, 40).refreshBody();
  platforms.create(600, 300, null).setDisplaySize(200, 20).refreshBody();
  platforms.create(150, 250, null).setDisplaySize(150, 20).refreshBody();

  // Vulvian
  player = this.physics.add.sprite(100, 300, "vulvian");
  player.setBounce(0.1);
  player.setCollideWorldBounds(true);

  // Enemies
  enemies = this.physics.add.group();
  enemies.create(500, 100, "enemy");
  enemies.create(700, 100, "enemy");

  // Cage (Boobi Doodi)
  cage = this.physics.add.staticSprite(760, 360, "cage");

  this.physics.add.collider(player, platforms);
  this.physics.add.collider(enemies, platforms);

  this.physics.add.overlap(player, enemies, hitEnemy, null, this);
  this.physics.add.overlap(player, cage, rescueBro, null, this);

  cursors = this.input.keyboard.createCursorKeys();

  heartText = this.add.text(10, 10, "🍰🍰🍰", { fontSize: "20px" });
  scoreText = this.add.text(10, 40, "Score: 0 💩", { fontSize: "18px" });

  this.add.text(400, 20, "Alpha Jump Activated", {
    fontSize: "16px",
    color: "#00ff00"
  }).setOrigin(0.5);
}

function update() {
  if (cursors.left.isDown) {
    player.setVelocityX(-200);
  } else if (cursors.right.isDown) {
    player.setVelocityX(200);
  } else {
    player.setVelocityX(0);
  }

  if (cursors.up.isDown && player.body.touching.down) {
    player.setVelocityY(-450);
  }
}

// --- GAME LOGIC ---

function hitEnemy(player, enemy) {
  enemy.disableBody(true, true);
  score += 10;
  scoreText.setText("Score: " + score + " 💩");

  hearts--;
  updateHearts();

  if (hearts <= 0) {
    gameOver(this);
  }
}

function rescueBro(player, cage) {
  cage.disableBody(true, true);

  const txt = this.add.text(player.x, player.y - 40,
    "Thx bro.",
    { fontSize: "14px", color: "#fff" }
  );

  this.time.delayedCall(2000, () => {
    txt.destroy();
    this.scene.restart();
  });
}

function updateHearts() {
  heartText.setText("🍰".repeat(hearts));
}

function gameOver(scene) {
  scene.physics.pause();
  player.setTint(0xff0000);

  scene.add.text(400, 225,
    "YABBA DABBA DEAD!",
    { fontSize: "32px", color: "#ff0000" }
  ).setOrigin(0.5);
}
