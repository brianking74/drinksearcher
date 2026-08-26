<?php
/**
 * Single event.
 */
if (!defined('ABSPATH')) exit;
get_header();
the_post();
$id = get_the_ID();
$f = function ($k) { return function_exists('get_field') ? get_field($k) : ''; };
$types = wp_get_post_terms($id, 'event_type', ['fields' => 'names']);
$districts = wp_get_post_terms($id, 'district', ['fields' => 'names']);
$venue_ref = $f('venue_ref');
$venue_name = $venue_ref ? get_the_title($venue_ref->ID) : $f('venue_name');
?>
<section class="ds-section">
  <div class="container" style="max-width:860px">
    <span class="ds-kicker"><?php echo esc_html(implode(' · ', $types)); ?><?php if ($districts) echo ' · ' . esc_html(implode(', ', $districts)); ?></span>
    <h1><?php the_title(); ?></h1>
    <div class="ds-info-strip">
      <?php if ($f('event_date')): ?><div class="ds-info-chip"><span class="muted">When</span><strong><?php echo esc_html($f('event_date')); ?></strong></div><?php endif; ?>
      <?php if ($venue_name): ?><div class="ds-info-chip"><span class="muted">Venue</span><strong><?php echo esc_html($venue_name); ?></strong></div><?php endif; ?>
      <?php if ($f('price')): ?><div class="ds-info-chip"><span class="muted">Price</span><strong><?php echo esc_html($f('price')); ?></strong></div><?php endif; ?>
    </div>
    <div class="ds-card-actions" style="margin:24px 0">
      <?php if ($f('ticket_url')): ?><a class="ds-btn ds-btn-primary" href="<?php echo esc_url($f('ticket_url')); ?>" target="_blank" rel="noopener">Tickets / RSVP</a><?php endif; ?>
      <?php if ($venue_ref): ?><a class="ds-btn ds-btn-ghost" href="<?php echo esc_url(get_permalink($venue_ref->ID)); ?>">View venue</a><?php endif; ?>
    </div>
    <?php if (has_post_thumbnail()): ?>
    <p><?php the_post_thumbnail('large', ['style' => 'border-radius:8px']); ?></p>
    <?php endif; ?>
    <div class="ds-prose"><?php the_content(); ?></div>
  </div>
</section>
<?php get_footer(); ?>
