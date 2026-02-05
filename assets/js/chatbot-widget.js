/**
 * IntakeFlow Chat Widget - Frontend JavaScript
 * Handles chat bubble, conversation flow, and user interactions
 */

(function($) {
    'use strict';
    
    const IntakeFlowWidget = {
        sessionId: null,
        flowId: null,
        currentNode: null,
        conversationHistory: [],
        isOpen: false,
        
        init: function() {
            console.log('🎯 IntakeFlow Widget initializing...');
            console.log('📋 Widget settings:', intakeflowWidget);
            
            // Check if widget HTML exists
            if ($('#intakeflow-widget').length === 0) {
                console.error('❌ IntakeFlow widget HTML not found! The widget is not being rendered.');
                console.log('💡 Possible reasons:');
                console.log('   1. Widget is disabled in Settings');
                console.log('   2. No active flow exists');
                console.log('   3. PHP error preventing render');
                return;
            }
            
            console.log('✅ Widget HTML found');
            
            // Load session from LocalStorage
            this.loadSession();
            
            // Bind events
            this.bindEvents();
            
            // Check if should auto-open
            if (this.sessionId) {
                console.log('📱 Resuming previous session:', this.sessionId);
                this.openChat();
                this.restoreConversation();
            }
            
            console.log('✅ IntakeFlow Widget ready!');
        },
        
        bindEvents: function() {
            const self = this;
            
            // Open chat
            $('#intakeflow-bubble').on('click', function() {
                self.openChat();
                if (!self.sessionId) {
                    self.startConversation();
                }
            });
            
            // Close chat
            $('#intakeflow-close').on('click', function() {
                self.closeChat();
            });
        },
        
        openChat: function() {
            $('#intakeflow-bubble').hide();
            $('#intakeflow-window').fadeIn(200);
            this.isOpen = true;
            this.scrollToBottom();
        },
        
        closeChat: function() {
            $('#intakeflow-window').fadeOut(200, function() {
                $('#intakeflow-bubble').fadeIn(200);
            });
            this.isOpen = false;
        },
        
        startConversation: function() {
            const self = this;
            
            console.log('🚀 Starting new conversation...');
            
            $.ajax({
                url: intakeflowWidget.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'intakeflow_start_conversation',
                    nonce: intakeflowWidget.nonce
                },
                success: function(response) {
                    if (response.success) {
                        console.log('✅ Conversation started:', response.data);
                        
                        self.sessionId = response.data.session_id;
                        self.flowId = response.data.flow_id;
                        self.currentNode = response.data.current_node;
                        
                        // Save session
                        self.saveSession();
                        
                        // Display first message
                        self.displayBotMessage(response.data.message);
                    } else {
                        console.error('❌ Failed to start conversation:', response.data);
                        self.displayBotMessage({
                            type: 'message',
                            text: 'Sorry, our chat is temporarily unavailable. Please try again later.'
                        });
                    }
                },
                error: function(xhr, status, error) {
                    console.error('❌ AJAX error:', error);
                    self.displayBotMessage({
                        type: 'message',
                        text: 'Connection error. Please refresh the page and try again.'
                    });
                }
            });
        },
        
        sendResponse: function(userResponse) {
            const self = this;
            
            // Only display user message if it's not the auto-continue flag
            if (userResponse !== '__auto_continue__') {
                this.displayUserMessage(userResponse);
            }
            
            // Show typing indicator
            this.showTyping();
            
            console.log('📤 Sending response:', userResponse);
            
            $.ajax({
                url: intakeflowWidget.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'intakeflow_process_response',
                    nonce: intakeflowWidget.nonce,
                    session_id: this.sessionId,
                    flow_id: this.flowId,
                    current_node: this.currentNode,
                    response: userResponse
                },
                success: function(response) {
                    self.hideTyping();
                    
                    if (response.success) {
                        console.log('✅ Response processed:', response.data);
                        
                        if (response.data.end) {
                            // Conversation ended
                            self.displayBotMessage(response.data.message);
                            self.endConversation();
                        } else {
                            // Continue conversation
                            self.currentNode = response.data.current_node;
                            self.saveSession();
                            self.displayBotMessage(response.data.message);
                        }
                    } else {
                        console.error('❌ Failed to process response:', response.data);
                        self.displayBotMessage({
                            type: 'message',
                            text: 'Sorry, something went wrong. Please try again.'
                        });
                    }
                },
                error: function(xhr, status, error) {
                    self.hideTyping();
                    console.error('❌ AJAX error:', error);
                    self.displayBotMessage({
                        type: 'message',
                        text: 'Connection error. Please try again.'
                    });
                }
            });
        },
        
        displayBotMessage: function(message) {
            console.log('🤖 Bot message:', message);
            
            const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            
            // Add to messages container
            const $messageHtml = $(`
                <div class="intakeflow-message intakeflow-bot-message">
                    <div class="intakeflow-message-content">
                        <div class="intakeflow-message-text">${this.escapeHtml(message.text)}</div>
                        <div class="intakeflow-message-time">${timestamp}</div>
                    </div>
                </div>
            `);
            
            $('#intakeflow-messages').append($messageHtml);
            
            // Save to history
            this.conversationHistory.push({
                type: 'bot',
                message: message,
                timestamp: timestamp
            });
            
            // Handle auto-continue
            if (message.auto_continue) {
                const delay = (message.delay || 0) * 1000;
                setTimeout(() => {
                    this.sendResponse('__auto_continue__');
                }, delay);
            } else {
                // Show appropriate input
                this.showInput(message);
            }
            
            this.scrollToBottom();
        },
        
        displayUserMessage: function(text) {
            const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            const $messageHtml = $(`
                <div class="intakeflow-message intakeflow-user-message">
                    <div class="intakeflow-message-content">
                        <div class="intakeflow-message-text">${this.escapeHtml(text)}</div>
                        <div class="intakeflow-message-time">${timestamp}</div>
                    </div>
                </div>
            `);
            
            $('#intakeflow-messages').append($messageHtml);
            
            // Save to history
            this.conversationHistory.push({
                type: 'user',
                text: text,
                timestamp: timestamp
            });
            
            this.scrollToBottom();
        },
        
        showInput: function(message) {
            const self = this;
            const $inputArea = $('#intakeflow-input-area');
            $inputArea.empty();
            
            // Show buttons if available
            if (message.options && message.options.length > 0) {
                const $buttonsContainer = $('<div class="intakeflow-buttons"></div>');
                
                message.options.forEach(function(option) {
                    const $button = $(`
                        <button class="intakeflow-button" data-value="${self.escapeHtml(option.label)}">
                            ${self.escapeHtml(option.label)}
                        </button>
                    `);
                    
                    $button.on('click', function() {
                        const value = $(this).data('value');
                        self.sendResponse(value);
                        $inputArea.empty(); // Clear input after send
                    });
                    
                    $buttonsContainer.append($button);
                });
                
                $inputArea.append($buttonsContainer);
            }
            
            // Show text input if allowed or no buttons
            if (message.allow_text || !message.options || message.options.length === 0) {
                const placeholder = message.placeholder || 'Type your message...';
                
                const $textInput = $(`
                    <div class="intakeflow-text-input-container">
                        <input type="text" 
                               class="intakeflow-text-input" 
                               placeholder="${placeholder}" 
                               id="intakeflow-user-input" />
                        <button class="intakeflow-send-btn" id="intakeflow-send">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M2 10L18 2L10 18L8 11L2 10Z" fill="currentColor"/>
                            </svg>
                        </button>
                    </div>
                `);
                
                $inputArea.append($textInput);
                
                // Bind send events
                $('#intakeflow-send').on('click', function() {
                    const text = $('#intakeflow-user-input').val().trim();
                    if (text) {
                        self.sendResponse(text);
                        $('#intakeflow-user-input').val('');
                        $inputArea.empty();
                    }
                });
                
                $('#intakeflow-user-input').on('keypress', function(e) {
                    if (e.which === 13) { // Enter key
                        $('#intakeflow-send').click();
                    }
                });
                
                // Focus input
                setTimeout(function() {
                    $('#intakeflow-user-input').focus();
                }, 100);
            }
        },
        
        showTyping: function() {
            const $typing = $(`
                <div class="intakeflow-typing" id="intakeflow-typing">
                    <span></span><span></span><span></span>
                </div>
            `);
            $('#intakeflow-messages').append($typing);
            this.scrollToBottom();
        },
        
        hideTyping: function() {
            $('#intakeflow-typing').remove();
        },
        
        scrollToBottom: function() {
            const $messages = $('#intakeflow-messages');
            $messages.scrollTop($messages[0].scrollHeight);
        },
        
        saveSession: function() {
            const session = {
                sessionId: this.sessionId,
                flowId: this.flowId,
                currentNode: this.currentNode,
                history: this.conversationHistory
            };
            localStorage.setItem('intakeflow_session', JSON.stringify(session));
            console.log('💾 Session saved');
        },
        
        loadSession: function() {
            const saved = localStorage.getItem('intakeflow_session');
            if (saved) {
                const session = JSON.parse(saved);
                this.sessionId = session.sessionId;
                this.flowId = session.flowId;
                this.currentNode = session.currentNode;
                this.conversationHistory = session.history || [];
                console.log('📥 Session loaded:', this.sessionId);
            }
        },
        
        restoreConversation: function() {
            const self = this;
            this.conversationHistory.forEach(function(item) {
                if (item.type === 'bot') {
                    self.displayBotMessage(item.message);
                } else {
                    self.displayUserMessage(item.text);
                }
            });
        },
        
        endConversation: function() {
            localStorage.removeItem('intakeflow_session');
            this.sessionId = null;
            this.flowId = null;
            this.currentNode = null;
            this.conversationHistory = [];
            console.log('✅ Conversation ended');
        },
        
        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };
    
    // Initialize when document ready
    $(document).ready(function() {
        IntakeFlowWidget.init();
    });
    
})(jQuery);
