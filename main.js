const ARENA = {
  x: 20,
  y: 20,
  width: 440,
  height: 760
};

class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  create() {
    // 1. 물리 월드 경계 설정 (아레나 내부)
    this.physics.world.setBounds(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

    // 2. 동양풍 무협 도장 마룻바닥 배경
    const floor = this.add.graphics();
    floor.fillStyle(0x1c1510, 1);
    floor.fillRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

    // 3. 목재 마루 널빤지 패턴 (가로 판자 및 이음매)
    const plankGraphics = this.add.graphics();
    const plankHeight = 38;
    for (let y = ARENA.y; y < ARENA.y + ARENA.height; y += plankHeight) {
      // 널빤지 사이 그림자선
      plankGraphics.lineStyle(2, 0x120c08, 0.85);
      plankGraphics.lineBetween(ARENA.x, y, ARENA.x + ARENA.width, y);
      // 은은한 나무결 하이라이트선
      plankGraphics.lineStyle(1, 0x2b2019, 0.4);
      plankGraphics.lineBetween(ARENA.x, y + 2, ARENA.x + ARENA.width, y + 2);
    }

    // 4. 연무장 중앙 결투 원형 문양 (수묵/도장 문양 느낌)
    const centerDeco = this.add.graphics();
    const centerX = ARENA.x + ARENA.width / 2;
    const centerY = ARENA.y + ARENA.height / 2;
    centerDeco.lineStyle(3, 0x38281d, 0.7);
    centerDeco.strokeCircle(centerX, centerY, 90);
    centerDeco.lineStyle(1, 0x4a3527, 0.5);
    centerDeco.strokeCircle(centerX, centerY, 105);
    centerDeco.strokeCircle(centerX, centerY, 20);

    // 5. 도장 외곽 벽 (옻칠 목재 벽 + 단청 주홍 테두리)
    const wallBorder = this.add.graphics();
    // 두꺼운 외벽 프레임
    wallBorder.lineStyle(10, 0x2e1a12, 1);
    wallBorder.strokeRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

    // 안쪽 단청 주홍(朱色) 장식선
    wallBorder.lineStyle(2, 0x8f2d24, 0.9);
    wallBorder.strokeRect(ARENA.x + 5, ARENA.y + 5, ARENA.width - 10, ARENA.height - 10);

    // 6. 네 모서리 황동 금구 장식 (동양 전통 가구/도장 장식)
    const cornerSize = 18;
    const corners = [
      [ARENA.x, ARENA.y],
      [ARENA.x + ARENA.width, ARENA.y],
      [ARENA.x, ARENA.y + ARENA.height],
      [ARENA.x + ARENA.width, ARENA.y + ARENA.height]
    ];
    const cornerGraphics = this.add.graphics();
    cornerGraphics.fillStyle(0x9a7b3c, 1); // 황동색
    corners.forEach(([cx, cy]) => {
      cornerGraphics.fillRect(cx - cornerSize / 2, cy - cornerSize / 2, cornerSize, cornerSize);
    });
    cornerGraphics.fillStyle(0x2e1a12, 1); // 리벳 못 포인트
    corners.forEach(([cx, cy]) => {
      cornerGraphics.fillCircle(cx, cy, 3);
    });
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 480,
  height: 800,
  backgroundColor: '#0c0a08', // 깊은 먹색 배경
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [MainScene]
};

const game = new Phaser.Game(config);
