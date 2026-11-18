import St from 'gi://St';
import Clutter from 'gi://Clutter';

export class Rocket {
    constructor(containerWidth, containerHeight) {
        this.actor = new St.Label({
            text: '🚀',
            reactive: false,
            can_focus: false,
            track_hover: false,
            style: 'font-size: 40px;'
        });
        
        this.containerWidth = containerWidth;
        this.containerHeight = containerHeight;
        
        this.startX = 1000;
        this.startY = containerHeight - 50;
        this.endY = -100;
        
        this.isLaunching = false;
        this.progress = 0;
        this.speed = 0.01;
        
        this.actor.set_position(this.startX, this.startY);
        this.actor.set_rotation_angle(Clutter.RotateAxis.Z_AXIS, -45);
        this.actor.set_pivot_point(0.5, 0.5);
        
        this.actor.hide();
    }
    
    launch() {
        this.isLaunching = true;
        this.progress = 0;
        this.actor.set_position(this.startX, this.startY);
        this.actor.show();
    }
    
    update() {
        if (!this.isLaunching) return;
        
        this.progress += this.speed;
        
        if (this.progress >= 1.0) {
            this.isLaunching = false;
            this.progress = 0;
            this.actor.hide();
            return;
        }
        
        const currentY = this.startY + (this.endY - this.startY) * this.progress;
        this.actor.set_position(this.startX, currentY);
    }
    
    destroy() {
        this.actor.destroy();
    }
}