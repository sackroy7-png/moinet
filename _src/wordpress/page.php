<?php
/* Pages sans gabarit dédié : panier, commande, mon compte, CGV, mentions légales, recettes… */
get_header(); ?>
<section class="section wp-content">
  <div class="wrap prose-wide">
    <?php while ( have_posts() ) : the_post(); ?>
      <h1><?php the_title(); ?></h1>
      <?php the_content(); ?>
    <?php endwhile; ?>
  </div>
</section>
<?php get_footer();
