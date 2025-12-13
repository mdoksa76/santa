import St from 'gi://St';
import Cairo from 'gi://cairo';

export class ChristmasLightsCanvas {
    constructor(containerWidth, containerHeight) {
        this.canvas = new St.DrawingArea({
            reactive: false,
            can_focus: false,
            track_hover: false
        });
        
        this.canvas.set_size(containerWidth, 400);
        this.canvas.set_position(0, 0);
        
        this.canvas.connect('repaint', (area) => {
            this.draw(area);
        });
        
        this.containerWidth = containerWidth;
        this.setupLights();
    }
    
    setupLights() {
        this.lights = [];
        const spacing = 50;
        
        const numColumns = Math.floor(this.containerWidth / spacing);
        const totalWidth = numColumns * spacing;
        const offsetX = (this.containerWidth - totalWidth) / 2;
        
        for (let col = 0; col < numColumns; col++) {
            const x = offsetX + (col * spacing) + 25;
            const lightsInColumn = 3 + Math.floor(Math.random() * 3);
            
            const column = [];
            for (let i = 0; i < lightsInColumn; i++) {
                const y = 35 + (i * 20);
                
                column.push({
                    x: x,
                    y: y,
                    color: this.getRandomColor(),
                    isOn: false,
                    size: 6 + Math.random() * 4,
                    index: col * 20 + i
                });
            }
            
            this.lights.push(column);
        }
        
        this.flatLights = [];
        this.lights.forEach(column => {
            column.forEach(light => this.flatLights.push(light));
        });
    }
    
    getRandomColor() {
        const colors = [
            [255, 0, 0],
            [0, 255, 0],
            [0, 0, 255],
            [255, 255, 0],
            [255, 0, 255],
            [0, 255, 255],
            [255, 165, 0],
            [255, 255, 255]
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    draw(area) {
        const cr = area.get_context();
        const [width, height] = area.get_surface_size();
        
        cr.setOperator(Cairo.Operator.CLEAR);
        cr.paint();
        cr.setOperator(Cairo.Operator.OVER);
        
        this.lights.forEach(column => {
            if (column.length === 0) return;
            
            cr.setSourceRGB(0.176, 0.314, 0.086);
            cr.setLineWidth(2);
            
            cr.moveTo(column[0].x, 0);
            column.forEach(light => {
                cr.lineTo(light.x, light.y);
            });
            cr.stroke();
            
            column.forEach(light => {
                cr.setSourceRGB(0.2, 0.2, 0.2);
                cr.arc(light.x, light.y, light.size * 0.6, 0, 2 * Math.PI);
                cr.fill();
                
                if (light.isOn) {
                    const gradient = new Cairo.RadialGradient(
                        light.x, light.y, 0,
                        light.x, light.y, light.size * 2.5
                    );
                    gradient.addColorStopRGBA(
                        0,
                        light.color[0] / 255,
                        light.color[1] / 255,
                        light.color[2] / 255,
                        0.6
                    );
                    gradient.addColorStopRGBA(
                        1,
                        light.color[0] / 255,
                        light.color[1] / 255,
                        light.color[2] / 255,
                        0.0
                    );
                    cr.setSource(gradient);
                    cr.arc(light.x, light.y, light.size * 2.5, 0, 2 * Math.PI);
                    cr.fill();
                    
                    cr.setSourceRGBA(
                        light.color[0] / 255,
                        light.color[1] / 255,
                        light.color[2] / 255,
                        1.0
                    );
                    cr.arc(light.x, light.y, light.size, 0, 2 * Math.PI);
                    cr.fill();
                    
                    cr.setSourceRGBA(1, 1, 1, 0.6);
                    cr.arc(light.x - light.size * 0.3, light.y - light.size * 0.3, light.size * 0.4, 0, 2 * Math.PI);
                    cr.fill();
                } else {
                    cr.setSourceRGBA(
                        light.color[0] / 255,
                        light.color[1] / 255,
                        light.color[2] / 255,
                        0.15
                    );
                    cr.arc(light.x, light.y, light.size, 0, 2 * Math.PI);
                    cr.fill();
                }
            });
        });
    }
    
    update(pattern, globalPhase) {
        const numLights = this.flatLights.length;
        
        this.flatLights.forEach((light, index) => {
            switch(pattern) {
                case 0:
                    light.isOn = Math.floor(globalPhase / 20) % 2 === 0;
                    break;
                    
                case 1:
                    const wavePos = (globalPhase + index * 3) % 60;
                    light.isOn = wavePos < 30;
                    break;
                    
                case 2:
                    const pairGroup = Math.floor(index / 2) % 2;
                    const pairState = Math.floor(globalPhase / 20) % 2;
                    light.isOn = (pairGroup === pairState);
                    break;
                    
                case 3:
                    let foundColumn = -1;
                    let lightInColumn = -1;
                    
                    for (let col = 0; col < this.lights.length; col++) {
                        const colIndex = this.lights[col].findIndex(l => l === light);
                        if (colIndex !== -1) {
                            foundColumn = col;
                            lightInColumn = colIndex;
                            break;
                        }
                    }
                    
                    if (foundColumn !== -1) {
                        const maxLightsInColumn = Math.max(...this.lights.map(col => col.length));
                        const chasePos = Math.floor(globalPhase / 5) % (maxLightsInColumn * 2);
                        
                        const isEvenColumn = foundColumn % 2 === 0;
                        const passPhase = Math.floor(chasePos / maxLightsInColumn);
                        
                        if (passPhase === 0 && isEvenColumn) {
                            const posInPass = chasePos % maxLightsInColumn;
                            const trailLength = 3;
                            const distance = Math.abs(lightInColumn - posInPass);
                            light.isOn = distance < trailLength;
                        } else if (passPhase === 1 && !isEvenColumn) {
                            const posInPass = chasePos % maxLightsInColumn;
                            const trailLength = 3;
                            const distance = Math.abs(lightInColumn - posInPass);
                            light.isOn = distance < trailLength;
                        } else {
                            light.isOn = false;
                        }
                    }
                    break;
                    
                case 4:
                    const center = Math.floor(numLights / 2);
                    const centerDist = Math.abs(index - center);
                    const maxDist = Math.floor(numLights / 2);
                    const pulsePos = Math.floor(globalPhase / 3) % maxDist;
                    
                    const ring1 = pulsePos;
                    const ring2 = (pulsePos + Math.floor(maxDist / 3)) % maxDist;
                    const ring3 = (pulsePos + Math.floor(maxDist * 2 / 3)) % maxDist;
                    
                    light.isOn = (centerDist === ring1 || centerDist === ring2 || centerDist === ring3);
                    break;
                    
                case 5:
                    if (Math.random() < 0.03) {
                        light.isOn = true;
                    } else if (Math.random() < 0.1) {
                        light.isOn = false;
                    }
                    break;
                    
                case 6:
                    const oddEvenState = Math.floor(globalPhase / 20) % 2;
                    light.isOn = (index % 2 === oddEvenState);
                    break;
                    
                case 7:
                    light.isOn = Math.floor(globalPhase / 10) % 2 === 0;
                    break;
            }
        });
        
        this.canvas.queue_repaint();
    }
    
    destroy() {
        this.canvas.destroy();
    }
}