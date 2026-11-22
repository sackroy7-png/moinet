<?php
/**
 * Maison Moinet — fonctions du thème.
 * Les gabarits (header.php, footer.php, front-page.php, page-*.php, archive-product.php) sont générés
 * depuis la maquette par _src/wordpress.py : modifier la maquette, puis relancer le script.
 */
defined( 'ABSPATH' ) || exit;

const MOINET_VERSION = '1.0.0';

add_action( 'after_setup_theme', function () {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script' ) );
	add_theme_support( 'woocommerce' );
} );

/** Adresses du site utilisées par les gabarits. */
function moinet_url( $key, $suffix = '' ) {
	switch ( $key ) {
		case 'maison':       $url = home_url( '/maison-moinet/' ); break;
		case 'savoir-faire': $url = home_url( '/notre-savoir-faire/' ); break;
		case 'magasins':     $url = home_url( '/nos-magasins/' ); break;
		case 'contact':      $url = home_url( '/nous-contacter/' ); break;
		case 'boutique':
			$url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/boutique-en-ligne/' );
			break;
		default:             $url = home_url( '/' );
	}
	if ( $suffix && '?' === $suffix[0] && false !== strpos( $url, '?' ) ) {
		$suffix = '&' . substr( $suffix, 1 );
	}
	return $url . $suffix;
}

/** Rubrique de la page courante, pour souligner l'entrée du menu. */
function moinet_section() {
	if ( is_front_page() ) return 'accueil';
	if ( function_exists( 'is_woocommerce' ) && ( is_woocommerce() || is_cart() || is_checkout() ) ) return 'boutique';
	foreach ( array( 'maison-moinet' => 'maison', 'histoire-de-la-maison' => 'maison', 'notre-savoir-faire' => 'savoir-faire', 'nos-magasins' => 'magasins', 'nous-contacter' => 'contact' ) as $slug => $key ) {
		if ( is_page( $slug ) ) return $key;
	}
	return '';
}
function moinet_current( $key ) {
	if ( moinet_section() === $key ) echo ' aria-current="page"';
}
function moinet_asset( $path ) {
	return get_theme_file_uri( 'assets/' . $path );
}

/** Pages qui affichent le catalogue (boutique, fiches, scène des parfums de l'accueil). */
function moinet_needs_catalogue() {
	return is_front_page() || ( function_exists( 'is_woocommerce' ) && ( is_shop() || is_product_taxonomy() || is_product() ) );
}
/** Gabarits du thème qui remplacent l'affichage WooCommerce (sa feuille de style n'y sert pas). */
function moinet_own_shop_template() {
	return is_front_page() || ( function_exists( 'is_woocommerce' ) && ( is_shop() || is_product_taxonomy() || is_product() ) );
}

add_action( 'wp_enqueue_scripts', function () {
	$v = MOINET_VERSION;
	wp_enqueue_style( 'moinet', moinet_asset( 'css/main.css' ), array(), $v );
	$js = function ( $handle, $file, $deps = array() ) use ( $v ) {
		wp_enqueue_script( $handle, moinet_asset( $file ), $deps, $v, array( 'in_footer' => true, 'strategy' => 'defer' ) );
	};
	$js( 'moinet-main', 'js/main.js' );
	$js( 'moinet-motion', 'js/motion.js' );
	if ( moinet_needs_catalogue() ) {
		$js( 'moinet-offre', 'data/offre.js' );
		$js( 'moinet-catalogue', 'js/catalogue.js', array( 'moinet-offre' ) );
		$wc = function_exists( 'wc_get_cart_url' );
		wp_add_inline_script( 'moinet-offre', 'window.MOINET_WP=' . wp_json_encode( array(
			'home'  => home_url( '/' ),
			'shop'  => moinet_url( 'boutique' ),
			'cart'  => $wc ? wc_get_cart_url() : home_url( '/panier/' ),
			'store' => rest_url( 'wc/store/v1/' ),
		) ) . ';', 'before' );
	}
	if ( is_front_page() || is_page( 'notre-savoir-faire' ) ) {
		$js( 'moinet-pastille', 'js/pastille.js' );
	}
	$js( 'moinet-immersif', 'js/immersif.js', array( 'moinet-motion' ) );
	$js( 'moinet-mesure', 'js/mesure.js' );
	$ga4 = trim( (string) get_theme_mod( 'moinet_ga4', '' ) );
	if ( preg_match( '/^G-[A-Z0-9]{4,}$/', $ga4 ) ) {
		wp_add_inline_script( 'moinet-mesure', 'window.MOINET_GA4=' . wp_json_encode( $ga4 ) . ';', 'before' );
	}
}, 20 );

/* La feuille de style WooCommerce reste pour le panier, la commande et le compte, pas sur nos gabarits. */
add_filter( 'woocommerce_enqueue_styles', function ( $styles ) {
	return moinet_own_shop_template() ? array() : $styles;
} );

/* Avant tout rendu : animations autorisées, ouverture en octogone une fois par visite ; polices préchargées. */
add_action( 'wp_head', function () {
	echo '<script>try{var d=document.documentElement;if(!matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("motion");if(!sessionStorage.getItem("moinet-intro")){d.classList.add("intro");sessionStorage.setItem("moinet-intro","1")}}}catch(e){}</script>' . "\n";
	foreach ( array( 'bodoni-moda-latin-opsz-normal.woff2', 'jost-latin-wght-normal.woff2' ) as $font ) {
		printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url( moinet_asset( 'fonts/' . $font ) ) );
	}
	echo '<meta name="theme-color" content="#d71535">' . "\n";
	if ( is_front_page() ) {
		printf( '<link rel="preload" as="image" href="%1$s" imagesrcset="%2$s 900w, %3$s 1400w, %1$s 2000w" imagesizes="100vw" fetchpriority="high">' . "\n",
			esc_url( moinet_asset( 'img/hero.webp' ) ), esc_url( moinet_asset( 'img/hero-900.webp' ) ), esc_url( moinet_asset( 'img/hero-1400.webp' ) ) );
	}
}, 1 );

/* Icône du site si aucune n'est réglée dans WordPress. */
add_action( 'wp_head', function () {
	if ( ! has_site_icon() ) {
		printf( '<link rel="icon" href="%s" type="image/png">' . "\n", esc_url( moinet_asset( 'img/favicon.png' ) ) );
	}
} );

/* Personnaliser > Mesure d'audience : identifiant Google Analytics 4 (G-XXXXXXXXXX). Vide = rien n'est chargé. */
add_action( 'customize_register', function ( $wp_customize ) {
	$wp_customize->add_section( 'moinet_mesure', array(
		'title'       => 'Mesure d’audience',
		'description' => 'Identifiant de la propriété Google Analytics 4 de la Maison Moinet. Tant qu’il est vide, ni Google Analytics ni le bandeau de cookies ne sont chargés.',
		'priority'    => 160,
	) );
	$wp_customize->add_setting( 'moinet_ga4', array(
		'default'           => '',
		'sanitize_callback' => function ( $value ) {
			$value = strtoupper( trim( (string) $value ) );
			return preg_match( '/^G-[A-Z0-9]{4,}$/', $value ) ? $value : '';
		},
	) );
	$wp_customize->add_control( 'moinet_ga4', array(
		'label'   => 'Identifiant GA4',
		'section' => 'moinet_mesure',
		'type'    => 'text',
		'input_attrs' => array( 'placeholder' => 'G-XXXXXXXXXX' ),
	) );
} );

/* Boutique : toutes les fiches sur une page pour la version sans JavaScript (le catalogue les regroupe ensuite). */
add_action( 'pre_get_posts', function ( $q ) {
	if ( ! is_admin() && $q->is_main_query() && ( $q->is_post_type_archive( 'product' ) || $q->is_tax( 'product_cat' ) ) ) {
		$q->set( 'posts_per_page', 200 );
	}
} );

/* Les émojis s'affichent nativement : pas de script ni d'images chargés depuis wordpress.org. */
add_action( 'init', function () {
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
	remove_action( 'admin_print_styles', 'print_emoji_styles' );
	remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
	remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
	remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );
} );
