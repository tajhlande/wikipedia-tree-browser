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

  appHeader: {
    title: "Wikipedia-Baum-Browser",
    whatsThis: "Was ist diese Anwendung?"
  },

  appInfoOverlay: {
    title: "Über den WikiTree-Browser",
    description: [
      "Visualisieren Sie die ermittelte hierarchische Struktur der Wikipedia-Artikel als interaktiven",
      "3D-Baum. Jeder Knoten repräsentiert eine Gruppe verwandter Artikel, geordnet nach thematischer",
      "Ähnlichkeit und semantischen Beziehungen."
    ].join(" "),
    process: [
      "Diese Struktur wurde entdeckt, indem Artikeltitel und Abstracts mithilfe des",
      "jina-embeddings-v4-text-matching-Einbettungsmodells in einen Vektorraum eingebettet,",
      "die Dimensionalität dieser Vektoren mittels Hauptkomponentenanalyse reduziert und",
      "die reduzierten Vektoren anschließend rekursiv mit k-Means geclustert wurden.",
      "Die Themenbezeichnungen wurden ermittelt, indem die Seitentitel jedes Blattknotens",
      "im Clusterbaum in einem zweistufigen Prozess in das gpt-oss-20b-LLM-Modell eingespeist",
      "und die jeweils passendste beschreibende Bezeichnung ausgewählt wurde.",
      "Dieses Verfahren ist zwar bewusst so gestaltet, dass es eine einigermaßen navigierbare",
      "Struktur erzeugt, und führt daher nicht unbedingt zu Kategorien wie denen in Wikis.",
      "Dennoch ist es interessant.",
    ].join(" "),
    infoEntries: {
      creator: "Dieses Projekt wurde erstellt von",
      codeRepo: "Der Code für dieses Projekt wird gehostet unter",
      license: "Dieses Projekt ist Open Source und unter folgender Lizenz lizenziert",
    },
    specialThanks: "Ich danke Wikimedia Enterprise für die Gewährung des Zugangs zum Quellinhalt.",
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
