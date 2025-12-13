import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Cairo from 'gi://cairo';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

export const MusicIndicator = GObject.registerClass(
class MusicIndicator extends PanelMenu.Button {
    _init(musicPlayer) {
        super._init(0.0, 'Christmas Music Player', false);
        
        this.musicPlayer = musicPlayer;
        
        // Panel icon
        this._icon = new St.Label({
            text: '🎵',
            y_align: Clutter.ActorAlign.CENTER,
            style: 'font-size: 16px;'
        });
        
        this.add_child(this._icon);
        
        // Build menu
        this._buildMenu();
    }
    
    _buildMenu() {
        // Title
        let titleItem = new PopupMenu.PopupMenuItem('🎵 Christmas Music Player', {
            reactive: false,
            can_focus: false
        });
        titleItem.label.style = 'font-weight: bold;';
        this.menu.addMenuItem(titleItem);
        
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        // Current track display
        this._trackLabel = new PopupMenu.PopupMenuItem('♪ No track playing', {
            reactive: false,
            can_focus: false
        });
        this.menu.addMenuItem(this._trackLabel);
        
        // Control buttons - ALL IN ONE ROW with labels + PREV button
        let controlBox = new St.BoxLayout({
            style_class: 'popup-menu-item',
            style: 'padding: 10px; spacing: 8px;'
        });
        
        // Play/Pause button
        this._playButton = new St.Button({
            label: '▶️ Play',
            style_class: 'button',
            x_expand: true
        });
        this._playButton.connect('clicked', () => {
            if (this.musicPlayer.isPlaying) {
                this.musicPlayer.pause();
                this._playButton.label = '▶️ Play';
            } else {
                this.musicPlayer.play();
                this._playButton.label = '⏸️ Pause';
                this._updateTrackLabel();
            }
        });
        controlBox.add_child(this._playButton);
        
        // Stop button
        this._stopButton = new St.Button({
            label: '⏹️ Stop',
            style_class: 'button',
            x_expand: true
        });
        this._stopButton.connect('clicked', () => {
            this.musicPlayer.stop();
            this._playButton.label = '▶️ Play';
            this._updateTrackLabel();
        });
        controlBox.add_child(this._stopButton);
        
        // Previous button
        let prevButton = new St.Button({
            label: '⏮️ Prev',
            style_class: 'button',
            x_expand: true
        });
        prevButton.connect('clicked', () => {
            this.musicPlayer.previous();
            if (this.musicPlayer.isPlaying) {
                this._playButton.label = '⏸️ Pause';
            }
            this._updateTrackLabel();
        });
        controlBox.add_child(prevButton);
        
        // Next button
        let nextButton = new St.Button({
            label: '⏭️ Next',
            style_class: 'button',
            x_expand: true
        });
        nextButton.connect('clicked', () => {
            this.musicPlayer.next();
            if (this.musicPlayer.isPlaying) {
                this._playButton.label = '⏸️ Pause';
            }
            this._updateTrackLabel();
        });
        controlBox.add_child(nextButton);
        
        // Mute button
        this._muteButton = new St.Button({
            label: '🔊 Mute',
            style_class: 'button',
            x_expand: true
        });
        this._muteButton.connect('clicked', () => {
            this.musicPlayer.toggleMute();
            this._muteButton.label = this.musicPlayer.isMuted ? '🔇 Unmute' : '🔊 Mute';
        });
        controlBox.add_child(this._muteButton);
        
        // Loop button
        this._loopButton = new St.Button({
            label: '🔁 Loop: ON',
            style_class: 'button',
            x_expand: true,
            style: 'color: #4CAF50;' // Green when ON
        });
        this._loopButton.connect('clicked', () => {
            this.musicPlayer.toggleLoop();
            if (this.musicPlayer.loopEnabled) {
                this._loopButton.label = '🔁 Loop: ON';
                this._loopButton.style = 'color: #4CAF50;'; // Green
            } else {
                this._loopButton.label = '🔁 Loop: OFF';
                this._loopButton.style = 'color: #888;'; // Gray
            }
        });
        controlBox.add_child(this._loopButton);
        
        let controlItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false
        });
        controlItem.actor.add_child(controlBox);
        this.menu.addMenuItem(controlItem);
        
        // Progress bar - HORIZONTAL sa vremenom
        let progressBox = new St.BoxLayout({
            style: 'padding: 5px 10px; spacing: 10px;',
            vertical: false,
            x_expand: true
        });
        
        // Time label
        this._progressLabel = new St.Label({
            text: '00:00 / 00:00',
            style: 'font-size: 11px; color: #888; min-width: 80px;',
            y_align: Clutter.ActorAlign.CENTER
        });
        progressBox.add_child(this._progressLabel);
        
        // Separator |
        let separator = new St.Label({
            text: '│',
            style: 'color: #555;',
            y_align: Clutter.ActorAlign.CENTER
        });
        progressBox.add_child(separator);
        
        // Progress bar (slider-style)
        this._progressBar = new St.DrawingArea({
            style: 'height: 6px;',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this._progressBar.connect('repaint', (area) => {
            this._drawProgressBar(area);
        });
        progressBox.add_child(this._progressBar);
        
        let progressItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false
        });
        progressItem.actor.add_child(progressBox);
        this.menu.addMenuItem(progressItem);
        
        // Start progress update timer
        this._progressUpdateId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            this._updateProgress();
            return GLib.SOURCE_CONTINUE;
        });
        
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        // Playlist section with scrollable area
        let playlistLabel = new PopupMenu.PopupMenuItem('📋 Playlist:', {
            reactive: false,
            can_focus: false
        });
        playlistLabel.label.style = 'font-weight: bold;';
        this.menu.addMenuItem(playlistLabel);
        
        // Scrollable playlist container
        this._playlistSection = new PopupMenu.PopupMenuSection();
        let scrollView = new St.ScrollView({
            style: 'max-height: 500px;',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC
        });
        scrollView.add_child(this._playlistSection.actor);
        
        let scrollItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false
        });
        scrollItem.actor.add_child(scrollView);
        this.menu.addMenuItem(scrollItem);
        
        // Build initial playlist
        this._buildPlaylistItems();
        
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        // Add music file button
        let addFileItem = new PopupMenu.PopupMenuItem('➕ Add Music File...');
        addFileItem.connect('activate', () => {
            this._openFilePicker();
        });
        this.menu.addMenuItem(addFileItem);
    }
    
    _buildPlaylistItems() {
        // Clear existing playlist items
        if (this._playlistItems) {
            this._playlistItems.forEach(item => item.destroy());
        }
        this._playlistItems = [];
        
        // Clear the section
        this._playlistSection.removeAll();
        
        // Add each track with checkbox AND remove button
        this.musicPlayer.playlist.forEach((track, index) => {
            // Create container for the whole row
            let rowBox = new St.BoxLayout({
                style: 'spacing: 8px; padding: 2px 0px;',
                x_expand: true,
                vertical: false
            });
            
            // Checkbox (enable/disable track)
            let checkbox = new St.Button({
                style_class: 'check-box',
                x_expand: false,
                can_focus: true,
                toggle_mode: true,
                checked: track.enabled
            });
            
            // Visual toggle
            if (track.enabled) {
                checkbox.add_style_class_name('toggle-on');
            }
            
            checkbox.connect('clicked', () => {
                track.enabled = !track.enabled;
                this.musicPlayer.playlist[index].enabled = track.enabled;
                
                if (track.enabled) {
                    checkbox.add_style_class_name('toggle-on');
                } else {
                    checkbox.remove_style_class_name('toggle-on');
                }
                
                this.musicPlayer.savePlaylist();
                log(`🎵 Track "${track.name}" ${track.enabled ? 'enabled' : 'disabled'}`);
            });
            
            rowBox.add_child(checkbox);
            
            // Track name label
            let nameLabel = new St.Label({
                text: track.name,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
                style: 'padding-left: 8px;'
            });
            rowBox.add_child(nameLabel);
            
            // Remove button (X) - smaller and always present
            let removeButton = new St.Button({
                label: '✖',
                style_class: 'button',
                style: 'padding: 2px 6px; font-size: 10px; color: #ff4444;',
                x_align: Clutter.ActorAlign.END
            });
            removeButton.connect('clicked', () => {
                this.musicPlayer.removeTrack(index);
                this._buildPlaylistItems(); // Rebuild list
            });
            rowBox.add_child(removeButton);
            
            // Add to section
            let rowItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                can_focus: false
            });
            rowItem.actor.style = 'padding: 2px 10px;';
            rowItem.actor.add_child(rowBox);
            
            this._playlistSection.addMenuItem(rowItem);
            this._playlistItems.push(rowItem);
        });
        
        if (this.musicPlayer.playlist.length === 0) {
            let emptyItem = new PopupMenu.PopupMenuItem('(No tracks in playlist)', {
                reactive: false,
                can_focus: false
            });
            emptyItem.label.style = 'font-style: italic; color: #888;';
            this._playlistSection.addMenuItem(emptyItem);
            this._playlistItems.push(emptyItem);
        }
    }
    
    _openFilePicker() {
        log('🎵 Opening file picker...');
        
        // Use native file manager (Nautilus) to select files
        let cmd = [
            'zenity',
            '--file-selection',
            '--title=Select Music File',
            '--file-filter=Audio Files | *.mp3 *.ogg *.flac *.wav *.m4a',
            '--multiple',
            '--separator=\n'
        ];
        
        try {
            let proc = Gio.Subprocess.new(
                cmd,
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            
            proc.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                    
                    if (proc.get_successful() && stdout) {
                        let files = stdout.trim().split('\n').filter(f => f.length > 0);
                        
                        files.forEach(filePath => {
                            this._addMusicFile(filePath);
                        });
                        
                        log(`🎵 Added ${files.length} file(s) to playlist`);
                        this._buildPlaylistItems();
                    }
                } catch (e) {
                    log('Error reading file picker output: ' + e.message);
                }
            });
            
        } catch (e) {
            log('Error opening file picker: ' + e.message);
        }
    }
    
    _addMusicFile(filePath) {
        // Extract filename from path
        let fileName = filePath.split('/').pop();
        
        // Convert to file:// URI
        let fileUri = `file://${filePath}`;
        
        // Add to playlist
        this.musicPlayer.playlist.push({
            name: fileName,
            uri: fileUri,
            enabled: true
        });
        
        // Save playlist
        this.musicPlayer.savePlaylist();
        
        log(`🎵 Added: ${fileName}`);
    }
    
    _updateProgress() {
        let progress = this.musicPlayer.getProgress();
        
        // Update label
        let posStr = this._formatTime(progress.position);
        let durStr = this._formatTime(progress.duration);
        this._progressLabel.text = `${posStr} / ${durStr}`;
        
        // Update current track name
        this._updateTrackLabel();
        
        // Redraw progress bar
        this._progressBar.queue_repaint();
    }
    
    _formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '00:00';
        
        let mins = Math.floor(seconds / 60);
        let secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    _drawProgressBar(area) {
        let cr = area.get_context();
        let [width, height] = area.get_surface_size();
        
        let progress = this.musicPlayer.getProgress();
        let fillWidth = (width * progress.percentage) / 100;
        
        let radius = height / 2; // Rounded corners
        
        // Background track (dark gray, rounded)
        cr.setSourceRGB(0.2, 0.2, 0.2);
        cr.newSubPath();
        cr.arc(radius, radius, radius, Math.PI / 2, 3 * Math.PI / 2);
        cr.arc(width - radius, radius, radius, 3 * Math.PI / 2, Math.PI / 2);
        cr.closePath();
        cr.fill();
        
        // Progress fill (green, rounded)
        if (fillWidth > radius * 2) {
            cr.setSourceRGB(0.3, 0.8, 0.3);
            cr.newSubPath();
            cr.arc(radius, radius, radius, Math.PI / 2, 3 * Math.PI / 2);
            cr.arc(Math.min(fillWidth, width) - radius, radius, radius, 3 * Math.PI / 2, Math.PI / 2);
            cr.closePath();
            cr.fill();
        } else if (fillWidth > 0) {
            // Very small progress - just a circle
            cr.setSourceRGB(0.3, 0.8, 0.3);
            cr.arc(radius, radius, radius, 0, 2 * Math.PI);
            cr.fill();
        }
    }
    
    _updateTrackLabel() {
        let trackName = this.musicPlayer.getCurrentTrackName();
        this._trackLabel.label.text = `♪ ${trackName}`;
    }
    
    destroy() {
        if (this._progressUpdateId) {
            GLib.source_remove(this._progressUpdateId);
            this._progressUpdateId = null;
        }
        
        super.destroy();
    }
});