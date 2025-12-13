import St from 'gi://St';
import Clutter from 'gi://Clutter';

export class SantaSleigh {
    constructor(containerWidth, containerHeight, extensionPath) {
        this.actor = new St.Widget({
            reactive: false,
            can_focus: false,
            track_hover: false,
            width: 177,
            height: 34
        });
        
        this.containerWidth = containerWidth;
        this.containerHeight = containerHeight;
        this.extensionPath = extensionPath;
        
        this.frames = [
            `${extensionPath}/BigSantaRudolf1.png`,
            `${extensionPath}/BigSantaRudolf2.png`,
            `${extensionPath}/BigSantaRudolf3.png`,
            `${extensionPath}/BigSantaRudolf4.png`
        ];
        
        this.currentFrame = 0;
        this.frameCounter = 0;
        this.framesPerChange = 5;
        
        this.updateFrame();
        
        this.progress = 0;
        this.speed = 0.0008;
        this.pauseProgress = 1.5;
        
        this.startX = -300;
        this.endX = containerWidth + 300;
        this.bottomY = containerHeight - 100;
        this.topY = containerHeight - 600;
        
        // Gift drop tracking
        this.giftDropCallbacks = [];
        this.hasDroppedGift1 = false;
        this.hasDroppedGift2 = false;
        this.hasDroppedGift3 = false;
        this.hasDroppedGift4 = false;
        this.hasDroppedGift5 = false;
        
        // Fade gifts callback
        this.fadeGiftsCallbacks = [];
    }
    
    updateFrame() {
        this.actor.set_style(
            `background-image: url("${this.frames[this.currentFrame]}"); 
             background-size: 177px 34px;
             background-repeat: no-repeat;`
        );
    }
    
    update() {
        // Frame animation
        this.frameCounter++;
        if (this.frameCounter >= this.framesPerChange) {
            this.frameCounter = 0;
            this.currentFrame = (this.currentFrame + 1) % 4;
            this.updateFrame();
        }
        
        // Pause logic
        if (this.progress >= 1.0 && this.progress < this.pauseProgress) {
            this.progress += this.speed;
            this.actor.hide();
            
            // Reset gift drop flags during pause
            this.hasDroppedGift1 = false;
            this.hasDroppedGift2 = false;
            this.hasDroppedGift3 = false;
            this.hasDroppedGift4 = false;
            this.hasDroppedGift5 = false;
            
            return;
        }
        
        // Reset after pause - FADE OUT POKLONA
        if (this.progress >= this.pauseProgress) {
            this.progress = 0;
            this.actor.show();
            
            // SIGNAL ZA FADE OUT POKLONA
            this.fadeGiftsCallbacks.forEach(cb => cb());
        }
        
        // Flight logic
        if (this.progress < 1.0) {
            this.actor.show();
            this.progress += this.speed;
            
            const x = this.startX + (this.endX - this.startX) * this.progress;
            const arcProgress = Math.sin(this.progress * Math.PI);
            const y = this.bottomY - (this.bottomY - this.topY) * arcProgress;
            
            const slope = Math.cos(this.progress * Math.PI) * Math.PI * (this.topY - this.bottomY) / (this.endX - this.startX);
            const rotationDegrees = Math.atan(slope) * (180 / Math.PI);
            
            this.actor.set_position(x - 88, y - 17);
            this.actor.set_rotation_angle(Clutter.RotateAxis.Z_AXIS, rotationDegrees);
            this.actor.set_pivot_point(0.5, 0.5);
            
            // Gift drop triggers - BACA SA STRAŽNJEG DIJELA SANJKI
            const screenProgress = this.progress;

            // Offset za stražnji dio sanjki (gdje su pokloni)
            const sleighBackOffset = -65; // Piksel offset za stražnji dio

            // 45% ekrana - baci prvi poklon
            if (screenProgress >= 0.45 && !this.hasDroppedGift1) {
                const giftX = x + sleighBackOffset + (Math.random() * 25);
                const giftY = y;
                this.dropGift(giftX, giftY);
                this.hasDroppedGift1 = true;  // ← Flag 1
            }

            // 50% ekrana - baci drugi poklon
            if (screenProgress >= 0.5 && !this.hasDroppedGift2) {  // ← Flag 2
                const giftX = x + sleighBackOffset + (Math.random() * 25);
                const giftY = y;
                this.dropGift(giftX, giftY);
                this.hasDroppedGift2 = true;  // ← Flag 2
            }

            // 55% ekrana - baci treći poklon
            if (screenProgress >= 0.55 && !this.hasDroppedGift3) {  // ← Flag 3
                const giftX = x + sleighBackOffset + (Math.random() * 50 - 25);
                const giftY = y;
                this.dropGift(giftX, giftY);
                this.hasDroppedGift3 = true;  // ← Flag 3
            }

            // 60% ekrana - baci četvrti poklon
            if (screenProgress >= 0.6 && !this.hasDroppedGift4) {  // ← Flag 4
                const giftX = x + sleighBackOffset + (Math.random() * 25);
                const giftY = y;
                this.dropGift(giftX, giftY);
                this.hasDroppedGift4 = true;  // ← Flag 4
            }

            // 65% ekrana - baci peti poklon
            if (screenProgress >= 0.65 && !this.hasDroppedGift5) {  // ← Flag 5
                const giftX = x + sleighBackOffset - (Math.random() * 25);
                const giftY = y;
                this.dropGift(giftX, giftY);
                this.hasDroppedGift5 = true;  // ← Flag 5
            }
        }
    }
    
    dropGift(x, y) {
        this.giftDropCallbacks.forEach(cb => cb(x, y));
    }
    
    onGiftDrop(callback) {
        this.giftDropCallbacks.push(callback);
    }
    
    onFadeGifts(callback) {
        this.fadeGiftsCallbacks.push(callback);
    }
    
    destroy() {
        this.actor.destroy();
        this.giftDropCallbacks = [];
        this.fadeGiftsCallbacks = [];
    }
}