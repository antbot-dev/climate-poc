# Gérer l'inévitable — Votre commune face à la dérive climatique

Outil web compagnon du livre *Gérer l'inévitable* d'Antoine Poincaré & Clément Jeanneau (Éditions de l'Aube, janvier 2026).

Explorez les risques climatiques, les projections et la gouvernance locale de n'importe quelle commune française à partir de données publiques.

## Fonctionnalités

- **Recherche de commune** — par nom ou code postal via geo.api.gouv.fr
- **Assistant IA** — chatbot Claude Opus interrogeant les données ouvertes de data.gouv.fr (tool use)
- **Évolution climatique** — projections DRIAS/GIEC, simulation et graphiques
- **Gouvernance locale** — élections municipales 2026, déclarations cat-nat (Géorisques), carte des risques

## Stack technique

| Couche | Technologies |
|---|---|
| Framework | Nuxt 3, Vue 3, TypeScript |
| Style | Tailwind CSS (palettes `ink`, `heat`, `crisis`) |
| Cartographie | Leaflet (`@nuxtjs/leaflet`) |
| Graphiques | Chart.js + vue-chartjs |
| IA | Anthropic SDK (Claude Opus), Google AI (génération d'images) |
| Données | geo.api.gouv.fr, Géorisques, data.gouv.fr, DRIAS |

## Installation

```bash
npm install
cp .env.example .env
# Renseigner ANTHROPIC_API_KEY et GOOGLE_AI_API_KEY dans .env
```

## Développement

```bash
npm run dev
```

L'application est accessible sur `http://localhost:3000`.

## Build production

```bash
npm run build
npm run preview
```

## Structure du projet

```
app.vue                     # Point d'entrée (NuxtPage)
pages/index.vue             # Page principale (recherche, onglets, contenu)
components/
  CommuneSearch.vue         # Barre de recherche commune
  McpChatbot.vue            # Assistant IA avec tool use
  RiskMap.vue               # Carte Leaflet des risques
  ClimateChart.vue          # Graphiques climatiques (Chart.js)
  ClimateSimulation.vue     # Simulation projections GIEC
  ElectionsPanel.vue        # Données électorales municipales
  BookReferences.vue        # Références au livre
composables/
  useCommune.ts             # Recherche et sélection de commune
  useChat.ts                # État du chatbot
  useRisks.ts               # Données cat-nat (Géorisques)
  useClimate.ts             # Projections climatiques
  useElections.ts           # Maires et candidats
server/api/
  chat.post.ts              # API chatbot (Anthropic + data.gouv.fr tools)
  generate-image.post.ts    # Génération d'images (Google AI)
```

## Sources de données

- **geo.api.gouv.fr** — référentiel des communes
- **Géorisques** — déclarations de catastrophes naturelles
- **data.gouv.fr** — données ouvertes (interrogées par l'assistant IA)
- **DRIAS / Météo-France** — projections climatiques

## Licence

Projet open-source. Les projections climatiques sont indicatives et basées sur les modèles DRIAS.
