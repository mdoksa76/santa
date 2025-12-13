import St from 'gi://St';

export class Snowflake {
    constructor(containerWidth, containerHeight) {
        this.actor = new St.Label({
            text: '❄',
            style_class: 'snowflake',
            reactive: false,
            can_focus: false,
            track_hover: false
        });
        
        this.x = Math.random() * containerWidth;
        this.y = -20;
        this.speed = 1 + Math.random() * 2;
        this.drift = (Math.random() - 0.5) * 2;
        this.size = 12 + Math.random() * 12;
        this.opacity = 100 + Math.random() * 155;
        
        this.actor.set_position(this.x, this.y);
        this.actor.set_style(`font-size: ${this.size}px; opacity: ${this.opacity / 255};`);
        
        this.containerWidth = containerWidth;
        this.containerHeight = containerHeight;
    }
    
    update() {
        this.y += this.speed;
        this.x += this.drift * 0.5;
        
        if (this.x < -20) this.x = this.containerWidth;
        if (this.x > this.containerWidth) this.x = -20;
        
        if (this.y > this.containerHeight) {
            this.y = -20;
            this.x = Math.random() * this.containerWidth;
        }
        
        this.actor.set_position(this.x, this.y);
    }
    
    destroy() {
        this.actor.destroy();
    }
}