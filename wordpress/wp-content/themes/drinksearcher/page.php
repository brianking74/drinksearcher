<?php
/**
 * Standard page.
 */
if (!defined('ABSPATH')) exit;
get_header();
the_post();
?>
<section class="ds-section">
  <div class="container" style="max-width:860px">
    <h1><?php the_title(); ?></h1>
    <div class="ds-prose"><?php the_content(); ?></div>
  </div>
</section>
<?php get_footer(); ?>
