![bandeau du logo](/front-end/public/assets/bandeau_logo.png)

Bienvenue dans **Lucid Arena**, un **jeu de plateau en ligne** immersif et coloré, inspiré par l’univers festif de *Mario Party* et conçu pour offrir des moments ludiques et conviviaux en solo ou entre amis !

---

## 🌈 1. Présentation du projet

* **Nom du jeu** : Lucid Arena
* **Type** : Jeu de plateau en ligne, tour par tour
* **Inspiration** : Mario Party, jeux de plateau classiques et univers « dream »

**Lucid Arena** invite les joueurs à évoluer sur un plateau 3D interactif où stratégie, hasard et mini‑jeux se combinent pour créer une expérience unique.

---

## 💡 2. Contexte et motivations

* **Origine du projet** : Partager un moment ludique et collaboratif dans un cadre onirique, accessible depuis le web (Chrome, Edge).
* **Objectifs** :

  * **Techniques** :
    - maîtriser le déploiement web et l’intégration de modèles 3D créés avec Blender dans une application front‑end réalisée avec React et Babylon.js.
    - Concevoir un back‑end robuste en Java avec Spring Boot.
    - Implémenter la communication en temps réel grâce à WebSocket.
    - Structurer le projet en modules dédiés (plateau, mini‑jeux) pour assurer la maintenabilité et l’évolutivité du code.
  * **Ludiques** : créer une mécanique simple, dynamique et riche en rebondissements.
  * **Pédagogiques** : renforcer nos compétences front‑end et back‑end tout en s’amusant.

---

## 🚀 3. Fonctionnalités principales

* **Plateau 3D interactif** : tour par tour, chaque joueur incarne un pion coloré.
* **4 mini‑jeux intégrés** : 2 solo et 2 multijoueurs.
* **Système d’étoiles** basé sur la couleur des cases :

  * 🩷 **Rose clair** : déclenche un mini‑jeu **solo**
  * 💖 **Rose foncé** : déclenche un mini‑jeu **multijoueur**
  * 💛 **Jaune** : **malus**, perte d’une étoile
  * 💙 **Bleu** : **bonus**, gain d’une étoile

---

## 🎯 4. Concept et gameplay

1. **Lancement de la partie** : chaque joueur choisit un pion et démarre avec 0 étoile.
2. **Déroulement d’un tour** :

   * Le joueur actif lance un **dé virtuel** et avance de 1 à 6 cases.
   * Selon la **couleur** de la case : mini‑jeu solo/multijoueur ou modification du compte d’étoiles.
3. **Conditions de victoire** : le premier joueur à atteindre **10 étoiles** remporte la **Lucid Cup** ! 🏆

> **Astuce** : Les cases bleues sont vos meilleures alliées, mais les cases jaunes peuvent inverser le cours du jeu… 😈

---

## 🎲 5. Description des mini‑jeux

### 🕹️ 5.1 Mini-jeux Solo

1. **RainingGame**

   * Pluie d’éléments : attrapez les bonus et esquivez les poubelles.
   * **+1** point par bonus, **−1** point par poubelle.
   * Atteignez le **score cible** (paramétré en début de partie) pour gagner une étoile.

2. **ClickerGame**

   * Défi de rapidité : réalisez le **nombre de clics imposé** en **20 secondes**.
   * Objectif atteint → étoile remportée.

### 🤝 5.2 Mini-jeux Multijoueurs

1. **SkySurfer**

   * Naviguez à travers un champ de nuages, esquivez les obstacles et allez le plus loin possible.
   * Le joueur ayant parcouru la plus grande distance gagne une étoile.

2. **StarGame**

   * Lancez une étoile sur des cibles concentriques : plus vous êtes précis, plus vous scorez.
   * 3 manches successives, le meilleur total d’un joueur lui rapporte une étoile.

---

## ⭐ 6. Système d’étoiles et progression

* **Gain/perte** d’étoiles à chaque interaction avec une case ou un mini‑jeu.
* **Stratégie** : gérer son avancée pour maximiser bonus et minimiser malus.
* **Fin de partie** : premier à 5 étoiles → champion de la **Lucid Cup**.

---

## 🛠️ 7. Technologies & architecture

* **Front‑end** : React, Babylon.js, Blender (modèles 3D)
* **Back‑end** : Java, Spring Boot
* **Communication** : WebSocket pour un échange en temps réel
* **Organisation** : modules dédiés pour le plateau et chaque mini‑jeu, code propre et évolutif

---

## 📥 8. Installation & prise en main

   ```bash
   git clone https://github.com/Firelods/LucidArena.git
   cd LucidArena
   docker network create proxy_net
   docker compose up -d
   ```
Une fois ces commandes exécutées, l’application sera accessible depuis votre navigateur à l’adresse suivante : http://localhost:3000.
---

## 🤝 9. Contribution

Nous accueillons vos idées et contributions ! 🙌

* **Fork** le dépôt, créez une **branche**, puis proposez une **Pull Request**.
* Respectez le **guide de style**.

---

## 📄 10. Licence

Ce projet est soumis à la licence **MIT**.

---

> Embarquez dans l’aventure **Lucid Arena**, laissez libre cours à votre esprit compétitif et vivez un moment inoubliable ! 🌟
