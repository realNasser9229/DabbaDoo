const config = {
    type: Phaser.AUTO,
    parent: 'game-area',
    width: 800,
    height: 600,
    physics: { default: 'arcade', arcade: { gravity: { y: 1200 } } },
    scene: { preload, create, update }
};

let player, platforms, spikes, goal, cursors;
let inputState = { left: false, right: false, jump: false, dash: false };
const game = new Phaser.Game(config);

function preload() {
    let g = this.make.graphics({x: 0, y: 0, add: false});
    // Player (Cyan Square)
    g.fillStyle(0x00f3ff); g.fillRect(0, 0, 32, 32);
    g.generateTexture('player', 32, 32);
    // Platform (Bright Green)
    g.clear(); g.fillStyle(0x00ff00); g.fillRect(0, 0, 32, 32);
    g.generateTexture('platform', 32, 32);
    // Spike (Red)
    g.clear(); g.fillStyle(0xff0000); g.beginPath(); g.moveTo(0,32); g.lineTo(16,0); g.lineTo(32,32); g.fillPath();
    g.generateTexture('spike', 32, 32);
}

function create() {
    platforms = this.physics.add.staticGroup();
    spikes = this.physics.add.staticGroup();
    goal = this.physics.add.staticGroup();

    // SIMPLE LEVEL MAP
    const map = [
        "################################",
        "#..............................#",
        "#.......G......................#",
        "#########......................#",
        "#..............................#",
        "#...........####...............#",
        "#..............................#",
        "####...........................#",
        "#.........####.................#",
        "#..@..............^^^^.........#",
        "################################"
    ];

    map.forEach((row, y) => {
        row.split('').forEach((char, x) => {
            let wx = x * 32, wy = y * 32;
            if (char === '#') platforms.create(wx, wy, 'platform');
            if (char === '^') spikes.create(wx, wy, 'spike');
            if (char === 'G') goal.create(wx, wy, 'platform').setTint(0xffff00);
            if (char === '@') { this.startX = wx; this.startY = wy; }
        });
    });

    player = this.physics.add.sprite(this.startX, this.startY, 'player');
    player.setCollideWorldBounds(true);

    this.physics.add.collider(player, platforms);
    this.physics.add.overlap(player, spikes, () => this.scene.restart());
    this.physics.add.overlap(player, goal, () => alert("YOU WIN!"));

    this.cameras.main.startFollow(player);
    this.cameras.main.setZoom(1.5);

    // BIND BUTTONS
    const setupBtn = (id, key) => {
        const btn = document.getElementById(id);
        btn.onpointerdown = () => { inputState[key] = true; };
        btn.onpointerup = () => { inputState[key] = false; };
    };
    setupBtn('leftBtn', 'left'); setupBtn('rightBtn', 'right');
    setupBtn('jumpBtn', 'jump'); setupBtn('dashBtn', 'dash');
}

function update() {
    if (inputState.left) { player.setVelocityX(-200); }
    else if (inputState.right) { player.setVelocityX(200); }
    else { player.setVelocityX(0); }

    if (inputState.jump && player.body.touching.down) {
        player.setVelocityY(-500);
        inputState.jump = false; // Reset to prevent infinite flight
    }

    if (inputState.dash) {
        player.setVelocityX(player.body.velocity.x * 3);
        inputState.dash = false;
    }
}
