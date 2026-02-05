<?php
/**
 * Frontend functionality for IntakeFlow
 * Handles chat widget display and interaction
 */

if (!defined('ABSPATH')) {
    exit;
}

class IntakeFlow_Frontend {
    
    /**
     * Initialize frontend
     */
    public static function init() {
        add_action('wp_enqueue_scripts', array(__CLASS__, 'enqueue_scripts'));
        add_action('wp_footer', array(__CLASS__, 'render_chat_widget'));
        
        // AJAX handlers for frontend
        add_action('wp_ajax_intakeflow_start_conversation', array(__CLASS__, 'ajax_start_conversation'));
        add_action('wp_ajax_nopriv_intakeflow_start_conversation', array(__CLASS__, 'ajax_start_conversation'));
        
        add_action('wp_ajax_intakeflow_process_response', array(__CLASS__, 'ajax_process_response'));
        add_action('wp_ajax_nopriv_intakeflow_process_response', array(__CLASS__, 'ajax_process_response'));
    }
    
    /**
     * Enqueue frontend scripts and styles
     */
    public static function enqueue_scripts() {
        // Only load if chatbot is enabled
        $settings = get_option('intakeflow_settings', array('enabled' => false));
        if (empty($settings['enabled'])) {
            return;
        }
        
        // Enqueue CSS
        wp_enqueue_style(
            'intakeflow-widget',
            plugins_url('assets/css/chatbot-widget.css', dirname(__FILE__)),
            array(),
            INTAKEFLOW_VERSION
        );
        
        // Enqueue JS
        wp_enqueue_script(
            'intakeflow-widget',
            plugins_url('assets/js/chatbot-widget.js', dirname(__FILE__)),
            array('jquery'),
            INTAKEFLOW_VERSION,
            true
        );
        
        // Localize script with settings
        wp_localize_script('intakeflow-widget', 'intakeflowWidget', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('intakeflow_widget'),
            'settings' => array(
                'primaryColor' => isset($settings['primary_color']) ? $settings['primary_color'] : '#4A90E2',
                'position' => isset($settings['chat_position']) ? $settings['chat_position'] : 'bottom-right',
                'welcomeMessage' => isset($settings['welcome_message']) ? $settings['welcome_message'] : 'Hi! How can we help you today?'
            )
        ));
    }
    
    /**
     * Render chat widget HTML
     */
    public static function render_chat_widget() {
        // Only render if enabled
        $settings = get_option('intakeflow_settings', array('enabled' => false));
        
        // DEBUG: Output HTML comment with status
        echo "<!-- IntakeFlow Debug: Widget enabled = " . (empty($settings['enabled']) ? 'false' : 'true') . " -->\n";
        
        if (empty($settings['enabled'])) {
            echo "<!-- IntakeFlow: Widget is disabled in Settings. Enable it at " . admin_url('admin.php?page=intakeflow-settings') . " -->\n";
            return;
        }
        
        // Get active flow (with visibility settings)
        global $wpdb;
        $flows_table = $wpdb->prefix . 'intakeflow_flows';
        $active_flow = $wpdb->get_row("SELECT id, visibility_mode, visible_roles FROM $flows_table WHERE is_active = 1 ORDER BY id DESC LIMIT 1");
        
        if (!$active_flow) {
            echo "<!-- IntakeFlow: No active flow found. Create one at " . admin_url('admin.php?page=intakeflow-builder') . " -->\n";
            return;
        }
        
        // Check FLOW-SPECIFIC visibility (not global settings)
        $visibility_mode = isset($active_flow->visibility_mode) ? $active_flow->visibility_mode : 'everyone';
        $visible = false;
        
        switch ($visibility_mode) {
            case 'everyone':
                $visible = true;
                echo "<!-- IntakeFlow: Flow visibility = Everyone -->\n";
                break;
                
            case 'logged_in':
                $visible = is_user_logged_in();
                echo "<!-- IntakeFlow: Flow visibility = Logged-in users only (" . ($visible ? 'VISIBLE' : 'HIDDEN - not logged in') . ") -->\n";
                break;
                
            case 'specific_roles':
                if (is_user_logged_in()) {
                    $user = wp_get_current_user();
                    $visible_roles_json = isset($active_flow->visible_roles) ? $active_flow->visible_roles : '[]';
                    $visible_roles = json_decode($visible_roles_json, true);
                    if (!is_array($visible_roles)) {
                        $visible_roles = array();
                    }
                    $user_roles = $user->roles;
                    
                    // Check if user has any of the allowed roles
                    $visible = !empty(array_intersect($user_roles, $visible_roles));
                    
                    echo "<!-- IntakeFlow: Flow visibility = Specific roles only (" . implode(', ', $visible_roles) . ") -->\n";
                    echo "<!-- IntakeFlow: User roles = " . implode(', ', $user_roles) . " (" . ($visible ? 'VISIBLE' : 'HIDDEN - no matching role') . ") -->\n";
                } else {
                    echo "<!-- IntakeFlow: Flow visibility = Specific roles (HIDDEN - not logged in) -->\n";
                }
                break;
        }
        
        if (!$visible) {
            echo "<!-- IntakeFlow: Widget hidden due to FLOW visibility settings -->\n";
            return;
        }
        
        echo "<!-- IntakeFlow: Rendering widget (Flow ID: " . $active_flow->id . ", Visibility: " . $visibility_mode . ") -->\n";
        
        ?>
        <!-- IntakeFlow Chat Widget -->
        <div id="intakeflow-widget" class="intakeflow-widget">
            <!-- Chat Bubble (Closed State) -->
            <div id="intakeflow-bubble" class="intakeflow-bubble">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="white"/>
                </svg>
                <span class="intakeflow-bubble-text">Chat</span>
            </div>
            
            <!-- Chat Window (Expanded State) -->
            <div id="intakeflow-window" class="intakeflow-window" style="display: none;">
                <!-- Header -->
                <div class="intakeflow-header">
                    <div class="intakeflow-header-title">
                        <strong>Chat with us</strong>
                        <span class="intakeflow-header-status">● Online</span>
                    </div>
                    <button class="intakeflow-close-btn" id="intakeflow-close">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M15 5L5 15M5 5L15 15" stroke="white" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
                
                <!-- Messages Container -->
                <div class="intakeflow-messages" id="intakeflow-messages">
                    <!-- Messages will be added here dynamically -->
                </div>
                
                <!-- Input Area -->
                <div class="intakeflow-input-area" id="intakeflow-input-area">
                    <!-- Dynamic input (text or buttons) will be added here -->
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * AJAX: Start new conversation
     */
    public static function ajax_start_conversation() {
        check_ajax_referer('intakeflow_widget', 'nonce');
        
        global $wpdb;
        
        // Get the NEWEST active flow (ordered by ID descending)
        $flows_table = $wpdb->prefix . 'intakeflow_flows';
        $flow = $wpdb->get_row("SELECT * FROM $flows_table WHERE is_active = 1 ORDER BY id DESC LIMIT 1");
        
        if (!$flow) {
            wp_send_json_error(array('message' => 'No active chatbot found. Please contact the site administrator.'));
            return;
        }
        
        // Parse flow data
        $flow_data = json_decode($flow->flow_data, true);
        
        // Get start node
        $start_node_id = IntakeFlow_Engine::get_start_node($flow_data);
        if (!$start_node_id) {
            wp_send_json_error(array('message' => 'No start node found'));
            return;
        }
        
        // Find start node
        $start_node = null;
        foreach ($flow_data['nodes'] as $node) {
            if ($node['id'] === $start_node_id) {
                $start_node = $node;
                break;
            }
        }
        
        if (!$start_node) {
            wp_send_json_error(array('message' => 'Start node not found in flow'));
            return;
        }
        
        // Create session
        $session_id = 'session_' . uniqid();
        
        // Get first message
        $response = self::format_node_response($start_node, $flow_data);
        
        wp_send_json_success(array(
            'session_id' => $session_id,
            'flow_id' => $flow->id,
            'current_node' => $start_node_id,
            'message' => $response
        ));
    }
    
    /**
     * AJAX: Process user response
     */
    public static function ajax_process_response() {
        check_ajax_referer('intakeflow_widget', 'nonce');
        
        $session_id = sanitize_text_field($_POST['session_id']);
        $current_node_id = sanitize_text_field($_POST['current_node']);
        $user_response = sanitize_text_field($_POST['response']);
        $flow_id = intval($_POST['flow_id']);
        
        global $wpdb;
        
        // Get flow
        $flows_table = $wpdb->prefix . 'intakeflow_flows';
        $flow = $wpdb->get_row($wpdb->prepare("SELECT * FROM $flows_table WHERE id = %d", $flow_id));
        
        if (!$flow) {
            wp_send_json_error(array('message' => 'Flow not found'));
            return;
        }
        
        $flow_data = json_decode($flow->flow_data, true);
        
        // Process response and get next node
        $next_node_id = IntakeFlow_Engine::process_response($flow_data, $current_node_id, $user_response);
        
        if (!$next_node_id) {
            // End of conversation
            wp_send_json_success(array(
                'end' => true,
                'message' => array(
                    'type' => 'message',
                    'text' => 'Thank you for chatting with us!'
                )
            ));
            return;
        }
        
        // Find next node
        $next_node = null;
        foreach ($flow_data['nodes'] as $node) {
            if ($node['id'] === $next_node_id) {
                $next_node = $node;
                break;
            }
        }
        
        if (!$next_node) {
            wp_send_json_error(array('message' => 'Next node not found'));
            return;
        }
        
        // Execute action if it's an action node
        if ($next_node['data']['nodeType'] === 'action') {
            IntakeFlow_Engine::execute_action($next_node, array(
                'session_id' => $session_id,
                'user_response' => $user_response
            ));
            
            // Get node after action
            $next_node_id = IntakeFlow_Engine::get_next_node($flow_data['edges'], $next_node_id);
            if ($next_node_id) {
                foreach ($flow_data['nodes'] as $node) {
                    if ($node['id'] === $next_node_id) {
                        $next_node = $node;
                        break;
                    }
                }
            } else {
                // End after action
                wp_send_json_success(array(
                    'end' => true,
                    'message' => array(
                        'type' => 'message',
                        'text' => 'Thank you! We\'ll be in touch soon.'
                    )
                ));
                return;
            }
        }
        
        // CRITICAL FIX: If next node is a branch, process it automatically!
        if ($next_node['data']['nodeType'] === 'branch') {
            error_log('🔀 Branch node detected, processing automatically with user response: ' . $user_response);
            
            // Process the branch with the user's response
            $branch_result_id = IntakeFlow_Engine::process_response($flow_data, $next_node_id, $user_response);
            
            error_log('✅ Branch result: ' . ($branch_result_id ? $branch_result_id : 'NULL'));
            
            if (!$branch_result_id) {
                // Branch had no matching conditions - end conversation
                wp_send_json_success(array(
                    'end' => true,
                    'message' => array(
                        'type' => 'message',
                        'text' => 'Thank you for your interest!'
                    )
                ));
                return;
            }
            
            // Get the node after the branch
            foreach ($flow_data['nodes'] as $node) {
                if ($node['id'] === $branch_result_id) {
                    $next_node = $node;
                    $next_node_id = $branch_result_id;
                    break;
                }
            }
            
            // If the result is another branch, process it too (recursive)
            while ($next_node['data']['nodeType'] === 'branch') {
                error_log('🔀 Chained branch detected, processing...');
                $branch_result_id = IntakeFlow_Engine::process_response($flow_data, $next_node_id, $user_response);
                
                if (!$branch_result_id) {
                    wp_send_json_success(array(
                        'end' => true,
                        'message' => array(
                            'type' => 'message',
                            'text' => 'Thank you for your interest!'
                        )
                    ));
                    return;
                }
                
                foreach ($flow_data['nodes'] as $node) {
                    if ($node['id'] === $branch_result_id) {
                        $next_node = $node;
                        $next_node_id = $branch_result_id;
                        break;
                    }
                }
            }
        }
        
        $response = self::format_node_response($next_node, $flow_data);
        
        wp_send_json_success(array(
            'current_node' => $next_node_id,
            'message' => $response
        ));
    }
    
    /**
     * Format node response for frontend
     */
    private static function format_node_response($node, $flow_data) {
        $node_type = $node['data']['nodeType'];
        
        if ($node_type === 'question') {
            $message = isset($node['data']['message']) ? $node['data']['message'] : 
                      (isset($node['data']['question']) ? $node['data']['question'] : '');
            
            $response = array(
                'type' => 'question',
                'text' => $message,
                'auto_continue' => isset($node['data']['auto_continue']) ? $node['data']['auto_continue'] : false,
                'delay' => isset($node['data']['delay']) ? $node['data']['delay'] : 0,
                'allow_text' => isset($node['data']['allow_text_input']) ? $node['data']['allow_text_input'] : false,
                'placeholder' => isset($node['data']['text_placeholder']) ? $node['data']['text_placeholder'] : 'Type your message...',
                'options' => isset($node['data']['options']) ? $node['data']['options'] : array()
            );
            
            return $response;
        }
        
        // Default message
        return array(
            'type' => 'message',
            'text' => 'Hello! How can we help you?'
        );
    }
}
