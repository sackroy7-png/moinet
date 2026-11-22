<?php
/* Gabarit par défaut : articles, recettes, et toute page sans gabarit dédié. */
get_header(); ?>
<section class="section wp-content">
  <div class="wrap prose-wide">
    <?php if ( have_posts() ) : while ( have_posts() ) : the_post(); ?>
      <article <?php post_class(); ?>>
        <?php if ( is_singular() ) : ?>
          <h1><?php the_title(); ?></h1>
          <?php the_content(); ?>
        <?php else : ?>
          <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
          <?php the_excerpt(); ?>
        <?php endif; ?>
      </article>
    <?php endwhile; the_posts_pagination(); else : ?>
      <h1>Rien à afficher</h1>
      <p class="lead">Cette page est vide pour l’instant.</p>
    <?php endif; ?>
  </div>
</section>
<?php get_footer();
