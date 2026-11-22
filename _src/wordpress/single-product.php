<?php
/**
 * Fiche produit : le catalogue (assets/js/catalogue.js) la remplace par la fiche de la famille du
 * produit, avec ses déclinaisons, la quantité et le total. Ce qui suit sert sans JavaScript et aux
 * moteurs de recherche.
 */
get_header();
while ( have_posts() ) : the_post();
	$product = wc_get_product( get_the_ID() ); ?>
<div class="fiche-page" data-fiche data-product="<?php the_ID(); ?>">
  <div class="wrap">
    <?php if ( function_exists( 'woocommerce_breadcrumb' ) ) : ?>
      <nav class="breadcrumb" aria-label="Fil d’Ariane"><?php woocommerce_breadcrumb( array( 'delimiter' => ' / ', 'wrap_before' => '<ol><li>', 'wrap_after' => '</li></ol>', 'before' => '', 'after' => '' ) ); ?></nav>
    <?php endif; ?>
    <div class="fiche">
      <div class="fiche-media"><div class="fiche-frame"><?php echo $product ? $product->get_image( 'woocommerce_single' ) : ''; ?></div></div>
      <div class="fiche-info">
        <h1><?php the_title(); ?></h1>
        <?php if ( $product ) : ?>
          <p class="fiche-price"><span class="price"><?php echo wp_kses_post( $product->get_price_html() ); ?></span></p>
          <?php if ( $product->is_purchasable() && $product->is_in_stock() ) : ?>
            <a class="btn fiche-add" rel="nofollow" href="<?php echo esc_url( $product->add_to_cart_url() ); ?>">Ajouter au panier</a>
          <?php else : ?>
            <p class="fiche-meta">Épuisé</p>
          <?php endif; ?>
        <?php endif; ?>
        <div class="fiche-description"><?php the_content(); ?></div>
      </div>
    </div>
  </div>
</div>
<?php endwhile;
get_footer();
