<?php
/**
 * Single drink.
 */
if (!defined('ABSPATH')) exit;
get_header();
the_post();
$id = get_the_ID();
$price = function_exists('get_field') ? get_field('price') : '';
$abv = function_exists('get_field') ? get_field('abv') : '';
$size = function_exists('get_field') ? get_field('size') : '';
$buy = function_exists('get_field') ? get_field('buy_url') : '';
$tier = function_exists('get_field') ? get_field('tier') : '';
$supplier_ref = function_exists('get_field') ? get_field('supplier_ref') : null;
$supplier_name = $supplier_ref ? get_the_title($supplier_ref->ID) : (function_exists('get_field') ? get_field('supplier_name') : '');
$supplier_link = $supplier_ref ? get_permalink($supplier_ref->ID) : '';
$types = wp_get_post_terms($id, 'drink_type', ['fields' => 'names']);
$origins = wp_get_post_terms($id, 'origin', ['fields' => 'names']);
$districts = wp_get_post_terms($id, 'district', ['fields' => 'names']);
?>
<section class="ds-section">
  <div class="container ds-single-hero">
    <div>
      <span class="ds-kicker"><?php echo esc_html(implode(' · ', $types)); ?><?php if ($origins) echo ' · ' . esc_html(implode(', ', $origins)); ?></span>
      <h1><?php the_title(); ?></h1>
      <?php echo ds_tier_badge($tier); ?>
      <div class="ds-info-strip">
        <?php if ($price): ?><div class="ds-info-chip"><span class="muted">Price</span><strong><?php echo esc_html($price); ?></strong></div><?php endif; ?>
        <?php if ($abv): ?><div class="ds-info-chip"><span class="muted">ABV</span><strong><?php echo esc_html($abv); ?></strong></div><?php endif; ?>
        <?php if ($size): ?><div class="ds-info-chip"><span class="muted">Size</span><strong><?php echo esc_html($size); ?></strong></div><?php endif; ?>
        <?php if ($districts): ?><div class="ds-info-chip"><span class="muted">District</span><strong><?php echo esc_html(implode(', ', $districts)); ?></strong></div><?php endif; ?>
      </div>
      <div class="ds-card-actions" style="margin-top:24px">
        <?php if ($buy): ?><a class="ds-btn ds-btn-primary" href="<?php echo esc_url($buy); ?>" target="_blank" rel="noopener">Buy from supplier</a><?php endif; ?>
        <?php if ($supplier_link): ?><a class="ds-btn ds-btn-ghost" href="<?php echo esc_url($supplier_link); ?>">View supplier</a><?php endif; ?>
      </div>
    </div>
    <?php if (has_post_thumbnail()): ?>
    <div class="ds-single-hero-img"><?php the_post_thumbnail('large'); ?></div>
    <?php endif; ?>
  </div>
</section>

<?php if (get_the_content()): ?>
<section class="ds-section">
  <div class="container">
    <span class="ds-kicker">About this bottle</span>
    <div class="ds-prose"><?php the_content(); ?></div>
  </div>
</section>
<?php endif; ?>

<?php
$gallery = function_exists('get_field') ? get_field('gallery') : null;
if ($gallery):
?>
<section class="ds-section">
  <div class="container">
    <span class="ds-kicker">Gallery</span>
    <h2>Photos</h2>
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
