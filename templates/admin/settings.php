<?php
/**
 * Settings Admin Page
 */

if (!defined('ABSPATH')) {
    exit;
}

// Handle settings save
if (isset($_POST['intakeflow_save_settings']) && check_admin_referer('intakeflow_settings')) {
    $settings = array(
        'enabled' => isset($_POST['enabled']) ? 1 : 0,
        'visibility_mode' => sanitize_text_field($_POST['visibility_mode']),
        'visible_roles' => isset($_POST['visible_roles']) ? array_map('sanitize_text_field', $_POST['visible_roles']) : array(),
        'primary_color' => sanitize_hex_color($_POST['primary_color']),
        'chat_position' => sanitize_text_field($_POST['chat_position']),
        'session_duration' => intval($_POST['session_duration']),
        'welcome_message' => sanitize_textarea_field($_POST['welcome_message']),
        'offline_message' => sanitize_textarea_field($_POST['offline_message']),
        'business_hours' => array(
            'enabled' => isset($_POST['business_hours_enabled']) ? 1 : 0,
            'timezone' => sanitize_text_field($_POST['timezone'])
        )
    );
    
    update_option('intakeflow_settings', $settings);
    echo '<div class="notice notice-success"><p>Settings saved successfully!</p></div>';
}

$settings = get_option('intakeflow_settings', array(
    'enabled' => false,
    'visibility_mode' => 'everyone',
    'visible_roles' => array('administrator'),
    'primary_color' => '#4A90E2',
    'chat_position' => 'bottom-right',
    'session_duration' => 7,
    'welcome_message' => 'Hi! How can we help you today?',
    'offline_message' => 'We\'re currently offline. Please leave your contact information and we\'ll get back to you.',
    'business_hours' => array(
        'enabled' => false,
        'timezone' => 'America/New_York'
    )
));
?>

<div class="wrap">
    <h1>IntakeFlow Settings</h1>
    
    <?php
    // Check if widget is enabled and if there's an active flow
    global $wpdb;
    $active_flows_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}intakeflow_flows WHERE is_active = 1");
    $widget_enabled = !empty($settings['enabled']);
    
    if ($widget_enabled && $active_flows_count === 0) {
        ?>
        <div class="notice notice-warning">
            <p><strong>⚠️ Chat Widget Enabled But No Active Flow</strong></p>
            <p>The chat widget is enabled, but you don't have any active flows. Visitors won't see the chat bubble until you create and activate a flow.</p>
            <p><a href="<?php echo admin_url('admin.php?page=intakeflow-builder'); ?>" class="button">Create a Flow →</a></p>
        </div>
        <?php
    } elseif (!$widget_enabled && $active_flows_count > 0) {
        ?>
        <div class="notice notice-info">
            <p><strong>ℹ️ Chat Widget Disabled</strong></p>
            <p>You have active flows, but the chat widget is disabled. Enable it below to show the chat bubble on your website.</p>
        </div>
        <?php
    } elseif ($widget_enabled && $active_flows_count > 0) {
        ?>
        <div class="notice notice-success">
            <p><strong>✅ Chat Widget Active</strong></p>
            <p>The chat widget is enabled and using your <?php echo $active_flows_count > 1 ? 'newest' : ''; ?> active flow. Visit your site to see it in action!</p>
        </div>
        <?php
    }
    ?>
    
    <form method="post" action="">
        <?php wp_nonce_field('intakeflow_settings'); ?>
        
        <div class="intakeflow-settings-section">
            <h2>General Settings</h2>
            
            <div class="intakeflow-setting-row">
                <div class="intakeflow-setting-label">
                    <h4>Enable Chatbot</h4>
                    <p>Turn the chatbot on or off on your website</p>
                </div>
                <div class="intakeflow-setting-control">
                    <label>
                        <input type="checkbox" name="enabled" value="1" <?php checked($settings['enabled'], 1); ?> />
                        Enable chatbot on frontend
                    </label>
                </div>
            </div>
            
            <div class="intakeflow-setting-row" style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 10px;">
                <div class="intakeflow-setting-label">
                    <h4>🎯 Visibility Mode <span style="background: #fbbf24; color: #78350f; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">NEW</span></h4>
                    <p><strong>Control who can see the chatbot</strong></p>
                    <p style="margin-top: 8px; color: #666;">Perfect for testing before going live!</p>
                </div>
                <div class="intakeflow-setting-control">
                    <select name="visibility_mode" id="intakeflow-visibility-mode" style="margin-bottom: 15px;">
                        <option value="everyone" <?php selected($settings['visibility_mode'], 'everyone'); ?>>
                            👥 Everyone (Public)
                        </option>
                        <option value="logged_in" <?php selected($settings['visibility_mode'], 'logged_in'); ?>>
                            🔐 Logged-in Users Only
                        </option>
                        <option value="specific_roles" <?php selected($settings['visibility_mode'], 'specific_roles'); ?>>
                            👑 Specific User Roles
                        </option>
                    </select>
                    
                    <div id="intakeflow-roles-selector" style="display: none; margin-top: 15px; padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;">
                        <p style="margin: 0 0 10px 0; font-weight: 600; font-size: 13px;">Select which roles can see the chatbot:</p>
                        <?php
                        $wp_roles = wp_roles();
                        $available_roles = $wp_roles->get_names();
                        $selected_roles = isset($settings['visible_roles']) ? $settings['visible_roles'] : array('administrator');
                        
                        foreach ($available_roles as $role_key => $role_name) {
                            $checked = in_array($role_key, $selected_roles) ? 'checked' : '';
                            echo '<label style="display: block; margin-bottom: 8px; padding: 6px; background: white; border-radius: 4px;">';
                            echo '<input type="checkbox" name="visible_roles[]" value="' . esc_attr($role_key) . '" ' . $checked . ' style="margin-right: 8px;" />';
                            echo esc_html($role_name);
                            echo '</label>';
                        }
                        ?>
                    </div>
                    
                    <div style="margin-top: 15px; padding: 12px; background: #e0f2fe; border-left: 4px solid #0ea5e9; border-radius: 4px; font-size: 13px; line-height: 1.6;">
                        <strong>💡 Testing Workflow:</strong><br>
                        1. Set to <strong>"Specific User Roles"</strong> → Select <strong>"Administrator"</strong><br>
                        2. Test your flows while logged in as admin<br>
                        3. When ready, switch to <strong>"Everyone"</strong> to go live!
                    </div>
                </div>
            </div>
            
            <div class="intakeflow-setting-row">
                <div class="intakeflow-setting-label">
                    <h4>Primary Color</h4>
                    <p>Main color for the chat widget</p>
                </div>
                <div class="intakeflow-setting-control">
                    <div class="intakeflow-color-picker">
                        <input type="color" name="primary_color" value="<?php echo esc_attr($settings['primary_color']); ?>" />
                        <input type="text" name="primary_color_text" value="<?php echo esc_attr($settings['primary_color']); ?>" readonly style="width: 100px;" />
                    </div>
                </div>
            </div>
            
            <div class="intakeflow-setting-row">
                <div class="intakeflow-setting-label">
                    <h4>Chat Position</h4>
                    <p>Where the chat widget appears on your site</p>
                </div>
                <div class="intakeflow-setting-control">
                    <select name="chat_position">
                        <option value="bottom-right" <?php selected($settings['chat_position'], 'bottom-right'); ?>>Bottom Right</option>
                        <option value="bottom-left" <?php selected($settings['chat_position'], 'bottom-left'); ?>>Bottom Left</option>
                    </select>
                </div>
            </div>
            
            <div class="intakeflow-setting-row">
                <div class="intakeflow-setting-label">
                    <h4>Session Duration</h4>
                    <p>How long to remember a conversation (in days)</p>
                </div>
                <div class="intakeflow-setting-control">
                    <input type="number" name="session_duration" value="<?php echo esc_attr($settings['session_duration']); ?>" min="1" max="90" />
                </div>
            </div>
        </div>
        
        <div class="intakeflow-settings-section">
            <h2>Messages</h2>
            
            <div class="intakeflow-setting-row">
                <div class="intakeflow-setting-label">
                    <h4>Welcome Message</h4>
                    <p>First message visitors see when opening the chat</p>
                </div>
                <div class="intakeflow-setting-control">
                    <textarea name="welcome_message" rows="3"><?php echo esc_textarea($settings['welcome_message']); ?></textarea>
                </div>
            </div>
            
            <div class="intakeflow-setting-row">
                <div class="intakeflow-setting-label">
                    <h4>Offline Message</h4>
                    <p>Message shown when outside business hours</p>
                </div>
                <div class="intakeflow-setting-control">
                    <textarea name="offline_message" rows="3"><?php echo esc_textarea($settings['offline_message']); ?></textarea>
                </div>
            </div>
        </div>
        
        <div class="intakeflow-settings-section">
            <h2>Business Hours</h2>
            
            <div class="intakeflow-setting-row">
                <div class="intakeflow-setting-label">
                    <h4>Enable Business Hours</h4>
                    <p>Show different messages during/after business hours</p>
                </div>
                <div class="intakeflow-setting-control">
                    <label>
                        <input type="checkbox" name="business_hours_enabled" value="1" 
                               <?php checked($settings['business_hours']['enabled'], 1); ?> />
                        Use business hours
                    </label>
                </div>
            </div>
            
            <div class="intakeflow-setting-row">
                <div class="intakeflow-setting-label">
                    <h4>Timezone</h4>
                    <p>Your business timezone</p>
                </div>
                <div class="intakeflow-setting-control">
                    <select name="timezone">
                        <option value="America/New_York" <?php selected($settings['business_hours']['timezone'], 'America/New_York'); ?>>Eastern Time</option>
                        <option value="America/Chicago" <?php selected($settings['business_hours']['timezone'], 'America/Chicago'); ?>>Central Time</option>
                        <option value="America/Denver" <?php selected($settings['business_hours']['timezone'], 'America/Denver'); ?>>Mountain Time</option>
                        <option value="America/Los_Angeles" <?php selected($settings['business_hours']['timezone'], 'America/Los_Angeles'); ?>>Pacific Time</option>
                    </select>
                </div>
            </div>
        </div>
        
        <p class="submit">
            <button type="submit" name="intakeflow_save_settings" class="button button-primary button-large">
                Save Settings
            </button>
        </p>
    </form>
</div>

<script>
jQuery(document).ready(function($) {
    // Sync color picker and text input
    $('input[name="primary_color"]').on('change', function() {
        $('input[name="primary_color_text"]').val($(this).val());
    });
    
    // Show/hide role selector based on visibility mode
    function updateRoleSelector() {
        const mode = $('#intakeflow-visibility-mode').val();
        if (mode === 'specific_roles') {
            $('#intakeflow-roles-selector').slideDown(200);
        } else {
            $('#intakeflow-roles-selector').slideUp(200);
        }
    }
    
    // Initialize on page load
    updateRoleSelector();
    
    // Update when dropdown changes
    $('#intakeflow-visibility-mode').on('change', updateRoleSelector);
});
</script>

<!-- Business Hours Note -->
<div class="intakeflow-settings-section">
    <h2>Business Hours</h2>
    <div class="intakeflow-notice">
        <p><strong>ℹ️ Business Hours Configuration</strong></p>
        <p>Full business hours configuration (day/time selection) coming in v0.27.0!</p>
        <p>For now, you can enable/disable the business hours feature.</p>
    </div>
</div>

<!-- Session Persistence Note -->
<div class="intakeflow-settings-section">
    <h2>Session Management</h2>
    <div class="intakeflow-notice">
        <p><strong>ℹ️ Session Persistence Options</strong></p>
        <p>Advanced session controls (time-based expiration, session-only mode) coming in v0.27.0!</p>
        <p>Currently: Sessions persist in browser LocalStorage until cleared.</p>
    </div>
</div>
