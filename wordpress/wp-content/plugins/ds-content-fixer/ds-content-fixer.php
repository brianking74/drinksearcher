<?php
/**
 * Plugin Name: DrinkSearcher Content Fixer
 * Description: One-time tool: download images, set featured images, populate ACF fields, link drinks to suppliers.
 * Version: 1.0.0
 * Author: DrinkSearcher
 *
 * USAGE: Upload to wp-content/plugins/, activate, visit /wp-admin/tools.php?page=ds-content-fixer,
 * click "Run Fixer", then deactivate and delete this plugin.
 */

if (!defined('ABSPATH')) exit;

add_action('admin_menu', function () {
  add_management_page('DrinkSearcher Content Fixer', 'DS Content Fixer', 'manage_options', 'ds-content-fixer', 'ds_content_fixer_page');
});

add_action('admin_post_ds_run_fixer', function () {
  if (!current_user_can('manage_options') || !check_admin_referer('ds_run_fixer')) wp_die('No');
  ds_run_fixer();
  wp_redirect(add_query_arg('page', 'ds-content-fixer', 'tools.php'));
  exit;
});

function ds_content_fixer_page() {
  if (isset($_GET['ran'])) echo '<div class="notice notice-success"><p>Fixer ran. Check the output below.</p></div>';
  ?>
  <div class="wrap">
    <h1>DrinkSearcher Content Fixer</h1>
    <p>This tool will:</p>
    <ol>
      <li>Download images from Cloudinary into the Media Library</li>
      <li>Set featured images on suppliers, venues, drinks, events</li>
      <li>Populate ACF fields (price, rating, phone, website, etc.)</li>
      <li>Link drinks to suppliers via the supplier_ref post-object field</li>
    </ol>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
      <?php wp_nonce_field('ds_run_fixer'); ?>
      <input type="hidden" name="action" value="ds_run_fixer">
      <?php submit_button('Run Fixer'); ?>
    </form>
    <?php
    if (isset($_POST['action']) && $_POST['action'] === 'ds_run_fixer') {
      echo '<h2>Output</h2><pre style="background:#fff;padding:16px;border:1px solid #ddd;max-height:600px;overflow:auto">';
      ds_run_fixer(true);
      echo '</pre>';
    }
    echo '</div>';
}

function ds_run_fixer($echo = false) {
  $base = 'https://raw.githubusercontent.com/brianking74/drinksearcher/main/scripts/wp-import';
  $files = ['suppliers.csv', 'venues.csv', 'drinks.csv', 'events.csv'];
  $out = '';

  foreach ($files as $file) {
    $url = "$base/$file";
    $csv = @file_get_contents($url);
    if ($csv === false) { $out .= "FAILED to fetch $url\n"; continue; }
    $lines = explode("\n", trim($csv));
    $headers = str_getcsv(array_shift($lines));
    $count = 0;
    foreach ($lines as $line) {
      if (!trim($line)) continue;
      $row = array_combine($headers, str_getcsv($line));
      if (empty($row['post_title'])) continue;
      $post = get_page_by_title($row['post_title'], 'OBJECT', str_replace('.csv', '', $file));
      if (!$post) { $out .= "MISSING post: {$row['post_title']} ({$file})\n"; continue; }

      // Featured image from URL
      if (!empty($row['featured_image']) && !preg_match('#^https?://#', $row['featured_image'])) {
        // Local asset path — skip, use placeholder
        $row['featured_image'] = 'https://res.cloudinary.com/rqokncht/image/upload/v1785202989/HK_Timelapse_2_hklr2m.png';
      }
      if (!empty($row['featured_image']) && !get_post_thumbnail_id($post->ID)) {
        $media = ds_sideload_image($row['featured_image'], $post->ID);
        if (!is_wp_error($media)) {
          set_post_thumbnail($post->ID, $media);
          $out .= "  image set: {$post->post_title}\n";
        } else {
          $out .= "  image FAIL: {$post->post_title} ({$media->get_error_message()})\n";
        }
      }

      // ACF fields
      $acf = [];
      foreach ($row as $k => $v) {
        if (strpos($k, 'acf_') === 0) {
          $acf[substr($k, 4)] = $v;
        }
      }
      // supplier_ref post-object from supplier name
      if ($post->post_type === 'drink' && !empty($row['acf_supplier_name'])) {
        $sup = get_page_by_title($row['acf_supplier_name'], 'OBJECT', 'supplier');
        if ($sup) {
          $acf['supplier_ref'] = $sup->ID;
          $out .= "  linked drink {$post->post_title} -> supplier {$sup->post_title}\n";
        }
      }
      if ($acf && function_exists('update_field')) {
        foreach ($acf as $field => $value) {
          if ($value === '' || $value === null) continue;
          update_field($field, $value, $post->ID);
        }
        $count++;
      }
    }
    $out .= "$file: processed $count posts with ACF\n";
  }
  if ($echo) echo $out;
  return $out;
}

function ds_sideload_image($url, $post_id) {
  require_once ABSPATH . 'wp-admin/includes/file.php';
  require_once ABSPATH . 'wp-admin/includes/media.php';
  require_once ABSPATH . 'wp-admin/includes/image.php';
  $tmp = download_url($url);
  if (is_wp_error($tmp)) return $tmp;
  $file = array(
    'name' => basename(parse_url($url, PHP_URL_PATH)),
    'type' => mime_content_type($tmp),
    'tmp_name' => $tmp,
    'error' => 0,
    'size' => filesize($tmp),
  );
  $id = media_handle_sideload($file, $post_id);
  if (is_wp_error($id)) {
    @unlink($tmp);
    return $id;
  }
  return $id;
}
