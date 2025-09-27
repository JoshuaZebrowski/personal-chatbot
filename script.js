// Import configuration
import { CONFIG } from './config.js';
import { ChatHistoryManager } from './chat-history-manager.js';

// Global variables
let isLoading = false;
let chatHistory = null;

// DOM elements
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const loadingDiv = document.getElementById('loading');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sessionList = document.getElementById('sessionList');

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize chat history manager
    chatHistory = new ChatHistoryManager();
    await chatHistory.initialize();
    
    // Load existing conversation if available
    await loadConversationHistory();
    
    // Initialize sidebar
    await initializeSidebar();
    
    // Enable sending message with Enter key
    userInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
});

// Function to add a message to the chat
function addMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    if (type === 'ai') {
        // Format AI responses with better visual structure
        messageDiv.innerHTML = formatAIResponse(content);
    } else {
        // Keep user messages and errors as plain text
        messageDiv.textContent = content;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Function to format AI responses with comprehensive markdown support
function formatAIResponse(content) {
    // First, handle code blocks (must be done before other formatting)
    let formatted = content
        // Handle fenced code blocks with language specification
        .replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'text';
            return `<div class="code-block">
                <div class="code-header">
                    <span class="language-label">${language}</span>
                    <button class="copy-button" onclick="copyCode(this)">Copy</button>
                </div>
                <pre><code class="language-${language}">${code.trim()}</code></pre>
            </div>`;
        })
        // Handle inline code
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
        
        // Handle headers (all levels)
        .replace(/^##### (.*$)/gm, '<h5 class="ai-header h5">$1</h5>')
        .replace(/^#### (.*$)/gm, '<h4 class="ai-header h4">$1</h4>')
        .replace(/^### (.*$)/gm, '<h3 class="ai-header h3">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 class="ai-header h2">$1</h2>')
        .replace(/^# (.*$)/gm, '<h1 class="ai-header h1">$1</h1>')
        
        // Handle bold and italic (must be done carefully to avoid conflicts)
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
        
        // Handle links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="ai-link">$1 ↗</a>')
        
        // Handle tables
        .replace(/^\|(.+)\|\s*$/gm, (match, content) => {
            const cells = content.split('|').map(cell => cell.trim());
            return `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
        })
        
        // Handle horizontal rules (multiple variations)
        .replace(/^---+$/gm, '<hr class="section-divider">')
        .replace(/^___+$/gm, '<hr class="section-divider">')
        .replace(/^\*\*\*+$/gm, '<hr class="section-divider">')
        
        // Handle strikethrough text
        .replace(/~~(.*?)~~/g, '<del class="strikethrough">$1</del>')
        
        // Handle highlighted text
        .replace(/==(.*?)==/g, '<mark class="highlight">$1</mark>')
        
        // Handle blockquotes (including nested)
        .replace(/^> (.+$)/gm, '<blockquote class="ai-quote">$1</blockquote>')
        .replace(/^>> (.+$)/gm, '<blockquote class="ai-quote nested">$1</blockquote>')
        
        // Handle footnotes
        .replace(/\[\^(\w+)\]/g, '<sup class="footnote-ref">$1</sup>')
        
        // Handle different types of lists
        // Numbered lists with various formats
        .replace(/^(\d+[\.\)]\s+)(.*$)/gm, '<div class="list-item numbered"><span class="list-marker">$1</span>$2</div>')
        
        // Bullet lists with -, *, or •
        .replace(/^[-*•]\s+(.+$)/gm, '<div class="list-item bullet"><span class="list-marker">•</span> $1</div>')
        
        // Task lists (checkboxes)
        .replace(/^[-*]\s*\[([ x])\]\s+(.+$)/gm, (match, checked, text) => {
            const isChecked = checked === 'x';
            return `<div class="list-item task ${isChecked ? 'completed' : ''}">
                <span class="checkbox ${isChecked ? 'checked' : ''}">
                    ${isChecked ? '✓' : '○'}
                </span>
                ${text}
            </div>`;
        })
        
        // Handle special formatting for structured content
        .replace(/\*\*([^:]*?):\*\*\s*(.*?)(?=\n|$)/g, '<div class="info-line"><span class="info-label">$1:</span> <span class="info-value">$2</span></div>')
        
        // Convert line breaks to paragraphs (avoiding code blocks)
        .split(/\n\s*\n/)
        .map(paragraph => {
            if (paragraph.includes('<div class="code-block">') || 
                paragraph.includes('<h') || 
                paragraph.includes('<div class="list-item">') ||
                paragraph.includes('<hr') ||
                paragraph.includes('<blockquote') ||
                paragraph.includes('<div class="info-line">')) {
                return paragraph;
            }
            return paragraph.trim() ? `<p>${paragraph.trim()}</p>` : '';
        })
        .filter(p => p)
        .join('');
    
    return `<div class="formatted-response">${formatted}</div>`;
}

// Function to copy code to clipboard
function copyCode(button) {
    const codeBlock = button.closest('.code-block').querySelector('code');
    const text = codeBlock.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy code:', err);
        button.textContent = 'Copy failed';
        setTimeout(() => {
            button.textContent = 'Copy';
        }, 2000);
    });
}

// Make copyCode function globally available
window.copyCode = copyCode;

// Function to show/hide loading state
function setLoading(loading) {
    isLoading = loading;
    loadingDiv.style.display = loading ? 'flex' : 'none';
    sendButton.disabled = loading;
    sendButton.textContent = loading ? 'Sending...' : 'Send';
}

// Function to load conversation history from storage
async function loadConversationHistory() {
    try {
        const session = chatHistory.getCurrentSession();
        if (session && session.messages.length > 0) {
            // Clear existing messages except system message
            const systemMessage = messagesContainer.querySelector('.system-message');
            messagesContainer.innerHTML = '';
            if (systemMessage) {
                messagesContainer.appendChild(systemMessage);
            }

            // Load all previous messages
            session.messages.forEach(msg => {
                if (msg.user) {
                    addMessage(msg.user, 'user');
                }
                if (msg.system) {
                    addMessage(msg.system, 'ai');
                }
            });
        }
    } catch (error) {
        console.error('Error loading conversation history:', error);
    }
}

// Function to send message to Azure OpenAI
async function sendMessage() {
    const message = userInput.value.trim();

    // Validation
    if (!message) {
        addMessage('Please enter a message.', 'error');
        return;
    }

    if (isLoading) {
        return;
    }

    // Add user message to chat history
    await chatHistory.addUserMessage(message);
    
    // Add user message to chat UI
    addMessage(message, 'user');
    userInput.value = '';
    setLoading(true);

    try {
        // Get conversation history for context
        const conversationMessages = chatHistory.getConversationHistory();
        
        // Add the current message to the conversation
        conversationMessages.push({
            role: "user",
            content: message
        });

        // Prepare the request with full conversation history
        const requestBody = {
            messages: conversationMessages,
            max_tokens: 16384,
            temperature: 1,
            top_p: 1,
            model: CONFIG.AZURE_API_MODEL
        };

        // Make the API call using environment variable API key
        const response = await fetch(CONFIG.AZURE_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': CONFIG.AZURE_API_KEY
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
        }

        const data = await response.json();

        // Handle the response
        if (data.error) {
            throw new Error(data.error.message || 'Unknown API error');
        }

        if (data.choices && data.choices.length > 0) {
            const aiResponse = data.choices[0].message.content;
            
            // Add system response to chat history
            await chatHistory.addSystemResponse(aiResponse);
            
            // Add AI response to chat UI
            addMessage(aiResponse, 'ai');
            
            // Refresh sidebar to show updated session
            await refreshSessionList();
        } else {
            throw new Error('No response received from the AI model');
        }

    } catch (error) {
        console.error('Error:', error);
        addMessage(`Error: ${error.message}`, 'error');
    } finally {
        setLoading(false);
    }
}

// Function to clear chat (optional feature)
async function clearChat() {
    const messages = messagesContainer.querySelectorAll('.message:not(.system-message)');
    messages.forEach(message => message.remove());
    
    // Start a new chat session
    if (chatHistory) {
        await chatHistory.startNewSession();
        console.log('Started new chat session:', chatHistory.getCurrentSession().sessionId);
        
        // Refresh sidebar to show new session
        await refreshSessionList();
    }
}

// Function to get current session info (for debugging/development)
function getCurrentSessionInfo() {
    if (chatHistory && chatHistory.getCurrentSession()) {
        const session = chatHistory.getCurrentSession();
        return {
            sessionId: session.sessionId,
            messageCount: session.messages.length,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
        };
    }
    return null;
}

// Function to list all sessions (for future UI features)
async function listAllSessions() {
    if (chatHistory) {
        return await chatHistory.listAllSessions();
    }
    return [];
}

// Make functions globally available
window.sendMessage = sendMessage;
window.clearChat = clearChat;
window.getCurrentSessionInfo = getCurrentSessionInfo;
window.listAllSessions = listAllSessions;

// Sidebar functions
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.startNewChat = startNewChat;
window.clearAllSessions = clearAllSessions;
window.loadSession = loadSessionFromSidebar;
window.deleteSessionFromSidebar = deleteSessionFromSidebar;

// ===== SIDEBAR FUNCTIONALITY =====

// Initialize sidebar with session list
async function initializeSidebar() {
    await refreshSessionList();
}

// Toggle sidebar visibility
function toggleSidebar() {
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

// Open sidebar
async function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('visible');
    await refreshSessionList();
}

// Close sidebar
function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('visible');
}

// Start new chat session
async function startNewChat() {
    await clearChat();
    await refreshSessionList();
    closeSidebar();
}

// Load a session from sidebar
async function loadSessionFromSidebar(sessionId) {
    try {
        console.log('Loading session:', sessionId);
        
        // Load the session using the chat history manager
        const session = await chatHistory.loadSession(sessionId);
        
        if (session) {
            console.log('Session loaded successfully:', session.sessionId);
            
            // Clear current messages except system message
            const systemMessage = messagesContainer.querySelector('.system-message');
            messagesContainer.innerHTML = '';
            if (systemMessage) {
                messagesContainer.appendChild(systemMessage);
            }

            // Load session messages into UI
            if (session.messages && session.messages.length > 0) {
                session.messages.forEach(msg => {
                    if (msg.user) {
                        addMessage(msg.user, 'user');
                    }
                    if (msg.system) {
                        addMessage(msg.system, 'ai');
                    }
                });
            }

            // Update session list to show active session
            await refreshSessionList();
            closeSidebar();
            
            console.log('Successfully loaded session with', session.messages.length, 'messages');
        } else {
            console.error('Session not found:', sessionId);
            addMessage('Error: Chat session not found.', 'error');
        }
    } catch (error) {
        console.error('Error loading session:', error);
        addMessage('Error loading chat session.', 'error');
    }
}

// Delete session from sidebar
async function deleteSessionFromSidebar(sessionId, event) {
    if (event) {
        event.stopPropagation(); // Prevent triggering session load
    }
    
    if (confirm('Are you sure you want to delete this chat session?')) {
        try {
            await chatHistory.deleteSession(sessionId);
            await refreshSessionList();
            console.log('Deleted session:', sessionId);
        } catch (error) {
            console.error('Error deleting session:', error);
        }
    }
}

// Clear all sessions
async function clearAllSessions() {
    if (confirm('Are you sure you want to delete all chat history? This cannot be undone.')) {
        try {
            const sessions = await chatHistory.listAllSessions();
            for (const session of sessions) {
                await chatHistory.deleteSession(session.sessionId);
            }
            
            // Start fresh session
            await startNewChat();
            await refreshSessionList();
            
            console.log('All sessions cleared');
        } catch (error) {
            console.error('Error clearing all sessions:', error);
        }
    }
}

// Refresh the session list in sidebar
async function refreshSessionList() {
    try {
        const sessions = await chatHistory.listAllSessions();
        const currentSessionId = chatHistory.getCurrentSession()?.sessionId;
        
        if (sessions.length === 0) {
            sessionList.innerHTML = `
                <div class="empty-sessions">
                    <p>No chat history yet</p>
                    <small>Start a conversation to see your chat history here</small>
                </div>
            `;
            return;
        }

        sessionList.innerHTML = sessions.map(session => {
            const isActive = session.sessionId === currentSessionId;
            const date = new Date(session.updatedAt).toLocaleDateString();
            const time = new Date(session.updatedAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            // Get preview text from first user message
            let previewText = 'New Chat';
            if (session.messageCount > 0) {
                // We'll need to load the session to get the first message
                // For now, just use a generic preview
                previewText = `Chat with ${session.messageCount} messages`;
            }

            return `
                <div class="session-item ${isActive ? 'active' : ''}" 
                     data-session-id="${session.sessionId}"
                     style="cursor: pointer;">
                    <div class="session-preview">${previewText}</div>
                    <div class="session-meta">
                        <span class="session-date">${date} ${time}</span>
                        <div class="session-actions">
                            <button class="session-delete" 
                                    data-session-id="${session.sessionId}"
                                    title="Delete Session">×</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners after creating the HTML
        sessionList.querySelectorAll('.session-item').forEach(item => {
            const sessionId = item.getAttribute('data-session-id');
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking on delete button
                if (!e.target.classList.contains('session-delete')) {
                    loadSessionFromSidebar(sessionId);
                }
            });
        });

        // Add delete button event listeners
        sessionList.querySelectorAll('.session-delete').forEach(button => {
            const sessionId = button.getAttribute('data-session-id');
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteSessionFromSidebar(sessionId, e);
            });
        });

    } catch (error) {
        console.error('Error refreshing session list:', error);
        sessionList.innerHTML = `
            <div class="empty-sessions">
                <p>Error loading sessions</p>
                <small>Please try refreshing the page</small>
            </div>
        `;
    }
}

// Enhanced session preview (load first message for better preview)
async function getSessionPreview(sessionId) {
    try {
        const sessionData = await chatHistory.storageProvider.loadSession(sessionId);
        if (sessionData && sessionData.messages.length > 0) {
            const firstMessage = sessionData.messages[0];
            if (firstMessage.user) {
                return firstMessage.user.length > 50 
                    ? firstMessage.user.substring(0, 47) + '...'
                    : firstMessage.user;
            }
        }
        return 'New Chat';
    } catch (error) {
        return 'Chat Session';
    }
}