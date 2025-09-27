// Import configuration
import { CONFIG } from './config.js';

// Global variables
let isLoading = false;

// DOM elements
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const loadingDiv = document.getElementById('loading');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
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

// Function to send message to Azure OpenAI
async function sendMessage() {
    console.log('🚀 sendMessage() called');
    const message = userInput.value.trim();
    console.log('📝 User message:', message);

    // Validation
    if (!message) {
        console.warn('⚠️ Empty message, showing error');
        addMessage('Please enter a message.', 'error');
        return;
    }

    if (isLoading) {
        console.log('⏳ Already loading, ignoring request');
        return;
    }

    // Add user message to chat
    addMessage(message, 'user');
    userInput.value = '';
    setLoading(true);

    try {
        // Prepare the request
        const requestBody = {
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant."
                },
                {
                    role: "user", 
                    content: message
                }
            ],
            max_tokens: 16384,
            temperature: 1,
            top_p: 1,
            model: CONFIG.AZURE_API_MODEL
        };

        console.log('📤 Sending request to:', CONFIG.AZURE_API_ENDPOINT);
        console.log('📋 Request body:', requestBody);

        // Make the API call using environment variable API key
        const response = await fetch(CONFIG.AZURE_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': CONFIG.AZURE_API_KEY
            },
            body: JSON.stringify(requestBody)
        });

        console.log('📥 Response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ API request failed:', {
                status: response.status,
                statusText: response.statusText,
                errorData
            });
            throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
        }

        const data = await response.json();
        console.log('✅ API response data:', data);

        // Handle the response
        if (data.error) {
            console.error('❌ API returned error:', data.error);
            throw new Error(data.error.message || 'Unknown API error');
        }

        if (data.choices && data.choices.length > 0) {
            const aiResponse = data.choices[0].message.content;
            console.log('🤖 AI response:', aiResponse);
            addMessage(aiResponse, 'ai');
        } else {
            console.error('❌ No choices in response');
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
function clearChat() {
    const messages = messagesContainer.querySelectorAll('.message:not(.system-message)');
    messages.forEach(message => message.remove());
}

// Make functions globally available
window.sendMessage = sendMessage;
window.clearChat = clearChat;