<?php
/**
 * Plugin Name: IntakeFlow
 * Plugin URI: https://intakeflow.com
 * Description: Visual chatbot flow builder for WordPress with smart lead capture
 * Version: 0.27.2
 * Author: IntakeFlow
 * Author URI: https://intakeflow.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: intakeflow
 * Requires at least: 5.0
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('INTAKEFLOW_VERSION', '0.27.2');
define('INTAKEFLOW_PATH', plugin_dir_path(__FILE__));
define('INTAKEFLOW_URL', plugin_dir_url(__FILE__));

// Include core classes
require_once INTAKEFLOW_PATH . 'includes/class-database.php';
require_once INTAKEFLOW_PATH . 'includes/class-flow-engine.php';
require_once INTAKEFLOW_PATH . 'includes/class-analytics.php';
require_once INTAKEFLOW_PATH . 'includes/class-frontend.php';

// Initialize frontend
add_action('init', array('IntakeFlow_Frontend', 'init'));

/**
 * Main IntakeFlow Class
 */
class IntakeFlow {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
        
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
        
        // AJAX handlers
        add_action('wp_ajax_intakeflow_save_flow', array($this, 'ajax_save_flow'));
        add_action('wp_ajax_intakeflow_get_flows', array($this, 'ajax_get_flows'));
        add_action('wp_ajax_intakeflow_delete_flow', array($this, 'ajax_delete_flow'));
    }
    
    public function activate() {
        IntakeFlow_Database::create_tables();
        IntakeFlow_Database::migrate(); // Run migration for existing tables
        
        // Create default settings if they don't exist
        $settings = get_option('intakeflow_settings');
        if (!$settings) {
            $default_settings = array(
                'enabled' => true, // Enable by default so users can test immediately
                'visibility_mode' => 'everyone', // Changed from specific_roles - now per-flow
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
            );
            update_option('intakeflow_settings', $default_settings);
        }
        
        flush_rewrite_rules();
    }
    
    public function deactivate() {
        flush_rewrite_rules();
    }
    
    public function add_admin_menu() {
        add_menu_page(
            'IntakeFlow',
            'IntakeFlow',
            'manage_options',
            'intakeflow',
            array($this, 'render_dashboard'),
            'dashicons-format-chat',
            30
        );
        
        add_submenu_page(
            'intakeflow',
            'Dashboard',
            'Dashboard',
            'manage_options',
            'intakeflow',
            array($this, 'render_dashboard')
        );
        
        add_submenu_page(
            'intakeflow',
            'Flow Builder',
            'Flow Builder',
            'manage_options',
            'intakeflow-builder',
            array($this, 'render_builder')
        );
        
        add_submenu_page(
            'intakeflow',
            'Analytics',
            'Analytics',
            'manage_options',
            'intakeflow-analytics',
            array($this, 'render_analytics')
        );
        
        add_submenu_page(
            'intakeflow',
            'Leads',
            'Leads',
            'manage_options',
            'intakeflow-leads',
            array($this, 'render_leads')
        );
        
        add_submenu_page(
            'intakeflow',
            'Settings',
            'Settings',
            'manage_options',
            'intakeflow-settings',
            array($this, 'render_settings')
        );
    }
    
    public function enqueue_admin_assets($hook) {
        if (strpos($hook, 'intakeflow') === false) {
            return;
        }
        
        // Enqueue React and ReactDOM from CDN
        wp_enqueue_script('react', 'https://unpkg.com/react@18.3.1/umd/react.production.min.js', array(), '18.3.1', true);
        wp_enqueue_script('react-dom', 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js', array('react'), '18.3.1', true);
        
        // Enqueue our React canvas component
        wp_enqueue_script(
            'intakeflow-react',
            INTAKEFLOW_URL . 'assets/js/flow-builder-react.js',
            array('react', 'react-dom'),
            INTAKEFLOW_VERSION,
            true
        );
        
        // Enqueue admin JS
        wp_enqueue_script(
            'intakeflow-admin',
            INTAKEFLOW_URL . 'assets/js/admin.js',
            array('jquery', 'intakeflow-react'),
            INTAKEFLOW_VERSION,
            true
        );
        
        // Enqueue admin CSS
        wp_enqueue_style(
            'intakeflow-admin',
            INTAKEFLOW_URL . 'assets/css/admin.css',
            array(),
            INTAKEFLOW_VERSION
        );
        
        // Localize script for AJAX
        wp_localize_script('intakeflow-admin', 'intakeflowAdmin', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('intakeflow_nonce')
        ));
    }
    
    public function render_dashboard() {
        require_once INTAKEFLOW_PATH . 'templates/admin/dashboard.php';
    }
    
    public function render_builder() {
        require_once INTAKEFLOW_PATH . 'templates/admin/builder.php';
    }
    
    public function render_analytics() {
        require_once INTAKEFLOW_PATH . 'templates/admin/analytics.php';
    }
    
    public function render_leads() {
        require_once INTAKEFLOW_PATH . 'templates/admin/leads.php';
    }
    
    public function render_settings() {
        require_once INTAKEFLOW_PATH . 'templates/admin/settings.php';
    }
    
    public function ajax_save_flow() {
        check_ajax_referer('intakeflow_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
            return;
        }
        
        global $wpdb;
        $table = $wpdb->prefix . 'intakeflow_flows';
        
        $flow_id = isset($_POST['flow_id']) ? intval($_POST['flow_id']) : 0;
        $flow_name = isset($_POST['flow_name']) ? sanitize_text_field($_POST['flow_name']) : 'Untitled Flow';
        $is_active = isset($_POST['is_active']) ? intval($_POST['is_active']) : 0;
        $flow_data = isset($_POST['flow_data']) ? wp_unslash($_POST['flow_data']) : '';
        $visibility_mode = isset($_POST['visibility_mode']) ? sanitize_text_field($_POST['visibility_mode']) : 'everyone';
        $visible_roles = isset($_POST['visible_roles']) ? wp_unslash($_POST['visible_roles']) : '[]';
        
        // Validate JSON
        $decoded = json_decode($flow_data, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            wp_send_json_error('Invalid flow data JSON: ' . json_last_error_msg() . ' | Data length: ' . strlen($flow_data));
            return;
        }
        
        $data = array(
            'flow_name' => $flow_name,
            'flow_data' => $flow_data,
            'is_active' => $is_active,
            'visibility_mode' => $visibility_mode,
            'visible_roles' => $visible_roles,
            'updated_at' => current_time('mysql')
        );
        
        if ($flow_id > 0) {
            // Update existing flow
            $result = $wpdb->update(
                $table,
                $data,
                array('id' => $flow_id),
                array('%s', '%s', '%d', '%s', '%s', '%s'),
                array('%d')
            );
            
            if ($result === false) {
                wp_send_json_error('Database error: ' . $wpdb->last_error);
                return;
            }
            
            wp_send_json_success(array('flow_id' => $flow_id, 'message' => 'Flow updated'));
        } else {
            // Create new flow
            $data['created_at'] = current_time('mysql');
            
            $result = $wpdb->insert(
                $table,
                $data,
                array('%s', '%s', '%d', '%s', '%s', '%s', '%s')
            );
            
            if ($result === false) {
                wp_send_json_error('Database error: ' . $wpdb->last_error);
                return;
            }
            
            wp_send_json_success(array('flow_id' => $wpdb->insert_id, 'message' => 'Flow created'));
        }
    }
    
    public function ajax_get_flows() {
        check_ajax_referer('intakeflow_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
            return;
        }
        
        global $wpdb;
        $table = $wpdb->prefix . 'intakeflow_flows';
        
        $flows = $wpdb->get_results("SELECT * FROM $table ORDER BY updated_at DESC");
        
        wp_send_json_success($flows);
    }
    
    public function ajax_delete_flow() {
        check_ajax_referer('intakeflow_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
            return;
        }
        
        $flow_id = isset($_POST['flow_id']) ? intval($_POST['flow_id']) : 0;
        
        if ($flow_id <= 0) {
            wp_send_json_error('Invalid flow ID');
            return;
        }
        
        global $wpdb;
        $table = $wpdb->prefix . 'intakeflow_flows';
        
        $result = $wpdb->delete($table, array('id' => $flow_id), array('%d'));
        
        if ($result === false) {
            wp_send_json_error('Database error: ' . $wpdb->last_error);
            return;
        }
        
        wp_send_json_success('Flow deleted');
    }
}

// Initialize plugin
IntakeFlow::get_instance();
