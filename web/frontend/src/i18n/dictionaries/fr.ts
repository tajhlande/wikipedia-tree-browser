// frontend/src/i18n/dictionaries/fr.ts
import type { Dict } from "./en";

export const dict: Dict = {
  namespaceSelector: {
    title: "Navigateur d'arborescence Wikipedia",
    subtitle: "Sélectionnez un wiki pour commencer",
    searchPlaceholder: "Rechercher des wikis...",
    loading: "Chargement des espaces de noms...",
    error: {
      connection: "Échec de la connexion au serveur principal. Veuillez vous assurer que le serveur principal est en cours d'exécution et que le point de terminaison /api/search/namespaces est disponible.",
      unknown: "Erreur inconnue lors du chargement des espaces de noms",
      retry: "Réessayer"
    },
    empty: {
      noMatch: "Aucun espace de noms trouvé correspondant à {{query}}",
      noAvailable: "Aucun espace de noms disponible. Veuillez vous assurer que le serveur principal est en cours d'exécution."
    }
  },

  navigationControls: {
    parent: "Parent",
    parentTooltip: "Aller au nœud parent",
    noParentTooltip: "Aucun nœud parent",
    home: "Accueil",
    homeTooltip: "Retour au nœud racine",
    hideLabels: "Masquer les étiquettes",
    showLabels: "Afficher les étiquettes",
    labelsTooltip: {
      hide: "Masquer les étiquettes des panneaux",
      show: "Afficher les étiquettes des panneaux"
    },
    chooseWiki: "Choisir un wiki",
    chooseWikiTooltip: "Retour à la sélection de wiki",
    hideBoundingBox: "Masquer la boîte de délimitation",
    showBoundingBox: "Afficher la boîte de délimitation",
    boundingBoxTooltip: {
      hide: "Masquer la boîte de délimitation",
      show: "Afficher la boîte de délimitation"
    }
  },

  nodeViewLoading: {
    title: "Chargement de la vue des nœuds...",
    loadingChildren: "Chargement des enfants de {{nodeLabel}}",
    initializing: "Initialisation de la visualisation"
  },

  nodeInfoOverlay: {
    currentNode: "Nœud actuel",
    hoveredNode: "Nœud survolé",
    id: "ID",
    label: "Étiquette",
    depth: "Profondeur",
    namespace: "Espace de noms",
    type: "Type",
    leaf: "Feuille",
    cluster: "Cluster",
  },

  leafNodeOverlay: {
    missingLabel: "[étiquette de cluster manquante]",
    viewOnWikipedia: "Voir sur Wikipedia",
    loading: "Chargement des liens de page...",
    noPages: "Aucune page trouvée",
    previous: "Précédent",
    next: "Suivant",
    pageOf: "Page {{currentPage}} sur {{totalPages}}"
  },

  errorOverlay: {
    title: "Erreur",
    dismiss: "Ignorer l'erreur",
    backToNamespaces: "Retour aux espaces de noms",
    retry: "Réessayer"
  },

  performanceMonitor: {
    fps: "IPS",
    status: "État",
    excellent: "Excellent",
    good: "Bon",
    poor: "Médiocre"
  },

  zoomControl: {
    label: "Zoom"
  },

  namespaceCard: {
    explore: "Explorer ce Wiki"
  },

  billboardInfoOverlay: {
    title: "Informations sur le nœud",
    id: "ID",
    label: "Étiquette",
    depth: "Profondeur",
    type: "Type",
    leafNode: "Nœud feuille",
    clusterNode: "Nœud cluster",
    parentId: "ID parent"
  },

  appHeader: {
    title: "Navigateur d'arborescence Wikipedia",
    whatsThis: "Qu'est-ce que cette application ?"
  },

   appInfoOverlay: {
    title: "À propos de Wiki Tree Browser",
    description: [
      "Visualisez la structure hiérarchique des articles de Wikipédia sous forme d'arbre 3D interactif.",
      "Chaque nœud représente un groupe d'articles apparentés, organisés par similarité thématique et relations sémantiques.",
    ].join(" "),
    process: [
      "Cette structure a été découverte en intégrant les titres et résumés des articles dans un espace",
      "vectoriel à l'aide du modèle d'intégration jina-embeddings-v4-text-matching, en réduisant",
      "la dimensionnalité de ces vecteurs par analyse en composantes principales, puis en regroupant",
      "récursivement les vecteurs réduits par l'algorithme des k-moyennes. Les étiquettes thématiques",
      "ont été déterminées en fournissant les titres des pages de chaque nœud terminal de l'arbre de",
      "regroupement au modèle LLM gpt-oss-20b, selon un processus en deux passes, afin de sélectionner",
      "l'étiquette descriptive la plus appropriée.",
      "Ce processus introduit un certain biais pour produire une structure relativement navigable;",
      "il ne produira donc pas nécessairement des catégories identiques à celles présentes sur Wikipédia,",
      "mais il n'en demeure pas moins intéressant."
    ].join(" "),
    infoEntries: {
      creator: "Ce projet a été créé par",
      codeRepo: "Le code de ce projet est hébergé à l'adresse suivante",
      license: "Ce projet est open source et distribué sous licence",
    },
    specialThanks: "Je remercie Wikimedia Enterprise de m'avoir accordé l'accès au contenu source."
  },

  common: {
    loading: "Chargement...",
    retry: "Réessayer",
    close: "Fermer",
    dismiss: "Ignorer"
  }
};

// Metadata about this language file
export const meta = {
  code: "fr" as const,
  name: "French",
  nativeName: "Français"
};
