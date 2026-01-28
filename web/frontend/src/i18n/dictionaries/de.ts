// frontend/src/i18n/dictionaries/de.ts
import type { Dict } from "./en";

export const dict: Dict = {
  namespaceSelector: {
    title: "Wikipedia-Baum-Browser",
    subtitle: "Wählen Sie ein Wiki aus, um zu beginnen",
    searchPlaceholder: "Wikis durchsuchen...",
    loading: "Namespaces werden geladen...",
    error: {
      connection: "Verbindung zum Backend-Server fehlgeschlagen. Bitte stellen Sie sicher, dass der Backend-Server läuft und der Endpunkt /api/search/namespaces verfügbar ist.",
      unknown: "Unbekannter Fehler beim Laden der Namespaces",
      retry: "Wiederholen"
    },
    empty: {
      noMatch: "Keine Namespaces gefunden, die {{query}} entsprechen",
      noAvailable: "Keine Namespaces verfügbar. Bitte stellen Sie sicher, dass der Backend-Server läuft."
    }
  },

  navigationControls: {
    parent: "Übergeordnet",
    parentTooltip: "Zum übergeordneten Knoten gehen",
    noParentTooltip: "Kein übergeordneter Knoten",
    home: "Startseite",
    homeTooltip: "Zum Stammknoten zurückkehren",
    hideLabels: "Beschriftungen ausblenden",
    showLabels: "Beschriftungen anzeigen",
    labelsTooltip: {
      hide: "Beschriftungen ausblenden",
      show: "Beschriftungen anzeigen"
    },
    chooseWiki: "Wiki auswählen",
    chooseWikiTooltip: "Zur Wiki-Auswahl zurückkehren",
    hideBoundingBox: "Begrenzungsrahmen ausblenden",
    showBoundingBox: "Begrenzungsrahmen anzeigen",
    boundingBoxTooltip: {
      hide: "Begrenzungsrahmen ausblenden",
      show: "Begrenzungsrahmen anzeigen"
    }
  },

  nodeViewLoading: {
    title: "Knotenansicht wird geladen...",
    loadingChildren: "Untergeordnete Elemente von {{nodeLabel}} werden geladen",
    initializing: "Visualisierung wird initialisiert"
  },

  nodeInfoOverlay: {
    currentNode: "Aktueller Knoten",
    hoveredNode: "Knoten über dem Mauszeiger",
    id: "ID",
    label: "Bezeichnung",
    depth: "Tiefe",
    namespace: "Namespace",
    type: "Typ",
    leaf: "Blatt",
    cluster: "Cluster",
  },

  leafNodeOverlay: {
    missingLabel: "[fehlende Clusterbezeichnung]",
    viewOnWikipedia: "Auf Wikipedia ansehen",
    loading: "Seitenlinks werden geladen...",
    noPages: "Keine Seiten gefunden",
    previous: "Zurück",
    next: "Weiter",
    close: "Schließen",
    pageOf: "Seite {{currentPage}} von {{totalPages}}"
  },

  errorOverlay: {
    title: "Fehler",
    dismiss: "Fehler verwerfen",
    backToNamespaces: "Zurück zu Namespaces",
    retry: "Wiederholen"
  },

  performanceMonitor: {
    fps: "BPS",
    status: "Status",
    excellent: "Ausgezeichnet",
    good: "Gut",
    poor: "Schlecht"
  },

  zoomControl: {
    label: "Zoom"
  },

  namespaceCard: {
    explore: "Dieses Wiki erkunden"
  },

  billboardInfoOverlay: {
    title: "Knoteninformationen",
    id: "ID",
    label: "Bezeichnung",
    depth: "Tiefe",
    type: "Typ",
    leafNode: "Blattknoten",
    clusterNode: "Clusterknoten",
    parentId: "Übergeordnete ID"
  },

  common: {
    loading: "Wird geladen...",
    retry: "Wiederholen",
    close: "Schließen",
    dismiss: "Verwerfen"
  }
};

// Metadata about this language file
export const meta = {
  code: "de" as const,
  name: "German",
  nativeName: "Deutsch"
};
