import { UNIT_TYPES } from '../config/unitTypes.js';
import { BUILDING_TYPES } from '../config/buildingTypes.js';
// Note: Other dependencies like TERRAIN_TYPES, TILE_SIZE, GRID_SIZE, WORLD_SIZE,
// and access to global arrays like 'captions', 'effects', 'buildings', 'resources', 'resourceNodes'
// will be addressed in subsequent refactoring steps. For now, the Unit class methods
// will continue to reference these as if they are in the same scope or global.

class Effect {
            constructor(x1, y1, x2, y2, color) {
                this.x1 = x1;
                this.y1 = y1;
                this.x2 = x2;
                this.y2 = y2;
                this.color = color;
                this.life = 10;
                this.particles = [];

                // Create impact particles
                for (let i = 0; i < 5; i++) {
                    this.particles.push({
                        x: x2,
                        y: y2,
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10,
                        life: 20
                    });
                }
            }

            update() {
                this.life--;

                for (const particle of this.particles) {
                    particle.x += particle.vx;
                    particle.y += particle.vy;
                    particle.vx *= 0.9;
                    particle.vy *= 0.9;
                    particle.life--;
                }
            }

            draw(ctx, camera) {
                const screenX1 = (this.x1 - camera.x) * camera.zoom + camera.canvasWidth / 2;
                const screenY1 = (this.y1 - camera.y) * camera.zoom + camera.canvasHeight / 2;
                const screenX2 = (this.x2 - camera.x) * camera.zoom + camera.canvasWidth / 2;
                const screenY2 = (this.y2 - camera.y) * camera.zoom + camera.canvasHeight / 2;

                // Projectile trail
                ctx.strokeStyle = this.color;
                ctx.globalAlpha = this.life / 10;
                ctx.lineWidth = 2 * camera.zoom;
                ctx.beginPath();
                ctx.moveTo(screenX1, screenY1);
                ctx.lineTo(screenX2, screenY2);
                ctx.stroke();

                // Impact particles
                for (const particle of this.particles) {
                    if (particle.life > 0) {
                        const px = (particle.x - camera.x) * camera.zoom + camera.canvasWidth / 2;
                        const py = (particle.y - camera.y) * camera.zoom + camera.canvasHeight / 2;
                        ctx.fillStyle = this.color;
                        ctx.globalAlpha = particle.life / 20;
                        ctx.fillRect(px - 2, py - 2, 4, 4);
                    }
                }

                ctx.globalAlpha = 1;
            }
        }

export { Effect };
