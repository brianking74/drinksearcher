<?php
/**
 * Plugin Name: DrinkSearcher Core
 * Description: Content types, taxonomies, fields and directory shortcodes for DrinkSearcher.HK
 * Version: 1.0.0
 * Author: DrinkSearcher
 */

if (!defined('ABSPATH')) exit;

/*--------------------------------------------------------------
 * Custom Post Types
 *------------------------------------------------------------*/
add_action('init', function () {

  register_post_type('drink', [
    'label' => 'Drinks',
    'labels' => ['name' => 'Drinks', 'singular_name' => 'Drink', 'add_new_item' => 'Add New Drink'],
    'public' => true,
    'has_archive' => true,
    'rewrite' => ['slug' => 'drinks'],
    'menu_icon' => 'dashicons-beer',
    'supports' => ['title', 'editor', 'thumbnail', 'custom-fields', 'comments'],
    'show_in_rest' => true,
  ]);

  register_post_type('supplier', [
    'label' => 'Suppliers',
    'labels' => ['name' => 'Suppliers', 'singular_name' => 'Supplier', 'add_new_item' => 'Add New Supplier'],
    'public' => true,
    'has_archive' => true,
    'rewrite' => ['slug' => 'suppliers'],
    'menu_icon' => 'dashicons-store',
    'supports' => ['title', 'editor', 'thumbnail', 'custom-fields'],
    'show_in_rest' => true,
  ]);

  register_post_type('venue', [
    'label' => 'Venues',
    'labels' => ['name' => 'Venues', 'singular_name' => 'Venue', 'add_new_item' => 'Add New Venue'],
    'public' => true,
    'has_archive' => true,
    'rewrite' => ['slug' => 'venues'],
    'menu_icon' => 'dashicons-location-alt',
    'supports' => ['title', 'editor', 'thumbnail', 'custom-fields', 'comments'],
    'show_in_rest' => true,
  ]);

  register_post_type('event', [
    'label' => 'Events',
    'labels' => ['name' => 'Events', 'singular_name' => 'Event', 'add_new_item' => 'Add New Event'],
    'public' => true,
    'has_archive' => true,
    'rewrite' => ['slug' => 'events'],
    'menu_icon' => 'dashicons-calendar-alt',
    'supports' => ['title', 'editor', 'thumbnail', 'custom-fields'],
    'show_in_rest' => true,
  ]);

  register_post_type('guide', [
    'label' => 'Guides',
    'labels' => ['name' => 'Guides', 'singular_name' => 'Guide', 'add_new_item' => 'Add New Guide'],
    'public' => true,
    'has_archive' => true,
    'rewrite' => ['slug' => 'guides'],
    'menu_icon' => 'dashicons-book-alt',
    'supports' => ['title', 'editor', 'thumbnail', 'custom-fields', 'excerpt'],
    'show_in_rest' => true,
  ]);
});

/*--------------------------------------------------------------
 * Taxonomies
 *------------------------------------------------------------*/
add_action('init', function () {

  // Shared
  register_taxonomy('district', ['drink', 'venue', 'event', 'supplier'], [
    'label' => 'Districts',
    'rewrite' => ['slug' => 'district'],
    'hierarchical' => true,
    'show_in_rest' => true,
  ]);

  register_taxonomy('drink_type', ['drink'], [
    'label' => 'Drink Categories',
    'rewrite' => ['slug' => 'drink-category'],
    'hierarchical' => true,
    'show_in_rest' => true,
  ]);

  register_taxonomy('origin', ['drink'], [
    'label' => 'Origins',
    'rewrite' => ['slug' => 'origin'],
    'hierarchical' => true,
    'show_in_rest' => true,
  ]);

  register_taxonomy('venue_type', ['venue'], [
    'label' => 'Venue Types',
    'rewrite' => ['slug' => 'venue-type'],
    'hierarchical' => true,
    'show_in_rest' => true,
  ]);

  register_taxonomy('event_type', ['event'], [
    'label' => 'Event Types',
    'rewrite' => ['slug' => 'event-type'],
    'hierarchical' => true,
    'show_in_rest' => true,
  ]);

  register_taxonomy('specialty', ['supplier'], [
    'label' => 'Specialties',
    'rewrite' => ['slug' => 'specialty'],
    'hierarchical' => true,
    'show_in_rest' => true,
  ]);
});

/*--------------------------------------------------------------
 * Seed default taxonomy terms on activation
 *------------------------------------------------------------*/
register_activation_hook(__FILE__, function () {
  // CPTs/taxonomies must exist before seeding
  do_action('init');

  $districts = ['Central', 'Soho', 'Wan Chai', 'Tsim Sha Tsui', 'Sheung Wan', 'Causeway Bay', 'The Peak', 'West Kowloon', 'North Point', 'Mong Kok', 'Taikoo Shing', 'Jordan', 'Kennedy Town', 'Admiralty', 'Lan Kwai Fong'];
  foreach ($districts as $d) { if (!term_exists($d, 'district')) wp_insert_term($d, 'district'); }

  $types = ['Tequila', 'Whisky', 'Wine', 'Sake', 'Beer', 'Gin', 'Rum', 'Vodka', 'Champagne', 'No & Low'];
  foreach ($types as $t) { if (!term_exists($t, 'drink_type')) wp_insert_term($t, 'drink_type'); }

  $origins = ['Japan', 'Mexico', 'Scotland', 'France', 'Italy', 'Spain', 'USA', 'Ireland', 'Hong Kong', 'Taiwan', 'Australia'];
  foreach ($origins as $o) { if (!term_exists($o, 'origin')) wp_insert_term($o, 'origin'); }

  $venue_types = ['Cocktail Bar', 'Rooftop Bar', 'Wine Bar', 'Whisky Bar', 'Sake Bar', 'Hotel Bar', 'Speakeasy', 'Jazz Bar', 'Craft Beer', 'Izakaya', 'Restaurant Bar'];
  foreach ($venue_types as $v) { if (!term_exists($v, 'venue_type')) wp_insert_term($v, 'venue_type'); }

  $event_types = ['Tasting', 'Guest Shift', 'Pairing Dinner', 'Launch', 'Masterclass', 'Zero-Proof'];
  foreach ($event_types as $e) { if (!term_exists($e, 'event_type')) wp_insert_term($e, 'event_type'); }

  $specialties = ['Fine Wine', 'Whisky', 'Sake', 'Craft Beer', 'Premium Spirits', 'No & Low'];
  foreach ($specialties as $s) { if (!term_exists($s, 'specialty')) wp_insert_term($s, 'specialty'); }

  flush_rewrite_rules();
});

register_deactivation_hook(__FILE__, function () { flush_rewrite_rules(); });

/*--------------------------------------------------------------
 * ACF Field Groups (registered in PHP — no ACF Pro UI needed)
 *------------------------------------------------------------*/
add_action('acf/init', function () {
  if (!function_exists('acf_add_local_field_group')) return;

  acf_add_local_field_group([
    'key' => 'group_drink',
    'title' => 'Drink Details',
    'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'drink']]],
    'fields' => [
      ['key' => 'field_drink_price', 'label' => 'Price (HKD)', 'name' => 'price', 'type' => 'text', 'instructions' => 'e.g. HK$1,498'],
      ['key' => 'field_drink_abv', 'label' => 'ABV', 'name' => 'abv', 'type' => 'text', 'instructions' => 'e.g. 40%'],
      ['key' => 'field_drink_size', 'label' => 'Size', 'name' => 'size', 'type' => 'text', 'instructions' => 'e.g. 700ml', 'default_value' => '700ml'],
      ['key' => 'field_drink_supplier', 'label' => 'Supplier', 'name' => 'supplier_ref', 'type' => 'post_object', 'post_type' => ['supplier'], 'return_format' => 'object', 'instructions' => 'Link this drink to a supplier listing'],
      ['key' => 'field_drink_supplier_name', 'label' => 'Supplier name (fallback)', 'name' => 'supplier_name', 'type' => 'text', 'instructions' => 'Used if no supplier listing is linked'],
      ['key' => 'field_drink_buy_url', 'label' => 'Buy URL', 'name' => 'buy_url', 'type' => 'url'],
      ['key' => 'field_drink_tier', 'label' => 'Listing tier', 'name' => 'tier', 'type' => 'select', 'choices' => ['standard' => 'Standard', 'enhanced' => 'Enhanced', 'featured' => 'Featured'], 'default_value' => 'standard'],
      ['key' => 'field_drink_gallery', 'label' => 'Gallery images', 'name' => 'gallery', 'type' => 'gallery', 'instructions' => 'Up to 3 additional photos shown on the product page'],
    ],
  ]);

  acf_add_local_field_group([
    'key' => 'group_supplier',
    'title' => 'Supplier Details',
    'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'supplier']]],
    'fields' => [
      ['key' => 'field_sup_phone', 'label' => 'Phone', 'name' => 'phone', 'type' => 'text'],
      ['key' => 'field_sup_website', 'label' => 'Website', 'name' => 'website', 'type' => 'url'],
      ['key' => 'field_sup_whatsapp', 'label' => 'WhatsApp number', 'name' => 'whatsapp', 'type' => 'text', 'instructions' => 'e.g. 85235430039 — used for WhatsApp enquiry buttons'],
      ['key' => 'field_sup_delivery', 'label' => 'Delivery info', 'name' => 'delivery', 'type' => 'text', 'instructions' => 'e.g. Same-day delivery'],
      ['key' => 'field_sup_min_order', 'label' => 'Minimum order', 'name' => 'min_order', 'type' => 'text', 'instructions' => 'e.g. HK$500'],
      ['key' => 'field_sup_payment', 'label' => 'Payment methods', 'name' => 'payment', 'type' => 'text'],
      ['key' => 'field_sup_address', 'label' => 'Address', 'name' => 'address', 'type' => 'textarea', 'rows' => 2],
      ['key' => 'field_sup_tier', 'label' => 'Listing tier', 'name' => 'tier', 'type' => 'select', 'choices' => ['standard' => 'Standard', 'enhanced' => 'Enhanced', 'featured' => 'Featured'], 'default_value' => 'standard'],
      ['key' => 'field_sup_gallery', 'label' => 'Gallery images', 'name' => 'gallery', 'type' => 'gallery'],
    ],
  ]);

  acf_add_local_field_group([
    'key' => 'group_venue',
    'title' => 'Venue Details',
    'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'venue']]],
    'fields' => [
      ['key' => 'field_ven_phone', 'label' => 'Phone', 'name' => 'phone', 'type' => 'text'],
      ['key' => 'field_ven_website', 'label' => 'Website / booking URL', 'name' => 'website', 'type' => 'url'],
      ['key' => 'field_ven_booking', 'label' => 'Booking platform', 'name' => 'booking', 'type' => 'text', 'instructions' => 'e.g. SevenRooms, Walk-in'],
      ['key' => 'field_ven_price', 'label' => 'Price band', 'name' => 'price_band', 'type' => 'select', 'choices' => ['$$' => '$$', '$$$' => '$$$', '$$$$' => '$$$$'], 'default_value' => '$$$'],
      ['key' => 'field_ven_rating', 'label' => 'Rating', 'name' => 'rating', 'type' => 'number', 'min' => 0, 'max' => 5, 'step' => 0.1],
      ['key' => 'field_ven_mtr', 'label' => 'Nearest MTR', 'name' => 'mtr', 'type' => 'text'],
      ['key' => 'field_ven_address', 'label' => 'Address', 'name' => 'address', 'type' => 'textarea', 'rows' => 2],
      ['key' => 'field_ven_hours', 'label' => 'Opening hours', 'name' => 'hours', 'type' => 'textarea', 'rows' => 3, 'instructions' => 'One line per day range, e.g. Mon–Thu · 5 PM–1 AM'],
      ['key' => 'field_ven_signature', 'label' => 'Signature / known for', 'name' => 'signature', 'type' => 'text', 'instructions' => 'e.g. Molecular Mixology'],
      ['key' => 'field_ven_tier', 'label' => 'Listing tier', 'name' => 'tier', 'type' => 'select', 'choices' => ['standard' => 'Standard', 'enhanced' => 'Enhanced', 'featured' => 'Featured'], 'default_value' => 'standard'],
      ['key' => 'field_ven_gallery', 'label' => 'Gallery images', 'name' => 'gallery', 'type' => 'gallery'],
    ],
  ]);

  acf_add_local_field_group([
    'key' => 'group_event',
    'title' => 'Event Details',
    'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'event']]],
    'fields' => [
      ['key' => 'field_evt_date', 'label' => 'Date & time', 'name' => 'event_date', 'type' => 'date_time_picker', 'display_format' => 'j M · g:i a', 'return_format' => 'j M · g:i a'],
      ['key' => 'field_evt_venue', 'label' => 'Venue', 'name' => 'venue_ref', 'type' => 'post_object', 'post_type' => ['venue'], 'return_format' => 'object'],
      ['key' => 'field_evt_venue_name', 'label' => 'Venue name (fallback)', 'name' => 'venue_name', 'type' => 'text'],
      ['key' => 'field_evt_price', 'label' => 'Price', 'name' => 'price', 'type' => 'text', 'instructions' => 'e.g. HK$380 or Free'],
      ['key' => 'field_evt_url', 'label' => 'Tickets / RSVP URL', 'name' => 'ticket_url', 'type' => 'url'],
    ],
  ]);

  acf_add_local_field_group([
    'key' => 'group_guide',
    'title' => 'Guide Entries',
    'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'guide']]],
    'fields' => [
      ['key' => 'field_guide_topic', 'label' => 'Topic', 'name' => 'topic', 'type' => 'select', 'choices' => ['Night out' => 'Night out', 'Collectors' => 'Collectors', 'Neighbourhood' => 'Neighbourhood', 'General' => 'General'], 'default_value' => 'Night out'],
      ['key' => 'field_guide_entries', 'label' => 'Entries', 'name' => 'entries', 'type' => 'repeater', 'button_label' => 'Add entry', 'layout' => 'block',
        'sub_fields' => [
          ['key' => 'field_ge_name', 'label' => 'Name', 'name' => 'name', 'type' => 'text'],
          ['key' => 'field_ge_area', 'label' => 'Area', 'name' => 'area', 'type' => 'text'],
          ['key' => 'field_ge_venue', 'label' => 'Linked venue', 'name' => 'venue_ref', 'type' => 'post_object', 'post_type' => ['venue'], 'return_format' => 'object', 'instructions' => 'Optional — creates the "View venue" button'],
          ['key' => 'field_ge_image', 'label' => 'Image', 'name' => 'image', 'type' => 'image', 'return_format' => 'url'],
          ['key' => 'field_ge_rating', 'label' => 'Rating', 'name' => 'rating', 'type' => 'number', 'min' => 0, 'max' => 5, 'step' => 0.1],
          ['key' => 'field_ge_price', 'label' => 'Price band', 'name' => 'price_band', 'type' => 'select', 'choices' => ['$$' => '$$', '$$$' => '$$$', '$$$$' => '$$$$']],
          ['key' => 'field_ge_tags', 'label' => 'Tags', 'name' => 'tags', 'type' => 'text', 'instructions' => 'e.g. Cocktail Bar · Rooftop Bar'],
          ['key' => 'field_ge_description', 'label' => 'Description', 'name' => 'description', 'type' => 'textarea', 'rows' => 4],
        ],
      ],
    ],
  ]);
});

/*--------------------------------------------------------------
 * Helper: formatted listing tier badge
 *------------------------------------------------------------*/
function ds_tier_badge($tier) {
  if ($tier === 'featured') return '<span class="ds-badge ds-badge-gold">Featured</span>';
  if ($tier === 'enhanced') return '<span class="ds-badge ds-badge-jade">Enhanced</span>';
  return '';
}

/*--------------------------------------------------------------
 * Shortcode: [ds_directory type="drink|venue|supplier|event"]
 * Renders the instant-filter directory (search + type/district/price filters).
 *------------------------------------------------------------*/
add_shortcode('ds_directory', function ($atts) {
  $atts = shortcode_atts(['type' => 'drink'], $atts);
  $type = in_array($atts['type'], ['drink', 'venue', 'supplier', 'event']) ? $atts['type'] : 'drink';

  $posts = get_posts(['post_type' => $type, 'posts_per_page' => -1, 'post_status' => 'publish', 'orderby' => 'title', 'order' => 'ASC']);
  if (!$posts) return '<div class="ds-empty"><h3>No listings yet.</h3><p>Check back soon.</p></div>';

  // Gather filter facets from the actual posts
  $types = $districts = [];
  $items = [];
  foreach ($posts as $p) {
    $id = $p->ID;
    $tier = function_exists('get_field') ? get_field('tier', $id) : '';
    $img = get_the_post_thumbnail_url($id, 'medium');
    $terms_type = wp_get_post_terms($id, $type === 'drink' ? 'drink_type' : ($type === 'venue' ? 'venue_type' : ($type === 'event' ? 'event_type' : 'specialty')), ['fields' => 'names']);
    $terms_dist = wp_get_post_terms($id, 'district', ['fields' => 'names']);
    foreach ($terms_type as $t) $types[$t] = true;
    foreach ($terms_dist as $d) $districts[$d] = true;

    $meta = [
      'id' => $id, 'name' => get_the_title($p), 'link' => get_permalink($p),
      'img' => $img ?: '', 'tier' => $tier ?: 'standard',
      'type' => implode(', ', $terms_type), 'district' => implode(', ', $terms_dist),
    ];
    if ($type === 'drink' && function_exists('get_field')) {
      $meta['price'] = get_field('price', $id); $meta['abv'] = get_field('abv', $id);
      $meta['origin'] = implode(', ', wp_get_post_terms($id, 'origin', ['fields' => 'names']));
      $meta['supplier'] = get_field('supplier_name', $id) ?: '';
    } elseif ($type === 'venue' && function_exists('get_field')) {
      $meta['price'] = get_field('price_band', $id); $meta['rating'] = get_field('rating', $id);
      $meta['signature'] = get_field('signature', $id);
    } elseif ($type === 'supplier' && function_exists('get_field')) {
      $meta['delivery'] = get_field('delivery', $id); $meta['min_order'] = get_field('min_order', $id);
    } elseif ($type === 'event' && function_exists('get_field')) {
      $meta['date'] = get_field('event_date', $id); $meta['price'] = get_field('price', $id);
      $meta['venue'] = get_field('venue_name', $id) ?: '';
    }
    $items[] = $meta;
  }

  // Sort: featured first, then enhanced, then standard
  usort($items, function ($a, $b) {
    $order = ['featured' => 0, 'enhanced' => 1, 'standard' => 2];
    return ($order[$a['tier']] ?? 2) - ($order[$b['tier']] ?? 2);
  });

  ob_start();
  $type_label = $type === 'drink' ? 'Drinks' : ($type === 'venue' ? 'Venues' : ($type === 'supplier' ? 'Suppliers' : 'Events'));
  ?>
  <div class="ds-directory" data-ds-type="<?php echo esc_attr($type); ?>">
    <div class="ds-directory-bar">
      <input class="ds-search" type="search" placeholder="Search <?php echo esc_attr(strtolower($type_label)); ?>…" aria-label="Search <?php echo esc_attr(strtolower($type_label)); ?>">
      <div class="ds-filters">
        <?php if ($types): ?><select class="ds-filter" data-facet="type"><option value="">All categories</option><?php foreach (array_keys($types) as $t) echo '<option>' . esc_html($t) . '</option>'; ?></select><?php endif; ?>
        <?php if ($districts): ?><select class="ds-filter" data-facet="district"><option value="">All districts</option><?php foreach (array_keys($districts) as $d) echo '<option>' . esc_html($d) . '</option>'; ?></select><?php endif; ?>
      </div>
      <span class="ds-count"><strong class="ds-count-num"><?php echo count($items); ?></strong> results</span>
    </div>
    <div class="ds-results">
      <?php foreach ($items as $it): ?>
      <article class="ds-card ds-card-<?php echo esc_attr($type); ?>" data-search="<?php echo esc_attr(strtolower($it['name'] . ' ' . $it['type'] . ' ' . $it['district'] . ' ' . ($it['origin'] ?? '') . ' ' . ($it['supplier'] ?? ''))); ?>" data-type="<?php echo esc_attr($it['type']); ?>" data-district="<?php echo esc_attr($it['district']); ?>">
        <a class="ds-card-media" href="<?php echo esc_url($it['link']); ?>">
          <?php if ($it['img']): ?><img src="<?php echo esc_url($it['img']); ?>" alt="<?php echo esc_attr($it['name']); ?>" loading="lazy"><?php endif; ?>
        </a>
        <div class="ds-card-body">
          <span class="ds-kicker"><?php echo esc_html($it['type']); ?><?php if ($it['district']) echo ' · ' . esc_html($it['district']); ?></span>
          <h3><a href="<?php echo esc_url($it['link']); ?>"><?php echo esc_html($it['name']); ?></a></h3>
          <?php echo ds_tier_badge($it['tier']); ?>
          <div class="ds-card-meta">
            <?php if (!empty($it['rating'])): ?><span class="ds-fresh">★ <?php echo esc_html($it['rating']); ?></span><?php endif; ?>
            <?php if (!empty($it['abv'])): ?><span><?php echo esc_html($it['abv']); ?> ABV</span><?php endif; ?>
            <?php if (!empty($it['signature'])): ?><span><?php echo esc_html($it['signature']); ?></span><?php endif; ?>
            <?php if (!empty($it['delivery'])): ?><span><?php echo esc_html($it['delivery']); ?></span><?php endif; ?>
            <?php if (!empty($it['date'])): ?><span class="ds-fresh"><?php echo esc_html($it['date']); ?></span><?php endif; ?>
            <?php if (!empty($it['venue'])): ?><span><?php echo esc_html($it['venue']); ?></span><?php endif; ?>
          </div>
        </div>
        <div class="ds-card-price">
          <?php if (!empty($it['price'])): ?><strong><?php echo esc_html($it['price']); ?></strong><?php endif; ?>
          <a class="ds-btn ds-btn-primary" href="<?php echo esc_url($it['link']); ?>"><?php echo $type === 'supplier' ? 'View supplier' : ($type === 'venue' ? 'View venue' : ($type === 'event' ? 'Event details' : 'View drink')); ?></a>
        </div>
      </article>
      <?php endforeach; ?>
    </div>
  </div>
  <?php
  return ob_get_clean();
});

/*--------------------------------------------------------------
 * Shortcode: [ds_guide_entries] — renders entries repeater on single guide
 *------------------------------------------------------------*/
add_shortcode('ds_guide_entries', function () {
  if (!function_exists('get_field')) return '';
  $entries = get_field('entries');
  if (!$entries) return '';
  ob_start();
  echo '<div class="ds-guide-entries">';
  $i = 1;
  foreach ($entries as $e) {
    $v = $e['venue_ref'] ?? null;
    echo '<article class="ds-guide-entry">';
    if (!empty($e['image'])) echo '<div class="ds-guide-entry-media"><img src="' . esc_url($e['image']) . '" alt="' . esc_attr($e['name']) . '" loading="lazy"></div>';
    echo '<div class="ds-guide-entry-body">';
    if (!empty($e['area'])) echo '<span class="ds-kicker">' . esc_html($e['area']) . '</span>';
    echo '<div class="ds-guide-entry-head"><span class="ds-count-badge">' . $i . '</span><h3>' . esc_html($e['name']) . '</h3></div>';
    echo '<div class="ds-card-meta">';
    if (!empty($e['rating'])) echo '<span>★ ' . esc_html($e['rating']) . '</span>';
    if (!empty($e['price_band'])) echo '<span>' . esc_html($e['price_band']) . '</span>';
    if (!empty($e['tags'])) echo '<span>' . esc_html($e['tags']) . '</span>';
    echo '</div>';
    if (!empty($e['description'])) echo '<p>' . esc_html($e['description']) . '</p>';
    echo '<div class="ds-card-actions">';
    if ($v) echo '<a class="ds-btn ds-btn-primary" href="' . esc_url(get_permalink($v->ID)) . '">View venue</a>';
    echo '<a class="ds-btn ds-btn-ghost" href="https://www.google.com/maps/search/?api=1&query=' . rawurlencode($e['name'] . ' ' . ($e['area'] ?? '') . ' Hong Kong') . '" target="_blank" rel="noopener">Directions</a>';
    echo '</div></div></article>';
    $i++;
  }
  echo '</div>';
  return ob_get_clean();
});

/*--------------------------------------------------------------
 * Shortcode: [ds_gallery] — renders ACF gallery on any single CPT
 *------------------------------------------------------------*/
add_shortcode('ds_gallery', function () {
  if (!function_exists('get_field')) return '';
  $gallery = get_field('gallery');
  if (!$gallery) return '';
  ob_start();
  echo '<div class="ds-gallery">';
  foreach ($gallery as $img) {
    echo '<figure class="ds-gallery-item"><img src="' . esc_url($img['sizes']['medium_large'] ?? $img['url']) . '" alt="' . esc_attr($img['alt']) . '" loading="lazy"></figure>';
  }
  echo '</div>';
  return ob_get_clean();
});

/*--------------------------------------------------------------
 * WooCommerce: mark listing tier from order
 * Buy "Enhanced Listing" product → linked drink/supplier/venue
 * gets tier=enhanced. Requires a hidden checkout field
 * "listing_id" populated via a form on the product page.
 *------------------------------------------------------------*/
add_action('woocommerce_order_status_completed', function ($order_id) {
  $order = wc_get_order($order_id);
  if (!$order) return;
  foreach ($order->get_items() as $item) {
    $listing_id = $item->get_meta('listing_id');
    if (!$listing_id) continue;
    $product = $item->get_product();
    if (!$product) continue;
    $sku = strtolower($product->get_sku() ?: $product->get_name());
    $tier = (strpos($sku, 'featured') !== false) ? 'featured' : ((strpos($sku, 'enhanced') !== false) ? 'enhanced' : '');
    if ($tier && function_exists('update_field')) {
      update_field('tier', $tier, intval($listing_id));
    }
  }
});
