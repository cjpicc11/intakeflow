<?php
/**
 * Analytics for IntakeFlow
 */

if (!defined('ABSPATH')) {
    exit;
}

class IntakeFlow_Analytics {
    
    /**
     * Track event
     */
    public static function track_event($conversation_id, $event_type, $event_data = array()) {
        global $wpdb;
        $table = $wpdb->prefix . 'intakeflow_analytics';
        
        $wpdb->insert(
            $table,
            array(
                'conversation_id' => $conversation_id,
                'event_type' => $event_type,
                'event_data' => json_encode($event_data),
                'created_at' => current_time('mysql')
            ),
            array('%d', '%s', '%s', '%s')
        );
    }
    
    /**
     * Get conversation metrics
     */
    public static function get_conversation_metrics($date_from = null, $date_to = null) {
        global $wpdb;
        $conversations_table = $wpdb->prefix . 'intakeflow_conversations';
        
        $where = "WHERE 1=1";
        if ($date_from) {
            $where .= $wpdb->prepare(" AND created_at >= %s", $date_from);
        }
        if ($date_to) {
            $where .= $wpdb->prepare(" AND created_at <= %s", $date_to);
        }
        
        $total = $wpdb->get_var("SELECT COUNT(*) FROM $conversations_table $where");
        $with_leads = $wpdb->get_var("SELECT COUNT(*) FROM $conversations_table $where AND lead_data IS NOT NULL");
        
        return array(
            'total_conversations' => intval($total),
            'conversations_with_leads' => intval($with_leads),
            'conversion_rate' => $total > 0 ? round(($with_leads / $total) * 100, 2) : 0
        );
    }
    
    /**
     * Get lead metrics
     */
    public static function get_lead_metrics($date_from = null, $date_to = null) {
        global $wpdb;
        $leads_table = $wpdb->prefix . 'intakeflow_leads';
        
        $where = "WHERE 1=1";
        if ($date_from) {
            $where .= $wpdb->prepare(" AND created_at >= %s", $date_from);
        }
        if ($date_to) {
            $where .= $wpdb->prepare(" AND created_at <= %s", $date_to);
        }
        
        $total = $wpdb->get_var("SELECT COUNT(*) FROM $leads_table $where");
        $by_status = $wpdb->get_results("SELECT status, COUNT(*) as count FROM $leads_table $where GROUP BY status");
        $by_service = $wpdb->get_results("SELECT service_interest, COUNT(*) as count FROM $leads_table $where GROUP BY service_interest");
        
        return array(
            'total_leads' => intval($total),
            'by_status' => $by_status,
            'by_service' => $by_service
        );
    }
    
    /**
     * Get popular paths
     */
    public static function get_popular_paths($limit = 10) {
        global $wpdb;
        $analytics_table = $wpdb->prefix . 'intakeflow_analytics';
        
        // Get most common conversation paths
        $paths = $wpdb->get_results($wpdb->prepare(
            "SELECT event_data, COUNT(*) as count 
            FROM $analytics_table 
            WHERE event_type = 'path_taken'
            GROUP BY event_data 
            ORDER BY count DESC 
            LIMIT %d",
            $limit
        ));
        
        return $paths;
    }
    
    /**
     * Get time-based metrics
     */
    public static function get_time_metrics($days = 30) {
        global $wpdb;
        $conversations_table = $wpdb->prefix . 'intakeflow_conversations';
        
        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM $conversations_table 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL %d DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC",
            $days
        ));
        
        return $results;
    }
}
