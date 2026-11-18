import St from 'gi://St';
import Cairo from 'gi://cairo';

export class UFO {
    constructor(containerWidth, containerHeight) {
        this.actor = new St.Label({
            text: '🛸',
            reactive: false,
            can_focus: false,
            track_hover: false,
            style: 'font-size: 50px;'
        });
        
        this.beamCanvas = new St.DrawingArea({
            reactive: false,
            can_focus: false,
            track_hover: false
        });
        
        this.beamCanvas.connect('repaint', (area) => {
            this.drawBeam(area);
        });
        
        this.containerWidth = containerWidth;
        this.containerHeight = containerHeight;
        
        this.startX = 0;
        this.startY = 0;
        this.endX = 0;
        this.endY = 0;
        
        this.isActive = false;
        this.phase = 0;
        this.progress = 0;
        this.frameCounter = 0;
        
        this.beamActive = false;
        this.beamAlpha = 0.6;
        this.beamPulseDirection = 1;
        
        this.flashFrame = 0;
        this.stretchFactor = 1.0;
        
        this.actor.hide();
        this.beamCanvas.hide();
    }
    
    launch() {
        const fromLeft = Math.random() < 0.5;
        this.startX = fromLeft ? -100 : this.containerWidth + 100;
        this.startY = 50;
        
        this.endX = this.containerWidth * (0.15 + Math.random() * 0.7);
        this.endY = this.containerHeight * (0.25 + Math.random() * 0.25);
        
        this.isActive = true;
        this.phase = 1;
        this.progress = 0;
        this.frameCounter = 0;
        this.beamActive = false;
        this.flashFrame = 0;
        this.stretchFactor = 1.0;
        
        this.actor.set_scale(0.3, 0.3);
        this.actor.show();
    }
    
    drawBeam(area) {
        if (!this.beamActive) return;
        
        const cr = area.get_context();
        const [width, height] = area.get_surface_size();
        
        cr.setOperator(Cairo.Operator.CLEAR);
        cr.paint();
        cr.setOperator(Cairo.Operator.OVER);
        
        const ufoX = this.actor.get_x() + 25;
        const ufoY = this.actor.get_y() + 25;
        
        const beamTopWidth = 30;
        const beamBottomWidth = 80;
        const beamHeight = this.containerHeight - ufoY;
        
        const gradient = new Cairo.LinearGradient(ufoX, ufoY, ufoX, ufoY + beamHeight);
        gradient.addColorStopRGBA(0, 100/255, 255/255, 150/255, this.beamAlpha);
        gradient.addColorStopRGBA(1, 150/255, 200/255, 255/255, this.beamAlpha * 0.4);
        
        cr.setSource(gradient);
        
        cr.moveTo(ufoX - beamTopWidth/2, ufoY);
        cr.lineTo(ufoX + beamTopWidth/2, ufoY);
        cr.lineTo(ufoX + beamBottomWidth/2, ufoY + beamHeight);
        cr.lineTo(ufoX - beamBottomWidth/2, ufoY + beamHeight);
        cr.closePath();
        cr.fill();
    }
    
    update() {
        if (!this.isActive) return;
        
        this.frameCounter++;
        
        if (this.phase === 1) {
            this.progress = Math.min(1.0, this.frameCounter / 100);
            
            const baseX = this.startX + (this.endX - this.startX) * this.progress;
            const baseY = this.startY + (this.endY - this.startY) * this.progress;
            const sinOffset = Math.sin(this.progress * Math.PI * 4) * 50;
            
            const vibrateX = (Math.random() - 0.5) * 4;
            const vibrateY = (Math.random() - 0.5) * 4;
            
            const finalX = baseX + vibrateX;
            const finalY = baseY + sinOffset + vibrateY;
            
            this.actor.set_position(finalX, finalY);
            
            const scale = 0.3 + (0.7 * this.progress);
            this.actor.set_scale(scale, scale);
            
            if (this.frameCounter >= 100) {
                this.phase = 2;
                this.frameCounter = 0;
                this.beamActive = true;
                this.beamCanvas.set_size(this.containerWidth, this.containerHeight);
                this.beamCanvas.show();
            }
        }
        
        else if (this.phase === 2) {
            const vibrateX = (Math.random() - 0.5) * 4;
            const vibrateY = (Math.random() - 0.5) * 4;
            
            this.actor.set_position(this.endX + vibrateX, this.endY + vibrateY);
            
            this.beamAlpha += 0.01 * this.beamPulseDirection;
            if (this.beamAlpha >= 0.9) this.beamPulseDirection = -1;
            if (this.beamAlpha <= 0.6) this.beamPulseDirection = 1;
            
            this.beamCanvas.queue_repaint();
            
            if (this.frameCounter >= 50) {
                this.phase = 3;
                this.frameCounter = 0;
                this.beamActive = false;
                this.beamCanvas.hide();
            }
        }
        
        else if (this.phase === 3) {
            if (this.frameCounter === 0 || this.frameCounter === 3 || this.frameCounter === 6) {
                this.actor.set_style('font-size: 50px; color: white; text-shadow: 0 0 20px white;');
            } else {
                this.actor.set_style('font-size: 50px;');
            }
            
            if (this.frameCounter >= 7) {
                const stretchProgress = (this.frameCounter - 7) / 3;
                const scaleX = 1.0 + (stretchProgress * 2.0);
                const scaleY = 1.0 - (stretchProgress * 0.7);
                this.actor.set_scale(scaleX, scaleY);
                
                const opacity = 255 - (stretchProgress * 255);
                this.actor.set_opacity(opacity);
            }
            
            if (this.frameCounter >= 10) {
                this.isActive = false;
                this.phase = 0;
                this.actor.hide();
                this.actor.set_scale(1.0, 1.0);
                this.actor.set_opacity(255);
            }
        }
    }
    
    destroy() {
        this.actor.destroy();
        this.beamCanvas.destroy();
    }
}