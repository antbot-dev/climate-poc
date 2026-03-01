# Feature: Explanatory paragraph below climate simulation image

## Feature Description
Add a descriptive paragraph below the generated climate simulation image that explains what changed and what impacts are visible in the scenario. Currently the image overlay just shows Gemini's English preamble — we want a proper French paragraph contextualizing the climate scenario for the commune.

## User Story
As a citizen exploring my commune's climate risks
I want to read a clear explanation of what the simulation shows
So that I understand the concrete impacts of each warming scenario on my territory

## Problem Statement
The current description overlay shows Gemini's raw English text (e.g. "Here is a realistic photographic view of...") which is not informative. Users need a French paragraph explaining the specific climate impacts shown.

## Solution Statement
1. Update the Gemini prompt to request a separate French explanatory paragraph alongside the image
2. Display this paragraph in a styled block below the image, above the caption

## Relevant Files
- `server/api/generate-image.post.ts` — prompt needs to request a French description
- `components/ClimateSimulation.vue` — needs a new description block below the image

## Step by Step Tasks

### 1. Update the Gemini prompt to request a French explanation
- Add instruction to generate a 2-3 sentence French paragraph describing the visible impacts

### 2. Add description block in ClimateSimulation.vue
- Display the paragraph below the image in a styled section
- Only show when image is generated

### 3. Validate
- `npm run build`
- Visual check

## Validation Commands
- `npm run build`
- Manual: generate a simulation and verify the French paragraph appears

## Notes
- No new dependencies
- Two files changed
