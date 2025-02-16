export class ChatInterface {
    constructor(client) {
        this.client = client;
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.messagesContainer = document.getElementById('messages');
        this.uploadZone = document.getElementById('upload-zone');
        this.fileInput = document.getElementById('file-input');
        
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.handleSendMessage());
        this.messageInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                this.handleSendMessage();
            }
        });

        this.uploadZone.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (event) => {
            this.handleFileUpload(event.target.files);
        });
    }

    setupDragAndDrop() {
        this.uploadZone.addEventListener('dragover', (event) => {
            event.preventDefault();
            this.uploadZone.classList.add('drag-over');
        });

        this.uploadZone.addEventListener('dragleave', () => {
            this.uploadZone.classList.remove('drag-over');
        });

        this.uploadZone.addEventListener('drop', (event) => {
            event.preventDefault();
            this.uploadZone.classList.remove('drag-over');
            this.handleFileUpload(event.dataTransfer.files);
        });
    }

    handleSendMessage() {
        const message = this.messageInput.value.trim();
        if (message) {
            this.addMessage(message, 'user');
            this.client.send({ text: message });
            this.messageInput.value = '';
        }
    }

    async handleFileUpload(files) {
        for (const file of files) {
            try {
                const base64Data = await this.readFileAsBase64(file);
                this.client.sendRealtimeInput([{
                    mimeType: file.type,
                    data: base64Data
                }]);
                this.addMessage(`Uploaded file: ${file.name}`, 'user');
            } catch (error) {
                console.error('File upload error:', error);
                this.addMessage(`Error uploading file: ${error.message}`, 'system');
            }
        }
    }

    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64Data = reader.result.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    addMessage(text, type) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', type);
        messageElement.textContent = text;
        this.messagesContainer.appendChild(messageElement);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    setEnabled(enabled) {
        this.messageInput.disabled = !enabled;
        this.sendButton.disabled = !enabled;
        this.uploadZone.style.pointerEvents = enabled ? 'auto' : 'none';
        this.uploadZone.style.opacity = enabled ? '1' : '0.5';
    }
} 