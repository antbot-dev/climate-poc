<template>
  <div class="bg-white rounded-sm border border-ink-200 overflow-hidden sticky top-20">
    <!-- Book header -->
    <div class="p-5 border-b border-ink-100">
      <div class="flex items-start gap-4">
        <img
          src="https://editionsdelaube.fr/wp-content/uploads/Document-special-produit-unique-visuel.-hd-5-20-652x1024.jpg"
          alt="Couverture du livre Gérer l'inévitable"
          class="w-14 h-20 rounded-sm shadow-md flex-shrink-0 object-cover"
        />
        <div>
          <h3 class="font-display text-base text-ink-800 leading-snug">Gérer l'inévitable</h3>
          <p class="text-xs text-ink-500 mt-0.5 italic">Repères face à la dérive climatique</p>
          <p class="text-[11px] text-ink-400 mt-1">A. Poincaré &amp; C. Jeanneau</p>
          <p class="text-[10px] text-ink-300">Éd. de l'Aube, jan. 2026</p>
        </div>
      </div>
    </div>

    <!-- Quotes -->
    <div class="divide-y divide-ink-100">
      <div
        v-for="(quote, i) in relevantQuotes"
        :key="i"
        class="px-5 py-4"
      >
        <blockquote class="border-l-2 border-heat-400 pl-3">
          <p class="text-sm text-ink-600 italic leading-relaxed">
            &laquo;&nbsp;{{ quote.text }}&nbsp;&raquo;
          </p>
        </blockquote>
        <p class="text-[10px] text-ink-400 mt-2 pl-5">{{ quote.chapter }}</p>
      </div>
    </div>

    <!-- CTA -->
    <div class="p-5 border-t border-ink-100 bg-ink-50/50">
      <a
        href="https://editionsdelaube.fr/catalogue_de_livres/gerer-linevitable-reperes-face-a-la-derive-climatique/"
        target="_blank"
        rel="noopener"
        class="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-ink-900 text-ink-50 rounded-sm text-sm font-medium hover:bg-ink-800 transition-colors"
      >
        Découvrir le livre
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 17L17 7M17 7H7M17 7v10" /></svg>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  context?: 'elections' | 'climate' | 'risks'
}>()

interface Quote {
  text: string
  chapter: string
  context: string[]
}

const quotes: Quote[] = [
  {
    text: "L'adaptation n'est pas un aveu de défaite face au changement climatique, c'est une nécessité pragmatique pour protéger les plus vulnérables.",
    chapter: 'Chapitre 1 — L\'urgence de l\'adaptation',
    context: ['climate', 'elections'],
  },
  {
    text: "Chaque commune de France est exposée à au moins un risque climatique majeur. La question n'est plus de savoir si, mais quand.",
    chapter: 'Chapitre 2 — Cartographier les risques',
    context: ['risks', 'elections'],
  },
  {
    text: "Les élus locaux sont en première ligne. Leur mandat 2026-2032 sera celui de l'adaptation ou celui du déni.",
    chapter: 'Chapitre 3 — Le rôle des collectivités',
    context: ['elections'],
  },
  {
    text: "La température moyenne en France a déjà augmenté de 1.7°C depuis l'ère préindustrielle. Les projections pour 2050 dessinent un pays transformé.",
    chapter: 'Chapitre 4 — La France à +2°C',
    context: ['climate'],
  },
  {
    text: "Les catastrophes naturelles se multiplient, mais nos outils de prévention restent ceux du siècle dernier. Il faut repenser l'aménagement du territoire.",
    chapter: 'Chapitre 5 — Repenser nos territoires',
    context: ['risks'],
  },
  {
    text: "L'inaction a un coût. Chaque euro investi dans l'adaptation en économise sept en dommages évités.",
    chapter: 'Chapitre 6 — L\'économie de l\'adaptation',
    context: ['climate', 'risks', 'elections'],
  },
  {
    text: "La démocratie locale est le bon échelon pour l'adaptation climatique. C'est au niveau communal que se joue la résilience des territoires.",
    chapter: 'Chapitre 7 — Démocratie et climat',
    context: ['elections'],
  },
]

const relevantQuotes = computed(() => {
  const ctx = props.context || 'climate'
  return quotes.filter((q) => q.context.includes(ctx)).slice(0, 3)
})
</script>
