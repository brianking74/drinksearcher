<?php
/**
 * DrinkSearcher theme functions.
 */
if (!defined('ABSPATH')) exit;

add_action('after_setup_theme', function () {
  add_theme_support('title-tag');
  add_theme_support('post-thumbnails');
  add_theme_support('automatic-feed-links');
  add_theme_support('html5', ['search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script']);
  add_theme_support('custom-logo', ['height' => 44, 'width' => 200, 'flex-height' => true, 'flex-width' => true]);
  register_nav_menus(['primary' => 'Primary Menu', 'footer' => 'Footer Menu']);
  // Image sizes for cards/galleries
  add_image_size('ds-card', 600, 680, true);
  add_image_size('ds-hero', 1920, 1080, true);
});

add_action('wp_enqueue_scripts', function () {
  $ver = '1.0.0';
  // Fonts — same pairing as current site
  wp_enqueue_style('ds-fonts', 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap', [], null);
  wp_enqueue_style('ds-main', get_stylesheet_directory_uri() . '/assets/css/main.css', ['ds-fonts'], $ver);
  wp_enqueue_script('ds-directory', get_stylesheet_directory_uri() . '/assets/js/directory.js', [], $ver, true);
});

// Elementor compatibility: register theme builder locations
add_action('elementor/theme/register_locations', function ($elementor_theme_manager) {
  $elementor_theme_manager->register_all_core_location();
});

// Excerpt tweaks
add_filter('excerpt_length', function () { return 24; });
add_filter('excerpt_more', function () { return '…'; });

// Hide admin bar on front-end for cleaner screenshots/testing (admins can re-enable)
add_filter('show_admin_bar', function () { return current_user_can('manage_options') ? false : false; });

// Body classes for CPTs so CSS can target directory/single contexts
add_filter('body_class', function ($classes) {
  if (is_singular(['drink', 'venue', 'supplier', 'event', 'guide'])) $classes[] = 'ds-single-' . get_post_type();
  if (is_post_type_archive(['drink', 'venue', 'supplier', 'event', 'guide'])) $classes[] = 'ds-archive-' . get_query_var('post_type');
  return $classes;
});
