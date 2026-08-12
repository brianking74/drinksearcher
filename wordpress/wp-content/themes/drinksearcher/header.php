<?php
/**
 * Header template.
 */
if (!defined('ABSPATH')) exit;
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php if (function_exists('wp_body_open')) wp_body_open(); ?>
<header class="ds-header">
  <div class="container ds-header-inner">
    <a class="ds-logo" href="<?php echo esc_url(home_url('/')); ?>">
      <?php
      if (has_custom_logo()) { the_custom_logo(); }
      else { echo '<span>Drink</span>Searcher'; }
      ?>
    </a>
    <nav class="ds-nav" aria-label="Primary">
      <?php
      wp_nav_menu([
        'theme_location' => 'primary',
        'container' => false,
        'items_wrap' => '%3$s',
        'fallback_cb' => function () {
          echo '<a href="' . esc_url(home_url('/drinks/')) . '">Drinks</a>';
          echo '<a href="' . esc_url(home_url('/venues/')) . '">Bars &amp; Restaurants</a>';
          echo '<a href="' . esc_url(home_url('/suppliers/')) . '">Suppliers</a>';
          echo '<a href="' . esc_url(home_url('/events/')) . '">Events</a>';
          echo '<a href="' . esc_url(home_url('/guides/')) . '">Guides</a>';
          echo '<a href="' . esc_url(home_url('/pricing/')) . '">Pricing</a>';
        },
      ]);
      ?>
      <a class="ds-btn ds-btn-primary" href="<?php echo esc_url(home_url('/list-your-business/')); ?>">List your business</a>
    </nav>
  </div>
</header>
<main id="ds-main">
