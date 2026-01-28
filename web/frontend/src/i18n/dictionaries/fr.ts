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
    close: "Fermer",
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
