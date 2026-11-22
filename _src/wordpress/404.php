<?php get_header(); ?>
<section class="section wp-content">
  <div class="wrap">
    <h1>Cette page n’existe pas</h1>
    <p class="lead">L’adresse a peut-être changé. Retrouvez nos douceurs dans la boutique en ligne ou revenez à l’accueil.</p>
    <p class="hero-ctas"><a class="btn" href="<?php echo esc_url( moinet_url( 'boutique' ) ); ?>">Voir la boutique</a> <a class="btn btn--ghost" href="<?php echo esc_url( home_url( '/' ) ); ?>">Revenir à l’accueil</a></p>
  </div>
</section>
<?php get_footer();
