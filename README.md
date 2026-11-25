# Kégué Billetterie 3D · V2

Billetterie 3D du **Stade de Kégué** (Lomé, Togo), centrée sur le stade lui-même. On survole le stade, on voit le prix et les places restantes de chaque tribune, la caméra plonge dans le bloc choisi, on regarde le terrain **depuis son propre siège** avant de payer, puis on règle par **T-Money ou Flooz** et on reçoit un e-billet de place avec QR code.

**Démo en ligne : https://kegue-tickets-3d.vercel.app**
Mode démonstration automatique (pour les vidéos) : https://kegue-tickets-3d.vercel.app/?demo=1

> Concept indépendant, non officiel. Aucun lien avec la Fédération togolaise de football ni avec la gestion du stade. Les prix et les disponibilités sont fictifs, et aucun paiement réel n'est effectué.

**Nouveau dans la V2 :** une direction visuelle inspirée du travail d'Ascenta Studio. La vue aérienne passe en mode nocturne : fond noir, sièges auto-éclairés en blanc bleuté avec halo lumineux (bloom), tribune d'honneur et loges en orange chaud, numéros de blocs en texte fin autour du stade. Dès que la caméra plonge vers un bloc, l'éclairage bascule en rendu « studio ». Sièges modélisés avec accoudoirs aux couleurs de chaque catégorie, loges VIP orangées et lumineuses, panneaux LED anthracite qui affichent les prix directement dans la 3D, contour pointillé et étiquette du bloc survolé, siège choisi qui s'illumine en ambre, plongées de caméra avec flou de mouvement et interface plus discrète (barre de réservation en pilule sur ordinateur). Le mode démonstration choisit maintenant toujours la même place (Honneur 1D, rang 7, sièges 9 et 10) : vidéos et captures restent cohérentes entre ordinateur et mobile.

La première version reste disponible sur le tag `v1` : https://github.com/Donchaminade/kegue-tickets-3d/tree/v1

![Vue aérienne du stade](screenshots/desktop-1-aerial.jpg)

Vidéo du parcours complet (16:9) : [video/kegue-billetterie-3d-1920x1080-web.mp4](video/kegue-billetterie-3d-1920x1080-web.mp4)

Version verticale (9:16) : [video/kegue-billetterie-3d-1080x1920-web.mp4](video/kegue-billetterie-3d-1080x1920-web.mp4)

## ⭐ Star & Fork

Si le projet te plaît, laisse une **⭐ Star** et fais un **Fork** pour l'adapter à ton stade, ton club ou ton événement. Ça m'aide énormément à continuer à partager ce genre de projets.

## Ce que fait l'application

| | |
|---|---|
| **Vue aérienne 3D** | Le stade entier, librement orientable (glisser pour tourner, molette ou pincement pour zoomer). |
| **Survol des tribunes** | Prix, catégorie et places restantes de chaque bloc, mis à jour en direct (ventes simulées). |
| **Vol vers le bloc** | Un clic sur une tribune et la caméra s'y rend en douceur. Le plan des sièges s'ouvre. |
| **Vue depuis le siège** | La caméra se place à hauteur des yeux sur le siège choisi. On peut regarder autour avant de réserver. |
| **Loges VIP** | Huit loges vitrées sous la tribune d'honneur, accessibles en un clic. |
| **Paiement Mobile Money** | Récapitulatif, choix du nombre de places côte à côte, T-Money ou Flooz, confirmation sur téléphone (simulée). |
| **E-billet** | Billet de place avec stade, catégorie, bloc, rang, siège, porte d'accès, prix, référence et QR code, téléchargeable en image. |

Catégories de la démo : Loges VIP (50 000 FCFA), Tribune d'honneur (15 000 FCFA), Tribunes latérales (5 000 FCFA), Virages populaires (2 000 FCFA).

## Captures

### Ordinateur

| Survol d'une tribune | Choix du siège |
|---|---|
| ![Survol](screenshots/desktop-2-hover.jpg) | ![Choix du siège](screenshots/desktop-4-seat-selected.jpg) |
| **Vue depuis le siège** | **Loges VIP** |
| ![Vue depuis le siège](screenshots/desktop-5-seat-view.jpg) | ![Loges VIP](screenshots/desktop-10-loges.jpg) |
| **Paiement T-Money / Flooz** | **E-billet avec QR code** |
| ![Paiement](screenshots/desktop-7-payment.jpg) | ![E-billet](screenshots/desktop-9-ticket.jpg) |

### Mobile (390 × 844)

| Stade | Plan du bloc | Vue du siège | Paiement | E-billet |
|---|---|---|---|---|
| ![](screenshots/mobile-390x844-1-aerial.jpg) | ![](screenshots/mobile-390x844-4-seat-selected.jpg) | ![](screenshots/mobile-390x844-5-seat-view.jpg) | ![](screenshots/mobile-390x844-7-payment.jpg) | ![](screenshots/mobile-390x844-9-ticket.jpg) |

## Le stade, modélisé en code

Aucun fichier Blender ni modèle lourd à télécharger : tout le stade est généré dans le navigateur.

- Forme ovale d'un stade avec piste d'athlétisme (deux lignes droites et deux virages), pelouse aux dimensions 105 × 68 m avec son marquage dessiné sur un canvas.
- Deux anneaux de gradins tout autour, une bande de loges VIP vitrées et une toiture sur la tribune principale, des panneaux LED qui affichent la catégorie et le prix de chaque tribune, quatre pylônes d'éclairage.
- Plus de 11 000 sièges individuels (assise, dossier, accoudoirs) dans **un seul `InstancedMesh`** (un seul appel de dessin). La couleur de chaque siège indique sa catégorie, s'il est libre ou déjà vendu (graphite).
- Éclairage d'ambiance studio (`RoomEnvironment`) pour des matériaux nets sans ombres temps réel, qui s'éteint progressivement en vue aérienne au profit de sièges auto-éclairés (un seul shader, aucune géométrie en plus).
- Zones invisibles par bloc pour le survol et le clic, sans lancer de rayons sur les 11 000 sièges.

Repères réels utilisés : le Stade de Kégué est un stade multifonction inauguré en 2000, avec piste d'athlétisme, d'une capacité d'environ 25 000 places après les travaux de mise aux normes. La disposition détaillée (blocs, loges, portes) est une interprétation libre.

## Performance et mobile

- La scène 3D est chargée à part (`React.lazy`) : l'interface s'affiche tout de suite.
- Résolution adaptative (`PerformanceMonitor`) : la densité de pixels baisse si l'appareil peine.
- Pas d'ombres temps réel, des matériaux simples et une géométrie fusionnée.
- Halo lumineux (bloom) uniquement là où l'appareil le permet : désactivé sur les appareils modestes (4 cœurs ou moins, peu de mémoire) et coupé automatiquement si la fluidité baisse. `?nobloom` le désactive, `?bloom` le force.
- `100dvh`, `viewport-fit=cover` et marges `safe-area` : rien n'est caché sous la barre de Safari sur iPhone. Sur mobile, les étapes s'affichent dans une feuille du bas qui défile.

## Stack

React 19 · TypeScript · Vite · Three.js avec React Three Fiber et drei (CameraControls) · Tailwind CSS 4 · Motion · zustand · qrcode · lucide-react.

## Lancer en local

```bash
npm install
npm run dev
```

Build de production : `npm run build` puis `npm run preview`.

## Mode démonstration

`?demo=1` rejoue tout le parcours automatiquement : survol des tribunes, rotation du stade, visite des loges, vol vers un bloc, choix du siège, vue depuis le siège, paiement T-Money et e-billet. Le script `scripts/record.py` s'en sert pour enregistrer une vidéo image par image (avec `?demo=1&capture=1`, une horloge virtuelle rend chaque image sans saccade).

## Crédits

Concept original : **Preston Odep**, dont la billetterie 3D du Raila Odinga Stadium a inspiré ce projet. Cette version adapte l'idée au Stade de Kégué, avec paiement Mobile Money.

Direction visuelle de la V2 : inspirée du réel « The future of basketball ticketing » d'**Ascenta Studio** (@ascenta.studio), adapté ici à un stade de football avec piste.

Réalisé par [Donchaminade](https://github.com/Donchaminade). Licence MIT.
