<?php
/**
 * Front page.
 * Hero video: set a Featured Image or add hero video URL via customizer later;
 * edit this page with Elementor to restructure freely.
 */
if (!defined('ABSPATH')) exit;
get_header();

// Hero video URL — filterable so you can change it in one place (or via Elementor later)
$hero_video = apply_filters('ds_hero_video', 'https://res.cloudinary.com/rqokncht/video/upload/v1785202887/HK_Timelapse_1_apqrq9.mp4');
?>
<section class="ds-hero">
  <?php if ($hero_video): ?>
  <video autoplay muted loop playsinline preload="metadata" src="<?php echo esc_url($hero_video); ?>"></video>
  <?php elseif (has_post_thumbnail()): ?>
  <img class="ds-hero-img" src="<?php echo esc_url(get_the_post_thumbnail_url(null, 'ds-hero')); ?>" alt="">
  <?php endif; ?>
  <div class="container">
    <span class="ds-kicker">Hong Kong drinks discovery</span>
    <h1>Compare drinks in stock across Hong Kong.</h1>
    <p class="ds-lead">Verified local availability. Honest HK pricing. Direct access to the suppliers, bars and events worth your time.</p>
    <div class="ds-hero-actions">
      <a class="ds-btn ds-btn-primary" href="<?php echo esc_url(home_url('/drinks/')); ?>">Compare drinks →</a>
      <a class="ds-btn ds-btn-ghost" href="<?php echo esc_url(home_url('/venues/')); ?>">Find bars tonight</a>
      <a class="ds-btn ds-btn-ghost" href="<?php echo esc_url(home_url('/events/')); ?>">Explore events</a>
    </div>
  </div>
</section>

<div class="ds-trust">
  <div class="ds-trust-cell"><strong>Verified HK stock</strong><span>Local availability, not overseas listings</span></div>
  <div class="ds-trust-cell"><strong>Honest HK pricing</strong><span>Compare in Hong Kong dollars</span></div>
  <div class="ds-trust-cell"><strong>Direct access</strong><span>Go straight to supplier or venue</span></div>
  <div class="ds-trust-cell"><strong><?php echo wp_count_posts('drink')->publish; ?>+</strong><span>Bottles indexed in the directory</span></div>
  <div class="ds-trust-cell"><strong><?php echo wp_count_posts('supplier')->publish; ?></strong><span>Hong Kong suppliers indexed</span></div>
  <div class="ds-trust-cell"><strong><?php echo wp_count_posts('venue')->publish; ?></strong><span>Venues in discovery</span></div>
</div>

<section class="ds-section">
  <div class="container">
    <div class="ds-section-head">
      <div><span class="ds-kicker">Curated Hong Kong guides</span><h2>Decide faster. Drink better.</h2></div>
      <a class="ds-btn ds-btn-ghost" href="<?php echo esc_url(home_url('/guides/')); ?>">All guides</a>
    </div>
    <div class="ds-grid-3">
      <?php
      $guides = new WP_Query(['post_type' => 'guide', 'posts_per_page' => 3, 'post_status' => 'publish']);
      if ($guides->have_posts()): while ($guides->have_posts()): $guides->the_post();
      ?>
      <a class="ds-feature-card" href="<?php the_permalink(); ?>">
        <?php if (has_post_thumbnail()): ?><img src="<?php echo esc_url(get_the_post_thumbnail_url(null, 'large')); ?>" alt="" loading="lazy"><?php endif; ?>
        <div class="ds-feature-card-body">
          <span class="ds-kicker"><?php echo esc_html(function_exists('get_field') ? (get_field('topic') ?: 'Guide') : 'Guide'); ?></span>
          <h3><?php the_title(); ?></h3>
        </div>
      </a>
      <?php endwhile; wp_reset_postdata(); else: ?>
      <p class="muted">Guides coming soon.</p>
      <?php endif; ?>
    </div>
  </div>
</section>

<section class="ds-section">
  <div class="container">
    <div class="ds-section-head">
      <div><span class="ds-kicker">Featured</span><h2>This week in the directory</h2></div>
      <a class="ds-btn ds-btn-ghost" href="<?php echo esc_url(home_url('/drinks/')); ?>">Browse all drinks</a>
    </div>
    <div class="ds-grid-3">
      <?php
      $drinks = new WP_Query(['post_type' => 'drink', 'posts_per_page' => 3, 'meta_key' => 'tier', 'meta_value' => 'featured']);
      if (!$drinks->have_posts()) $drinks = new WP_Query(['post_type' => 'drink', 'posts_per_page' => 3]);
      if ($drinks->have_posts()): while ($drinks->have_posts()): $drinks->the_post();
        $price = function_exists('get_field') ? get_field('price') : '';
      ?>
      <a class="ds-feature-card" href="<?php the_permalink(); ?>">
        <?php if (has_post_thumbnail()): ?><img src="<?php echo esc_url(get_the_post_thumbnail_url(null, 'large')); ?>" alt="" loading="lazy"><?php endif; ?>
        <div class="ds-feature-card-body">
          <span class="ds-kicker"><?php echo esc_html($price ?: 'Featured'); ?></span>
          <h3><?php the_title(); ?></h3>
        </div>
      </a>
      <?php endwhile; wp_reset_postdata(); endif; ?>
    </div>
  </div>
</section>
<?php get_footer(); ?>
