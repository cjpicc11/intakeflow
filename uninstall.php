<?php
/**
 * Uninstall IntakeFlow
 * 
 * Fired when the plugin is uninstalled (deleted, not just deactivated)
 * Removes all plugin data from the database
 */

// If uninstall not called from WordPress, exit
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

global $wpdb;

// Drop all IntakeFlow tables
$tables = array(
    $wpdb->prefix . 'intakeflow_flows',
    $wpdb->prefix . 'intakeflow_conversations',
    $wpdb->prefix . 'intakeflow_leads',
    $wpdb->prefix . 'intakeflow_analytics'
);

foreach ($tables as $table) {
    $wpdb->query("DROP TABLE IF EXISTS $table");
}

// Delete all plugin options
delete_option('intakeflow_settings');
delete_option('intakeflow_version');

// Clear any transients
delete_transient('intakeflow_cache');

// Log cleanup (optional - comment out in production)
// error_log('IntakeFlow: All data cleaned up on uninstall');
