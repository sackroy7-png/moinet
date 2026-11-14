#!/usr/bin/env python3
"""Prépare les photos du site à partir des originaux de confiserie-moinet.fr.
Les fichiers WebP produits sont versionnés dans assets/img : ce script ne sert que si l'on veut
les régénérer. Il télécharge les originaux dans un dossier de travail (hors dépôt), puis les
redimensionne. Usage : python3 _src/images.py /chemin/vers/un/dossier/de/travail
Dépendance : Pillow."""
import pathlib, subprocess, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img"
UP = "https://confiserie-moinet.fr/wp-content/uploads/"

# sortie : (original, largeur max, recadrage largeur/hauteur ou None, qualité)
JOBS = {
    # mosaïque des spécialités
    "cat-pour-offrir.webp": ("DSC05732-scaled.jpg", 1300, None, 80),
    "cat-carreaux-vichy.webp": ("carreaux-vichy-rouge-bleu-moinet.jpg", 1300, None, 80),
    "cat-chocolats.webp": ("chocolats-moinet-vichy.jpg", 1100, None, 80),
    "cat-tablettes-de-chocolat.webp": ("DSC01443-1.jpg", 1200, None, 80),
    "cat-marrons-glaces.webp": ("DSC07072-2-scaled.jpg", 1200, None, 80),
    "cat-pate-de-fruits.webp": ("confiserie-moinet.fr-pates-de-fruits-pulpe-2.jpg", 800, None, 82),
    "cat-bicentenaire-de-la-pastille.webp": ("vichy-pastilles-moinet-.jpg", 1000, None, 82),
    # bandeaux 1920x600 : on garde le centre, au format 2:1
    "cat-pastilles.webp": ("confiserie-moinet.fr-pastilles.jpg", 1200, 2.0, 78),
    "cat-bonbons-glaces.webp": ("bonbons_glaces.jpg", 1200, 2.0, 78),
    "cat-caramels-nougats.webp": ("confiserie-moinet.fr-caramels.jpg", 1200, 2.0, 78),
    "cat-gels-de-fruits.webp": ("confiserie-moinet.fr-gels_de_fruit.jpg", 1200, 2.0, 78),
    "cat-gommes.webp": ("confiserie-moinet.fr-gommes.jpg", 1200, 2.0, 78),
    "cat-pralines.webp": ("confiserie-moinet.fr-pralines.jpg", 1200, 2.0, 78),
    "cat-sucres-cuits.webp": ("confiserie-moinet.fr-sucres_cuits.jpg", 1200, 2.0, 78),
    # savoir-faire, maison
    "savoir-2.webp": ("confiserie-moinet.fr-savoir_faire_2.jpg", 1500, None, 80),
    "savoir-3.webp": ("confiserie-moinet.fr-savoir_faire_3.jpg", 1500, None, 80),
    "maison-4.webp": ("confiserie-moinet.fr-maison_moinet_4.jpg", 1500, None, 80),
    # devantures
    "shop-vichy.webp": ("confiserie-moinet.fr-vichy_confiseriemoinet.jpg", 1200, None, 80),
    "shop-cotesucre.webp": ("confiserie-moinet.fr-vichy_cotesucre.jpg", 1200, None, 80),
    "shop-glaces.webp": ("confiserie-moinet.fr-vichy_galerie-des-glaces.jpg", 1200, None, 80),
    "shop-clermont.webp": ("confiserie-moinet.fr-clermont.jpg", 1200, None, 80),
    "shop-paris.webp": ("confiserie-moinet.fr-paris.jpg", 1200, None, 80),
    # archives et griffe
    **{f"histoire-{i}.webp": (f"confiserie-moinet.fr-histoire_{i}.jpg", 1300, None, 78) for i in range(1, 7)},
    **{f"identite-{i}.webp": (f"confiserie-moinet.fr-identite_visuelle_{i}.jpg", 1100, None, 82) for i in range(1, 7)},
    "gravures.webp": ("confiserie-moinet.fr-histoire_bandeau.jpg", 2000, None, 80),
}


def main(work):
    work = pathlib.Path(work); work.mkdir(parents=True, exist_ok=True)
    for out, (src, width, ratio, quality) in JOBS.items():
        f = work / src
        if not f.exists():
            subprocess.run(["curl", "-sS", "-m", "120", "-o", str(f), UP + src], check=True)
        im = Image.open(f).convert("RGB")
        if ratio:                                   # recadrage centré
            w, h = im.size
            cw = min(w, round(h * ratio))
            im = im.crop(((w - cw) // 2, 0, (w - cw) // 2 + cw, h))
        if im.size[0] > width:
            im = im.resize((width, round(im.size[1] * width / im.size[0])), Image.LANCZOS)
        im.save(OUT / out, "WEBP", quality=quality, method=6)
        print(f"{out:44s} {im.size[0]}x{im.size[1]} {(OUT / out).stat().st_size // 1024} ko")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "/tmp/moinet-originaux")
