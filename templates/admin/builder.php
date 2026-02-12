<?php
/**
 * Flow Builder Admin Page
 */

if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap intakeflow-builder-wrap">
    <h1>
        IntakeFlow - Flow Builder
        <button class="button button-primary intakeflow-new-flow">
            <span class="dashicons dashicons-plus-alt"></span> New Flow
        </button>
    </h1>
    
    <div class="intakeflow-builder-container">
        <!-- Flow List Sidebar -->
        <div class="intakeflow-flows-sidebar">
            <h2>Your Flows</h2>
            <div id="intakeflow-flows-list">
                <p class="intakeflow-loading">Loading flows...</p>
            </div>
        </div>
        
        <!-- Flow Builder Canvas -->
        <div class="intakeflow-builder-main">
            <div class="intakeflow-builder-toolbar">
                <div class="intakeflow-builder-toolbar-left">
                    <input type="text" 
                           id="intakeflow-flow-name" 
                           class="intakeflow-flow-name-input" 
                           placeholder="Flow Name" 
                           value="Untitled Flow" />
                    <label class="intakeflow-active-toggle">
                        <input type="checkbox" id="intakeflow-flow-active" checked />
                        <span>Active</span>
                    </label>
                    
                    <!-- Visibility Controls -->
                    <div class="intakeflow-visibility-controls" style="display: inline-flex; align-items: center; gap: 8px; margin-left: 15px; padding-left: 15px; border-left: 1px solid #ddd;">
                        <label style="font-size: 13px; font-weight: 600; margin: 0;">
                            👁️ Visible to:
                        </label>
                        <select id="intakeflow-flow-visibility" style="font-size: 13px; padding: 4px 8px;">
                            <option value="everyone">👥 Everyone</option>
                            <option value="logged_in">🔐 Logged-in Users</option>
                            <option value="specific_roles">👑 Specific Roles</option>
                        </select>
                        <button type="button" class="button button-small" id="intakeflow-visibility-settings" style="display: none; font-size: 12px;">
                            Configure Roles
                        </button>
                    </div>
                </div>
                <div class="intakeflow-builder-toolbar-right">
                    <button class="button intakeflow-preview-flow">
                        <span class="dashicons dashicons-visibility"></span> Preview
                    </button>
                    <button class="button button-primary intakeflow-save-flow">
                        <span class="dashicons dashicons-saved"></span> Save Flow
                    </button>
                </div>
            </div>
            
            <!-- Node Palette -->
            <div class="intakeflow-node-palette">
                <h3>💡 Drag nodes onto canvas or click to add</h3>
                <div class="intakeflow-node-buttons">
                <button class="intakeflow-add-node intakeflow-draggable-node" 
                    data-type="question"
                    draggable="true">
                        <span class="dashicons dashicons-format-chat"></span>
                        Message
                    </button>
                    <button class="intakeflow-add-node intakeflow-draggable-node" 
                    data-type="branch"
                    draggable="true">
                        <span class="dashicons dashicons-randomize"></span>
                        Branch
                    </button>
                    <button class="intakeflow-add-node intakeflow-draggable-node" 
                    data-type="action"
                    draggable="true">
                        <span class="dashicons dashicons-admin-generic"></span>
                        Action
                    </button>
                </div>
            </div>
            
            <!-- ReactFlow Canvas -->
            <div id="intakeflow-canvas" class="intakeflow-canvas"></div>
            
            <!-- Node Editor Panel -->
            <div id="intakeflow-node-editor" class="intakeflow-node-editor" style="display: none;">
                <div class="intakeflow-node-editor-header">
                    <h3>Edit Node</h3>
                    <button class="intakeflow-close-editor">
                        <span class="dashicons dashicons-no"></span>
                    </button>
                </div>
                <div id="intakeflow-node-editor-content" class="intakeflow-node-editor-content">
                    <!-- Dynamic content based on node type -->
                </div>
                <div class="intakeflow-node-editor-footer">
                    <button class="button button-secondary intakeflow-delete-node">Delete Node</button>
                    <button class="button button-primary intakeflow-save-node">Save</button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Visibility Role Selection Modal -->
    <div id="intakeflow-visibility-modal" class="intakeflow-modal" style="display: none;">
        <div class="intakeflow-modal-backdrop"></div>
        <div class="intakeflow-modal-content" style="max-width: 500px;">
            <div class="intakeflow-modal-header">
                <h3>👑 Select Visible Roles</h3>
                <button class="intakeflow-modal-close">
                    <span class="dashicons dashicons-no"></span>
                </button>
            </div>
            <div class="intakeflow-modal-body">
                <p style="margin-bottom: 15px; color: #666;">Choose which user roles can see this chatbot flow:</p>
                <div id="intakeflow-roles-list">
                    <?php
                    $wp_roles = wp_roles();
                    $available_roles = $wp_roles->get_names();
                    foreach ($available_roles as $role_key => $role_name) {
                        echo '<label style="display: block; margin-bottom: 10px; padding: 8px; background: #f9fafb; border-radius: 4px;">';
                        echo '<input type="checkbox" class="intakeflow-role-checkbox" value="' . esc_attr($role_key) . '" style="margin-right: 8px;" />';
                        echo esc_html($role_name);
                        echo '</label>';
                    }
                    ?>
                </div>
            </div>
            <div class="intakeflow-modal-footer">
                <button class="button button-secondary intakeflow-modal-close">Cancel</button>
                <button class="button button-primary" id="intakeflow-save-roles">Save Roles</button>
            </div>
        </div>
    </div>
</div>

<!-- Flow List Item Template -->
<script type="text/template" id="intakeflow-flow-item-template">
    <div class="intakeflow-flow-item {{active_class}}" data-flow-id="{{id}}">
        <div class="intakeflow-flow-item-header">
            <h4>{{flow_name}}</h4>
            <span class="intakeflow-flow-status {{status_class}}">{{status}}</span>
        </div>
        <div class="intakeflow-flow-item-meta">
            <span>Updated: {{updated_at}}</span>
            <br />
            <span class="intakeflow-flow-visibility" style="font-size: 11px; color: #666;">{{visibility_icon}} {{visibility_label}}</span>
        </div>
        <div class="intakeflow-flow-item-actions">
            <button class="button button-small intakeflow-edit-flow" data-flow-id="{{id}}">Edit</button>
            <button class="button button-small intakeflow-duplicate-flow" data-flow-id="{{id}}">Duplicate</button>
            <button class="button button-small button-link-delete intakeflow-delete-flow" data-flow-id="{{id}}">Delete</button>
        </div>
    </div>
</script>

<!-- Message Node Editor Template -->
<script type="text/template" id="intakeflow-message-node-template">
    <div class="intakeflow-field">
        <label>Message Text</label>
        <textarea class="intakeflow-node-field" data-field="message" rows="4" placeholder="Enter your message...">{{message}}</textarea>
        <p class="description">This message will be displayed to the visitor.</p>
    </div>
    <div class="intakeflow-field">
        <label>Delay (ms)</label>
        <input type="number" class="intakeflow-node-field" data-field="delay" value="{{delay}}" min="0" step="100" />
        <p class="description">Optional delay before showing this message (to simulate typing).</p>
    </div>
</script>

<!-- Question Node Editor Template -->
<script type="text/template" id="intakeflow-question-node-template">
    <div class="intakeflow-field">
        <label>Message Text</label>
        <textarea class="intakeflow-node-field" data-field="message" rows="3" placeholder="What do you want to say or ask?">{{message}}</textarea>
        <p class="description">The message shown to the visitor</p>
    </div>
    
    <div class="intakeflow-field" style="background: #f9f9f9; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
        <h4 style="margin: 0 0 10px 0; font-size: 13px;">Response Type</h4>
        
        <label style="display: block; margin-bottom: 8px;">
            <input type="checkbox" class="intakeflow-node-field" data-field="auto_continue" {{auto_continue_checked}} />
            <strong>Auto-continue (Display only)</strong> - Don't wait for response
        </label>
        
        <div class="intakeflow-delay-field" style="margin-left: 24px; margin-bottom: 12px; {{delay_visibility}}">
            <label>Delay before continuing: 
                <input type="number" class="intakeflow-node-field" data-field="delay" value="{{delay}}" min="0" max="10" step="0.5" style="width: 60px;" /> seconds
            </label>
        </div>
        
        <label style="display: block; margin-bottom: 8px;">
            <input type="checkbox" class="intakeflow-node-field" data-field="allow_text_input" {{allow_text_input_checked}} />
            <strong>Allow text input</strong> - Let users type freely
        </label>
        
        <div class="intakeflow-text-placeholder-field" style="margin-left: 24px; margin-bottom: 16px; {{text_placeholder_visibility}}">
            <label style="display: block; margin-bottom: 4px; font-weight: 600; font-size: 13px;">
                Text input placeholder:
            </label>
            <input type="text" class="intakeflow-node-field" data-field="text_placeholder" value="{{text_placeholder}}" placeholder="Type your message..." style="width: 100%; padding: 8px;" />
            <p class="description" style="margin: 4px 0 0 0; font-size: 12px; color: #666; font-style: italic;">
                This is what users see as placeholder text in the input box
            </p>
        </div>
    </div>
    
    <div class="intakeflow-field">
        <label>Quick-Reply Buttons (Optional)</label>
        <p class="description">Provide quick options users can click instead of typing</p>
        <div id="intakeflow-question-options" class="intakeflow-question-options">
            <!-- Dynamic options -->
        </div>
        <button class="button button-small intakeflow-add-option">
            <span class="dashicons dashicons-plus"></span> Add Button
        </button>
    </div>
</script>

<!-- Output Node Editor Template -->
<script type="text/template" id="intakeflow-output-node-template">
    <div class="intakeflow-field">
        <label>Output Message</label>
        <textarea class="intakeflow-node-field" data-field="output_message" rows="4" placeholder="Enter the message to display to the user...">{{output_message}}</textarea>
        <p class="description">This message will be shown to the visitor when this path is taken.</p>
    </div>
    <div class="intakeflow-field">
        <label>Delay (ms)</label>
        <input type="number" class="intakeflow-node-field" data-field="delay" value="{{delay}}" min="0" step="100" />
        <p class="description">Optional delay before showing this message (to simulate typing).</p>
    </div>
    <div class="intakeflow-field">
        <label>Action Buttons (Optional)</label>
        <p class="description">Add clickable buttons that link to pages or trigger actions.</p>
        <div id="intakeflow-output-buttons" class="intakeflow-output-buttons">
            <!-- Dynamic buttons -->
        </div>
        <button class="button button-small intakeflow-add-button">
            <span class="dashicons dashicons-plus"></span> Add Button
        </button>
    </div>
</script>

<!-- Click Node Editor Template -->
<script type="text/template" id="intakeflow-click-node-template">
    <div class="intakeflow-field">
        <label>Detected Clicks</label>
        <p class="description">This node detects which button or link was clicked by the user. Connect from an Output node with buttons.</p>
        <div id="intakeflow-click-options" class="intakeflow-click-options">
            <!-- Dynamic click options based on connected Output node -->
        </div>
    </div>
    <div class="intakeflow-notice" style="margin-top: 15px;">
        <p><strong>💡 How it works:</strong> Connect an Output node (with buttons) to this Click node. Each button creates a path that can be routed differently.</p>
    </div>
</script>

<!-- Branch Node Editor Template -->
<script type="text/template" id="intakeflow-branch-node-template">
    <div class="intakeflow-field">
        <label>Output Groups</label>
        <p class="description">Each group creates one output handle. Define conditions within each group.</p>
        <div id="intakeflow-branch-groups" class="intakeflow-branch-groups">
            <!-- Dynamic output groups -->
        </div>
        <button class="button button-small intakeflow-add-output-group">
            <span class="dashicons dashicons-plus"></span> Add Output Group
        </button>
    </div>
</script>

<!-- Action Node Editor Template -->
<script type="text/template" id="intakeflow-action-node-template">
    <div class="intakeflow-field">
        <label>Action Type</label>
        <select id="intakeflow-action-type" class="intakeflow-node-field" data-field="action_type">
            <option value="capture_lead" {{selected_capture_lead}}>Capture Lead</option>
            <option value="redirect" {{selected_redirect}}>Redirect</option>
            <option value="send_email" {{selected_send_email}}>Send Email (Pro)</option>
            <option value="set_variable" {{selected_set_variable}}>Set Variable (Pro)</option>
        </select>
        <p class="description">Choose what action to perform when this node is reached.</p>
    </div>
    
    <!-- Dynamic configuration container -->
    <div id="intakeflow-action-config" class="intakeflow-action-config">
        <!-- Configuration fields will be dynamically inserted here -->
    </div>
</script>

<style>
.intakeflow-builder-wrap {
    margin: 20px 20px 20px 0;
}

.intakeflow-builder-container {
    display: flex;
    gap: 20px;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-top: 20px;
    height: calc(100vh - 180px);
}

.intakeflow-flows-sidebar {
    width: 280px;
    border-right: 1px solid #ddd;
    padding: 20px;
    overflow-y: auto;
}

.intakeflow-flows-sidebar h2 {
    margin: 0 0 15px 0;
    font-size: 16px;
}

.intakeflow-flow-item {
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 10px;
    cursor: pointer;
    transition: all 0.2s;
}

.intakeflow-flow-item:hover {
    border-color: #2271b1;
    background: #f6f7f7;
}

.intakeflow-flow-item.active {
    border-color: #2271b1;
    background: #f0f6fc;
}

.intakeflow-flow-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.intakeflow-flow-item-header h4 {
    margin: 0;
    font-size: 14px;
}

.intakeflow-flow-status {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 3px;
    background: #ddd;
}

.intakeflow-flow-status.active {
    background: #00a32a;
    color: #fff;
}

.intakeflow-flow-item-meta {
    font-size: 12px;
    color: #666;
    margin-bottom: 8px;
}

.intakeflow-flow-item-actions {
    display: flex;
    gap: 5px;
}

.intakeflow-builder-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
}

.intakeflow-builder-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #ddd;
    background: #f9f9f9;
}

.intakeflow-builder-toolbar-left {
    display: flex;
    gap: 15px;
    align-items: center;
}

.intakeflow-flow-name-input {
    font-size: 16px;
    font-weight: 600;
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    min-width: 250px;
}

.intakeflow-active-toggle {
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 0;
}

.intakeflow-builder-toolbar-right {
    display: flex;
    gap: 10px;
}

.intakeflow-node-palette {
    padding: 15px 20px;
    background: #f9f9f9;
    border-bottom: 1px solid #ddd;
}

.intakeflow-node-palette h3 {
    margin: 0 0 10px 0;
    font-size: 14px;
}

.intakeflow-node-buttons {
    display: flex;
    gap: 10px;
}

.intakeflow-add-node {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 8px 15px;
    border: 1px solid #ddd;
    background: #fff;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.intakeflow-add-node:hover {
    border-color: #2271b1;
    background: #f0f6fc;
}

.intakeflow-canvas {
    flex: 1;
    background: #fafafa;
    background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
    background-size: 20px 20px;
}

.intakeflow-node-editor {
    position: absolute;
    right: 20px;
    top: 120px;
    width: 500px;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
}

.intakeflow-node-editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #ddd;
    background: #f9f9f9;
}

.intakeflow-node-editor-header h3 {
    margin: 0;
    font-size: 16px;
}

.intakeflow-close-editor {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    color: #666;
}

.intakeflow-close-editor:hover {
    color: #000;
}

.intakeflow-node-editor-content {
    padding: 20px;
    max-height: 500px;
    overflow-y: auto;
}

.intakeflow-field {
    margin-bottom: 20px;
}

.intakeflow-field label {
    display: block;
    margin-bottom: 5px;
    font-weight: 600;
    font-size: 13px;
}

.intakeflow-field input[type="text"],
.intakeflow-field input[type="number"],
.intakeflow-field textarea,
.intakeflow-field select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.intakeflow-field .description {
    margin: 5px 0 0 0;
    font-size: 12px;
    color: #666;
    font-style: italic;
}

.intakeflow-node-editor-footer {
    padding: 15px 20px;
    border-top: 1px solid #ddd;
    display: flex;
    justify-content: space-between;
}

.intakeflow-loading {
    text-align: center;
    padding: 20px;
    color: #666;
}
.intakeflow-draggable-node.dragging {
    opacity: 0.5;
    cursor: grabbing;
}

.intakeflow-canvas.drag-over {
    background-color: #f0f6fc;
    border: 2px dashed #2271b1;
}

.intakeflow-add-node {
    cursor: grab;
}

.intakeflow-add-node:active {
    cursor: grabbing;
}

.intakeflow-add-node:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(34, 113, 177, 0.2);
}

.intakeflow-node-palette {
    background: #f0f6fc;
}

.intakeflow-node-palette h3 {
    color: #2271b1;
}
</style>
