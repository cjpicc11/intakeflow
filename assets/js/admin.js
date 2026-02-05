/**
 * IntakeFlow Admin JavaScript
 * Flow Builder functionality using custom React canvas
 * Version: 0.26.0 - Added Action Node Configurations
 */

(function($) {
    'use strict';
    
    const IntakeFlowBuilder = {
        currentFlowId: null,
        currentFlow: null,
        reactFlowInstance: null,
        nodes: [],
        edges: [],
        selectedNode: null,
        nodeIdCounter: 1,
        
        init: function() {
            this.bindEvents();
            this.loadFlows();
            
            // Wait a bit for React to be available, then initialize canvas
            setTimeout(() => {
                this.initCanvas();
            }, 500);
        },
        
        bindEvents: function() {
            const self = this;
            
            // New flow button
            $('.intakeflow-new-flow').on('click', function(e) {
                e.preventDefault();
                self.createNewFlow();
            });
            
            // Save flow button
            $('.intakeflow-save-flow').on('click', function(e) {
                e.preventDefault();
                self.saveFlow();
            });
            
            // Add node buttons
            $('.intakeflow-add-node').on('click', function(e) {
                e.preventDefault();
                const nodeType = $(this).data('type');
                self.addNode(nodeType);
            });
            
            // Close node editor
            $(document).on('click', '.intakeflow-close-editor', function(e) {
                e.preventDefault();
                $('#intakeflow-node-editor').hide();
            });
            
            // Save node
            $(document).on('click', '.intakeflow-save-node', function(e) {
                e.preventDefault();
                self.saveNodeEdits();
            });
            
            // Delete node
            $(document).on('click', '.intakeflow-delete-node', function(e) {
                e.preventDefault();
                self.deleteNode();
            });
            
            // Flow list click
            $(document).on('click', '.intakeflow-edit-flow', function(e) {
                e.preventDefault();
                const flowId = $(this).data('flow-id');
                self.loadFlow(flowId);
            });
            
            // Delete flow
            $(document).on('click', '.intakeflow-delete-flow', function(e) {
                e.preventDefault();
                const flowId = $(this).data('flow-id');
                if (confirm('Are you sure you want to delete this flow?')) {
                    self.deleteFlow(flowId);
                }
            });
            
            // Duplicate flow
            $(document).on('click', '.intakeflow-duplicate-flow', function(e) {
                e.preventDefault();
                const flowId = $(this).data('flow-id');
                self.duplicateFlow(flowId);
            });
            
            // Add option button
            $(document).on('click', '.intakeflow-add-option', function(e) {
                e.preventDefault();
                self.addQuestionOption();
            });
            
            // Add condition button (old - keep for backward compat)
            $(document).on('click', '.intakeflow-add-condition', function(e) {
                e.preventDefault();
                self.addBranchCondition();
            });
            
            // Add output group button (new)
            $(document).on('click', '.intakeflow-add-output-group', function(e) {
                e.preventDefault();
                self.addOutputGroup();
            });
            
            // Add button (for Output nodes)
            $(document).on('click', '.intakeflow-add-button', function(e) {
                e.preventDefault();
                self.addOutputButton();
            });
            
            // Visibility mode change
            $('#intakeflow-flow-visibility').on('change', function() {
                const mode = $(this).val();
                if (mode === 'specific_roles') {
                    $('#intakeflow-visibility-settings').show();
                } else {
                    $('#intakeflow-visibility-settings').hide();
                }
            });
            
            // Configure roles button
            $(document).on('click', '#intakeflow-visibility-settings', function(e) {
                e.preventDefault();
                $('#intakeflow-visibility-modal').fadeIn(200);
            });
            
            // Close visibility modal
            $(document).on('click', '.intakeflow-modal-close, .intakeflow-modal-backdrop', function(e) {
                e.preventDefault();
                $('#intakeflow-visibility-modal').fadeOut(200);
            });
            
            // Save roles
            $(document).on('click', '#intakeflow-save-roles', function(e) {
                e.preventDefault();
                $('#intakeflow-visibility-modal').fadeOut(200);
                // Update button text to show how many roles selected
                const selectedCount = $('.intakeflow-role-checkbox:checked').length;
                $('#intakeflow-visibility-settings').text(selectedCount + ' role(s) selected');
            });
        },
        
        initCanvas: function() {
            const self = this;
            
            console.log('🎬 initCanvas starting...');
            
            // Check for React and ReactDOM
            if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
                console.log('⏳ Waiting for React/ReactDOM...');
                setTimeout(() => self.initCanvas(), 200);
                return;
            }
            
            console.log('✅ React and ReactDOM ready');
            
            // Check if FlowBuilder component is ready (loaded via ES module)
            if (typeof window.IntakeFlowCanvasComponent === 'undefined') {
                console.log('⏳ Waiting for IntakeFlowCanvasComponent...');
                setTimeout(() => self.initCanvas(), 200);
                return;
            }
            
            console.log('✅ IntakeFlowCanvasComponent found');
            
            const container = document.getElementById('intakeflow-canvas');
            if (!container) {
                console.error('❌ Canvas container #intakeflow-canvas not found');
                return;
            }
            
            console.log('✅ Canvas container found');
            console.log('🚀 Creating React root and rendering...');
            
            try {
                // Create React root
                const root = ReactDOM.createRoot(container);
                
                // Create FlowBuilder props
                const flowBuilderProps = {
                    initialNodes: self.nodes || [],
                    initialEdges: self.edges || [],
                    onNodeClick: (node) => {
                        console.log('👆 Node clicked from React:', node.id);
                        self.selectNode(node);
                    }
                };
                
                console.log('📦 Rendering FlowBuilder with props:', flowBuilderProps);
                
                // Render the FlowCanvas component
                root.render(React.createElement(window.IntakeFlowCanvasComponent, flowBuilderProps));
                
                self.reactFlowRoot = root;
                
                console.log('✅✅✅ React canvas mounted successfully! ✅✅✅');
            } catch (error) {
                console.error('❌ Error mounting canvas:', error);
                console.error('Stack:', error.stack);
            }
        },
        
        createNewFlow: function() {
            this.currentFlowId = null;
            this.currentFlow = {
                flow_name: 'Untitled Flow',
                flow_data: {
                    nodes: [],
                    edges: []
                },
                is_active: true
            };
            
            $('#intakeflow-flow-name').val('Untitled Flow');
            $('#intakeflow-flow-active').prop('checked', true);
            
            // IMPORTANT: Clear local state first
            this.nodes = [];
            this.edges = [];
            this.nodeIdCounter = 1; // Reset counter
            
            // IMPORTANT: Clear canvas immediately
            if (window.IntakeFlowReactInstance) {
                window.IntakeFlowReactInstance.setFlow({
                    nodes: [],
                    edges: []
                });
            }
            
            // Wait a moment for canvas to clear, then add start node
            setTimeout(() => {
                this.addNode('question', true);
            }, 100);
        },
        
        addNode: function(nodeType, isStart = false) {
            console.log('🔵 addNode called with type:', nodeType);
            
            // CRITICAL: Sync BOTH nodes and edges from canvas before adding new node
            if (window.IntakeFlowReactInstance) {
                const currentFlow = window.IntakeFlowReactInstance.getFlow();
                if (currentFlow.nodes) {
                    this.nodes = currentFlow.nodes;
                    // console.log('📍 Synced', this.nodes.length, 'node positions from canvas');
                }
                if (currentFlow.edges) {
                    this.edges = currentFlow.edges;
                    // console.log('🔗 Synced', this.edges.length, 'edges from canvas');
                }
            }
            
            const nodeId = 'node_' + this.nodeIdCounter++;
            
            // Smart grid-based positioning to prevent overlaps
            const nodeWidth = 250;  // Approximate with padding
            const nodeHeight = 100; // Approximate with padding  
            const startX = 100;
            const startY = 50;
            const gridSize = 300; // Space between grid positions
            
            let newX = startX;
            let newY = startY;
            
            // If we have existing nodes, use grid-based positioning
            if (this.nodes.length > 0) {
                // Create a grid occupation map
                const occupied = new Set();
                this.nodes.forEach(node => {
                    // Round position to nearest grid point
                    const gridX = Math.round(node.position.x / gridSize);
                    const gridY = Math.round(node.position.y / gridSize);
                    occupied.add(`${gridX},${gridY}`);
                });
                
                // Find first empty grid spot (spiral outward from origin)
                let found = false;
                let radius = 0;
                const maxRadius = 20; // Search up to 20 grid units away
                
                while (!found && radius < maxRadius) {
                    // Check positions at current radius (spiral pattern)
                    for (let dx = -radius; dx <= radius && !found; dx++) {
                        for (let dy = -radius; dy <= radius && !found; dy++) {
                            // Only check perimeter at this radius
                            if (radius === 0 || Math.abs(dx) === radius || Math.abs(dy) === radius) {
                                const gridX = dx;
                                const gridY = dy;
                                const key = `${gridX},${gridY}`;
                                
                                if (!occupied.has(key)) {
                                    newX = gridX * gridSize + startX;
                                    newY = gridY * gridSize + startY;
                                    found = true;
                                }
                            }
                        }
                    }
                    radius++;
                }
                
                // Fallback: if no spot found, place to the far right
                if (!found) {
                    let maxX = startX;
                    this.nodes.forEach(node => {
                        if (node.position.x > maxX) {
                            maxX = node.position.x;
                        }
                    });
                    newX = maxX + gridSize;
                    newY = startY;
                }
            }
            
            const newNode = {
                id: nodeId,
                type: 'custom',
                position: { x: newX, y: newY },
                data: {
                    nodeType: nodeType,
                    label: this.getNodeLabel(nodeType),
                    is_start: isStart
                }
            };
            
            // Add type-specific default data
            switch (nodeType) {
                case 'message':
                    // DEPRECATED: Convert to question with auto-continue
                    newNode.data.nodeType = 'question'; // Migrate to question
                    newNode.data.message = 'Hello! How can we help you today?';
                    newNode.data.auto_continue = true;
                    newNode.data.delay = 2; // 2 second delay
                    newNode.data.allow_text_input = false;
                    newNode.data.options = [];
                    newNode.data.label = 'Hello! How can we help you today?';
                    break;
                case 'question':
                    newNode.data.message = 'What are you interested in?';
                    newNode.data.auto_continue = false; // Wait for response
                    newNode.data.delay = 0;
                    newNode.data.allow_text_input = false; // Buttons only by default
                    newNode.data.text_placeholder = 'Type your message...';
                    newNode.data.options = [
                        { id: 'opt_1', label: 'Therapy Services' },
                        { id: 'opt_2', label: 'Wellness Services' }
                    ];
                    newNode.data.label = 'What are you interested in?';
                    break;
                case 'output':
                    // DEPRECATED: Convert to question with buttons
                    newNode.data.nodeType = 'question'; // Migrate to question
                    newNode.data.message = 'Great choice! Let me help you with that.';
                    newNode.data.auto_continue = false;
                    newNode.data.delay = 0;
                    newNode.data.allow_text_input = false;
                    newNode.data.options = [];
                    newNode.data.label = 'Great choice! Let me help you with...';
                    break;
                case 'click':
                    // DEPRECATED: Convert to question
                    newNode.data.nodeType = 'question'; // Migrate to question
                    newNode.data.message = 'Please select an option';
                    newNode.data.auto_continue = false;
                    newNode.data.allow_text_input = false;
                    newNode.data.options = [];
                    newNode.data.label = 'Please select an option';
                    break;
                case 'branch':
                    newNode.data.output_groups = [
                        { 
                            id: 'group_1', 
                            label: 'Output 1',
                            conditions: [
                                { id: 'cond_1', operator: 'equals', value: '' }
                            ],
                            logic: 'and' // Logic between conditions in this group
                        }
                    ];
                    newNode.data.label = 'Branch Logic';
                    break;
                case 'action':
                    newNode.data.action_type = 'capture_lead';
                    newNode.data.label = 'Capture Lead';
                    newNode.data.config = {
                        fields: {
                            name: { enabled: true, label: 'Your Name', required: true },
                            email: { enabled: true, label: 'Email Address', required: true },
                            phone: { enabled: false, label: 'Phone Number', required: false },
                            company: { enabled: false, label: 'Company', required: false }
                        },
                        success_message: "Thanks! We'll be in touch soon."
                    };
                    break;
            }
            
            this.nodes.push(newNode);
            
            console.log('✅ Node created:', newNode);
            console.log('📊 Total nodes now:', this.nodes.length);
            
            // Update canvas if available
            const updateCanvas = (retries = 0) => {
                if (window.IntakeFlowReactInstance) {
                    // console.log('🎯 Calling setFlow with', this.nodes.length, 'nodes');
                    window.IntakeFlowReactInstance.setFlow({
                        nodes: this.nodes,
                        edges: this.edges
                    });
                    // console.log('✅ setFlow called successfully');
                } else if (retries < 10) {
                    console.log('⏳ IntakeFlowReactInstance not ready, retry', retries + 1, '/10');
                    setTimeout(() => updateCanvas(retries + 1), 100);
                } else {
                    console.error('❌ IntakeFlowReactInstance not available after 10 retries!');
                }
            };
            
            updateCanvas();
            
            // Open editor for new node
            this.selectNode(newNode);
        },
        
        getNodeLabel: function(nodeType) {
            const labels = {
                'message': 'Message',
                'question': 'Question',
                'output': 'Output',
                'click': 'Click',
                'branch': 'Branch',
                'action': 'Action'
            };
            return labels[nodeType] || 'Node';
        },
        
        selectNode: function(node) {
            // IMPORTANT: Sync edges from canvas to get latest connections
            if (window.IntakeFlowReactInstance) {
                const currentFlow = window.IntakeFlowReactInstance.getFlow();
                if (currentFlow.edges) {
                    this.edges = currentFlow.edges;
                    // console.log('🔗 Synced', this.edges.length, 'edges before showing editor');
                }
            }
            
            this.selectedNode = node;
            this.showNodeEditor(node);
        },
        
        showNodeEditor: function(node) {
            const $editor = $('#intakeflow-node-editor');
            const $content = $('#intakeflow-node-editor-content');
            
            let template = '';
            
            const nodeType = node.data.nodeType || node.type;
            
            console.log('🎨 Showing editor for node type:', nodeType, 'Node:', node);
            
            switch (nodeType) {
                case 'message':
                    template = this.renderMessageNodeEditor(node);
                    break;
                case 'question':
                    template = this.renderQuestionNodeEditor(node);
                    break;
                case 'output':
                    template = this.renderOutputNodeEditor(node);
                    break;
                case 'click':
                    template = this.renderClickNodeEditor(node);
                    break;
                case 'branch':
                    template = this.renderBranchNodeEditor(node);
                    break;
                case 'action':
                    template = this.renderActionNodeEditor(node);
                    break;
                default:
                    console.error('Unknown node type:', nodeType);
                    template = '<p>Unknown node type: ' + nodeType + '</p>';
            }
            
            $content.html(template);
            $editor.show();
        },
        
        renderMessageNodeEditor: function(node) {
            const template = $('#intakeflow-message-node-template').html();
            return template
                .replace(/{{message}}/g, node.data.message || '')
                .replace(/{{delay}}/g, node.data.delay || 0);
        },
        
        renderQuestionNodeEditor: function(node) {
            const template = $('#intakeflow-question-node-template').html();
            
            // Handle backward compatibility
            const message = node.data.message || node.data.question || '';
            const autoContinue = node.data.auto_continue || false;
            const allowText = node.data.allow_text_input || false;
            const delay = node.data.delay || 0;
            const placeholder = node.data.text_placeholder || 'Type your message...';
            
            const autoContinueChecked = autoContinue ? 'checked' : '';
            const allowTextChecked = allowText ? 'checked' : '';
            
            // Show/hide delay field based on auto_continue
            const delayVisibility = autoContinue ? '' : 'display: none;';
            
            // Show/hide placeholder field based on allow_text_input
            const placeholderVisibility = allowText ? '' : 'display: none;';
            
            let html = template
                .replace(/{{message}}/g, message)
                .replace(/{{auto_continue_checked}}/g, autoContinueChecked)
                .replace(/{{allow_text_input_checked}}/g, allowTextChecked)
                .replace(/{{delay}}/g, delay)
                .replace(/{{text_placeholder}}/g, placeholder)
                .replace(/{{delay_visibility}}/g, delayVisibility)
                .replace(/{{text_placeholder_visibility}}/g, placeholderVisibility);
            
            setTimeout(() => {
                this.renderQuestionOptions(node.data.options || []);
                
                // Add event listener for auto_continue checkbox to show/hide delay
                $('input[data-field="auto_continue"]').on('change', function() {
                    const isChecked = $(this).is(':checked');
                    $('.intakeflow-delay-field').toggle(isChecked);
                });
                
                // Add event listener for allow_text_input checkbox to show/hide placeholder
                $('input[data-field="allow_text_input"]').on('change', function() {
                    const isChecked = $(this).is(':checked');
                    $('.intakeflow-text-placeholder-field').toggle(isChecked);
                });
            }, 0);
            
            return html;
        },
        
        renderOutputNodeEditor: function(node) {
            const template = $('#intakeflow-output-node-template').html();
            const html = template
                .replace(/{{output_message}}/g, node.data.output_message || '')
                .replace(/{{delay}}/g, node.data.delay || 0);
            
            setTimeout(() => {
                this.renderOutputButtons(node.data.buttons || []);
            }, 0);
            
            return html;
        },
        
        renderOutputButtons: function(buttons) {
            const $container = $('#intakeflow-output-buttons');
            $container.empty();
            
            buttons.forEach((button, index) => {
                const buttonHtml = `
                    <div class="intakeflow-option-item" data-button-id="${button.id}">
                        <input type="text" 
                               class="intakeflow-button-label" 
                               value="${button.label}" 
                               placeholder="Button text" 
                               style="flex: 1;" />
                        <select class="intakeflow-button-action" style="width: 120px;">
                            <option value="link" ${button.action === 'link' ? 'selected' : ''}>Open Link</option>
                            <option value="continue" ${button.action === 'continue' ? 'selected' : ''}>Continue Flow</option>
                        </select>
                        <input type="url" 
                               class="intakeflow-button-url" 
                               value="${button.url || ''}" 
                               placeholder="https://..." 
                               style="flex: 1; ${button.action === 'link' ? '' : 'display:none;'}" />
                        <button class="button button-small intakeflow-remove-button" type="button">
                            <span class="dashicons dashicons-no"></span>
                        </button>
                    </div>
                `;
                $container.append(buttonHtml);
            });
            
            // Show/hide URL field based on action type
            $('.intakeflow-button-action').on('change', function() {
                const $select = $(this);
                const $urlField = $select.siblings('.intakeflow-button-url');
                if ($select.val() === 'link') {
                    $urlField.show();
                } else {
                    $urlField.hide();
                }
            });
            
            // Remove button event
            $('.intakeflow-remove-button').on('click', function(e) {
                e.preventDefault();
                $(this).closest('.intakeflow-option-item').remove();
            });
        },
        
        renderClickNodeEditor: function(node) {
            const template = $('#intakeflow-click-node-template').html();
            
            // Find connected Output node to show available click options
            let connectedOutputNode = null;
            if (window.IntakeFlowReactInstance) {
                const currentFlow = window.IntakeFlowReactInstance.getFlow();
                const incomingEdge = currentFlow.edges?.find(e => e.target === node.id);
                if (incomingEdge) {
                    connectedOutputNode = this.nodes.find(n => 
                        n.id === incomingEdge.source && n.data.nodeType === 'output'
                    );
                }
            }
            
            setTimeout(() => {
                if (connectedOutputNode && connectedOutputNode.data.buttons && connectedOutputNode.data.buttons.length > 0) {
                    const buttonsList = connectedOutputNode.data.buttons
                        .map(b => `<div style="padding: 8px; background: #f0f0f0; margin: 5px 0; border-radius: 3px;">
                            <strong>${b.label}</strong> 
                            ${b.action === 'link' ? `<small style="color: #666;">→ ${b.url}</small>` : '<small style="color: #666;">→ Continue</small>'}
                        </div>`)
                        .join('');
                    
                    $('#intakeflow-click-options').html(`
                        <div class="intakeflow-notice" style="background: #e3f2fd;">
                            <p><strong>💡 Available Buttons:</strong></p>
                            ${buttonsList}
                            <small style="color: #666; margin-top: 10px; display: block;">Connect this Click node to different paths based on which button is clicked.</small>
                        </div>
                    `);
                } else {
                    $('#intakeflow-click-options').html(`
                        <div class="intakeflow-notice warning">
                            <p><strong>⚠️ No buttons detected</strong></p>
                            <p>Connect an Output node (with buttons configured) to this Click node to detect button clicks.</p>
                        </div>
                    `);
                }
            }, 0);
            
            return template;
        },
        
        renderQuestionOptions: function(options) {
            const $container = $('#intakeflow-question-options');
            $container.empty();
            
            options.forEach((option, index) => {
                const optionHtml = `
                    <div class="intakeflow-option-item" data-option-id="${option.id}">
                        <input type="text" 
                               class="intakeflow-option-label" 
                               value="${option.label}" 
                               placeholder="Option ${index + 1}" />
                        <button class="button button-small intakeflow-remove-option" type="button">
                            <span class="dashicons dashicons-no"></span>
                        </button>
                    </div>
                `;
                $container.append(optionHtml);
            });
            
            $('.intakeflow-remove-option').on('click', function(e) {
                e.preventDefault();
                $(this).closest('.intakeflow-option-item').remove();
            });
        },
        
        renderBranchNodeEditor: function(node) {
            const template = $('#intakeflow-branch-node-template').html();
            
            let connectedQuestionNode = null;
            if (window.IntakeFlowReactInstance) {
                const currentFlow = window.IntakeFlowReactInstance.getFlow();
                const incomingEdge = currentFlow.edges?.find(e => e.target === node.id);
                if (incomingEdge) {
                    connectedQuestionNode = this.nodes.find(n => 
                        n.id === incomingEdge.source && n.data.nodeType === 'question'
                    );
                }
            }
            
            let helpText = '';
            if (connectedQuestionNode && connectedQuestionNode.data.options) {
                const optionsList = connectedQuestionNode.data.options
                    .map(o => `<code style="background: #f0f0f0; padding: 2px 6px; margin: 0 4px; border-radius: 3px;">${o.label}</code>`)
                    .join('');
                    
                helpText = `<div class="intakeflow-notice" style="padding: 12px; margin-bottom: 15px; background: #e3f2fd; border-left: 4px solid #2271b1; font-size: 13px; line-height: 1.6;">
                    <strong>💡 Connected Question Options:</strong><br>
                    ${optionsList}<br>
                    <small style="color: #666; margin-top: 6px; display: block;">Use these values in your conditions below to route based on the user's answer.</small>
                </div>`;
            }
            
            setTimeout(() => {
                if (helpText) {
                    $('#intakeflow-branch-groups').before(helpText);
                }
                this.renderBranchGroups(node.data.output_groups || []);
            }, 0);
            
            return template;
        },
        
        renderBranchConditions: function(conditions) {
            const $container = $('#intakeflow-branch-conditions');
            $container.empty();
            
            let questionOptions = null;
            if (this.selectedNode && window.IntakeFlowReactInstance) {
                const currentFlow = window.IntakeFlowReactInstance.getFlow();
                const incomingEdge = currentFlow.edges?.find(e => e.target === this.selectedNode.id);
                if (incomingEdge) {
                    const connectedNode = this.nodes.find(n => 
                        n.id === incomingEdge.source && n.data.nodeType === 'question'
                    );
                    if (connectedNode && connectedNode.data.options) {
                        questionOptions = connectedNode.data.options;
                    }
                }
            }
            
            conditions.forEach((condition, index) => {
                let valueInput;
                
                if (questionOptions && questionOptions.length > 0) {
                    const optionsHtml = questionOptions.map(opt => 
                        `<option value="${opt.label}" ${condition.value === opt.label ? 'selected' : ''}>${opt.label}</option>`
                    ).join('');
                    
                    valueInput = `
                        <select class="intakeflow-condition-value" style="flex: 1;">
                            <option value="">-- Select an option --</option>
                            ${optionsHtml}
                        </select>
                    `;
                } else {
                    valueInput = `
                        <input type="text" 
                               class="intakeflow-condition-value" 
                               value="${condition.value || ''}" 
                               placeholder="Enter value" 
                               style="flex: 1;" />
                    `;
                }
                
                const logicDropdown = index > 0 ? `
                    <select class="intakeflow-condition-logic" style="width: 80px; margin-right: 8px;">
                        <option value="and" ${(condition.logic === 'and' || !condition.logic) ? 'selected' : ''}>AND</option>
                        <option value="or" ${condition.logic === 'or' ? 'selected' : ''}>OR</option>
                    </select>
                ` : '';
                
                const conditionHtml = `
                    <div class="intakeflow-condition-item" data-condition-id="${condition.id}" style="display: flex; gap: 8px; margin-bottom: 10px; align-items: center;">
                        ${logicDropdown}
                        <select class="intakeflow-condition-operator" style="width: 140px;">
                            <option value="equals" ${condition.operator === 'equals' ? 'selected' : ''}>Equals</option>
                            <option value="contains" ${condition.operator === 'contains' ? 'selected' : ''}>Contains</option>
                            <option value="starts_with" ${condition.operator === 'starts_with' ? 'selected' : ''}>Starts with</option>
                            <option value="not_empty" ${condition.operator === 'not_empty' ? 'selected' : ''}>Not empty</option>
                        </select>
                        ${valueInput}
                        <button class="button button-small intakeflow-remove-condition" type="button" style="flex-shrink: 0;">
                            <span class="dashicons dashicons-no"></span>
                        </button>
                    </div>
                `;
                $container.append(conditionHtml);
            });
            
            $('.intakeflow-remove-condition').on('click', function(e) {
                e.preventDefault();
                $(this).closest('.intakeflow-condition-item').remove();
            });
        },
        
        renderBranchGroups: function(outputGroups) {
            const $container = $('#intakeflow-branch-groups');
            $container.empty();
            
            // Get connected Question options for dropdown values
            let questionOptions = null;
            if (this.selectedNode && window.IntakeFlowReactInstance) {
                const currentFlow = window.IntakeFlowReactInstance.getFlow();
                const incomingEdge = currentFlow.edges?.find(e => e.target === this.selectedNode.id);
                if (incomingEdge) {
                    const connectedNode = this.nodes.find(n => 
                        n.id === incomingEdge.source && n.data.nodeType === 'question'
                    );
                    if (connectedNode && connectedNode.data.options) {
                        questionOptions = connectedNode.data.options;
                    }
                }
            }
            
            outputGroups.forEach((group, groupIndex) => {
                const groupHtml = `
                    <div class="intakeflow-output-group" data-group-id="${group.id}" style="background: #f9f9f9; border: 2px solid #ddd; border-radius: 6px; padding: 15px; margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h4 style="margin: 0; color: #555;">Output ${groupIndex + 1}</h4>
                            <button class="button button-small intakeflow-remove-group" type="button" style="color: #d32f2f;">
                                <span class="dashicons dashicons-no"></span> Remove Output
                            </button>
                        </div>
                        <div class="intakeflow-group-conditions" data-group-id="${group.id}">
                            <!-- Conditions for this group -->
                        </div>
                        <div style="margin-top: 10px;">
                            <button class="button button-small intakeflow-add-condition-to-group" data-group-id="${group.id}">
                                <span class="dashicons dashicons-plus"></span> Add Condition
                            </button>
                            <label style="margin-left: 15px;">
                                <span style="margin-right: 5px;">Conditions must:</span>
                                <select class="intakeflow-group-logic" data-group-id="${group.id}" style="width: 160px;">
                                    <option value="and" ${group.logic === 'and' ? 'selected' : ''}>ALL match (AND)</option>
                                    <option value="or" ${group.logic === 'or' ? 'selected' : ''}>ANY match (OR)</option>
                                </select>
                            </label>
                        </div>
                    </div>
                `;
                $container.append(groupHtml);
                
                // Render conditions for this group
                const $groupConditions = $(`.intakeflow-group-conditions[data-group-id="${group.id}"]`);
                (group.conditions || []).forEach((condition, condIndex) => {
                    let valueInput;
                    if (questionOptions && questionOptions.length > 0) {
                        const optionsHtml = questionOptions.map(opt => 
                            `<option value="${opt.label}" ${condition.value === opt.label ? 'selected' : ''}>${opt.label}</option>`
                        ).join('');
                        valueInput = `
                            <select class="intakeflow-condition-value" style="flex: 1;">
                                <option value="">-- Select --</option>
                                ${optionsHtml}
                            </select>
                        `;
                    } else {
                        valueInput = `
                            <input type="text" 
                                   class="intakeflow-condition-value" 
                                   value="${condition.value || ''}" 
                                   placeholder="Enter value" 
                                   style="flex: 1;" />
                        `;
                    }
                    
                    const conditionHtml = `
                        <div class="intakeflow-condition-item" data-condition-id="${condition.id}" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                            <select class="intakeflow-condition-operator" style="width: 120px;">
                                <option value="equals" ${condition.operator === 'equals' ? 'selected' : ''}>Equals</option>
                                <option value="contains" ${condition.operator === 'contains' ? 'selected' : ''}>Contains</option>
                                <option value="starts_with" ${condition.operator === 'starts_with' ? 'selected' : ''}>Starts with</option>
                                <option value="not_empty" ${condition.operator === 'not_empty' ? 'selected' : ''}>Not empty</option>
                            </select>
                            ${valueInput}
                            <button class="button button-small intakeflow-remove-condition" type="button">
                                <span class="dashicons dashicons-no"></span>
                            </button>
                        </div>
                    `;
                    $groupConditions.append(conditionHtml);
                });
            });
            
            // Event handlers
            $('.intakeflow-remove-group').on('click', function(e) {
                e.preventDefault();
                if (outputGroups.length > 1 || confirm('Remove this output group?')) {
                    $(this).closest('.intakeflow-output-group').remove();
                }
            });
            
            $('.intakeflow-remove-condition').on('click', function(e) {
                e.preventDefault();
                $(this).closest('.intakeflow-condition-item').remove();
            });
            
            $('.intakeflow-add-condition-to-group').on('click', function(e) {
                e.preventDefault();
                const groupId = $(this).data('group-id');
                const $groupConditions = $(`.intakeflow-group-conditions[data-group-id="${groupId}"]`);
                
                let valueInput = `<input type="text" class="intakeflow-condition-value" placeholder="Enter value" style="flex: 1;" />`;
                if (questionOptions && questionOptions.length > 0) {
                    const optionsHtml = questionOptions.map(opt => 
                        `<option value="${opt.label}">${opt.label}</option>`
                    ).join('');
                    valueInput = `
                        <select class="intakeflow-condition-value" style="flex: 1;">
                            <option value="">-- Select --</option>
                            ${optionsHtml}
                        </select>
                    `;
                }
                
                const newCondHtml = `
                    <div class="intakeflow-condition-item" data-condition-id="cond_${Date.now()}" style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <select class="intakeflow-condition-operator" style="width: 120px;">
                            <option value="equals">Equals</option>
                            <option value="contains">Contains</option>
                            <option value="starts_with">Starts with</option>
                            <option value="not_empty">Not empty</option>
                        </select>
                        ${valueInput}
                        <button class="button button-small intakeflow-remove-condition" type="button">
                            <span class="dashicons dashicons-no"></span>
                        </button>
                    </div>
                `;
                $groupConditions.append(newCondHtml);
                
                // Rebind remove handler
                $groupConditions.find('.intakeflow-remove-condition').last().on('click', function(e) {
                    e.preventDefault();
                    $(this).closest('.intakeflow-condition-item').remove();
                });
            });
        },
        
        renderActionNodeEditor: function(node) {
            const template = $('#intakeflow-action-node-template').html();
            const actionType = node.data.action_type || 'capture_lead';
            
            let html = template
                .replace(/{{selected_capture_lead}}/g, actionType === 'capture_lead' ? 'selected' : '')
                .replace(/{{selected_send_email}}/g, actionType === 'send_email' ? 'selected' : '')
                .replace(/{{selected_redirect}}/g, actionType === 'redirect' ? 'selected' : '')
                .replace(/{{selected_set_variable}}/g, actionType === 'set_variable' ? 'selected' : '');
            
            setTimeout(() => {
                this.renderActionConfig(node);
                
                $('#intakeflow-action-type').on('change', () => {
                    const newType = $('#intakeflow-action-type').val();
                    if (!node.data.config) node.data.config = {};
                    node.data.action_type = newType;
                    this.renderActionConfig(node);
                });
            }, 0);
            
            return html;
        },
        
        renderActionConfig: function(node) {
            const actionType = node.data.action_type || 'capture_lead';
            const config = node.data.config || {};
            const $container = $('#intakeflow-action-config');
            
            console.log('🎨 Rendering action config for:', actionType);
            console.log('📋 Current config:', config);
            
            $container.empty();
            
            switch(actionType) {
                case 'capture_lead':
                    this.renderCaptureLeadConfig($container, config);
                    break;
                case 'redirect':
                    console.log('🔗 Rendering redirect config');
                    this.renderRedirectConfig($container, config);
                    break;
                case 'send_email':
                    this.renderSendEmailConfig($container, config);
                    break;
                case 'set_variable':
                    this.renderSetVariableConfig($container, config);
                    break;
            }
            
            console.log('✅ Config rendered, fields:', $('.intakeflow-action-config-field').length);
        },
        
        renderCaptureLeadConfig: function($container, config) {
            const fields = config.fields || {
                name: { enabled: true, label: 'Your Name', required: true },
                email: { enabled: true, label: 'Email Address', required: true },
                phone: { enabled: false, label: 'Phone Number', required: false },
                company: { enabled: false, label: 'Company', required: false }
            };
            
            const successMessage = config.success_message || "Thanks! We'll be in touch soon.";
            const redirectUrl = config.redirect_url || '';
            
            const html = `
                <div class="intakeflow-field">
                    <label>Fields to Capture</label>
                    <p class="description">Choose which fields to collect from visitors.</p>
                    
                    <div class="intakeflow-capture-fields">
                        ${this.renderCaptureField('name', 'Name', fields.name)}
                        ${this.renderCaptureField('email', 'Email', fields.email)}
                        ${this.renderCaptureField('phone', 'Phone', fields.phone)}
                        ${this.renderCaptureField('company', 'Company', fields.company)}
                    </div>
                </div>
                
                <div class="intakeflow-field">
                    <label>Success Message</label>
                    <textarea class="intakeflow-action-config-field" 
                              data-config-field="success_message" 
                              rows="2" 
                              placeholder="Message shown after form submission">${successMessage}</textarea>
                    <p class="description">Message displayed after the visitor submits their information.</p>
                </div>
                
                <div class="intakeflow-field">
                    <label>Redirect After Capture (Optional)</label>
                    <input type="url" 
                           class="intakeflow-action-config-field" 
                           data-config-field="redirect_url" 
                           value="${redirectUrl}" 
                           placeholder="https://example.com/thank-you" />
                    <p class="description">Optional: Redirect to a thank-you page after form submission.</p>
                </div>
            `;
            
            $container.html(html);
            
            $('.intakeflow-field-enable').on('change', function() {
                const $checkbox = $(this);
                const fieldKey = $checkbox.data('field');
                const $fieldRow = $checkbox.closest('.intakeflow-capture-field-row');
                const $inputs = $fieldRow.find('.intakeflow-field-label, .intakeflow-field-required');
                
                if ($checkbox.is(':checked')) {
                    $inputs.prop('disabled', false);
                    $fieldRow.removeClass('disabled');
                } else {
                    $inputs.prop('disabled', true);
                    $fieldRow.addClass('disabled');
                }
            });
        },
        
        renderCaptureField: function(fieldKey, fieldName, fieldConfig) {
            const enabled = fieldConfig.enabled !== false;
            const label = fieldConfig.label || fieldName;
            const required = fieldConfig.required !== false;
            const disabledClass = enabled ? '' : 'disabled';
            
            return `
                <div class="intakeflow-capture-field-row ${disabledClass}" data-field="${fieldKey}">
                    <label class="intakeflow-capture-field-enable-label">
                        <input type="checkbox" 
                               class="intakeflow-field-enable" 
                               data-field="${fieldKey}" 
                               ${enabled ? 'checked' : ''} />
                        <strong>${fieldName}</strong>
                    </label>
                    
                    <input type="text" 
                           class="intakeflow-field-label" 
                           data-field="${fieldKey}" 
                           value="${label}" 
                           placeholder="Field label" 
                           ${enabled ? '' : 'disabled'} />
                    
                    <label class="intakeflow-field-required-label">
                        <input type="checkbox" 
                               class="intakeflow-field-required" 
                               data-field="${fieldKey}" 
                               ${required ? 'checked' : ''} 
                               ${enabled ? '' : 'disabled'} />
                        Required
                    </label>
                </div>
            `;
        },
        
        renderRedirectConfig: function($container, config) {
            console.log('🔗 renderRedirectConfig called with config:', config);
            const url = config.url || '';
            const target = config.target || '_self';
            const delay = config.delay || 0;
            const message = config.message || '';
            
            console.log('  URL:', url);
            console.log('  Target:', target);
            console.log('  Delay:', delay);
            console.log('  Message:', message);
            
            const html = `
                <div class="intakeflow-field">
                    <label>Redirect URL *</label>
                    <input type="url" 
                           class="intakeflow-action-config-field" 
                           data-config-field="url" 
                           value="${url}" 
                           placeholder="https://example.com/contact" 
                           required />
                    <p class="description">Full URL including https:// where visitors will be redirected.</p>
                </div>
                
                <div class="intakeflow-field">
                    <label>Open In</label>
                    <select class="intakeflow-action-config-field" data-config-field="target">
                        <option value="_self" ${target === '_self' ? 'selected' : ''}>Same Window</option>
                        <option value="_blank" ${target === '_blank' ? 'selected' : ''}>New Tab</option>
                    </select>
                </div>
                
                <div class="intakeflow-field">
                    <label>Delay (seconds)</label>
                    <input type="number" 
                           class="intakeflow-action-config-field" 
                           data-config-field="delay" 
                           value="${delay}" 
                           min="0" 
                           max="10" 
                           step="1" />
                    <p class="description">Optional delay before redirect (0-10 seconds).</p>
                </div>
                
                <div class="intakeflow-field">
                    <label>Message Before Redirect (Optional)</label>
                    <textarea class="intakeflow-action-config-field" 
                              data-config-field="message" 
                              rows="2" 
                              placeholder="Taking you there now...">${message}</textarea>
                    <p class="description">Optional message shown during the delay period.</p>
                </div>
            `;
            
            console.log('✅ About to set HTML');
            $container.html(html);
            console.log('✅ HTML set, checking if fields have values...');
            
            setTimeout(() => {
                const urlField = $('.intakeflow-action-config-field[data-config-field="url"]');
                console.log('  URL field value after render:', urlField.val());
                console.log('  URL field element:', urlField[0]);
            }, 100);
        },
        
        renderSendEmailConfig: function($container, config) {
            const to = config.to || '';
            const subject = config.subject || 'New Lead from IntakeFlow';
            const body = config.body || 'Name: {user_name}\nEmail: {user_email}\nPhone: {user_phone}';
            const cc = config.cc || '';
            const bcc = config.bcc || '';
            
            const html = `
                <div class="intakeflow-notice warning" style="margin-bottom: 20px;">
                    <p><strong>⚠️ Pro Feature:</strong> Email notifications require SMTP configuration in Settings.</p>
                </div>
                
                <div class="intakeflow-field">
                    <label>Recipient Email *</label>
                    <input type="email" 
                           class="intakeflow-action-config-field" 
                           data-config-field="to" 
                           value="${to}" 
                           placeholder="sales@example.com" 
                           required />
                    <p class="description">Where to send the notification email.</p>
                </div>
                
                <div class="intakeflow-field">
                    <label>Subject Line</label>
                    <input type="text" 
                           class="intakeflow-action-config-field" 
                           data-config-field="subject" 
                           value="${subject}" 
                           placeholder="New Lead from IntakeFlow" />
                    <p class="description">Use variables like {user_name}, {user_email}, {user_phone}.</p>
                </div>
                
                <div class="intakeflow-field">
                    <label>Email Body</label>
                    <textarea class="intakeflow-action-config-field" 
                              data-config-field="body" 
                              rows="6" 
                              placeholder="Name: {user_name}...">${body}</textarea>
                    <p class="description">Email content. Use {variable_name} for captured data.</p>
                </div>
                
                <div class="intakeflow-field">
                    <label>CC (Optional)</label>
                    <input type="text" 
                           class="intakeflow-action-config-field" 
                           data-config-field="cc" 
                           value="${cc}" 
                           placeholder="manager@example.com, team@example.com" />
                </div>
                
                <div class="intakeflow-field">
                    <label>BCC (Optional)</label>
                    <input type="text" 
                           class="intakeflow-action-config-field" 
                           data-config-field="bcc" 
                           value="${bcc}" 
                           placeholder="archive@example.com" />
                </div>
            `;
            
            $container.html(html);
        },
        
        renderSetVariableConfig: function($container, config) {
            const variableName = config.variable_name || '';
            const variableValue = config.variable_value || '';
            const valueType = config.value_type || 'static';
            
            const html = `
                <div class="intakeflow-notice warning" style="margin-bottom: 20px;">
                    <p><strong>⚠️ Pro Feature:</strong> Variable system enables advanced flow logic.</p>
                </div>
                
                <div class="intakeflow-field">
                    <label>Variable Name *</label>
                    <input type="text" 
                           class="intakeflow-action-config-field" 
                           data-config-field="variable_name" 
                           value="${variableName}" 
                           placeholder="user_score" 
                           pattern="[a-z_]+" 
                           required />
                    <p class="description">Use lowercase letters and underscores only (e.g., user_score, interest_level).</p>
                </div>
                
                <div class="intakeflow-field">
                    <label>Value Type</label>
                    <select class="intakeflow-action-config-field" data-config-field="value_type">
                        <option value="static" ${valueType === 'static' ? 'selected' : ''}>Static Value</option>
                        <option value="reference" ${valueType === 'reference' ? 'selected' : ''}>Reference Previous Answer</option>
                    </select>
                </div>
                
                <div class="intakeflow-field">
                    <label>Variable Value *</label>
                    <input type="text" 
                           class="intakeflow-action-config-field" 
                           data-config-field="variable_value" 
                           value="${variableValue}" 
                           placeholder="10 or {previous_answer}" 
                           required />
                    <p class="description">Static value (e.g., "10") or reference like {previous_answer}.</p>
                </div>
                
                <div class="intakeflow-notice" style="margin-top: 15px;">
                    <p><strong>💡 Use Case:</strong> Store values to use in Branch conditions later. Example: Set "score" based on answers, then branch if score > 50.</p>
                </div>
            `;
            
            $container.html(html);
        },
        
        saveNodeEdits: function() {
            if (!this.selectedNode) return;
            
            $('.intakeflow-node-field').each((index, field) => {
                const $field = $(field);
                const fieldName = $field.data('field');
                let value = $field.val();
                
                if ($field.is(':checkbox')) {
                    value = $field.is(':checked');
                }
                
                this.selectedNode.data[fieldName] = value;
            });
            
            const nodeType = this.selectedNode.data?.nodeType || this.selectedNode.type;
            
            if (nodeType === 'question') {
                const options = [];
                $('.intakeflow-option-item').each(function() {
                    const $item = $(this);
                    const optionId = $item.data('option-id') || 'opt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    const label = $item.find('.intakeflow-option-label').val();
                    if (label) {
                        options.push({
                            id: optionId,
                            label: label
                        });
                    }
                });
                this.selectedNode.data.options = options;
            }
            
            if (nodeType === 'output') {
                const buttons = [];
                $('.intakeflow-option-item').each(function() {
                    const $item = $(this);
                    const buttonId = $item.data('button-id') || 'btn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    const label = $item.find('.intakeflow-button-label').val();
                    const action = $item.find('.intakeflow-button-action').val();
                    const url = $item.find('.intakeflow-button-url').val();
                    if (label) {
                        buttons.push({
                            id: buttonId,
                            label: label,
                            action: action,
                            url: url
                        });
                    }
                });
                this.selectedNode.data.buttons = buttons;
            }
            
            if (nodeType === 'branch') {
                const outputGroups = [];
                $('.intakeflow-output-group').each(function() {
                    const $group = $(this);
                    const groupId = $group.data('group-id');
                    const logic = $group.find('.intakeflow-group-logic').val() || 'and';
                    const conditions = [];
                    
                    $group.find('.intakeflow-condition-item').each(function() {
                        const $cond = $(this);
                        const operator = $cond.find('.intakeflow-condition-operator').val();
                        const value = $cond.find('.intakeflow-condition-value').val();
                        if (value) {
                            conditions.push({
                                id: $cond.data('condition-id') || 'cond_' + Date.now(),
                                operator: operator,
                                value: value
                            });
                        }
                    });
                    
                    if (conditions.length > 0) {
                        outputGroups.push({
                            id: groupId,
                            label: 'Output ' + (outputGroups.length + 1),
                            conditions: conditions,
                            logic: logic
                        });
                    }
                });
                this.selectedNode.data.output_groups = outputGroups;
                
                // Update label
                if (outputGroups.length > 0) {
                    const labels = outputGroups.map(g => {
                        const vals = g.conditions.map(c => c.value).join(' ' + g.logic.toUpperCase() + ' ');
                        return vals;
                    }).join(' | ');
                    this.selectedNode.data.label = labels || 'Branch Logic';
                }
            }
            
            // Collect action configuration if this is an action node
            if (nodeType === 'action') {
                const actionType = $('#intakeflow-action-type').val();
                console.log('💾 Saving action node:', actionType);
                this.selectedNode.data.action_type = actionType;
                
                if (!this.selectedNode.data.config) {
                    this.selectedNode.data.config = {};
                }
                
                if (actionType === 'capture_lead') {
                    const fields = {};
                    $('.intakeflow-capture-field-row').each(function() {
                        const $row = $(this);
                        const fieldKey = $row.data('field');
                        const enabled = $row.find('.intakeflow-field-enable').is(':checked');
                        const label = $row.find('.intakeflow-field-label').val();
                        const required = $row.find('.intakeflow-field-required').is(':checked');
                        
                        fields[fieldKey] = { enabled, label, required };
                    });
                    
                    this.selectedNode.data.config.fields = fields;
                    this.selectedNode.data.config.success_message = 
                        $('.intakeflow-action-config-field[data-config-field="success_message"]').val();
                    this.selectedNode.data.config.redirect_url = 
                        $('.intakeflow-action-config-field[data-config-field="redirect_url"]').val();
                        
                } else {
                    // For redirect, send_email, set_variable - collect all config fields
                    console.log('💾 Collecting config fields for:', actionType);
                    
                    const self = this; // Save reference to IntakeFlowBuilder
                    
                    // CRITICAL: Scope selector to ONLY the editor modal to avoid picking up random objects
                    const $fields = $('#intakeflow-node-editor-content').find('input.intakeflow-action-config-field[data-config-field], select.intakeflow-action-config-field[data-config-field], textarea.intakeflow-action-config-field[data-config-field]');
                    
                    console.log('🔍 Found', $fields.length, 'fields');
                    
                    $fields.each(function(index) {
                        // 'this' is the DOM element (DON'T use .bind!)
                        const element = this;
                        const $field = $(element);
                        
                        // Use .attr() to get field name
                        const fieldName = $field.attr('data-config-field');
                        
                        // Get value safely - use direct DOM access
                        let value = element.value !== undefined ? element.value : '';
                        
                        console.log('  📝 Field:', fieldName, '= "' + value + '"');
                        
                        if ($field.attr('type') === 'number') {
                            value = parseFloat(value) || 0;
                        }
                        
                        // Use 'self' to access IntakeFlowBuilder
                        self.selectedNode.data.config[fieldName] = value;
                    });
                    
                    console.log('✅ Saved config:', this.selectedNode.data.config);
                }
                
                const labelMap = {
                    'capture_lead': 'Capture Lead',
                    'redirect': (() => {
                        try {
                            if (this.selectedNode.data.config.url) {
                                const hostname = new URL(this.selectedNode.data.config.url).hostname;
                                return 'Redirect → ' + hostname;
                            }
                        } catch(e) {
                            // Invalid URL
                        }
                        return 'Redirect (URL needed)';
                    })(),
                    'send_email': 'Email: ' + (this.selectedNode.data.config.to || 'Not configured'),
                    'set_variable': 'Set ' + (this.selectedNode.data.config.variable_name || 'variable')
                };
                this.selectedNode.data.label = labelMap[actionType] || 'Action';
                console.log('✅ Action node label:', this.selectedNode.data.label);
            }
            
            // Update label based on node type and mode
            if (nodeType === 'message' || nodeType === 'question') {
                const message = this.selectedNode.data.message || this.selectedNode.data.question || '';
                const autoContinue = this.selectedNode.data.auto_continue;
                const allowText = this.selectedNode.data.allow_text_input;
                const hasButtons = this.selectedNode.data.options && this.selectedNode.data.options.length > 0;
                
                // Add mode indicator to label
                let prefix = '';
                if (autoContinue) {
                    prefix = '💬 '; // Display only
                } else if (allowText && hasButtons) {
                    prefix = '✍️💬 '; // Text + buttons
                } else if (allowText) {
                    prefix = '✍️ '; // Text input only
                } else if (hasButtons) {
                    prefix = '🔘 '; // Buttons only
                }
                
                this.selectedNode.data.label = prefix + this.truncate(message, 30);
            } else if (nodeType === 'output') {
                this.selectedNode.data.label = this.truncate(this.selectedNode.data.output_message, 30);
            }
            
            $('#intakeflow-node-editor').hide();
            
            if (window.IntakeFlowReactInstance) {
                const currentFlow = window.IntakeFlowReactInstance.getFlow();
                if (currentFlow.nodes) {
                    this.nodes = currentFlow.nodes;
                    // console.log('📍 Synced', this.nodes.length, 'node positions from canvas');
                }
                if (currentFlow.edges) {
                    this.edges = currentFlow.edges;
                    // console.log('🔗 Synced', this.edges.length, 'edges from canvas');
                }
            }
            
            if (window.IntakeFlowReactInstance) {
                window.IntakeFlowReactInstance.setFlow({
                    nodes: this.nodes,
                    edges: this.edges
                });
            }
        },
        
        addQuestionOption: function() {
            console.log('➕ Add Option clicked');
            if (!this.selectedNode) {
                console.log('❌ No selected node');
                return;
            }
            
            const nodeType = this.selectedNode.data?.nodeType || this.selectedNode.type;
            console.log('📋 Node type:', nodeType);
            
            if (nodeType !== 'question') {
                console.log('❌ Not a question node');
                return;
            }
            
            // CRITICAL: Collect current values before re-rendering
            const currentOptions = [];
            $('.intakeflow-option-item').each(function() {
                const $item = $(this);
                const optionId = $item.data('option-id');
                const label = $item.find('.intakeflow-option-label').val();
                if (optionId) {
                    currentOptions.push({
                        id: optionId,
                        label: label || ''
                    });
                }
            });
            
            // Update with collected values
            if (currentOptions.length > 0) {
                this.selectedNode.data.options = currentOptions;
            }
            
            const newOption = {
                id: 'opt_' + Date.now(),
                label: ''
            };
            
            if (!this.selectedNode.data.options) {
                this.selectedNode.data.options = [];
            }
            
            this.selectedNode.data.options.push(newOption);
            this.renderQuestionOptions(this.selectedNode.data.options);
        },
        
        addBranchCondition: function() {
            console.log('➕ Add Condition clicked');
            if (!this.selectedNode) {
                console.log('❌ No selected node');
                return;
            }
            
            const nodeType = this.selectedNode.data?.nodeType || this.selectedNode.type;
            console.log('📋 Node type:', nodeType);
            
            if (nodeType !== 'branch') {
                console.log('❌ Not a branch node');
                return;
            }
            
            const currentConditions = [];
            $('.intakeflow-condition-item').each(function() {
                const $item = $(this);
                const conditionId = $item.data('condition-id');
                const operator = $item.find('.intakeflow-condition-operator').val();
                const value = $item.find('.intakeflow-condition-value').val();
                const logic = $item.find('.intakeflow-condition-logic').val() || 'and';
                currentConditions.push({
                    id: conditionId,
                    operator: operator,
                    value: value,
                    logic: logic
                });
            });
            
            if (currentConditions.length > 0) {
                this.selectedNode.data.conditions = currentConditions;
            }
            
            const newCondition = {
                id: 'cond_' + Date.now(),
                operator: 'equals',
                value: '',
                logic: 'and'
            };
            
            if (!this.selectedNode.data.conditions) {
                this.selectedNode.data.conditions = [];
            }
            
            this.selectedNode.data.conditions.push(newCondition);
            console.log('✅ Added condition, total:', this.selectedNode.data.conditions.length);
            this.renderBranchConditions(this.selectedNode.data.conditions);
        },
        
        addOutputGroup: function() {
            console.log('➕ Add Output Group clicked');
            if (!this.selectedNode) return;
            
            const nodeType = this.selectedNode.data?.nodeType || this.selectedNode.type;
            if (nodeType !== 'branch') return;
            
            // CRITICAL: Collect current values from form before re-rendering
            const currentGroups = [];
            $('.intakeflow-output-group').each(function() {
                const $group = $(this);
                const groupId = $group.data('group-id');
                const logic = $group.find('.intakeflow-group-logic').val() || 'and';
                const conditions = [];
                
                $group.find('.intakeflow-condition-item').each(function() {
                    const $cond = $(this);
                    const condId = $cond.data('condition-id');
                    const operator = $cond.find('.intakeflow-condition-operator').val();
                    const value = $cond.find('.intakeflow-condition-value').val();
                    
                    conditions.push({
                        id: condId || 'cond_' + Date.now(),
                        operator: operator,
                        value: value
                    });
                });
                
                currentGroups.push({
                    id: groupId,
                    label: 'Output ' + (currentGroups.length + 1),
                    conditions: conditions.length > 0 ? conditions : [{ id: 'cond_' + Date.now(), operator: 'equals', value: '' }],
                    logic: logic
                });
            });
            
            // Update node data with collected values
            if (currentGroups.length > 0) {
                this.selectedNode.data.output_groups = currentGroups;
            }
            
            // Add new group
            const newGroup = {
                id: 'group_' + Date.now(),
                label: 'Output ' + ((this.selectedNode.data.output_groups?.length || 0) + 1),
                conditions: [
                    { id: 'cond_' + Date.now(), operator: 'equals', value: '' }
                ],
                logic: 'and'
            };
            
            if (!this.selectedNode.data.output_groups) {
                this.selectedNode.data.output_groups = [];
            }
            
            this.selectedNode.data.output_groups.push(newGroup);
            this.renderBranchGroups(this.selectedNode.data.output_groups);
        },
        
        addOutputButton: function() {
            console.log('➕ Add Button clicked');
            if (!this.selectedNode) {
                console.log('❌ No selected node');
                return;
            }
            
            const nodeType = this.selectedNode.data?.nodeType || this.selectedNode.type;
            console.log('📋 Node type:', nodeType);
            
            if (nodeType !== 'output') {
                console.log('❌ Not an output node');
                return;
            }
            
            // CRITICAL: Collect current values before re-rendering
            const currentButtons = [];
            $('.intakeflow-option-item').each(function() {
                const $item = $(this);
                const buttonId = $item.data('button-id');
                const label = $item.find('.intakeflow-button-label').val();
                const action = $item.find('.intakeflow-button-action').val();
                const url = $item.find('.intakeflow-button-url').val();
                if (buttonId) {
                    currentButtons.push({
                        id: buttonId,
                        label: label || '',
                        action: action || 'link',
                        url: url || ''
                    });
                }
            });
            
            // Update with collected values
            if (currentButtons.length > 0) {
                this.selectedNode.data.buttons = currentButtons;
            }
            
            const newButton = {
                id: 'btn_' + Date.now(),
                label: '',
                action: 'link',
                url: ''
            };
            
            if (!this.selectedNode.data.buttons) {
                this.selectedNode.data.buttons = [];
            }
            
            this.selectedNode.data.buttons.push(newButton);
            this.renderOutputButtons(this.selectedNode.data.buttons);
        },
        
        deleteNode: function() {
            if (!this.selectedNode) return;
            
            if (confirm('Are you sure you want to delete this node?')) {
                if (window.IntakeFlowReactInstance) {
                    const currentFlow = window.IntakeFlowReactInstance.getFlow();
                    if (currentFlow.nodes) {
                        this.nodes = currentFlow.nodes;
                        // console.log('📍 Synced', this.nodes.length, 'node positions before delete');
                    }
                    if (currentFlow.edges) {
                        this.edges = currentFlow.edges;
                        // console.log('🔗 Synced', this.edges.length, 'edges before delete');
                    }
                }
                
                this.nodes = this.nodes.filter(n => n.id !== this.selectedNode.id);
                this.edges = this.edges.filter(e => 
                    e.source !== this.selectedNode.id && e.target !== this.selectedNode.id
                );
                
                $('#intakeflow-node-editor').hide();
                this.selectedNode = null;
                
                if (window.IntakeFlowReactInstance) {
                    window.IntakeFlowReactInstance.setFlow({
                        nodes: this.nodes,
                        edges: this.edges
                    });
                }
            }
        },
        
        selectNodeById: function(nodeId) {
            const node = this.nodes.find(n => n.id === nodeId);
            if (node) {
                this.selectNode(node);
            }
        },
        
        saveFlow: function() {
            const flowName = $('#intakeflow-flow-name').val();
            const isActive = $('#intakeflow-flow-active').is(':checked');
            const visibilityMode = $('#intakeflow-flow-visibility').val();
            
            // Get selected roles
            const visibleRoles = [];
            $('.intakeflow-role-checkbox:checked').each(function() {
                visibleRoles.push($(this).val());
            });
            
            if (!flowName || flowName.trim() === '') {
                alert('Please enter a flow name!');
                return;
            }
            
            // Check for visibility conflicts if activating
            if (isActive) {
                this.checkVisibilityConflict(visibilityMode, visibleRoles, () => {
                    this.performSave(flowName, isActive, visibilityMode, visibleRoles);
                });
            } else {
                this.performSave(flowName, isActive, visibilityMode, visibleRoles);
            }
        },
        
        checkVisibilityConflict: function(visibilityMode, visibleRoles, callback) {
            const self = this;
            
            // Get all flows to check for conflicts
            $.ajax({
                url: intakeflowAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'intakeflow_get_flows',
                    nonce: intakeflowAdmin.nonce
                },
                success: (response) => {
                    if (response.success) {
                        const activeFlows = response.data.filter(f => 
                            parseInt(f.is_active) === 1 && 
                            parseInt(f.id) !== parseInt(self.currentFlowId)
                        );
                        
                        // Check for visibility conflicts
                        const conflicts = activeFlows.filter(f => {
                            const flowVisibility = f.visibility_mode || 'everyone';
                            
                            if (flowVisibility !== visibilityMode) {
                                return false; // Different modes, no conflict
                            }
                            
                            if (visibilityMode === 'specific_roles') {
                                const flowRoles = f.visible_roles ? JSON.parse(f.visible_roles) : [];
                                const rolesMatch = JSON.stringify(flowRoles.sort()) === JSON.stringify(visibleRoles.sort());
                                return rolesMatch;
                            }
                            
                            return true; // Same visibility mode
                        });
                        
                        if (conflicts.length > 0) {
                            const conflictNames = conflicts.map(f => f.flow_name).join(', ');
                            const message = `⚠️ VISIBILITY CONFLICT DETECTED\n\n` +
                                          `Another active flow "${conflictNames}" already has the same visibility settings.\n\n` +
                                          `When multiple flows are active with the same visibility, visitors will see the NEWEST flow.\n\n` +
                                          `Options:\n` +
                                          `✓ Continue anyway (visitors will see this flow)\n` +
                                          `✗ Cancel (change visibility or deactivate other flow)\n\n` +
                                          `💡 TIP: For A/B testing with same visibility, upgrade to Pro!\n\n` +
                                          `Continue with conflicting visibility?`;
                            
                            if (confirm(message)) {
                                callback();
                            }
                        } else {
                            callback();
                        }
                    }
                }
            });
        },
        
        performSave: function(flowName, isActive, visibilityMode, visibleRoles) {
            if (window.IntakeFlowReactInstance) {
                const flow = window.IntakeFlowReactInstance.getFlow();
                this.nodes = flow.nodes;
                this.edges = flow.edges;
            }
            
            console.log('💾 Saving flow:', flowName);
            console.log('📊 Nodes:', this.nodes.length, 'nodes');
            console.log('🔗 Edges:', this.edges.length, 'edges');
            
            // CRITICAL: Deduplicate nodes by ID before saving (keep first occurrence)
            const seenIds = new Set();
            const uniqueNodes = [];
            this.nodes.forEach(node => {
                if (!seenIds.has(node.id)) {
                    seenIds.add(node.id);
                    uniqueNodes.push(node);
                } else {
                    console.warn('⚠️ Duplicate node ID found and removed before save:', node.id);
                }
            });
            this.nodes = uniqueNodes;
            
            // VALIDATION: Check for start node
            const hasStartNode = this.nodes.some(n => n.data.is_start);
            if (!hasStartNode && this.nodes.length > 0) {
                console.warn('⚠️ No start node found! Marking first node as start.');
                this.nodes[0].data.is_start = true;
            }
            
            // VALIDATION: Check for empty flow
            if (this.nodes.length === 0) {
                alert('Cannot save empty flow! Please add at least one node.');
                return;
            }
            
            console.log('🔍 Full nodes data:', JSON.stringify(this.nodes, null, 2));
            console.log('🔍 Full edges data:', JSON.stringify(this.edges, null, 2));
            console.log('📍 Visibility:', visibilityMode, visibleRoles);
            
            const flowDataObj = {
                nodes: this.nodes,
                edges: this.edges
            };
            
            const flowDataJSON = JSON.stringify(flowDataObj);
            console.log('📦 Flow data JSON length:', flowDataJSON.length, 'characters');
            
            const formData = new FormData();
            formData.append('action', 'intakeflow_save_flow');
            formData.append('nonce', intakeflowAdmin.nonce);
            formData.append('flow_id', this.currentFlowId || 0);
            formData.append('flow_name', flowName);
            formData.append('is_active', isActive ? 1 : 0);
            formData.append('visibility_mode', visibilityMode);
            formData.append('visible_roles', JSON.stringify(visibleRoles));
            formData.append('flow_data', flowDataJSON);
            
            fetch(intakeflowAdmin.ajaxUrl, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(response => {
                console.log('✅ Save response:', response);
                if (response.success) {
                    this.currentFlowId = response.data.flow_id;
                    console.log('✅ Flow saved successfully! ID:', response.data.flow_id);
                    alert('Flow saved successfully! Flow ID: ' + response.data.flow_id);
                    this.loadFlows();
                } else {
                    console.error('❌ Save failed:', response);
                    alert('Error saving flow: ' + (response.data || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('❌ AJAX Error:', error);
                alert('Error saving flow. Check browser console for details.');
            });
        },
        
        loadFlows: function() {
            $.ajax({
                url: intakeflowAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'intakeflow_get_flows',
                    nonce: intakeflowAdmin.nonce
                },
                success: (response) => {
                    if (response.success) {
                        this.renderFlowList(response.data);
                    }
                }
            });
        },
        
        renderFlowList: function(flows) {
            const $list = $('#intakeflow-flows-list');
            
            if (flows.length === 0) {
                $list.html('<p class="intakeflow-loading">No flows yet. Create your first flow!</p>');
                return;
            }
            
            const template = $('#intakeflow-flow-item-template').html();
            let html = '';
            
            flows.forEach(flow => {
                const isActive = parseInt(flow.is_active) === 1;
                const updatedDate = new Date(flow.updated_at).toLocaleDateString();
                
                // Determine visibility display
                const visibilityMode = flow.visibility_mode || 'everyone';
                let visibilityIcon = '👥';
                let visibilityLabel = 'Everyone';
                
                if (visibilityMode === 'logged_in') {
                    visibilityIcon = '🔐';
                    visibilityLabel = 'Logged-in users';
                } else if (visibilityMode === 'specific_roles') {
                    visibilityIcon = '👑';
                    const roles = flow.visible_roles ? JSON.parse(flow.visible_roles) : [];
                    visibilityLabel = roles.length > 0 ? roles.length + ' role(s)' : 'Specific roles';
                }
                
                html += template
                    .replace(/{{id}}/g, flow.id)
                    .replace(/{{flow_name}}/g, flow.flow_name)
                    .replace(/{{active_class}}/g, isActive ? 'active' : '')
                    .replace(/{{status_class}}/g, isActive ? 'active' : 'inactive')
                    .replace(/{{status}}/g, isActive ? 'Active' : 'Inactive')
                    .replace(/{{updated_at}}/g, updatedDate)
                    .replace(/{{visibility_icon}}/g, visibilityIcon)
                    .replace(/{{visibility_label}}/g, visibilityLabel);
            });
            
            $list.html(html);
        },
        
        loadFlow: function(flowId) {
            console.log('📥 Loading flow ID:', flowId);
            $.ajax({
                url: intakeflowAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'intakeflow_get_flows',
                    nonce: intakeflowAdmin.nonce
                },
                success: (response) => {
                    if (response.success) {
                        const flow = response.data.find(f => parseInt(f.id) === parseInt(flowId));
                        if (flow) {
                            console.log('✅ Found flow:', flow.flow_name);
                            console.log('📦 Raw flow_data:', flow.flow_data);
                            
                            this.currentFlowId = flow.id;
                            this.currentFlow = flow;
                            
                            const flowData = JSON.parse(flow.flow_data);
                            console.log('🔍 Parsed flow data:', flowData);
                            console.log('📊 Nodes in flow:', flowData.nodes?.length || 0);
                            console.log('🔗 Edges in flow:', flowData.edges?.length || 0);
                            
                            // CRITICAL: Deduplicate nodes by ID (keep first occurrence)
                            const seenIds = new Set();
                            const uniqueNodes = [];
                            (flowData.nodes || []).forEach(node => {
                                if (!seenIds.has(node.id)) {
                                    seenIds.add(node.id);
                                    uniqueNodes.push(node);
                                } else {
                                    console.warn('⚠️ Duplicate node ID found and removed:', node.id);
                                }
                            });
                            
                            this.nodes = uniqueNodes;
                            this.edges = flowData.edges || [];
                            
                            console.log('✅ After deduplication:', this.nodes.length, 'unique nodes');
                            
                            // Log each node
                            this.nodes.forEach((node, i) => {
                                console.log(`  Node ${i}: ${node.id} (${node.data.nodeType}) - "${node.data.label}"`);
                                if (node.data.is_start) {
                                    console.log(`    ⭐ START NODE`);
                                }
                            });
                            
                            $('#intakeflow-flow-name').val(flow.flow_name);
                            $('#intakeflow-flow-active').prop('checked', parseInt(flow.is_active) === 1);
                            
                            // Load visibility settings
                            const visibilityMode = flow.visibility_mode || 'everyone';
                            $('#intakeflow-flow-visibility').val(visibilityMode);
                            
                            // Show/hide role button
                            if (visibilityMode === 'specific_roles') {
                                $('#intakeflow-visibility-settings').show();
                            } else {
                                $('#intakeflow-visibility-settings').hide();
                            }
                            
                            // Load visible roles
                            $('.intakeflow-role-checkbox').prop('checked', false);
                            if (flow.visible_roles) {
                                const roles = JSON.parse(flow.visible_roles);
                                roles.forEach(role => {
                                    $('.intakeflow-role-checkbox[value="' + role + '"]').prop('checked', true);
                                });
                                $('#intakeflow-visibility-settings').text(roles.length + ' role(s) selected');
                            }
                            
                            if (window.IntakeFlowReactInstance) {
                                console.log('🎨 Sending to React canvas:', this.nodes.length, 'nodes,', this.edges.length, 'edges');
                                window.IntakeFlowReactInstance.setFlow({
                                    nodes: this.nodes,
                                    edges: this.edges
                                });
                            }
                            
                            console.log('✅ Flow loaded successfully!');
                        } else {
                            console.error('❌ Flow not found:', flowId);
                        }
                    } else {
                        console.error('❌ Failed to get flows:', response);
                    }
                },
                error: function(xhr, status, error) {
                    console.error('❌ AJAX error loading flow:', error);
                }
            });
        },
        
        deleteFlow: function(flowId) {
            $.ajax({
                url: intakeflowAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'intakeflow_delete_flow',
                    nonce: intakeflowAdmin.nonce,
                    flow_id: flowId
                },
                success: (response) => {
                    if (response.success) {
                        alert('Flow deleted successfully');
                        this.loadFlows();
                        
                        if (parseInt(this.currentFlowId) === parseInt(flowId)) {
                            this.createNewFlow();
                        }
                    }
                }
            });
        },
        
        duplicateFlow: function(flowId) {
            alert('Duplicate feature coming soon!');
        },
        
        truncate: function(str, length) {
            if (!str) return '';
            return str.length > length ? str.substring(0, length) + '...' : str;
        }
    };
    
    $(document).ready(function() {
        if ($('.intakeflow-builder-wrap').length > 0) {
            window.IntakeFlowBuilder = IntakeFlowBuilder;
            IntakeFlowBuilder.init();
        }
    });
    
})(jQuery);
