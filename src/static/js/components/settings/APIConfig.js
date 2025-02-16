export class APIConfig {
    constructor() {
        this.apiKeyInput = document.getElementById('api-key');
        this.connectButton = document.getElementById('connect-button');
        this.configToggle = document.getElementById('config-toggle');
        this.configContainer = document.getElementById('config-container');
        
        this.setupEventListeners();
        this.loadSavedAPIKey();
    }

    setupEventListeners() {
        this.configToggle.addEventListener('click', () => {
            this.configContainer.classList.toggle('active');
            this.configToggle.classList.toggle('active');
        });

        this.apiKeyInput.addEventListener('input', () => {
            this.saveAPIKey();
        });
    }

    loadSavedAPIKey() {
        const savedApiKey = localStorage.getItem('gemini_api_key');
        if (savedApiKey) {
            this.apiKeyInput.value = savedApiKey;
        }
    }

    saveAPIKey() {
        localStorage.setItem('gemini_api_key', this.apiKeyInput.value);
    }

    getAPIKey() {
        return this.apiKeyInput.value;
    }

    setConnectionState(isConnected) {
        this.connectButton.textContent = isConnected ? 'Disconnect' : 'Connect';
        this.connectButton.classList.toggle('connected', isConnected);
    }
} 