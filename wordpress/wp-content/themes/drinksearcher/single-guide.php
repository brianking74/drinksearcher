<?php
/**
 * Single guide — renders the entries repeater with numbered cards
 * and a sidebar linking to other published guides.
 */
if (!defined('ABSPATH')) exit;
get_header();
the_post();
$topic = function_exists('get_field') ? get_field('topic') : '';
$all = new WP_Query(['post_type' => 'guide', 'posts_per_page' => -1, 'post_status' => 'publish']);
$topics = [];
if ($all->have_posts()) {
  foreach ($all->posts as $g) {
    $t = function_exists('get_field') ? (get_field('topic', $g->ID) ?: 'General') : 'General';
    $topics[$t][] = $g;
  }
}
?>
<section class="ds-section" style="padding-bottom:0">
  <div class="container" style="max-width:860px">
    <a class="muted" href="<?php echo esc_url(home_url('/')); ?>" style="font-size:.82rem">← Back to DrinkSearcher</a>
    <span class="ds-kicker" style="margin-top:16px"><?php echo esc_html($topic ?: 'Guide'); ?></span>
    <h1><?php the_title(); ?></h1>
    <?php if (has_excerpt()): ?><p class="ds-lead muted"><?php echo esc_html(get_the_excerpt()); ?></p><?php endif; ?>
  </div>
</section>

<section class="ds-section" style="padding-top:28px;border-bottom:0">
  <div class="container" style="display:grid;grid-template-columns:220px minmax(0,1fr);gap:40px" id="ds-guide-shell">
    <aside class="ds-panel" style="position:sticky;top:94px;align-self:start;padding:18px">
      <h4 style="font-family:var(--sans);font-size:.73rem;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin:0 0 14px">DrinkSearcher guides</h4>
      <?php foreach ($topics as $t => $guides): ?>
      <p style="font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin:14px 0 6px;border-top:1px solid var(--border);padding-top:12px"><?php echo esc_html($t); ?></p>
      <ul style="list-style:none;padding:0;margin:0">
        <?php foreach ($guides as $g): ?>
        <li><a class="<?php echo $g->ID === get_the_ID() ? 'ds-fresh' : 'muted'; ?>" style="display:block;padding:6px 8px;font-size:.84rem" href="<?php echo esc_url(get_permalink($g->ID)); ?>"><?php echo esc_html(get_the_title($g)); ?></a></li>
        <?php endforeach; ?>
      </ul>
      <?php endforeach; ?>
    </aside>
    <div>
      <?php if (get_the_content()): ?><div class="ds-prose" style="margin-bottom:32px"><?php the_content(); ?></div><?php endif; ?>
      <?php echo do_shortcode('[ds_guide_entries]'); ?>
      <div style="border-top:1px solid var(--border);padding-top:36px;margin-top:36px;text-align:center">
        <h3>See you up there</h3>
        <p class="muted" style="max-width:52ch;margin:0 auto 20px">Hong Kong's scene is always evolving. Bookmark this guide and check back as we update it.</p>
        <a class="ds-btn ds-btn-primary" href="<?php echo esc_url(home_url('/venues/')); ?>">Browse all venues →</a>
      </div>
    </div>
  </div>
</section>
<style>@media(max-width:860px){#ds-guide-shell{grid-template-columns:1fr!important}#ds-guide-shell aside{display:none}}</style>
<?php get_footer(); ?>
