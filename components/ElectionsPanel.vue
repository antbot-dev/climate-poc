<template>
  <div class="space-y-6">
    <!-- Mayor info -->
    <article class="bg-white rounded-sm border border-ink-200 overflow-hidden">
      <div class="border-b border-ink-100 px-6 py-3 bg-ink-50/50">
        <h3 class="text-xs uppercase tracking-[0.15em] text-ink-500 font-semibold">Maire sortant</h3>
      </div>
      <div class="px-6 py-5">
        <div v-if="electionsData.loading" class="animate-pulse space-y-3">
          <div class="h-5 bg-ink-100 rounded w-3/4" />
          <div class="h-3 bg-ink-100 rounded w-1/2" />
        </div>

        <div v-else-if="electionsData.mayor">
          <p class="font-display text-xl text-ink-900">
            {{ electionsData.mayor.prenom }} {{ electionsData.mayor.nom }}
          </p>
          <p class="text-sm text-ink-500 mt-1">
            {{ electionsData.mayor.libelle_fonction }}
            <span v-if="electionsData.mayor.date_debut_mandat" class="text-ink-400">
              &middot; depuis {{ formatDate(electionsData.mayor.date_debut_mandat) }}
            </span>
          </p>
        </div>

        <div v-else class="text-ink-400 text-sm">
          <p>Données non disponibles pour cette commune.</p>
          <p class="text-xs mt-1 text-ink-300">Source : Répertoire National des Élus (data.gouv.fr)</p>
        </div>
      </div>
    </article>

    <!-- Cat-nat during mandate -->
    <article class="bg-white rounded-sm border border-ink-200 overflow-hidden">
      <div class="border-b border-ink-100 px-6 py-3 bg-ink-50/50">
        <h3 class="text-xs uppercase tracking-[0.15em] text-ink-500 font-semibold">Catastrophes naturelles &middot; Mandat 2020-2026</h3>
      </div>
      <div class="px-6 py-5">
        <div v-if="riskData.loading" class="animate-pulse space-y-3">
          <div class="h-4 bg-ink-100 rounded w-full" />
          <div class="h-4 bg-ink-100 rounded w-2/3" />
        </div>

        <template v-else>
          <div v-if="riskData.catnatDuringMandate.length > 0">
            <div class="flex items-baseline gap-3 mb-5">
              <span class="font-display text-4xl text-heat-600">{{ riskData.catnatDuringMandate.length }}</span>
              <span class="text-sm text-ink-500">arrêtés de catastrophe naturelle pendant le mandat en cours</span>
            </div>

            <div class="divide-y divide-ink-100">
              <div
                v-for="(catnat, i) in riskData.catnatDuringMandate.slice(0, 5)"
                :key="i"
                class="flex items-start gap-3 py-3"
              >
                <span
                  class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  :style="{ backgroundColor: getRiskColor(catnat.libelle_risque) }"
                />
                <div>
                  <p class="text-sm text-ink-700 font-medium">{{ catnat.libelle_risque }}</p>
                  <p class="text-xs text-ink-400 mt-0.5">
                    {{ formatDate(catnat.date_debut) }}
                    <span v-if="catnat.date_fin !== catnat.date_debut"> — {{ formatDate(catnat.date_fin) }}</span>
                  </p>
                </div>
              </div>
            </div>

            <p v-if="riskData.catnatDuringMandate.length > 5" class="text-xs text-ink-400 mt-3 pt-3 border-t border-ink-100">
              + {{ riskData.catnatDuringMandate.length - 5 }} autres arrêtés
            </p>
          </div>

          <p v-else class="text-ink-400 text-sm">
            Aucun arrêté de catastrophe naturelle enregistré pendant le mandat 2020-2026.
          </p>

          <!-- Risk type tags -->
          <div v-if="riskData.totalCatNat > 0" class="mt-5 pt-4 border-t border-ink-100">
            <p class="text-xs text-ink-400 mb-2">
              {{ riskData.totalCatNat }} arrêtés au total &middot; Risques identifiés :
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="risk in riskData.riskTypes"
                :key="risk"
                class="px-2.5 py-1 rounded-sm text-xs font-medium border"
                :style="{
                  borderColor: getRiskColor(risk) + '40',
                  backgroundColor: getRiskColor(risk) + '10',
                  color: getRiskColor(risk),
                }"
              >
                {{ risk }}
              </span>
            </div>
          </div>
        </template>
      </div>
    </article>

    <!-- Climate projection vs candidates -->
    <article v-if="projections" class="rounded-sm border-2 border-heat-300 overflow-hidden bg-gradient-to-br from-heat-50 to-white">
      <div class="border-b border-heat-200 px-6 py-3 bg-heat-100/50">
        <h3 class="text-xs uppercase tracking-[0.15em] text-heat-700 font-semibold">
          Projections climatiques &middot; Interpellez vos candidats
        </h3>
      </div>
      <div class="px-6 py-5">
        <p class="text-sm text-ink-600 mb-5 leading-relaxed">
          Voici ce que les modèles climatiques prévoient pour votre commune.
          Les candidats aux municipales 2026 doivent répondre à ces enjeux.
        </p>

        <div class="grid grid-cols-3 gap-3">
          <div class="bg-white rounded-sm p-4 text-center border border-green-200">
            <p class="text-[10px] uppercase tracking-wider text-green-700 font-semibold mb-2">RCP 2.6</p>
            <p class="font-display text-2xl text-green-800">+1.2°C</p>
            <p class="text-[10px] text-ink-400 mt-1">Accord de Paris tenu</p>
          </div>
          <div class="bg-white rounded-sm p-4 text-center border border-heat-300">
            <p class="text-[10px] uppercase tracking-wider text-heat-700 font-semibold mb-2">RCP 4.5</p>
            <p class="font-display text-2xl text-heat-700">+1.8°C</p>
            <p class="text-[10px] text-ink-400 mt-1">Trajectoire actuelle</p>
          </div>
          <div class="bg-white rounded-sm p-4 text-center border border-crisis-400">
            <p class="text-[10px] uppercase tracking-wider text-crisis-600 font-semibold mb-2">RCP 8.5</p>
            <p class="font-display text-2xl text-crisis-600">+2.5°C</p>
            <p class="text-[10px] text-ink-400 mt-1">Sans action</p>
          </div>
        </div>

        <blockquote class="mt-5 pl-4 border-l-2 border-heat-400">
          <p class="text-sm text-ink-600 italic leading-relaxed">
            "Quel est votre plan d'adaptation au changement climatique pour notre commune ?"
          </p>
          <p class="text-xs text-ink-400 mt-1">La question à poser à chaque candidat</p>
        </blockquote>
      </div>
    </article>

    <!-- 2026 elections -->
    <article class="bg-white rounded-sm border border-ink-200 overflow-hidden">
      <div class="border-b border-ink-100 px-6 py-3 bg-ink-50/50">
        <h3 class="text-xs uppercase tracking-[0.15em] text-ink-500 font-semibold">Municipales 2026</h3>
      </div>
      <div class="px-6 py-5">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-ink-900 rounded-sm flex items-center justify-center flex-shrink-0">
            <span class="font-display text-ink-50 text-lg">26</span>
          </div>
          <div>
            <p class="text-sm text-ink-700 font-medium">Scrutin les 15 et 22 mars 2026</p>
            <p class="text-xs text-ink-400 mt-0.5">
              Les listes de candidats seront publiées sur data.gouv.fr à l'approche du scrutin.
            </p>
          </div>
        </div>
      </div>
    </article>

    <p class="text-[11px] text-ink-300 text-center tracking-wide">
      Sources : Géorisques &middot; Répertoire National des Élus (data.gouv.fr) &middot; DRIAS
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  projections?: { rcp26: any; rcp45: any; rcp85: any } | null
}>()

const { electionsData } = useElections()
const { riskData, getRiskColor } = useRisks()

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}
</script>
