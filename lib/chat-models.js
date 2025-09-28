// Chat message representation
export class ChatMessage {
    constructor(userMessage, systemResponse = null, timestamp = null) {
        this.user = userMessage;
        this.system = systemResponse;
        this.timestamp = timestamp || new Date().toISOString();
    }

    // Convert to plain object for JSON serialization
    toJSON() {
        return {
            user: this.user,
            system: this.system,
            timestamp: this.timestamp
        };
    }

    // Create from plain object (for deserialization)
    static fromJSON(data) {
        return new ChatMessage(data.user, data.system, data.timestamp);
    }
}

// Chat session representation
export class ChatSession {
    constructor(sessionId = null, name = null) {
        this.sessionId = sessionId || this.generateSessionId();
        this.name = name || this.generateDefaultName();
        this.messages = [];
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    generateSessionId() {
        return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateDefaultName() {
        return 'New Chat';
    }

    updateName(newName) {
        this.name = newName || this.generateDefaultName();
        this.updatedAt = new Date().toISOString();
    }

    addMessage(userMessage, systemResponse = null) {
        const chatMessage = new ChatMessage(userMessage, systemResponse);
        this.messages.push(chatMessage);
        this.updatedAt = new Date().toISOString();
        return chatMessage;
    }

    updateLastMessage(systemResponse) {
        if (this.messages.length > 0) {
            const lastMessage = this.messages[this.messages.length - 1];
            lastMessage.system = systemResponse;
            this.updatedAt = new Date().toISOString();
            return lastMessage;
        }
        return null;
    }

    // Get conversation history in OpenAI API format
    getConversationHistory() {
        const messages = [
            {
                role: "system",
                content: "You are a helpful assistant."
            }
        ];

        // Add all previous messages to provide context
        this.messages.forEach(msg => {
            if (msg.user) {
                messages.push({
                    role: "user",
                    content: msg.user
                });
            }
            if (msg.system) {
                messages.push({
                    role: "assistant",
                    content: msg.system
                });
            }
        });

        return messages;
    }

    // Convert to plain object for JSON serialization
    toJSON() {
        return {
            sessionId: this.sessionId,
            name: this.name,
            messages: this.messages.map(msg => msg.toJSON()),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    // Create from plain object (for deserialization)
    static fromJSON(data) {
        const session = new ChatSession(data.sessionId, data.name);
        session.messages = data.messages.map(msgData => ChatMessage.fromJSON(msgData));
        session.createdAt = data.createdAt;
        session.updatedAt = data.updatedAt;
        return session;
    }
}