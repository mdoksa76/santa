import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

// Import klasa iz classes/ foldera
import {Snowflake} from './classes/snowflake.js';
import {ChristmasLightsCanvas} from './classes/lights.js';
import {SantaSleigh} from './classes/santa.js';
import {MusicPlayer} from './classes/musicPlayer.js';
import {MusicIndicator} from './classes/musicIndicator.js';

// Panel indicator for quick toggle
const SnowIndicator = GObject.registerClass(
class SnowIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, 'Christmas Snow Indicator', false);
        
        this._extension = extension;
        
        this._label = new St.Label({
            text: '🎄',
            y_align: Clutter.ActorAlign.CENTER
        });
        
        let box = new St.BoxLayout();
        box.add_child(this._label);
        this.add_child(box);
    }
    
    updateIcon(isActive) {
        this._label.text = isActive ? '❄️' : '🎄';
    }
    
    vfunc_event(event) {
        if (event.type() === Clutter.EventType.BUTTON_PRESS ||
            event.type() === Clutter.EventType.TOUCH_BEGIN) {
            this._extension.toggleAnimation();
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }
});

export default class XmasSnowExtension extends Extension {
    enable() {
        this._isAnimating = false;
        this._container = null;
        this._snowflakes = null;
        this._santaSleigh = null;
        this._rocket = null;
        this._ufo = null;
        this._fireworksShow = null;
        this._lightsCanvas = null;
        this._aurora = null;
        this._giftManager = null;
        this._timeoutId = null;
        
        // Get settings
        this._settings = this.getSettings();
        
        // Initialize music player with settings
        this._musicPlayer = new MusicPlayer(this.path, this._settings);
        
        // Add indicators to panel
        this._indicator = new SnowIndicator(this);
        Main.panel.addToStatusArea('christmas-snow-indicator', this._indicator);
        
        this._musicIndicator = new MusicIndicator(this._musicPlayer);
        Main.panel.addToStatusArea('christmas-music-indicator', this._musicIndicator);
    }
    
    _createAnimation() {
        this._container = new St.Widget({
            name: 'xmas-snow-container',
            reactive: false,
            can_focus: false,
            track_hover: false,
            clip_to_allocation: false
        });
        
        Main.layoutManager.addChrome(this._container, {
            affectsInputRegion: false,
            affectsStruts: false
        });
        
        const monitor = Main.layoutManager.primaryMonitor;
        const panelHeight = Main.panel.height;
        
        this._container.set_position(monitor.x, monitor.y + panelHeight);
        this._container.set_size(monitor.width, monitor.height - panelHeight);
        
        const containerWidth = monitor.width;
        const containerHeight = monitor.height - panelHeight;
        
        this._lightsCanvas = null;
        this._lightsCreated = false;
        
        this._currentPattern = 0;
        this._patternPhase = 0;
        this._patternTimer = 0;
        this._patternDuration = 600;
        
        // Create snowflakes
        this._snowflakes = [];
        const snowflakeCount = 50;
        
        for (let i = 0; i < snowflakeCount; i++) {
            const snowflake = new Snowflake(containerWidth, containerHeight);
            snowflake.y = Math.random() * containerHeight;
            this._snowflakes.push(snowflake);
            this._container.add_child(snowflake.actor);
        }
       
        this._santaSleigh = new SantaSleigh(containerWidth, containerHeight, this.path);
        this._container.add_child(this._santaSleigh.actor);
        
        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
            if (this._isAnimating) {
                this._patternPhase += 1;
                this._patternTimer += 1;
                
                if (!this._lightsCreated && this._patternPhase >= 20) {
                    this._lightsCanvas = new ChristmasLightsCanvas(containerWidth, containerHeight);
                    this._container.add_child(this._lightsCanvas.canvas);
                    this._lightsCreated = true;
                }
                
                if (this._patternTimer >= this._patternDuration) {
                    this._currentPattern = (this._currentPattern + 1) % 8;
                    this._patternTimer = 0;
                }
                
                this._snowflakes.forEach(snowflake => snowflake.update());
                
                if (this._lightsCanvas) {
                    this._lightsCanvas.update(this._currentPattern, this._patternPhase);
                }
                
                this._santaSleigh.update();
                
            }
            return GLib.SOURCE_CONTINUE;
        });
        
        this._monitorChangedId = Main.layoutManager.connect('monitors-changed', () => {
            const monitor = Main.layoutManager.primaryMonitor;
            const panelHeight = Main.panel.height;
            if (this._container) {
                this._container.set_position(monitor.x, monitor.y + panelHeight);
                this._container.set_size(monitor.width, monitor.height - panelHeight);
            }
        });
    }
    
    _destroyAnimation() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        
        if (this._monitorChangedId) {
            Main.layoutManager.disconnect(this._monitorChangedId);
            this._monitorChangedId = null;
        }
        
        if (this._snowflakes) {
            this._snowflakes.forEach(snowflake => snowflake.destroy());
            this._snowflakes = null;
        }
        
        if (this._lightsCanvas) {
            this._lightsCanvas.destroy();
            this._lightsCanvas = null;
        }
        
        if (this._santaSleigh) {
            this._santaSleigh.destroy();
            this._santaSleigh = null;
        }
        
        if (this._giftManager) {
            this._giftManager.destroy();
            this._giftManager = null;
        }
        
        if (this._container) {
            Main.layoutManager.removeChrome(this._container);
            this._container.destroy();
            this._container = null;
        }
    }
    
    toggleAnimation() {
        this._isAnimating = !this._isAnimating;
        
        if (this._isAnimating) {
            if (!this._container) {
                this._createAnimation();
            } else {
                this._container.show();
            }
        } else {
            if (this._container) {
                this._container.hide();
            }
        }
        
        if (this._indicator) {
            this._indicator.updateIcon(this._isAnimating);
        }
    }
    
    disable() {
        this._destroyAnimation();
        
        if (this._musicPlayer) {
            this._musicPlayer.destroy();
            this._musicPlayer = null;
        }
        
        if (this._musicIndicator) {
            this._musicIndicator.destroy();
            this._musicIndicator = null;
        }
        
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}