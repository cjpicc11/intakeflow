<?php
/**
 * Leads Admin Page
 */

if (!defined('ABSPATH')) {
    exit;
}

global $wpdb;
$leads_table = $wpdb->prefix . 'intakeflow_leads';

// Handle status update
if (isset($_POST['update_lead_status']) && check_admin_referer('intakeflow_update_lead')) {
    $lead_id = intval($_POST['lead_id']);
    $new_status = sanitize_text_field($_POST['status']);
    
    $wpdb->update(
        $leads_table,
        array('status' => $new_status),
        array('id' => $lead_id),
        array('%s'),
        array('%d')
    );
    
    echo '<div class="notice notice-success"><p>Lead status updated!</p></div>';
}

// Get leads
$leads = $wpdb->get_results("SELECT * FROM $leads_table ORDER BY created_at DESC LIMIT 100");

// Export to CSV
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="intakeflow-leads-' . date('Y-m-d') . '.csv"');
    
    $output = fopen('php://output', 'w');
    fputcsv($output, array('ID', 'Name', 'Email', 'Phone', 'Service Interest', 'Status', 'Created Date'));
    
    foreach ($leads as $lead) {
        fputcsv($output, array(
            $lead->id,
            $lead->name,
            $lead->email,
            $lead->phone,
            $lead->service_interest,
            $lead->status,
            $lead->created_at
        ));
    }
    
    fclose($output);
    exit;
}
?>

<div class="wrap">
    <h1>
        IntakeFlow Leads
        <a href="<?php echo admin_url('admin.php?page=intakeflow-leads&export=csv'); ?>" class="button">
            <span class="dashicons dashicons-download"></span> Export CSV
        </a>
    </h1>
    
    <?php if (empty($leads)) : ?>
        <div class="intakeflow-notice">
            <p>No leads captured yet. Once visitors complete the chatbot conversation, their information will appear here.</p>
        </div>
    <?php else : ?>
        <table class="intakeflow-leads-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Service Interest</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($leads as $lead) : ?>
                    <tr>
                        <td><?php echo esc_html($lead->id); ?></td>
                        <td><?php echo esc_html($lead->name ?: 'â€”'); ?></td>
                        <td>
                            <?php if ($lead->email) : ?>
                                <a href="mailto:<?php echo esc_attr($lead->email); ?>">
                                    <?php echo esc_html($lead->email); ?>
                                </a>
                            <?php else : ?>
                                â€”
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if ($lead->phone) : ?>
                                <a href="tel:<?php echo esc_attr($lead->phone); ?>">
                                    <?php echo esc_html($lead->phone); ?>
                                </a>
                            <?php else : ?>
                                â€”
                            <?php endif; ?>
                        </td>
                        <td><?php echo esc_html($lead->service_interest ?: 'â€”'); ?></td>
                        <td>
                            <span class="intakeflow-lead-status <?php echo esc_attr($lead->status); ?>">
                                <?php echo esc_html($lead->status); ?>
                            </span>
                        </td>
                        <td><?php echo esc_html(date('M d, Y g:i A', strtotime($lead->created_at))); ?></td>
                        <td>
                            <button class="button button-small intakeflow-view-lead" 
                                    data-lead-id="<?php echo esc_attr($lead->id); ?>"
                                    onclick="IntakeFlowLeads.viewLead(<?php echo esc_attr($lead->id); ?>)">
                                View
                            </button>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>
</div>

<!-- Lead Detail Modal (simplified for now) -->
<script>
var IntakeFlowLeads = {
    viewLead: function(leadId) {
        alert('Lead detail view coming soon! Lead ID: ' + leadId);
    }
};
</script>
