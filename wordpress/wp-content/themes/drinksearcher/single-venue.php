<?php
/**
 * Single venue.
 */
if (!defined('ABSPATH')) exit;
get_header();
the_post();
$id = get_the_ID();
$f = function ($k) { return function_exists('get_field') ? get_field($k) : ''; };
$types = wp_get_post_terms($id, 'venue_type', ['fields' => 'names']);
$districts = wp_get_post_terms($id, 'district', ['fields' => 'names']);
?>
<section class="ds-section">
  <div class="container ds-single-hero">
    <div>
      <span class="ds-kicker"><?php echo esc_html(implode(' · ', $types)); ?><?php if ($districts) echo ' · ' . esc_html(implode(', ', $districts)); ?></span>
      <h1><?php the_title(); ?></h1>
      <?php echo ds_tier_badge($f('tier')); ?>
      <div class="ds-info-strip">
        <?php if ($f('rating')): ?><div class="ds-info-chip"><span class="muted">Rating</span><strong>★ <?php echo esc_html($f('rating')); ?></strong></div><?php endif; ?>
        <?php if ($f('price_band')): ?><div class="ds-info-chip"><span class="muted">Price</span><strong><?php echo esc_html($f('price_band')); ?></strong></div><?php endif; ?>
        <?php if ($f('mtr')): ?><div class="ds-info-chip"><span class="muted">MTR</span><strong><?php echo esc_html($f('mtr')); ?></strong></div><?php endif; ?>
        <?php if ($f('booking')): ?><div class="ds-info-chip"><span class="muted">Booking</span><strong><?php echo esc_html($f('booking')); ?></strong></div><?php endif; ?>
      </div>
      <div class="ds-card-actions" style="margin-top:24px">
        <?php if ($f('website')): ?><a class="ds-btn ds-btn-primary" href="<?php echo esc_url($f('website')); ?>" target="_blank" rel="noopener"><?php echo $f('booking') ? 'Book via ' . esc_html($f('booking')) : 'Visit website'; ?></a><?php endif; ?>
        <a class="ds-btn ds-btn-ghost" href="https://www.google.com/maps/search/?api=1&query=<?php echo rawurlencode(get_the_title() . ' ' . implode(' ', $districts) . ' Hong Kong'); ?>" target="_blank" rel="noopener">Directions</a>
      </div>
      <?php if ($f('phone') || $f('address') || $f('hours')): ?>
      <div class="ds-panel" style="margin-top:22px">
        <?php if ($f('phone')): ?><p class="muted" style="margin:0 0 6px">📞 <?php echo esc_html($f('phone')); ?></p><?php endif; ?>
        <?php if ($f('address')): ?><p class="muted" style="margin:0 0 6px">📍 <?php echo esc_html($f('address')); ?></p><?php endif; ?>
        <?php if ($f('hours')): ?><p class="muted" style="margin:0;white-space:pre-line">🕐 <?php echo esc_html($f('hours')); ?></p><?php endif; ?>
      </div>
      <?php endif; ?>
    </div>
    <?php if (has_post_thumbnail()): ?>
    <div class="ds-single-hero-img" style="background:transparent;padding:0"><img src="<?php echo esc_url(get_the_post_thumbnail_url(null, 'large')); ?>" alt="<?php the_title_attribute(); ?>" style="border-radius:8px;max-height:420px;object-fit:cover;width:100%"></div>
    <?php endif; ?>
  </div>
</section>

<?php if (get_the_content()): ?>
<section class="ds-section">
  <div class="container">
    <span class="ds-kicker">About</span>
    <div class="ds-prose"><?php the_content(); ?></div>
  </div>
</section>
<?php endif; ?>

<?php
// Drinks stocked at this venue's linked suppliers could go here later.
$gallery = function_exists('get_field') ? get_field('gallery') : null;
if ($gallery):
?>
<section class="ds-section">
  <div class="container">
    <span class="ds-kicker">Gallery</span>
    <h2>Photos of this venue</h2>
    <div class="ds-gallery">
      <?php foreach ($gallery as $img): ?>
      <figure class="ds-gallery-item"><img src="<?php echo esc_url($img['sizes']['medium_large'] ?? $img['url']); ?>" alt="<?php echo esc_attr($img['alt']); ?>" loading="lazy"></figure>
      <?php endforeach; ?>
    </div>
  </div>
</section>
<?php endif; ?>

<?php if (comments_open()): ?>
<section class="ds-section">
  <div class="container ds-comments">
    <?php comments_template(); ?>
  </div>
</section>
<?php endif; ?>
<?php get_footer(); ?>
