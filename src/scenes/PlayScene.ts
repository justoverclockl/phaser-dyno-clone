import {SpriteWithDynamicBody} from "../types";
import Player from "../entities/Player";
import GameScene from "./GameScene";
import Phaser from "phaser";
import {PRELOAD_CONFIG} from "../index";

class PlayScene extends GameScene {
    player: Player;
    ground: Phaser.GameObjects.TileSprite;
    obstacles: Phaser.Physics.Arcade.Group;
    clouds: Phaser.GameObjects.Group;
    startTrigger: SpriteWithDynamicBody;

    score: number = 0
    scoreInterval: number = 100
    scoreDeltaTime: number = 0

    spawnInterval: number = 1500
    spawnTime: number = 0
    gameSpeed: number = 2
    gameSpeedModifier: number = 1

    progressSound: Phaser.Sound.HTML5AudioSound;

    gameOverContainer: Phaser.GameObjects.Container;
    gameOverText: Phaser.GameObjects.Image;
    restartText: Phaser.GameObjects.Image;
    scoreText: Phaser.GameObjects.Text;
    highSCoreText: Phaser.GameObjects.Text;

    constructor() {
        super('PlayScene');
    }

    create() {
        this.createEnvironment()
        this.createPlayer()
        this.createObstacles()
        this.createGameOverContainer()
        this.createAnimations()
        this.createScore()

        this.handleGameStart()
        this.handleObstacleCollision()
        this.handleGameRestart()
        this.progressSound = this.sound.add('progress', {volume: 0.5}) as Phaser.Sound.HTML5AudioSound
    }
    // delta is time from the last frame, time is the entire time
    update(time: number, delta: number) {
        if (!this.isGameRunning) { return; }

        this.spawnTime += delta
        this.scoreDeltaTime += delta

        if (this.scoreDeltaTime >= this.scoreInterval) {
            this.score++;
            this.scoreDeltaTime = 0;

            if (this.score % 200 === 0) {
                this.gameSpeedModifier += 0.40
                this.progressSound.play()

                this.blinkScoreText()
            }
        }

        if (this.spawnTime >= this.spawnInterval) {
            this.spawnObstacles()
            this.spawnTime = 0
        }

        Phaser.Actions.IncX(this.obstacles.getChildren(), -this.gameSpeed * this.gameSpeedModifier)
        Phaser.Actions.IncX(this.clouds.getChildren(), -0.5)

        const score = Array.from(String(this.score), Number)

        // add 0 to the beginning of the array to keep the 5 digit display
        for (let i = 0; i < 5 - String(this.score).length; i++) {
            score.unshift(0)
        }

        this.scoreText.setText(score.join(''))

        // remove the obstacle from the array to avoid performance issues
        this.obstacles.getChildren().forEach((obstacle: SpriteWithDynamicBody) => {
            if (obstacle.getBounds().right < 0) {
                this.obstacles.remove(obstacle)
            }
        })

        this.clouds.getChildren().forEach((cloud: SpriteWithDynamicBody) => {
            if (cloud.getBounds().right < 0) {
                cloud.x = this.gameWidth + 30
            }
        })

        this.ground.tilePositionX += (this.gameSpeed * this.gameSpeedModifier)
    }

    blinkScoreText() {
        this.tweens.add({
            targets: this.scoreText,
            duration: 100,
            repeat: 3,
            alpha: 0,
            yoyo: true
        })
    }

    createPlayer() {
        this.player = new Player(this, 0, this.gameHeight)
    }

    createEnvironment() {
        this.ground = this.add
            .tileSprite(0, this.gameHeight, 88, 26, 'ground')
            .setOrigin(0, 1)

        this.clouds = this.add.group()

        this.clouds = this.clouds.addMultiple([
            this.add.image(this.gameWidth / 2, 170, 'cloud'),
            this.add.image(this.gameWidth -80, 80, 'cloud'),
            this.add.image(this.gameWidth / 1.3, 100, 'cloud'),
        ])

        this.clouds.setAlpha(0)
    }

    createObstacles() {
        this.obstacles = this.physics.add.group()
    }

    createGameOverContainer() {
        this.gameOverText =  this.add.image(0,0, 'game-over')
        this.restartText =  this.add
            .image(0,80, 'restart')
            .setInteractive()

        this.gameOverContainer = this.add
            .container(this.gameWidth / 2,(this.gameHeight / 2) - 50)
            .add([this.gameOverText, this.restartText])
            .setAlpha(0)
    }

    createAnimations() {
        this.anims.create({
            key: 'enemy-bird-fly',
            frames: this.anims.generateFrameNumbers('enemy-bird'),
            frameRate: 6,
            repeat: -1
        })
    }

    createScore() {
        this.scoreText = this.add.text(this.gameWidth, 0, '00000', {
            fontSize: 30,
            fontFamily: "Arial",
            color: "#535353",
            resolution: 5,
        }).setOrigin(1,0).setAlpha(0)

        this.highSCoreText = this.add.text(this.scoreText.getBounds().left - 20, 0, '00000', {
            fontSize: 30,
            fontFamily: "Arial",
            color: "#535353",
            resolution: 5,
        }).setOrigin(1,0).setAlpha(0)
    }

    spawnObstacles() {
        const obstacleCount = PRELOAD_CONFIG.cactusCount + PRELOAD_CONFIG.birdsCount
        const obstacleNum = Math.floor(Math.random() * obstacleCount) + 1
        const distance = Phaser.Math.Between(150,300)
        let obstacle;

        if (obstacleNum > PRELOAD_CONFIG.cactusCount) {
            const enemyPossibleHeight = [20, 70]
            const enemyHeight = enemyPossibleHeight[Math.floor(Math.random() * 2)]

            obstacle = this.obstacles
                .create(this.gameWidth + distance, this.gameHeight - enemyHeight, 'enemy-bird')

            obstacle.play('enemy-bird-fly', true)
        } else {
            obstacle = this.obstacles
                .create(this.gameWidth + distance, this.gameHeight, `cactus-${obstacleNum}`)

        }

        obstacle
            .setImmovable()
            .setOrigin(0,1)
    }

    handleGameStart() {
        this.startTrigger = this.physics.add
            .sprite(0, 10, null)
            .setAlpha(0)
            .setOrigin(0, 1)

        this.physics.add.overlap(this.startTrigger, this.player, () => {
            if (this.startTrigger.y === 10) {
                this.startTrigger.body.reset(0, this.gameHeight)
                return;
            }

            this.startTrigger.body.reset(9999, 9999)

            const groundRollOutEvent = this.time.addEvent({
                delay: 1000 / 60,
                loop: true,
                callback: () => {
                    this.player.playRunAnimation()
                    this.player.setVelocityX(80)
                    this.ground.width += (17 * 2)

                    if (this.ground.width >= this.gameWidth) {
                        groundRollOutEvent.remove()
                        this.ground.width = this.gameWidth
                        this.player.setVelocityX(0)
                        this.clouds.setAlpha(1)
                        this.scoreText.setAlpha(1)
                        this.isGameRunning = true
                    }
                }
            })
        })
    }

    handleGameRestart() {
        this.restartText.on('pointerdown', () => {
            this.physics.resume()
            this.player.setVelocityY(0)

            this.obstacles.clear(true, true)
            this.gameOverContainer.setAlpha(0)
            this.anims.resumeAll()

            this.isGameRunning = true
        })
    }

    handleObstacleCollision() {
        this.physics.add.collider(this.obstacles, this.player, () => {
            this.isGameRunning = false
            this.physics.pause()
            this.anims.pauseAll()
            this.player.die()
            this.gameOverContainer.setAlpha(1)

            this.showHighScore()

            this.spawnTime = 0
            this.scoreDeltaTime = 0
            this.score = 0
            this.gameSpeedModifier = 1
        })
    }

    showHighScore() {
        const newHighScore = this.highSCoreText.text.substring(this.highSCoreText.text.length - 5)
        const newScore = Number(this.scoreText.text) > Number(newHighScore) ? this.scoreText.text : newHighScore

        this.highSCoreText.setText('HI: ' + newScore)
        this.highSCoreText.setAlpha(1)
    }
}

export default PlayScene;