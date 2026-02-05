<?php
/**
 * Analytics Admin Page
 */

if (!defined('ABSPATH')) {
    exit;
}

// Get date range from query params
$date_from = isset($_GET['date_from']) ? sanitize_text_field($_GET['date_from']) : date('Y-m-d', strtotime('-30 days'));
$date_to = isset($_GET['date_to']) ? sanitize_text_field($_GET['date_to']) : date('Y-m-d');

$conversation_metrics = IntakeFlow_Analytics::get_conversation_metrics($date_from, $date_to);
$lead_metrics = IntakeFlow_Analytics::get_lead_metrics($date_from, $date_to);
$time_metrics = IntakeFlow_Analytics::get_time_metrics(30);
?>

<div class="wrap">
    <h1>IntakeFlow Analytics</h1>
    
    <div class="intakeflow-settings-section">
        <form method="get" action="">
            <input type="hidden" name="page" value="intakeflow-analytics" />
            <div style="display: flex; gap: 15px; align-items: flex-end;">
                <div>
                    <label>From Date</label><br/>
                    <input type="date" name="date_from" value="<?php echo esc_attr($date_from); ?>" />
                </div>
                <div>
                    <label>To Date</label><br/>
                    <input type="date" name="date_to" value="<?php echo esc_attr($date_to); ?>" />
                </div>
                <div>
                    <button type="submit" class="button button-primary">Apply Filter</button>
                </div>
            </div>
        </form>
    </div>
    
    <div class="intakeflow-dashboard-stats">
        <div class="intakeflow-stat-box">
            <h3>Conversations</h3>
            <div class="stat-number"><?php echo number_format($conversation_metrics['total_conversations']); ?></div>
            <div class="stat-label">Total interactions</div>
        </div>
        
        <div class="intakeflow-stat-box">
            <h3>With Leads</h3>
            <div class="stat-number"><?php echo number_format($conversation_metrics['conversations_with_leads']); ?></div>
            <div class="stat-label">Captured contact info</div>
        </div>
        
        <div class="intakeflow-stat-box">
            <h3>Conversion Rate</h3>
            <div class="stat-number"><?php echo $conversation_metrics['conversion_rate']; ?>%</div>
            <div class="stat-label">Success rate</div>
        </div>
        
        <div class="intakeflow-stat-box">
            <h3>Total Leads</h3>
            <div class="stat-number"><?php echo number_format($lead_metrics['total_leads']); ?></div>
            <div class="stat-label">Qualified prospects</div>
        </div>
    </div>
    
    <div class="intakeflow-chart-container">
        <h3>Conversation Trends</h3>
        <table class="intakeflow-leads-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Conversations</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($time_metrics)) : ?>
                    <?php foreach ($time_metrics as $metric) : ?>
                        <tr>
                            <td><?php echo esc_html(date('M d, Y', strtotime($metric->date))); ?></td>
                            <td><?php echo number_format($metric->count); ?></td>
                        </tr>
                    <?php endforeach; ?>
                <?php else : ?>
                    <tr>
                        <td colspan="2" style="text-align: center; padding: 20px; color: #666;">
                            No data available for this period
                        </td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
    
    <div class="intakeflow-chart-container">
        <h3>Leads by Service Interest</h3>
        <?php if (!empty($lead_metrics['by_service'])) : ?>
            <table class="intakeflow-leads-table">
                <thead>
                    <tr>
                        <th>Service</th>
                        <th>Count</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($lead_metrics['by_service'] as $service) : ?>
                        <?php
                        $percentage = $lead_metrics['total_leads'] > 0 
                            ? round(($service->count / $lead_metrics['total_leads']) * 100, 1) 
                            : 0;
                        ?>
                        <tr>
                            <td><?php echo esc_html($service->service_interest ?: 'Not specified'); ?></td>
                            <td><?php echo number_format($service->count); ?></td>
                            <td><?php echo $percentage; ?>%</td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php else : ?>
            <p style="text-align: center; padding: 40px; color: #666;">No service data available yet.</p>
        <?php endif; ?>
    </div>
</div>
