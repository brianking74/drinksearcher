<?php
/**
 * Comments template.
 */
if (!defined('ABSPATH')) exit;
if (post_password_required()) return;
?>
<div id="comments">
  <?php if (have_comments()): ?>
  <h3><?php comments_number('No comments yet', '1 comment', '% comments'); ?></h3>
  <ul class="comment-list">
    <?php wp_list_comments(['style' => 'ul', 'avatar_size' => 0, 'short_ping' => true]); ?>
  </ul>
  <?php the_comments_navigation(); ?>
  <?php endif; ?>
  <?php
  comment_form([
    'title_reply' => 'Join the discussion',
    'comment_field' => '<p><textarea name="comment" rows="5" required placeholder="Your comment…"></textarea></p>',
    'fields' => [
      'author' => '<p><input type="text" name="author" placeholder="Name" required></p>',
      'email' => '<p><input type="email" name="email" placeholder="Email (not published)" required></p>',
    ],
    'class_submit' => 'submit',
    'label_submit' => 'Post comment',
  ]);
  ?>
</div>
