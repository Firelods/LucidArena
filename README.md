# Lucid Arena 🎉

Bienvenue dans **Lucid Arena**, un **jeu de plateau en ligne** inspiré de l’univers festif de _Mario Party_ ! 🎲✨

---

## 🌈 1. Présentation du projet

-   **Nom du jeu** : LucidArena
-   **Type** : Jeu de plateau en ligne, tour par tour
-   **Inspiration** : Mario Party, jeux de plateau classiques et univers onirique

**LucidArena** est conçu pour plonger les joueurs dans un environnement “dream”, où stratégie et fun se rencontrent pour des parties mémorables en solo comme en multijoueur.

---

## 💡 2. Contexte et motivations

-   **Pourquoi ce jeu ?**

    -   Permettre à tous de jouer ensemble et de partager un moment ludique dans un univers « dream ».
    -   Favoriser la convivialité et le challenge amical.

-   **Objectifs**

    -   **Techniques** : explorer le déploiement web, la modélisation 3D avec Blender, et le développement en React.
    -   **Ludiques** : proposer une mécanique simple mais riche, avec des rebondissements à chaque tour.
    -   **Pédagogiques** : consolider nos compétences front-end et back-end tout en s’amusant.

---

## 🚀 3. Fonctionnalités principales

-   **Plateau interactif** en 3D, tour par tour. Chaque joueur se voit attribuer automatiquement un personnage de couleur.
-   **4 mini-jeux** intégrés : 2 **solo** et 2 **multijoueurs**.
-   **Système d’étoiles** basé sur la couleur des cases :

    -   🩷 **Rose clair** : déclenche un mini-jeu **solo**
    -   💖 **Rose foncé** : déclenche un mini-jeu **multijoueur**
    -   💛 **Jaune** : **malus**, perte d’une étoile
    -   💙 **Bleu** : **bonus**, gain d’une étoile

---

## 🎯 4. Gameplay

1. Les joueurs lancent un **dé virtuel** et avancent leur pion sur le plateau.
2. Selon la **couleur** de la case atteinte :

    - **Mini-jeu solo** ou **multijoueur**
    - **Gain** ou **perte** d’étoiles

3. **Premier** joueur à atteindre **10 étoiles** remporte la partie et la **Lucid Cup** ! 🏆

> **Conseil** : Cherchez à atteindre les cases bleues pour accumuler des étoiles, mais méfiez-vous des cases jaunes… 😈

---

## 🎲 5. Description des mini-jeux

### 🕹️ 5.1 Mini-jeux Solo

1. **RainingGame**

    - Plongez sous une pluie d’objets : attrapez les éléments bénéfiques tout en esquivant les poubelles.
    - Chaque élément positif vous rapporte +1 point ; chaque poubelle vous inflige −1 point.
    - Atteignez le **score cible** défini en début de partie pour décrocher une étoile.

2. **ClickerGame**

    - Relevez le défi du chronomètre : réalisez le **nombre de clics imposé** en moins de **20 secondes**.
    - Si vous atteignez l’objectif dans le temps imparti, vous remportez une étoile.

### 🤝 5.2 Mini-jeux Multijoueurs

1. **SkySurfer**

    - Naviguez à travers les nuages et affrontez vos concurrents pour parcourir la plus grande distance possible.
    - Le plus grand score de distance remporte une étoile.

2. **StarGame**

    - Lancez une étoile sur des bandes centrales avec précision.
    - Des points sont attribués en fonction de votre précision sur **3 manches**.
    - Le joueur totalisant le meilleur score remporte une étoile.

---

## ⭐ 6. Système d’étoiles et progression. Système d’étoiles et progression

-   À chaque mini-jeu, les joueurs peuvent **gagner** ou **perdre** des étoiles.
-   Les cases **bleues** offrent un **bonus**, tandis que les cases **jaunes** infligent un **malus**.
-   **Victoire finale** : le premier à 10 étoiles remporte la partie et porte fièrement la **Lucid Cup** ! 🌟

---

## 🛠️ 7. Technologies et architecture

-   **Front-end** : React, Babylon.js
-   **Back-end** : Java, Spring WebSocket
-   **Communication** : WebSocket pour un échange temps réel fluide
-   **Structure** : Modules dédiés pour le plateau et chaque mini-jeu, architecture claire et évolutive

---

## 📥 8. Installation & prise en main

1. **Prérequis** :

    - Node.js (>= 14)
    - Java (>= 11)

2. **Installation** :

    ```bash
    git clone https://github.com/Firelods/LucidArena.git
    cd lucid-arena
    cd frontend && npm install
    cd ../backend && mvn install
    ```

3. **Configuration** :

    - Variables d’environnement pour OAuth Google

4. **Lancement** :

    - `npm start` (front)
    - `mvn spring-boot:run` (back)

---

---

## 📄 10. Licence

Ce projet est distribué sous licence **MIT**.

---

> Plongez dans **Lucid Arena**, amusez-vous et que le meilleur gagne ! 🌟
