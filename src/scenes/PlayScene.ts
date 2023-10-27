import {SpriteWithDynamicBody} from "../types";
import Player from "../entities/Player";
import GameScene from "./GameScene";
import Phaser from "phaser";
import {PRELOAD_CONFIG} from "../index";

class PlayScene extends GameScene {
    player: Player;
    ground: Phaser.GameObjects.TileSprite;
    obstacles: Phaser.Physics.Arcade.Group
    startTrigger: SpriteWithDynamicBody;

    spawnInterval: number = 1500
    spawnTime: number = 0
    gameSpeed: number = 2

    gameOverContainer: Phaser.GameObjects.Container
    gameOverText: Phaser.GameObjects.Image
    restartText: Phaser.GameObjects.Image

    constructor() {
        super('PlayScene');
    }

    create() {
        this.createEnvironment()
        this.createPlayer()
        this.createObstacles()
        this.createGameOverContainer()

        this.handleGameStart()
        this.handleObstacleCollision()
        this.handleGameRestart()
    }
    // delta is time from the last frame, time is the entire time
    update(time: number, delta: number) {
        if (!this.isGameRunning) { return; }

        this.spawnTime += delta

        if (this.spawnTime >= this.spawnInterval) {
            this.spawnObstacles()
            this.spawnTime = 0
        }

        Phaser.Actions.IncX(this.obstacles.getChildren(), -this.gameSpeed)

        // remove the obstacle from the array to avoid performance issues
        this.obstacles.getChildren().forEach((obstacle: SpriteWithDynamicBody) => {
            if (obstacle.getBounds().right < 0) {
                this.obstacles.remove(obstacle)
            }
        })

        this.ground.tilePositionX += this.gameSpeed
    }

    createPlayer() {
        this.player = new Player(this, 0, this.gameHeight)
    }

    createEnvironment() {
        this.ground = this.add
            .tileSprite(0, this.gameHeight, 88, 26, 'ground')
            .setOrigin(0, 1)
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

    spawnObstacles() {
        const cactuses = Phaser.Math.Between(1, PRELOAD_CONFIG.cactusCount)
        const distance = Phaser.Math.Between(600,900)

        this.obstacles
            .create(distance, this.gameHeight, `cactus-${cactuses}`)
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
            this.player.die()
            this.gameOverContainer.setAlpha(1)

            this.spawnTime = 0
            this.gameSpeed = 2
        })
    }
}

export default PlayScene;