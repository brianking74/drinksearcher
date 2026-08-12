<?php
/**
 * Footer template.
 */
if (!defined('ABSPATH')) exit;
?>
</main>
<footer class="ds-footer">
  <div class="container ds-footer-grid">
    <div class="ds-footer-brand">
      <a class="ds-logo" href="<?php echo esc_url(home_url('/')); ?>"><span>Drink</span>Searcher</a>
      <p>Compare drinks in stock across Hong Kong. Verified local availability, honest HK pricing, direct access to the suppliers, bars and events worth your time.</p>
    </div>
    <div>
      <h4>Explore</h4>
      <a href="<?php echo esc_url(home_url('/drinks/')); ?>">Drinks</a>
      <a href="<?php echo esc_url(home_url('/venues/')); ?>">Bars &amp; Restaurants</a>
      <a href="<?php echo esc_url(home_url('/events/')); ?>">Events</a>
      <a href="<?php echo esc_url(home_url('/suppliers/')); ?>">Suppliers</a>
    </div>
    <div>
      <h4>Guides</h4>
      <a href="<?php echo esc_url(home_url('/guides/')); ?>">All guides</a>
      <a href="<?php echo esc_url(home_url('/blog/')); ?>">Blog</a>
    </div>
    <div>
      <h4>Business</h4>
      <a href="<?php echo esc_url(home_url('/pricing/')); ?>">Pricing</a>
      <a href="<?php echo esc_url(home_url('/list-your-business/')); ?>">List your business</a>
      <a href="mailto:hello@drinksearcher.hk">Contact</a>
    </div>
  </div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
