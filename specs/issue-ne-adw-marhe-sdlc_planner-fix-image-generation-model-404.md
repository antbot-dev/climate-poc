# Bug: Climate simulation image generation returns 404

## Bug Description
The "Simulation visuelle" component fails with a 404 error when generating climate images. The error message exposes the full API URL including the API key: `[POST] "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=...": 404 Not Found`

Expected: an AI-generated image of the commune under climate scenarios.
Actual: 404 error with leaked API key in the error message.

## Problem Statement
The Gemini model `gemini-2.0-flash-preview-image-generation` has been deprecated and no longer exists. The fallback model `imagen-3.0-generate-002` is also gone. Both return 404. Additionally, the raw error message leaks the API key to the client.

## Solution Statement
1. Update the primary model to `gemini-2.5-flash-image` (available, uses same `generateContent` API)
2. Update the fallback model to `imagen-4.0-generate-001`
3. Sanitize error messages to never expose the API key

## Steps to Reproduce
1. Open `http://localhost:3000`, search for a commune (e.g. "Loué" / 72540)
2. Go to "L'évolution climatique" tab
3. Click "Visualiser ma commune en 2050" or observe auto-generation
4. See 404 error with API key in the message

## Root Cause Analysis
The model ID `gemini-2.0-flash-preview-image-generation` was a preview model that has been retired by Google. The current available image generation models are: `gemini-2.5-flash-image`, `gemini-3-pro-image-preview`, `imagen-4.0-generate-001`. The fallback `imagen-3.0-generate-002` is also retired (now `imagen-4.0-*`).

## Relevant Files
- `server/api/generate-image.post.ts` — the server endpoint that calls the Gemini API with the wrong model name

## Step by Step Tasks

### 1. Update model names in generate-image.post.ts
- Change primary model from `gemini-2.0-flash-preview-image-generation` to `gemini-2.5-flash-image`
- Change fallback model from `imagen-3.0-generate-002` to `imagen-4.0-generate-001`
- Sanitize error messages to strip API keys before sending to client

### 2. Validate
- Run `npm run build`
- Test the endpoint manually with curl
- Open the app and test the simulation

## Validation Commands
- `npm run build` — ensure production build succeeds
- `curl -s -X POST http://localhost:3000/api/generate-image -H 'Content-Type: application/json' -d '{"communeName":"Loué","regionName":"Pays de la Loire","risks":["inondation"],"scenario":"rcp45"}' | head -c 200` — should return image data, not 404

## Notes
- No new dependencies needed — just model name updates
- The API key leak in error messages is a secondary security fix
