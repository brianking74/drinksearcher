<?php
/**
 * Archive template for drinks, venues, suppliers, events.
 * Uses the [ds_directory] shortcode so one filter UI covers all.
 */
if (!defined('ABSPATH')) exit;
get_header();
$pt = get_query_var('post_type');
$labels = [
  'drink' => ['Drinks marketplace', 'Compare local bottles, seller by seller.', 'Search indexed Hong Kong stock, compare pricing and move directly to a local supplier.'],
  'venue' => ['Bars & restaurants', 'Where to drink tonight.', 'Search Hong Kong\'s bars by district, category and vibe.'],
  'supplier' => ['Hong Kong suppliers', 'Buy locally, with fewer dead ends.', 'Compare specialist merchants by stock, delivery, pickup and category.'],
  'event' => ['Drinks events', 'Tastings, launches and guest shifts.', 'What\'s on across Hong Kong\'s drinks scene.'],
  'guide' => ['Guides', 'Curated Hong Kong guides.', 'Decide faster. Drink better.'],
];
$L = $labels[$pt] ?? ['Directory', '', ''];
?>
<section class="ds-section" style="padding-bottom:0">
  <div class="container">
    <span class="ds-kicker"><?php echo esc_html($L[1]); ?></span>
    <h1><?php echo esc_html($L[0]); ?></h1>
    <p class="ds-lead muted" style="max-width:68ch"><?php echo esc_html($L[2]); ?></p>
  </div>
</section>
<section class="ds-section" style="padding-top:0;border-bottom:0">
  <div class="container">
    <?php if ($pt === 'guide'): ?>
      <div class="ds-grid-3">
        <?php if (have_posts()): while (have_posts()): the_post(); ?>
        <a class="ds-feature-card" href="<?php the_permalink(); ?>">
          <?php if (has_post_thumbnail()): ?><img src="<?php echo esc_url(get_the_post_thumbnail_url(null, 'large')); ?>" alt="" loading="lazy"><?php endif; ?>
          <div class="ds-feature-card-body">
            <span class="ds-kicker"><?php echo esc_html(function_exists('get_field') ? (get_field('topic') ?: 'Guide') : 'Guide'); ?></span>
            <h3><?php the_title(); ?></h3>
          </div>
        </a>
        <?php endwhile; endif; ?>
      </div>
    <?php else: ?>
      <?php echo do_shortcode('[ds_directory type="' . esc_attr($pt) . '"]'); ?>
    <?php endif; ?>
  </div>
</section>
<?php get_footer(); ?>
