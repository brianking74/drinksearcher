<?php
/**
 * Single blog post.
 */
if (!defined('ABSPATH')) exit;
get_header();
the_post();
?>
<section class="ds-section">
  <div class="container" style="max-width:760px">
    <span class="ds-kicker"><?php echo esc_html(get_the_date('j M Y')); ?></span>
    <h1><?php the_title(); ?></h1>
    <?php if (has_post_thumbnail()): ?><p style="margin:20px 0"><?php the_post_thumbnail('large', ['style' => 'border-radius:8px']); ?></p><?php endif; ?>
    <div class="ds-prose"><?php the_content(); ?></div>
  </div>
</section>
<?php if (comments_open()): ?>
<section class="ds-section">
  <div class="container ds-comments">
    <?php comments_template(); ?>
  </div>
</section>
<?php endif; ?>
<?php get_footer(); ?>
