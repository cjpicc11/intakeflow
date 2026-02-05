<?php
/**
 * Dashboard Admin Page
 */

if (!defined('ABSPATH')) {
    exit;
}

// Get metrics
$conversation_metrics = IntakeFlow_Analytics::get_conversation_metrics();
$lead_metrics = IntakeFlow_Analytics::get_lead_metrics();
?>

<div class="wrap">
    <h1>IntakeFlow Dashboard</h1>
    
    <?php
    // Check for multiple active flows and show warning
    global $wpdb;
    $active_flows_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}intakeflow_flows WHERE is_active = 1");
    
    if ($active_flows_count > 1) {
        ?>
        <div class="notice notice-warning">
            <p><strong>⚠️ Multiple Active Flows Detected!</strong></p>
            <p>You have <strong><?php echo $active_flows_count; ?> active flows</strong>. The frontend chat widget will use the <strong>newest active flow</strong> (most recently created).</p>
            <p>To avoid confusion, we recommend keeping only <strong>one flow active</strong> at a time.</p>
            <p><a href="<?php echo admin_url('admin.php?page=intakeflow-builder'); ?>" class="button">Manage Flows →</a></p>
        </div>
        <?php
    } elseif ($active_flows_count === 0) {
        ?>
        <div class="notice notice-info">
            <p><strong>ℹ️ No Active Flow</strong></p>
            <p>You don't have any active flows yet. The chat widget won't appear on your website until you create and activate a flow.</p>
            <p><a href="<?php echo admin_url('admin.php?page=intakeflow-builder'); ?>" class="button button-primary">Create Your First Flow →</a></p>
        </div>
        <?php
    }
    ?>
    
    <div class="intakeflow-dashboard-stats">
        <div class="intakeflow-stat-box">
            <h3>Total Conversations</h3>
            <div class="stat-number"><?php echo number_format($conversation_metrics['total_conversations']); ?></div>
            <div class="stat-label">All time</div>
        </div>
        
        <div class="intakeflow-stat-box">
            <h3>Total Leads</h3>
            <div class="stat-number"><?php echo number_format($lead_metrics['total_leads']); ?></div>
            <div class="stat-label">Captured</div>
        </div>
        
        <div class="intakeflow-stat-box">
            <h3>Conversion Rate</h3>
            <div class="stat-number"><?php echo $conversation_metrics['conversion_rate']; ?>%</div>
            <div class="stat-label">Visitors to leads</div>
        </div>
        
        <div class="intakeflow-stat-box">
            <h3>Active Flows</h3>
            <?php
            global $wpdb;
            $active_flows = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}intakeflow_flows WHERE is_active = 1");
            ?>
            <div class="stat-number"><?php echo number_format($active_flows); ?></div>
            <div class="stat-label">Running now</div>
        </div>
    </div>
    
    <div class="intakeflow-notice">
        <p><strong>Welcome to IntakeFlow!</strong> Your smart chat assistant is ready to help convert visitors into leads.</p>
        <p>ðŸ‘‰ Start by <a href="<?php echo admin_url('admin.php?page=intakeflow-builder'); ?>">creating your first conversation flow</a>.</p>
    </div>
    
    <div class="intakeflow-chart-container">
        <h3>Recent Activity</h3>
        <p>Conversation trends and lead generation over the past 30 days.</p>
        <p><em>Chart visualization will be added in next update.</em></p>
    </div>
    
    <div class="intakeflow-settings-section">
        <h2>Quick Actions</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <a href="<?php echo admin_url('admin.php?page=intakeflow-builder'); ?>" class="button button-primary">
                <span class="dashicons dashicons-edit"></span> Create New Flow
            </a>
            <a href="<?php echo admin_url('admin.php?page=intakeflow-leads'); ?>" class="button">
                <span class="dashicons dashicons-groups"></span> View Leads
            </a>
            <a href="<?php echo admin_url('admin.php?page=intakeflow-analytics'); ?>" class="button">
                <span class="dashicons dashicons-chart-bar"></span> View Analytics
            </a>
            <a href="<?php echo admin_url('admin.php?page=intakeflow-settings'); ?>" class="button">
                <span class="dashicons dashicons-admin-generic"></span> Settings
            </a>
        </div>
    </div>
</div>

<!-- Multiple Active Flows Info -->
<div class="intakeflow-notice warning" style="margin-top: 20px;">
    <p><strong>📚 About Multiple Active Flows</strong></p>
    <p>You can have multiple active flows for advanced use cases:</p>
    <ul style="margin: 10px 0; padding-left: 20px;">
        <li><strong>A/B Testing:</strong> Run two flows simultaneously to compare conversion rates</li>
        <li><strong>Multi-language:</strong> Different flows for different languages</li>
        <li><strong>Department-specific:</strong> Sales vs Support chats</li>
    </ul>
    <p><strong>📌 Recommendation:</strong> For most websites, keep just <strong>one active flow</strong> to avoid confusion.</p>
    <p>When multiple flows are active, visitors see the <strong>newest active flow</strong> (most recently created).</p>
</div>
