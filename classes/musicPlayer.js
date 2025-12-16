import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gst from 'gi://Gst';

export class MusicPlayer {
    constructor(extensionPath, settings) {
        this.extensionPath = extensionPath;
        this.settings = settings;
        this.player = null;
        this.currentTrack = 0;
        this.isPlaying = false;
        this.isMuted = false;
        
        // Load settings
        this.loopEnabled = this.settings.get_boolean('loop-enabled');
        this.volume = this.settings.get_double('volume');
        this.includeBundled = this.settings.get_boolean('include-bundled-song');
        
        // Playlist
        this.playlist = [];
        this.bundledSong = `file://${extensionPath}/Silent_Night.ogg`;
        
        // Progress tracking
        this.duration = 0;
        this.position = 0;
        this.progressUpdateId = null;
        
        this._initPlayer();
        this._loadPlaylist();
    }
    
    _initPlayer() {
        try {
            // Point 6: Check if Gst is initialized before calling init
            if (!Gst.is_initialized()) {
                Gst.init(null);
            }
            
            this.player = Gst.ElementFactory.make('playbin', 'player');
            
            if (!this.player) {
                console.error('Failed to create GStreamer playbin element');
                return;
            }
            
            this.player.set_property('volume', this.volume);
            
            // Connect to end-of-stream signal
            let bus = this.player.get_bus();
            bus.add_signal_watch();
            bus.connect('message', (bus, message) => {
                if (message.type === Gst.MessageType.EOS) {
                    this._onTrackEnded();
                } else if (message.type === Gst.MessageType.DURATION_CHANGED) {
                    this._updateDuration();
                }
            });
            
            console.debug('🎵 Music Player initialized successfully');
        } catch (e) {
            console.error(`Error initializing music player: ${e.message}`);
        }
    }
    
    _loadPlaylist() {
        this.playlist = [];
        
        // Load saved playlist from settings FIRST
        try {
            let playlistJson = this.settings.get_string('music-playlist');
            if (playlistJson && playlistJson !== '[]') {
                let savedTracks = JSON.parse(playlistJson);
                savedTracks.forEach(track => {
                    this.playlist.push({
                        name: track.name,
                        uri: track.uri,
                        enabled: track.enabled || true
                    });
                });
            }
        } catch (e) {
            console.error(`Error loading playlist: ${e.message}`);
        }
        
        // Add bundled song ONLY if not already in playlist
        if (this.includeBundled) {
            let hasSilentNight = this.playlist.some(track => 
                track.uri === this.bundledSong || track.name === 'Silent Night'
            );
            
            if (!hasSilentNight) {
                // Add at beginning
                this.playlist.unshift({
                    name: 'Silent Night',
                    uri: this.bundledSong,
                    enabled: true
                });
            }
        }
        
        console.debug(`🎵 Playlist loaded: ${this.playlist.length} songs`);
    }
    
    savePlaylist() {
        try {
            // Save ALL tracks (including bundled) with their enabled state
            let allTracks = this.playlist.map(track => ({
                name: track.name,
                uri: track.uri,
                enabled: track.enabled
            }));
            
            let playlistJson = JSON.stringify(allTracks);
            this.settings.set_string('music-playlist', playlistJson);
            console.debug('🎵 Playlist saved');
        } catch (e) {
            console.error(`Error saving playlist: ${e.message}`);
        }
    }
    
    _updateDuration() {
        if (!this.player) return;
        
        try {
            let [success, duration] = this.player.query_duration(Gst.Format.TIME);
            if (success && duration > 0) {
                this.duration = duration / Gst.SECOND;
            } else {
                // Duration not ready yet, will retry in progress updates
                this.duration = 0;
            }
        } catch (e) {
            // Ignore errors
            this.duration = 0;
        }
    }
    
    _startProgressUpdates() {
        if (this.progressUpdateId) return;
        
        this.progressUpdateId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            if (!this.isPlaying || !this.player) {
                return GLib.SOURCE_CONTINUE;
            }
            
            try {
                // Update position
                let [success, position] = this.player.query_position(Gst.Format.TIME);
                if (success) {
                    this.position = position / Gst.SECOND;
                }
                
                // Keep trying to get duration if we don't have it yet
                if (this.duration === 0) {
                    let [dSuccess, duration] = this.player.query_duration(Gst.Format.TIME);
                    if (dSuccess && duration > 0) {
                        this.duration = duration / Gst.SECOND;
                    }
                }
            } catch (e) {
                // Ignore errors
            }
            
            return GLib.SOURCE_CONTINUE;
        });
    }
    
    _stopProgressUpdates() {
        if (this.progressUpdateId) {
            GLib.source_remove(this.progressUpdateId);
            this.progressUpdateId = null;
        }
        this.position = 0;
        this.duration = 0;
    }
    
    getProgress() {
        return {
            position: this.position,
            duration: this.duration,
            percentage: this.duration > 0 ? (this.position / this.duration) * 100 : 0
        };
    }
    
    _onTrackEnded() {
        console.debug('🎵 Track ended');
        this._stopProgressUpdates();
        
        if (this.loopEnabled) {
            this.next();
        } else {
            this.stop();
        }
    }
    
    play() {
        if (!this.player || this.playlist.length === 0) {
            console.debug('Cannot play - no player or empty playlist');
            return;
        }
        
        try {
            // If paused, just resume
            if (this.isPlaying) {
                this.player.set_state(Gst.State.PLAYING);
                this._startProgressUpdates();
                console.debug('🎵 Resumed playback');
                return;
            }
            
            // Load current track
            let track = this.playlist[this.currentTrack];
            if (!track || !track.enabled) {
                // Find next enabled track
                this.currentTrack = this._findNextEnabledTrack();
                if (this.currentTrack === -1) {
                    console.debug('No enabled tracks in playlist');
                    return;
                }
                track = this.playlist[this.currentTrack];
            }
            
            console.debug(`🎵 Playing: ${track.name}`);
            this.player.set_property('uri', track.uri);
            this.player.set_state(Gst.State.PLAYING);
            this.isPlaying = true;
            
            this._updateDuration();
            this._startProgressUpdates();
            
        } catch (e) {
            console.error(`Error playing track: ${e.message}`);
        }
    }
    
    pause() {
        if (!this.player) return;
        
        try {
            this.player.set_state(Gst.State.PAUSED);
            this.isPlaying = false;
            this._stopProgressUpdates();
            console.debug('🎵 Paused');
        } catch (e) {
            console.error(`Error pausing: ${e.message}`);
        }
    }
    
    stop() {
        if (!this.player) return;
        
        try {
            this.player.set_state(Gst.State.NULL);
            this.isPlaying = false;
            this._stopProgressUpdates();
            console.debug('🎵 Stopped');
        } catch (e) {
            console.error(`Error stopping: ${e.message}`);
        }
    }
    
    next() {
        this.stop();
        
        let nextTrack = this._findNextEnabledTrack();
        if (nextTrack !== -1) {
            this.currentTrack = nextTrack;
            this.play();
        } else {
            console.debug('No next track available');
        }
    }
    
    previous() {
        this.stop();
        
        let prevTrack = this._findPreviousEnabledTrack();
        if (prevTrack !== -1) {
            this.currentTrack = prevTrack;
            this.play();
        } else {
            console.debug('No previous track available');
        }
    }
    
    _findPreviousEnabledTrack() {
        if (this.playlist.length === 0) return -1;
        
        // Start from current - 1, wrap around
        let startIndex = this.currentTrack - 1;
        if (startIndex < 0) startIndex = this.playlist.length - 1;
        
        for (let i = 0; i < this.playlist.length; i++) {
            let index = (startIndex - i);
            if (index < 0) index += this.playlist.length;
            
            if (this.playlist[index].enabled) {
                return index;
            }
        }
        
        return -1; // No enabled tracks found
    }
    
    _findNextEnabledTrack() {
        let startIndex = (this.currentTrack + 1) % this.playlist.length;
        
        for (let i = 0; i < this.playlist.length; i++) {
            let index = (startIndex + i) % this.playlist.length;
            if (this.playlist[index].enabled) {
                return index;
            }
        }
        
        return -1; // No enabled tracks found
    }
    
    toggleMute() {
        if (!this.player) return;
        
        this.isMuted = !this.isMuted;
        
        try {
            if (this.isMuted) {
                this.player.set_property('volume', 0.0);
                console.debug('🎵 Muted');
            } else {
                this.player.set_property('volume', this.volume);
                console.debug('🎵 Unmuted');
            }
        } catch (e) {
            console.error(`Error toggling mute: ${e.message}`);
        }
    }
    
    toggleLoop() {
        this.loopEnabled = !this.loopEnabled;
        this.settings.set_boolean('loop-enabled', this.loopEnabled);
        console.debug(`🎵 Loop: ${this.loopEnabled ? 'ON' : 'OFF'}`);
    }
    
    setVolume(volume) {
        this.volume = Math.max(0.0, Math.min(1.0, volume));
        this.settings.set_double('volume', this.volume);
        
        if (!this.isMuted && this.player) {
            try {
                this.player.set_property('volume', this.volume);
            } catch (e) {
                console.error(`Error setting volume: ${e.message}`);
            }
        }
    }
    
    removeTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;
        
        console.debug(`🎵 Removing: ${this.playlist[index].name}`);
        this.playlist.splice(index, 1);
        
        // Adjust current track index if needed
        if (this.currentTrack >= index) {
            this.currentTrack = Math.max(0, this.currentTrack - 1);
        }
        
        this.savePlaylist();
    }
    
    getCurrentTrackName() {
        if (this.playlist.length === 0) return 'No tracks';
        if (this.currentTrack >= this.playlist.length) return 'Unknown';
        
        return this.playlist[this.currentTrack].name;
    }
    
    destroy() {
        this._stopProgressUpdates();
        
        if (this.player) {
            try {
                this.player.set_state(Gst.State.NULL);
            } catch (e) {
                console.error(`Error destroying player: ${e.message}`);
            }
            this.player = null;
        }
        
        console.debug('🎵 Music Player destroyed');
    }
}