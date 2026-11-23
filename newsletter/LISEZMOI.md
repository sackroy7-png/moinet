# Newsletter « Les boîtes Moinet pour les fêtes »

`fetes-2026.html` : e-mail prêt à importer dans Brevo, Mailchimp ou un autre outil d'e-mailing
(tableaux et styles en ligne, 600 px, version téléphone). Textes, prix, adresses et horaires
viennent du site actuel (prix relevés le 7 novembre 2026).

Avant l'envoi :
1. Importer les images de `img/` dans l'outil et remplacer les chemins `img/...` par leurs adresses.
2. Revérifier les prix sur confiserie-moinet.fr (surtout la réduction sur les sacs Vichy).
3. Remplacer `{{ unsubscribe }}` et `{{ mirror }}` par les balises de l'outil
   (Brevo : `{{ unsubscribe }}` et `{{ mirror }}` ; Mailchimp : `*|UNSUB|*` et `*|ARCHIVE|*`).
4. Objet proposé : « Les boîtes Moinet pour les fêtes ». Le texte d'aperçu est déjà dans l'e-mail.
5. N'envoyer qu'aux personnes qui ont accepté de recevoir la lettre (RGPD).
