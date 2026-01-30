// frontend/src/i18n/dictionaries/en.ts
export const dict = {
  namespaceSelector: {
    title: "Wikipedia Tree Browser",
    subtitle: "Select a wiki to begin",
    searchPlaceholder: "Search wikis...",
    loading: "Loading namespaces...",
    error: {
      connection: "Failed to connect to the backend server. Please ensure the backend is running and the /api/search/namespaces endpoint is available.",
      unknown: "Unknown error loading namespaces",
      retry: "Retry"
    },
    empty: {
      noMatch: "No namespaces found matching {{query}}",
      noAvailable: "No namespaces available. Please ensure the backend is running."
    }
  },

  navigationControls: {
    parent: "Parent",
    parentTooltip: "Go to parent node",
    noParentTooltip: "No parent node",
    home: "Home",
    homeTooltip: "Return to root node",
    hideLabels: "Hide Labels",
    showLabels: "Show Labels",
    labelsTooltip: {
      hide: "Hide billboard labels",
      show: "Show billboard labels"
    },
    chooseWiki: "Choose a wiki",
    chooseWikiTooltip: "Back to wiki selection",
    hideBoundingBox: "Hide Bounding Box",
    showBoundingBox: "Show Bounding Box",
    boundingBoxTooltip: {
      hide: "Hide bounding box",
      show: "Show bounding box"
    }
  },

  nodeViewLoading: {
    title: "Loading Node View...",
    loadingChildren: "Loading children of {{nodeLabel}}",
    initializing: "Initializing visualization"
  },

  nodeInfoOverlay: {
    currentNode: "Current Node",
    hoveredNode: "Hovered Node",
    id: "ID",
    label: "Label",
    depth: "Depth",
    namespace: "Namespace",
    type: "Type",
    leaf: "Leaf",
    cluster: "Cluster",
  },

  leafNodeOverlay: {
    missingLabel: "[missing cluster label]",
    viewOnWikipedia: "View on Wikipedia",
    loading: "Loading page links...",
    noPages: "No pages found",
    previous: "Previous",
    next: "Next",
    pageOf: "Page {{currentPage}} of {{totalPages}}"
  },

  errorOverlay: {
    title: "Error",
    dismiss: "Dismiss error",
    backToNamespaces: "Back to Namespaces",
    retry: "Retry"
  },

  performanceMonitor: {
    fps: "FPS",
    status: "Status",
    excellent: "Excellent",
    good: "Good",
    poor: "Poor"
  },

  zoomControl: {
    label: "Zoom"
  },

  namespaceCard: {
    explore: "Explore this Wiki"
  },

  billboardInfoOverlay: {
    title: "Node Information",
    id: "ID",
    label: "Label",
    depth: "Depth",
    type: "Type",
    leafNode: "Leaf Node",
    clusterNode: "Cluster Node",
    parentId: "Parent ID"
  },

  appHeader: {
    title: "Wikipedia Tree Browser",
    whatsThis: "What's this application?"
  },

  appInfoOverlay: {
    title: "About Wiki Tree Browser",
    description: [
      "Visualize the discovered hierarchical structure of Wikipedia articles as an interactive 3D tree.",
      "Each node represents a cluster of related articles, organized by topic similarity",
      "and semantic relationships."
    ].join(" "),
    process: [
      "This structure was discovered by embedding article titles and abstracts into a vector space",
      "using the jina-embeddings-v4-text-matching embedding model, reducing the dimensionality",
      "of those vectors using principal component analysis, then recursively clustering the",
      "reduced vectors using k-means. The topic labels were determined by feeding the page titles",
      "for each of the leaf nodes in the cluster tree into the gpt-oss-20b LLM model",
      "in a two-pass process and asking for the most appropriate descriptive label.",
      "This process has plenty of bias to produce a structure that is reasonably navigable, and so",
      "it won't necessarily produce categories like those present on-wiki, but it is interesting",
      "nonetheless.",
    ].join(" "),
    infoEntries: {
      creator: "This project was created by",
      codeRepo: "Code for this project is hosted at",
      license: "This project is open source, licensed under ",
    },
    specialThanks: "I am grateful to Wikimedia Enterprise for granting access to the source content."
  },

  common: {
    loading: "Loading...",
    retry: "Retry",
    close: "Close",
    dismiss: "Dismiss"
  }
};

// Metadata about this language file
export const meta = {
  code: "en" as const,
  name: "English",
  nativeName: "English"
};

export type Dict = typeof dict;
