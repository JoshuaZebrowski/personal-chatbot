// Import configuration
import { CONFIG } from '/lib/config.js';
import { ChatHistoryManager } from '/lib/chat-history-manager.js';
import { ChatSession } from '/lib/chat-models.js';
import { CosmosDBProvider } from '/lib/storage-providers.js';

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

// Initialize storage provider
async function initializeStorageProvider() {
    console.log('Initializing Cosmos DB storage provider...');
    const cosmosProvider = new CosmosDBProvider();
    
    try {
        // Test the connection
        await cosmosProvider.ensureClientReady();
        console.log('Cosmos DB connected successfully!');
        return cosmosProvider;
    } catch (error) {
        console.error('Cosmos DB connection failed:', error.message);
        throw new Error('Failed to connect to Cosmos DB. Please ensure the API server is running.');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize storage provider
        const storageProvider = await initializeStorageProvider();
        
        // Initialize chat history manager with the storage provider
        chatHistory = new ChatHistoryManager(storageProvider);
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
    } catch (error) {
        console.error('Failed to initialize application:', error);
        // Show error message to user
        addMessage('Failed to connect to database. Please ensure the Cosmos DB API server is running on port 3001.', 'error');
        
        // Disable input
        userInput.disabled = true;
        sendButton.disabled = true;
    }
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
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
        
    // Split content into lines for better processing
    const lines = formatted.split('\n');
    const processedLines = [];
    let inList = false;
    let inOrderedList = false;
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmedLine = line.trim();
        
        // Skip empty lines but preserve spacing context
        if (!trimmedLine) {
            if (inList || inOrderedList) {
                // End current list
                inList = false;
                inOrderedList = false;
            }
            processedLines.push('</p><p>'); // Create paragraph break
            continue;
        }
        
        // Handle headers (all levels)
        if (/^#{1,6}\s/.test(trimmedLine)) {
            const level = trimmedLine.match(/^#+/)[0].length;
            const text = trimmedLine.replace(/^#+\s/, '');
            processedLines.push(`<h${level} class="ai-header h${level}">${text}</h${level}>`);
            continue;
        }
        
        // Handle horizontal rules
        if (/^[-_*]{3,}$/.test(trimmedLine)) {
            processedLines.push('<hr class="section-divider">');
            continue;
        }
        
        // Handle blockquotes
        if (/^>\s/.test(trimmedLine)) {
            const quoteText = trimmedLine.replace(/^>\s/, '');
            processedLines.push(`<blockquote class="ai-quote">${quoteText}</blockquote>`);
            continue;
        }
        
        // Handle ordered lists (1. 2. 3. or 1) 2) 3))
        if (/^\d+[\.\)]\s/.test(trimmedLine)) {
            const match = trimmedLine.match(/^(\d+[\.\)])\s+(.+)$/);
            if (match) {
                if (!inOrderedList) {
                    processedLines.push('<ol class="ai-ordered-list">');
                    inOrderedList = true;
                }
                processedLines.push(`<li class="ai-list-item">${match[2]}</li>`);
                inList = false;
                continue;
            }
        } else if (inOrderedList) {
            processedLines.push('</ol>');
            inOrderedList = false;
        }
        
        // Handle unordered lists (-, *, +, •)
        if (/^[-*+•]\s/.test(trimmedLine)) {
            const listText = trimmedLine.replace(/^[-*+•]\s/, '');
            if (!inList) {
                processedLines.push('<ul class="ai-unordered-list">');
                inList = true;
            }
            processedLines.push(`<li class="ai-list-item">${listText}</li>`);
            inOrderedList = false;
            continue;
        } else if (inList) {
            processedLines.push('</ul>');
            inList = false;
        }
        
        // Handle task lists (checkboxes)
        if (/^[-*+]\s*\[([ xX])\]\s/.test(trimmedLine)) {
            const match = trimmedLine.match(/^[-*+]\s*\[([ xX])\]\s+(.+)$/);
            if (match) {
                const isChecked = match[1].toLowerCase() === 'x';
                const text = match[2];
                processedLines.push(`<div class="task-item ${isChecked ? 'completed' : ''}">
                    <span class="checkbox ${isChecked ? 'checked' : ''}">
                        ${isChecked ? '✓' : '○'}
                    </span>
                    <span class="task-text">${text}</span>
                </div>`);
                continue;
            }
        }
        
        // Handle regular content
        processedLines.push(line);
    }
    
    // Close any open lists
    if (inList) processedLines.push('</ul>');
    if (inOrderedList) processedLines.push('</ol>');
    
    // Rejoin and continue with other formatting
    formatted = processedLines.join('\n')
        // Handle bold and italic (must be done carefully to avoid conflicts)
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
        
        // Handle links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="ai-link">$1 ↗</a>')
        
        // Handle strikethrough text
        .replace(/~~(.*?)~~/g, '<del class="strikethrough">$1</del>')
        
        // Handle highlighted text
        .replace(/==(.*?)==/g, '<mark class="highlight">$1</mark>')
        
        // Handle special formatting for structured content
        .replace(/\*\*([^:]*?):\*\*\s*(.*?)(?=\n|$)/g, '<div class="info-line"><span class="info-label">$1:</span> <span class="info-value">$2</span></div>')
        
        // Convert remaining content to paragraphs
        .split('</p><p>')
        .map(paragraph => {
            const trimmed = paragraph.trim();
            if (!trimmed) return '';
            
            // Don't wrap already formatted elements
            if (trimmed.includes('<h') || 
                trimmed.includes('<ul') || 
                trimmed.includes('<ol') || 
                trimmed.includes('<div class="code-block">') ||
                trimmed.includes('<hr') ||
                trimmed.includes('<blockquote') ||
                trimmed.includes('<div class="task-item">') ||
                trimmed.includes('<div class="info-line">')) {
                return trimmed;
            }
            
            return trimmed ? `<p class="ai-paragraph">${trimmed}</p>` : '';
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

// Note: Removed cleanupEmptySessions function - it was too aggressive and deleted valid sessions

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

        // Make the API call to our secure server-side endpoint
        const response = await fetch(`${CONFIG.API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: conversationMessages
            })
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
    
    // Start a new chat session (will clean up empty current session)
    if (chatHistory) {
        await chatHistory.startNewSession();
        console.log('Started new chat session:', chatHistory.getCurrentSession().sessionId);
        
        // Refresh sidebar to show updated session list (empty sessions should be gone)
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
window.startEditingSessionName = startEditingSessionName;
window.saveSessionName = saveSessionName;
window.cancelEditSessionName = cancelEditSessionName;

// ===== SIDEBAR FUNCTIONALITY =====

// Initialize sidebar with session list
async function initializeSidebar() {
    await refreshSessionList();
    
    // Prevent sidebar from closing when clicking inside it
    sidebar.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // Close sidebar when clicking outside (on overlay or document)
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') && 
            !sidebar.contains(e.target) && 
            !e.target.closest('.sidebar-toggle')) {
            closeSidebar();
        }
    });
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
    document.body.classList.add('sidebar-open');
    await refreshSessionList();
}

// Close sidebar
function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('visible');
    document.body.classList.remove('sidebar-open');
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
        
        // Clean up current empty session before loading new one
        await chatHistory.cleanupEmptySession();
        
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
            
            // Use the session name or fall back to message count
            let displayName = session.name || `Chat with ${session.messageCount} messages`;
            if (session.messageCount === 0) {
                displayName = session.name || 'New Chat';
            }

            return `
                <div class="session-item ${isActive ? 'active' : ''}" 
                     data-session-id="${session.sessionId}">
                    <div class="session-preview" 
                         data-session-id="${session.sessionId}"
                         title="Click to edit name">${displayName}</div>
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
                // Check what was clicked
                const clickedElement = e.target;
                
                // Don't do anything if clicking on delete button or edit controls
                if (clickedElement.classList.contains('session-delete') || 
                    clickedElement.classList.contains('session-edit-btn')) {
                    return;
                }
                
                // If clicking on the session name (preview), start editing
                if (clickedElement.classList.contains('session-preview') || 
                    clickedElement.closest('.session-preview')) {
                    // Don't load session if already editing
                    if (!clickedElement.closest('.session-preview.editing')) {
                        startEditingSessionName(sessionId);
                    }
                    return;
                }
                
                // If clicking elsewhere in the session item, load the session
                if (!e.target.closest('.session-preview.editing')) {
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

// ===== SESSION NAME EDITING FUNCTIONALITY =====

// Start editing a session name
function startEditingSessionName(sessionId) {
    const preview = document.querySelector(`.session-preview[data-session-id="${sessionId}"]`);
    if (!preview || preview.classList.contains('editing')) return;

    // Get the original session name by extracting only the text content, 
    // excluding any button text that might be included
    let currentName = preview.childNodes[0] ? preview.childNodes[0].textContent.trim() : preview.textContent.trim();
    
    // Remove any "Save" or "Cancel" text that might have been included
    currentName = currentName.replace(/\s*(Save|Cancel)\s*/g, '').trim();
    
    preview.classList.add('editing');
    
    preview.innerHTML = `
        <input type="text" class="session-name-input" value="${currentName}" 
               data-original-name="${currentName}" 
               data-session-id="${sessionId}"
               maxlength="50">
        <div class="session-edit-controls">
            <button class="session-edit-btn save" onclick="saveSessionName('${sessionId}', event)">Save</button>
            <button class="session-edit-btn cancel" onclick="cancelEditSessionName('${sessionId}', event)">Cancel</button>
        </div>
    `;

    const input = preview.querySelector('.session-name-input');
    input.focus();
    input.select();

    // Save on Enter, cancel on Escape
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveSessionName(sessionId, e);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEditSessionName(sessionId, e);
        }
    });
}

// Save the edited session name
async function saveSessionName(sessionId, event) {
    event.stopPropagation();
    
    const preview = document.querySelector(`.session-preview[data-session-id="${sessionId}"]`);
    const input = preview.querySelector('.session-name-input');
    
    if (!input) return;

    const newName = input.value.trim();
    if (!newName) {
        // If empty, cancel the edit
        cancelEditSessionName(sessionId, event);
        return;
    }

    try {
        // Update the session name in storage
        if (chatHistory.getCurrentSession()?.sessionId === sessionId) {
            // Update current session
            await chatHistory.updateCurrentSessionName(newName);
        } else {
            // Update a different session - need to load, update, and save
            const sessionData = await chatHistory.storageProvider.loadSession(sessionId);
            if (sessionData) {
                const session = ChatSession.fromJSON(sessionData);
                session.updateName(newName);
                await chatHistory.storageProvider.saveSession(session);
            }
        }

        // Update UI
        preview.classList.remove('editing');
        preview.innerHTML = newName;
        
        // Refresh the session list to reflect changes
        await refreshSessionList();
        
        console.log('Updated session name:', newName);
    } catch (error) {
        console.error('Error saving session name:', error);
        cancelEditSessionName(sessionId, event);
    }
}

// Cancel editing session name
function cancelEditSessionName(sessionId, event) {
    event.stopPropagation();
    
    const preview = document.querySelector(`.session-preview[data-session-id="${sessionId}"]`);
    const input = preview.querySelector('.session-name-input');
    
    if (!input) return;

    const originalName = input.getAttribute('data-original-name');
    preview.classList.remove('editing');
    preview.innerHTML = originalName;
}

// Make functions globally available for HTML onclick handlers
window.sendMessage = sendMessage;
window.toggleSidebar = toggleSidebar;
window.startNewChat = startNewChat;