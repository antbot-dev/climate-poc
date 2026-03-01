# Bug: Chatbot displays raw API error JSON instead of user-friendly message

## Bug Description
When the "Assistant climat" chatbot is used and the Anthropic API key has insufficient credits, the chatbot displays the raw JSON error response to the user:
```
Erreur : 400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."},"request_id":"req_011CYc7XJv1XGgprAaSncXXW"
```

**Expected behavior**: A clean, French-language error message like "Service temporairement indisponible. Veuillez réessayer plus tard." — no raw JSON, no request IDs, no English API internals exposed to the user.

**Actual behavior**: The full JSON error body from the Anthropic API is concatenated into the error message string and displayed verbatim in the chat bubble.

## Problem Statement
Two issues combine to produce this bug:
1. **Server-side** (`server/api/chat.post.ts`): The catch block at line 202 passes `e.message` directly to `createError()`. For Anthropic SDK errors, `e.message` contains the full JSON response body (status code + JSON payload), not a clean error string.
2. **Client-side** (`components/McpChatbot.vue`): The catch block at line 163 displays `e.data?.message` verbatim with no sanitization, so whatever the server sends (including raw JSON) is shown to the user.

There is also a **secondary issue**: the API key has actually run out of credits, meaning the chatbot is entirely non-functional until credits are replenished. The error handling fix addresses UX, but the underlying service outage needs attention too.

## Solution Statement
1. **Server-side**: Parse Anthropic SDK errors properly. The SDK throws `Anthropic.APIError` with structured fields (`status`, `error.type`, `error.message`). Map known error types to clean French messages. For billing errors specifically, return a 503 status with a user-friendly message.
2. **Client-side**: Add a fallback that detects raw JSON in error messages and replaces it with a generic French error. This acts as a safety net regardless of server-side changes.
3. **API key**: Switch to a model that's cheaper (e.g. `claude-sonnet-4-20250514` instead of `claude-opus-4-20250514`) to reduce cost and extend credits. Opus is overkill for a data-lookup chatbot.

## Steps to Reproduce
1. Open http://localhost:3333/?commune=72540
2. Click the chat icon (bottom-right)
3. Type "Quels risques naturels menacent Loué ?" and send
4. Observe the raw JSON error message in the chat bubble

## Root Cause Analysis
The Anthropic Node SDK throws errors of type `Anthropic.APIError` which have a `message` property that contains the full HTTP response as a string: `"400 {"type":"error","error":{...}}"`.

In `server/api/chat.post.ts` line 202-207, the catch block does:
```typescript
catch (e: any) {
  throw createError({
    statusCode: 500,
    message: e.message || 'Erreur lors de l\'appel à l\'API Claude',
  })
}
```

This passes the raw SDK error string through to the client. The client at `McpChatbot.vue` line 163-166 then displays it:
```typescript
catch (e: any) {
  const errorMsg = e.data?.message || e.message || 'Erreur de connexion.'
  messages.value.push({ role: 'assistant', content: `Erreur : ${errorMsg}` })
}
```

No sanitization or mapping happens at either layer.

## Relevant Files
Use these files to fix the bug:

- `server/api/chat.post.ts` — The API route that calls Anthropic. The catch block (lines 202-208) needs to parse SDK errors and return clean French messages. Also where the model name is set (line 154 — switch from Opus to Sonnet).
- `components/McpChatbot.vue` — The chatbot UI. The catch block (lines 163-171) needs a safety-net to never display raw JSON to users.

## Step by Step Tasks

### 1. Fix server-side error handling in `chat.post.ts`
- In the catch block (line 202), detect Anthropic SDK errors by checking for `e.status` (present on `Anthropic.APIError`)
- Map common API error statuses to French user-friendly messages:
  - `400` with "credit balance" → `"Le service IA est temporairement indisponible (quota épuisé). Réessayez plus tard."`
  - `401` → `"Erreur de configuration du service IA."`
  - `429` → `"Trop de requêtes. Veuillez patienter quelques secondes."`
  - `500`/`529` → `"Le service IA est temporairement surchargé. Réessayez dans un instant."`
  - Default → `"Une erreur est survenue avec le service IA."`
- Set appropriate HTTP status codes: use `503` for billing/overload errors, `429` for rate limits, `500` for others
- Keep the `console.error` for server-side debugging

### 2. Downgrade model from Opus to Sonnet
- In `chat.post.ts`, replace `'claude-opus-4-20250514'` with `'claude-sonnet-4-20250514'` on lines 154 and 186
- Sonnet is significantly cheaper and more than capable for a data-lookup chatbot with tool use
- This extends the API credit runway substantially

### 3. Add client-side error sanitization in `McpChatbot.vue`
- In the catch block (line 163), add a check: if `errorMsg` contains `{` or `"type":"error"`, replace it with a generic message: `"Service momentanément indisponible. Veuillez réessayer."`
- This is a defense-in-depth measure — the server fix should handle most cases, but this prevents any future raw JSON leakage

### 4. Update chatbot footer text
- In `McpChatbot.vue` line 104, update "Claude Opus" to "Claude Sonnet" to match the model change

### 5. Validate the fix
- Run the validation commands below to ensure the build passes and no regressions are introduced

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd /Users/antoine/claude/climate-poc && npx nuxt build` — Run Nuxt build to validate no compilation errors
- `cd /Users/antoine/claude/climate-poc && grep -n 'claude-sonnet' server/api/chat.post.ts` — Verify model was switched to Sonnet
- `cd /Users/antoine/claude/climate-poc && grep -n 'credit\|quota\|indisponible' server/api/chat.post.ts` — Verify error messages are in French
- `cd /Users/antoine/claude/climate-poc && grep -n 'type.*error\|indisponible' components/McpChatbot.vue` — Verify client-side sanitization exists

## Notes
- The root cause of the chatbot being non-functional is that the Anthropic API key (`sk-ant-api03-...`) has exhausted its credit balance. After implementing the error handling fix, credits need to be added at https://console.anthropic.com/ for the chatbot to work again.
- Switching to Sonnet reduces cost by ~5x compared to Opus with negligible quality difference for this use case (structured data lookup + French language responses).
- No new libraries are needed for this fix.
