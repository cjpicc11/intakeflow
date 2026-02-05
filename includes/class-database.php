<?php
/**
 * Database management for IntakeFlow
 */

if (!defined('ABSPATH')) {
    exit;
}

class IntakeFlow_Database {
    
    /**
     * Create database tables
     */
    public static function create_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();
        
        // Flows table
        $flows_table = $wpdb->prefix . 'intakeflow_flows';
        $flows_sql = "CREATE TABLE IF NOT EXISTS $flows_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            flow_name varchar(255) NOT NULL,
            flow_data longtext NOT NULL,
            is_active tinyint(1) DEFAULT 1,
            visibility_mode varchar(50) DEFAULT 'everyone',
            visible_roles text DEFAULT NULL,
            created_at datetime NOT NULL,
            updated_at datetime NOT NULL,
            PRIMARY KEY (id),
            KEY is_active (is_active)
        ) $charset_collate;";
        
        // Conversations table
        $conversations_table = $wpdb->prefix . 'intakeflow_conversations';
        $conversations_sql = "CREATE TABLE IF NOT EXISTS $conversations_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            session_id varchar(255) NOT NULL,
            flow_id bigint(20) DEFAULT NULL,
            conversation_data longtext NOT NULL,
            lead_data longtext DEFAULT NULL,
            ip_address varchar(45) DEFAULT NULL,
            user_agent text DEFAULT NULL,
            created_at datetime NOT NULL,
            updated_at datetime NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY session_id (session_id),
            KEY flow_id (flow_id),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        // Leads table
        $leads_table = $wpdb->prefix . 'intakeflow_leads';
        $leads_sql = "CREATE TABLE IF NOT EXISTS $leads_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            conversation_id bigint(20) DEFAULT NULL,
            name varchar(255) DEFAULT NULL,
            email varchar(255) DEFAULT NULL,
            phone varchar(50) DEFAULT NULL,
            service_interest varchar(100) DEFAULT NULL,
            message text DEFAULT NULL,
            lead_data longtext DEFAULT NULL,
            status varchar(50) DEFAULT 'new',
            created_at datetime NOT NULL,
            PRIMARY KEY (id),
            KEY conversation_id (conversation_id),
            KEY email (email),
            KEY status (status),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        // Analytics table
        $analytics_table = $wpdb->prefix . 'intakeflow_analytics';
        $analytics_sql = "CREATE TABLE IF NOT EXISTS $analytics_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            conversation_id bigint(20) NOT NULL,
            event_type varchar(50) NOT NULL,
            event_data longtext DEFAULT NULL,
            created_at datetime NOT NULL,
            PRIMARY KEY (id),
            KEY conversation_id (conversation_id),
            KEY event_type (event_type),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($flows_sql);
        dbDelta($conversations_sql);
        dbDelta($leads_sql);
        dbDelta($analytics_sql);
    }
    
    /**
     * Drop all tables
     */
    public static function drop_tables() {
        global $wpdb;
        
        $tables = array(
            $wpdb->prefix . 'intakeflow_flows',
            $wpdb->prefix . 'intakeflow_conversations',
            $wpdb->prefix . 'intakeflow_leads',
            $wpdb->prefix . 'intakeflow_analytics'
        );
        
        foreach ($tables as $table) {
            $wpdb->query("DROP TABLE IF EXISTS $table");
        }
    }
    
    /**
     * Migrate database to latest version
     * Adds new columns to existing tables
     */
    public static function migrate() {
        global $wpdb;
        $flows_table = $wpdb->prefix . 'intakeflow_flows';
        
        // Check if visibility columns exist, add if not
        $row = $wpdb->get_results("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                                    WHERE table_name = '$flows_table' 
                                    AND column_name = 'visibility_mode'");
        
        if (empty($row)) {
            $wpdb->query("ALTER TABLE $flows_table 
                         ADD COLUMN visibility_mode varchar(50) DEFAULT 'everyone' AFTER is_active,
                         ADD COLUMN visible_roles text DEFAULT NULL AFTER visibility_mode");
        }
    }
}
