# VinX — site vitrine

Site de présentation de [VinX Ledger](https://github.com/HaitoDann/VinX-Ledger), le rail de
paiement léger. HTML et CSS statiques, sans étape de construction, avec la même charte que
l'interface web et l'application : IBM Plex, un seul accent vert, thèmes clair et sombre.

## Publication

Chaque push sur `main` publie le site sur GitHub Pages (`.github/workflows/pages.yml`).
Il faut l'activer une fois : **Settings → Pages → Source : GitHub Actions**.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | la page |
| `style.css` | la charte (mêmes couleurs que l'interface web) |
| `site.js` | thème, menu mobile, état du réseau en direct |
| `config.js` | adresse HTTPS d'un nœud du testnet (`VINX_API`) pour la section « Réseau » |
| `assets/` | logo et polices IBM Plex (licence OFL, `assets/fonts/OFL-IBM-Plex.txt`) |

## Voir en local

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

## Réseau en direct

Laisser `VINX_API` vide tant que le testnet n'est pas ouvert. Ensuite, y mettre l'adresse
HTTPS d'un nœud public. Le site étant en HTTPS, le nœud doit l'être aussi, derrière un proxy
qui ajoute `Access-Control-Allow-Origin: *` aux routes GET.
