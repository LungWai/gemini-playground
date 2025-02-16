import { AudioRecorder } from '../../audio/audio-recorder.js';
import { VideoManager } from '../../video/video-manager.js';
import { ScreenRecorder } from '../../video/screen-recorder.js';
import { AudioStreamer } from '../../audio/audio-streamer.js';

export class MediaControls {
    constructor(client) {
        this.client = client;
        this.initializeElements();
        this.initializeState();
        this.setupEventListeners();
    }

    initializeElements() {
        // Buttons
        this.micButton = document.getElementById('mic-button');
        this.micIcon = document.getElementById('mic-icon');
        this.cameraButton = document.getElementById('camera-button');
        this.cameraIcon = document.getElementById('camera-icon');
        this.screenButton = document.getElementById('screen-button');
        this.screenIcon = document.getElementById('screen-icon');

        // Visualizers
        this.inputVisualizer = document.getElementById('input-audio-visualizer');
        this.outputVisualizer = document.getElementById('audio-visualizer');

        // Containers
        this.screenContainer = document.getElementById('screen-container');
        this.screenPreview = document.getElementById('screen-preview');
    }

    initializeState() {
        this.isRecording = false;
        this.isVideoActive = false;
        this.isScreenSharing = false;
        this.audioCtx = null;
        this.audioStreamer = null;
        this.audioRecorder = null;
        this.videoManager = null;
        this.screenRecorder = null;
    }

    setupEventListeners() {
        this.micButton.addEventListener('click', () => this.handleMicToggle());
        this.cameraButton.addEventListener('click', () => this.handleVideoToggle());
        this.screenButton.addEventListener('click', () => this.handleScreenShare());
    }

    async ensureAudioInitialized() {
        if (!this.audioCtx) {
            this.audioCtx = new AudioContext();
        }
        if (!this.audioStreamer) {
            this.audioStreamer = new AudioStreamer(this.audioCtx);
            await this.audioStreamer.addWorklet('vumeter-out', 'js/audio/worklets/vol-meter.js', (ev) => {
                this.updateAudioVisualizer(ev.data.volume);
            });
        }
        return this.audioStreamer;
    }

    updateAudioVisualizer(volume, isInput = false) {
        const visualizer = isInput ? this.inputVisualizer : this.outputVisualizer;
        const bar = visualizer.querySelector('.visualizer-bar');
        bar.style.height = `${volume * 100}%`;
        bar.classList.toggle('active', volume > 0);
    }

    async handleMicToggle() {
        if (!this.isRecording) {
            try {
                await this.startRecording();
            } catch (error) {
                console.error('Microphone error:', error);
                this.isRecording = false;
                this.updateMicIcon();
            }
        } else {
            this.stopRecording();
        }
    }

    async startRecording() {
        await this.ensureAudioInitialized();
        this.audioRecorder = new AudioRecorder();
        
        const inputAnalyser = this.audioCtx.createAnalyser();
        inputAnalyser.fftSize = 256;
        const inputDataArray = new Uint8Array(inputAnalyser.frequencyBinCount);
        
        await this.audioRecorder.start((base64Data) => {
            this.client.sendRealtimeInput([{
                mimeType: "audio/pcm;rate=16000",
                data: base64Data
            }]);
            
            inputAnalyser.getByteFrequencyData(inputDataArray);
            const inputVolume = Math.max(...inputDataArray) / 255;
            this.updateAudioVisualizer(inputVolume, true);
        });

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = this.audioCtx.createMediaStreamSource(stream);
        source.connect(inputAnalyser);
        
        await this.audioStreamer.resume();
        this.isRecording = true;
        this.updateMicIcon();
    }

    stopRecording() {
        if (this.audioRecorder && this.isRecording) {
            this.audioRecorder.stop();
        }
        this.isRecording = false;
        this.updateMicIcon();
        this.updateAudioVisualizer(0, true);
    }

    updateMicIcon() {
        this.micIcon.textContent = this.isRecording ? 'mic_off' : 'mic';
        this.micButton.classList.toggle('active', this.isRecording);
    }

    async handleVideoToggle() {
        if (!this.isVideoActive) {
            try {
                if (!this.videoManager) {
                    this.videoManager = new VideoManager();
                }
                
                await this.videoManager.start(1, (frameData) => {
                    this.client.sendRealtimeInput([frameData]);
                });

                this.isVideoActive = true;
                this.cameraIcon.textContent = 'videocam_off';
                this.cameraButton.classList.add('active');

            } catch (error) {
                console.error('Camera error:', error);
                this.isVideoActive = false;
                this.videoManager = null;
                this.cameraIcon.textContent = 'videocam';
                this.cameraButton.classList.remove('active');
            }
        } else {
            this.stopVideo();
        }
    }

    stopVideo() {
        if (this.videoManager) {
            this.videoManager.stop();
            this.videoManager = null;
        }
        this.isVideoActive = false;
        this.cameraIcon.textContent = 'videocam';
        this.cameraButton.classList.remove('active');
    }

    async handleScreenShare() {
        if (!this.isScreenSharing) {
            try {
                this.screenContainer.style.display = 'block';
                
                this.screenRecorder = new ScreenRecorder();
                await this.screenRecorder.start(this.screenPreview, (frameData) => {
                    this.client.sendRealtimeInput([{
                        mimeType: "image/jpeg",
                        data: frameData
                    }]);
                });

                this.isScreenSharing = true;
                this.screenIcon.textContent = 'stop_screen_share';
                this.screenButton.classList.add('active');

            } catch (error) {
                console.error('Screen sharing error:', error);
                this.isScreenSharing = false;
                this.screenIcon.textContent = 'screen_share';
                this.screenButton.classList.remove('active');
                this.screenContainer.style.display = 'none';
            }
        } else {
            this.stopScreenSharing();
        }
    }

    stopScreenSharing() {
        if (this.screenRecorder) {
            this.screenRecorder.stop();
            this.screenRecorder = null;
        }
        this.isScreenSharing = false;
        this.screenIcon.textContent = 'screen_share';
        this.screenButton.classList.remove('active');
        this.screenContainer.style.display = 'none';
    }

    setEnabled(enabled) {
        this.micButton.disabled = !enabled;
        this.cameraButton.disabled = !enabled;
        this.screenButton.disabled = !enabled;
    }

    async processAudioOutput(data) {
        try {
            await this.ensureAudioInitialized();
            const streamer = await this.ensureAudioInitialized();
            streamer.addPCM16(new Uint8Array(data));
        } catch (error) {
            console.error('Error processing audio:', error);
        }
    }
} 