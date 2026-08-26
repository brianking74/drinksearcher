<?php
/**
 * Fallback template.
 */
if (!defined('ABSPATH')) exit;
get_header();
?>
<section class="ds-section">
  <div class="container">
    <?php if (have_posts()): while (have_posts()): the_post(); ?>
      <article <?php post_class(); ?>>
        <span class="ds-kicker"><?php echo esc_html(get_post_type()); ?></span>
        <h1><?php the_title(); ?></h1>
        <div class="ds-prose"><?php the_content(); ?></div>
      </article>
    <?php endwhile; else: ?>
      <div class="ds-empty"><h3>Nothing here yet.</h3><p>Check back soon.</p></div>
    <?php endif; ?>
  </div>
</section>
<?php get_footer(); ?>
