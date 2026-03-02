# Feature: Simulation Visuelle — 3 scénarios + sélecteur de lieux en texte

## Feature Description
Améliorer la section "Simulation Visuelle" sur deux axes :
1. **Trois scénarios climatiques** (au lieu de deux) alignés sur les RCP du GIEC, chacun influençant le prompt Gemini avec un degré croissant de changement climatique.
2. **Sélecteur de lieux en texte** : remplacer la grille de photos (monuments du centre-ville) par une liste textuelle de 3-5 lieux privilégiant la nature, les parcs, les bords de rivière et les espaces verts — plus représentatifs des transformations climatiques visibles.

## User Story
As a user exploring climate projections for my commune
I want to choose between 3 climate scenarios and select a place from a clean text list
So that I can visualize progressively more severe climate futures in naturalistic settings that show meaningful vegetation and water changes

## Problem Statement
- Seulement 2 scénarios disponibles (+2.7°C et +4.8°C), alors que la simulation devrait couvrir un spectre optimiste/médian/pessimiste complet.
- Les lieux proposés sont des monuments emblématiques du centre-ville (béton, peu de nature) qui ne permettent pas de visualiser les impacts climatiques les plus significatifs (végétation, eau, chaleur urbaine).
- La grille de photos ajoute un temps de chargement important (thumbnails) pour un apport visuel limité.

## Solution Statement
- Ajouter un 3ème scénario RCP 2.6 (+1.5°C — optimiste, accord de Paris) et adapter le prompt Gemini pour refléter des impacts légers mais visibles.
- Modifier le sélecteur de lieux pour afficher uniquement du texte (nom + type/quartier), sans photos.
- Modifier l'API `/api/places` pour prioriser les parcs, bords de rivière, forêts, jardins publics — lieux où les impacts climatiques (végétation, eau) sont visuellement perceptibles.

## Relevant Files

- **`components/ClimateSimulation.vue`** — Composant principal de la simulation. Contient les scénarios, le sélecteur de lieux (photo grid), le before/after slider. À modifier pour : ajouter 3ème scénario, remplacer la grille photo par une liste texte.
- **`server/api/generate-image.post.ts`** — Génère l'image via Gemini. Contient les prompts par scénario (`moderateInstructions` / `severeInstructions`). À modifier pour : gérer 3 scénarios (ajouter `lightInstructions` pour RCP 2.6), et adapter le calcul de `warming`.
- **`server/api/places.get.ts`** — Recherche des lieux via Google Places. Retourne actuellement parcs + tourist_attractions avec thumbnails. À modifier pour : supprimer les thumbnails, privilégier les espaces verts/naturels, retourner uniquement les données textuelles.

### New Files
Aucun nouveau fichier nécessaire.

## Implementation Plan

### Phase 1: Foundation — API places sans photos, orientée nature
Modifier `places.get.ts` pour :
- Supprimer complètement la logique de fetch de thumbnails (plus nécessaire)
- Élargir la recherche à des types Google Places plus naturels : `park`, `natural_feature`, `campground`, `stadium` (esplanades) — éviter `tourist_attraction` (monuments)
- Ajouter un critère de scoring favorisant les lieux avec `park` dans les types
- Retourner uniquement : `placeId`, `name`, `vicinity`, `types`, `rating` (pas de `photoReference`, pas de `thumbnailUrl`)
- Radius légèrement élargi (5km) pour trouver des espaces naturels périphériques

### Phase 2: Core Implementation — 3ème scénario dans l'API de génération
Modifier `generate-image.post.ts` pour :
- Calculer `warming` sur 3 valeurs : `rcp26` → `+1.5°C`, `rcp45` → `+2.7°C`, `rcp85` → `+4.8°C`
- Ajouter `lightInstructions` pour RCP 2.6 : impacts perceptibles mais limités (légère sécheresse estivale, quelques zones de végétation jaunissante, été plus chaud mais toujours vert)
- Adapter les fonctions `generateFromPhoto` et `generateTextOnly` pour brancher sur `light` / `moderate` / `severe` selon le scénario
- Adapter la description générée pour mentionner le scénario correct

### Phase 3: Integration — UI en texte + 3 boutons de scénario
Modifier `ClimateSimulation.vue` pour :
- Ajouter le 3ème scénario RCP 2.6 dans le tableau `scenarios` (vert clair)
- Remplacer le composant `PlaceCandidate` (interface) pour supprimer `thumbnailUrl` et `photoReference` du type affiché (garder `photoReference` uniquement en interne pour l'API)
- Remplacer la grille photo (grid cols-2 avec `<img>`) par une liste verticale de boutons texte : nom en gras + type/quartier en sous-titre discret
- Adapter `selectPlace` pour ne plus passer `thumbnailUrl`
- Ajuster les styles du picker pour un aspect épuré et cohérent avec le dark theme

## Step by Step Tasks

### Étape 1 : Modifier `server/api/places.get.ts` — suppression photos, focus nature

- Supprimer tout le bloc de fetch de thumbnails (la boucle `Promise.all` qui appelle l'API photo)
- Changer les types de recherche : remplacer `tourist_attraction` par `natural_feature` ; conserver `park`
- Ajouter une 3ème recherche parallèle pour `campground` ou `garden` si pertinent (optionnel selon résultats)
- Dans le scoring, donner un bonus aux lieux dont `types` inclut `park` ou `natural_feature`
- Mettre à jour le type de retour : retirer `thumbnailUrl` et `photoReference` du résultat (ou les rendre optionnels — voir note ci-dessous)
- **Note** : `photoReference` doit rester dans le retour pour que `generate-image.post.ts` puisse récupérer la vraie photo. Retirer uniquement `thumbnailUrl` du résultat public.

### Étape 2 : Mettre à jour l'interface `PlaceCandidate` dans `ClimateSimulation.vue`

- Retirer le champ `thumbnailUrl` de l'interface `PlaceCandidate`
- Conserver `photoReference` (utilisé pour la génération Gemini)
- Conserver `name`, `vicinity`, `placeId`, `rating`, `types`

### Étape 3 : Ajouter le 3ème scénario dans `ClimateSimulation.vue`

- Dans le tableau `scenarios`, ajouter en premier (index 0) :
  ```ts
  { id: 'rcp26', label: 'Optimiste', warming: '+1.5°C', activeBg: 'bg-green-600', activeText: 'text-white' }
  ```
- Réordonner : RCP 2.6 (+1.5°C) → RCP 4.5 (+2.7°C) → RCP 8.5 (+4.8°C)
- Changer `selectedScenario` par défaut à `'rcp45'` (pas de changement)

### Étape 4 : Remplacer la grille photo par une liste texte dans `ClimateSimulation.vue`

- Supprimer le bloc `<div class="grid grid-cols-2 gap-3">` et ses `<img>` internes
- Remplacer par une liste `<ul>` de boutons texte :
  ```html
  <ul class="divide-y divide-ink-700/50">
    <li v-for="place in places" :key="place.placeId">
      <button
        class="w-full text-left px-5 py-3.5 hover:bg-ink-700/40 transition-colors flex items-center justify-between group"
        @click="selectPlace(place)"
      >
        <div>
          <p class="text-sm text-ink-100 font-medium">{{ place.name }}</p>
          <p class="text-xs text-ink-500 mt-0.5">{{ place.vicinity }}</p>
        </div>
        <svg class="w-4 h-4 text-ink-600 group-hover:text-heat-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </li>
  </ul>
  ```
- Retirer le `aspect-square` du conteneur `showPlacePicker` — remplacer par une hauteur auto avec `min-h-[200px]`
- Conserver le bouton "Générer sans photo de référence →"

### Étape 5 : Adapter `generate-image.post.ts` pour 3 scénarios

- Mettre à jour le calcul de `warming` :
  ```ts
  const warming = scenario === 'rcp26' ? '+1.5°C' : scenario === 'rcp85' ? '+4.8°C' : '+2.7°C'
  ```
- Ajouter `lightInstructions` dans `generateFromPhoto` :
  ```
  Apply MINIMAL but perceptible modifications to show a warmer late-summer day:
  - Vegetation: grass slightly drier in the most exposed spots, but mostly green. Trees fully leafed, perhaps marginally less lush.
  - Water bodies: normal to slightly lower levels, barely noticeable.
  - Sky: clear blue, slightly warmer light, hints of summer haze. Realistic sunny day.
  - Ground/paths: slightly drier surface, minimal cracking.
  - CRITICAL: The scene must still look largely normal — this is the +Paris Agreement scenario. Most green spaces survive and adapt. Changes are subtle.
  ```
- Adapter le branchement : `const isLight = warming === '+1.5°C'` → utiliser `lightInstructions` si `isLight`, sinon `isModerate` pour moderate, sinon severe.
- Même logique pour `generateTextOnly`
- Adapter le texte de description Gemini pour mentionner le bon scénario

### Étape 6 : Validation finale

- Tester les 3 scénarios (RCP 2.6 / 4.5 / 8.5) sur Paris et une commune rurale
- Vérifier que le sélecteur de lieux affiche bien du texte sans photos
- Vérifier que les lieux proposés sont des espaces verts/naturels (pas Tour Eiffel, Louvre, etc.)
- Lancer les commandes de validation

## Testing Strategy

### Unit Tests
- Vérifier que `warming` retourne la bonne valeur pour chacun des 3 scénarios
- Vérifier que l'interface `PlaceCandidate` ne contient plus `thumbnailUrl`

### Edge Cases
- `places.get.ts` : commune sans espaces verts proches → fallback `generate()` sans plantage
- Scénario RCP 2.6 sélectionné et cache vide → génération correcte avec `lightInstructions`
- Changement de scénario avec un lieu déjà sélectionné → re-génération ou cache hit correct
- Liste de lieux vide → bouton "Visualiser ma commune en 2050" direct (comportement existant conservé)

## Acceptance Criteria

- [ ] 3 boutons de scénario visibles dans le header de la simulation : RCP 2.6 (+1.5°C), RCP 4.5 (+2.7°C), RCP 8.5 (+4.8°C)
- [ ] Le prompt Gemini varie selon le scénario avec 3 niveaux d'intensité distincts
- [ ] Le sélecteur de lieux ne contient aucune image/thumbnail
- [ ] Le sélecteur affiche une liste textuelle verticale (nom + quartier/vicinity)
- [ ] Les lieux proposés sont des parcs/jardins/espaces naturels (pas principalement des monuments)
- [ ] La sélection d'un lieu en mode texte déclenche correctement la génération d'image
- [ ] Le before/after slider fonctionne identiquement pour les 3 scénarios
- [ ] Le cache (imageCache) fonctionne avec 3 scénarios distincts
- [ ] La build TypeScript (`bun tsc --noEmit`) passe sans erreur

## Validation Commands

```bash
# TypeScript check
cd /Users/antoine/claude/climate-poc && npx nuxi typecheck

# Build check
cd /Users/antoine/claude/climate-poc && npx nuxi build

# Dev server (vérification visuelle manuelle)
cd /Users/antoine/claude/climate-poc && npx nuxi dev --port 3333
```

Vérifications manuelles :
1. Chercher "Paris" → onglet "Températures & scénarios 2050"
2. Cliquer "Visualiser ma commune en 2050" → vérifier que la liste de lieux est en texte (pas de photos)
3. Vérifier que les 3 lieux proposés sont des parcs/jardins
4. Sélectionner un lieu → vérifier la génération d'image
5. Changer de scénario (RCP 2.6 / 4.5 / 8.5) → vérifier que les couleurs des boutons et les descriptions générées varient

## Notes

- `photoReference` doit rester dans l'objet `PlaceCandidate` retourné par `/api/places` car il est consommé par `/api/generate-image` pour récupérer la vraie photo. Seul `thumbnailUrl` disparaît de l'interface côté client.
- Les 3 scénarios correspondent aux 3 RCP déjà affichés dans `ClimateChart.vue` (cohérence avec les projections chiffrées).
- Pour les lieux Paris : la recherche `park` + `natural_feature` devrait retourner Bois de Boulogne, Bois de Vincennes, Buttes-Chaumont, etc. — bien plus représentatifs que Tour Eiffel pour visualiser la sécheresse.
- Le container du place picker perd son `aspect-square` pour s'adapter à la hauteur de la liste (3-5 éléments texte). Le reste du composant (slider, etc.) conserve `aspect-square`.
