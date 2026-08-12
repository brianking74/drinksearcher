<?php
/**
 * Single supplier.
 */
if (!defined('ABSPATH')) exit;
get_header();
the_post();
$id = get_the_ID();
$f = function ($k) { return function_exists('get_field') ? get_field($k) : ''; };
$specialties = wp_get_post_terms($id, 'specialty', ['fields' => 'names']);
$districts = wp_get_post_terms($id, 'district', ['fields' => 'names']);
$whatsapp = preg_replace('/[^0-9]/', '', (string) $f('whatsapp'));

// Drinks linked to this supplier
$drinks = function_exists('get_field') ? get_posts([
  'post_type' => 'drink', 'posts_per_page' => 12,
  'meta_query' => [['key' => 'supplier_ref', 'value' => '"' . $id . '"', 'compare' => 'LIKE']],
]) : [];
?>
<section class="ds-section">
  <div class="container ds-single-hero">
    <div>
      <span class="ds-kicker"><?php echo esc_html(implode(' · ', $specialties)); ?><?php if ($districts) echo ' · ' . esc_html(implode(', ', $districts)); ?></span>
      <h1><?php the_title(); ?></h1>
      <?php echo ds_tier_badge($f('tier')); ?>
      <div class="ds-info-strip">
        <?php if ($f('delivery')): ?><div class="ds-info-chip"><span class="muted">Delivery</span><strong><?php echo esc_html($f('delivery')); ?></strong></div><?php endif; ?>
        <?php if ($f('min_order')): ?><div class="ds-info-chip"><span class="muted">Min. order</span><strong><?php echo esc_html($f('min_order')); ?></strong></div><?php endif; ?>
        <?php if ($f('payment')): ?><div class="ds-info-chip"><span class="muted">Payment</span><strong><?php echo esc_html($f('payment')); ?></strong></div><?php endif; ?>
      </div>
      <div class="ds-card-actions" style="margin-top:24px">
        <?php if ($f('website')): ?><a class="ds-btn ds-btn-primary" href="<?php echo esc_url($f('website')); ?>" target="_blank" rel="noopener">Visit supplier website</a><?php endif; ?>
        <?php if ($whatsapp): ?><a class="ds-btn ds-btn-ghost" href="https://wa.me/<?php echo esc_attr($whatsapp); ?>?text=<?php echo rawurlencode('Hi, I found you on DrinkSearcher and would like to enquire about your stock.'); ?>" target="_blank" rel="noopener">WhatsApp</a><?php endif; ?>
      </div>
      <?php if ($f('phone') || $f('address')): ?>
      <div class="ds-panel" style="margin-top:22px">
        <?php if ($f('phone')): ?><p class="muted" style="margin:0 0 6px">📞 <?php echo esc_html($f('phone')); ?></p><?php endif; ?>
        <?php if ($f('address')): ?><p class="muted" style="margin:0">📍 <?php echo esc_html($f('address')); ?></p><?php endif; ?>
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
    <span class="ds-kicker">Overview</span>
    <div class="ds-prose"><?php the_content(); ?></div>
  </div>
</section>
<?php endif; ?>

<?php if ($drinks): ?>
<section class="ds-section">
  <div class="container">
    <span class="ds-kicker">Catalogue</span>
    <h2>Bottles from this supplier</h2>
    <div class="ds-grid-3" style="margin-top:20px">
      <?php foreach ($drinks as $d): ?>
      <a class="ds-feature-card" href="<?php echo esc_url(get_permalink($d->ID)); ?>" style="min-height:240px">
        <?php if (has_post_thumbnail($d->ID)): ?><img src="<?php echo esc_url(get_the_post_thumbnail_url($d->ID, 'medium')); ?>" alt="" loading="lazy" style="object-fit:contain;background:#fff"><?php endif; ?>
        <div class="ds-feature-card-body">
          <span class="ds-kicker"><?php echo esc_html(function_exists('get_field') ? (get_field('price', $d->ID) ?: '') : ''); ?></span>
          <h3 style="font-size:1.3rem"><?php echo esc_html(get_the_title($d)); ?></h3>
        </div>
      </a>
      <?php endforeach; ?>
    </div>
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
<?php get_footer(); ?>
