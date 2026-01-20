import { Component, Show, onMount, createEffect, createSignal, For } from "solid-js";
import { dataStore } from '../stores/dataStore';
import { interactionManager } from '../babylon/scene';
import { Page } from "../types";
import { Button } from "@kobalte/core";

/**
 * Leaf Node Information Overlay Component
 * Shows pages with links to Wikipedia for the selected leaf node
 */
export const LeafNodeOverlay: Component = () => {
  const [pages, setPages] = createSignal<Page[]>([]);
  const [isLoading, setIsLoading] = createSignal<boolean>(false);
  const [currentPage, setCurrentPage] = createSignal<number>(1);
  const [hasMorePages, setHasMorePages] = createSignal<boolean>(true);
  const pageSize = 50;


  const loadPages = async (page: number = 1) => {
    const currentNamespace = dataStore.state.currentNamespace;
    const leafNodeId = dataStore.state.leafNode?.id;
    const leafNode = dataStore.state.leafNode;
    console.debug(`[LEAF_OVERLAY] loadPages() Loading pages for namespace ${currentNamespace} and node ${leafNodeId}, page ${page}`)
    setIsLoading(true);
    try {
      // Convert page number to offset (page 1 = offset 0, page 2 = offset 50, etc.)
      const offset = (page - 1) * pageSize;
      const pages = await dataStore.loadPagesForNode(currentNamespace, leafNodeId, offset, pageSize);
      console.debug(`[LEAF_OVERLAY] loadPages() Got ${pages.length} pages. Setting pages in signal`)
      setPages(pages);
      setCurrentPage(page);

      // Calculate if there are more pages based on the leaf node's size
      const totalPages = leafNode?.size ? Math.ceil(leafNode.size / pageSize) : 1;
      const currentOffset = offset;
      const hasMore = leafNode?.size ? currentOffset + pages.length < leafNode.size : pages.length === pageSize;

      setHasMorePages(hasMore);

      console.debug(`[LEAF_OVERLAY] Total pages available: ${totalPages}, current page: ${page}, has more: ${hasMore}`);
    } finally {
      setIsLoading(false);
    }
  };

  const goToPreviousPage = () => {
    const prevPage = currentPage() - 1;
    if (prevPage >= 1) {
      loadPages(prevPage);
    }
  };

  const goToNextPage = () => {
    if (hasMorePages()) {
      loadPages(currentPage() + 1);
    }
  };

  /**
   * Load pages when current node changes
   * This ensures pages are reloaded when a different leaf node is clicked
   */
  createEffect(() => {
    const leafNode = dataStore.state.leafNode;
    const isVisible = dataStore.state.leafNodeInfoVisible;
    const currentNamespace = dataStore.state.currentNamespace;
    console.debug(`[LEAF_OVERLAY] Effect triggered: leafNodeId=${leafNode?.id}, isVisible=${isVisible}`);

    if (isVisible && leafNode != null && currentNamespace != null) {
      console.debug(`[LEAF_OVERLAY] Effect trigger is loading pages for node ${leafNode.id}`);
      loadPages(1); // Reset to page 1 when node changes
    } else if (isVisible && leafNode) {
      console.warn(`[LEAF_OVERLAY] Can't load pages. No currentNamespace but leaf node is present`)
    } else {
      console.debug(`[LEAF_OVERLAY] Not loading pages right now`)
    }
  });


  return (
    <Show when={dataStore.state.currentView === 'node_view' && dataStore.state.currentNode && dataStore.state.leafNodeInfoVisible}>
      <div class="fixed bottom-4 left-4 z-50 bg-black/85 text-white p-4 rounded-lg w-5/12 max-w-8/12 max-h-fit">
        {/* Current Node Info */}

        <div class="mb-3">
          <h3 class="text-lg font-bold mb-1">{dataStore.state.leafNode?.label ?? "[missing cluster label]"} </h3>
          <div id="leaf-node-deferred-load">
            <p class="text-sm font-bold mb-2">🌐 View on Wikipedia</p>
            <div class="h-64 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-300 hover:scrollbar-thumb-gray-600">
              <Show when={isLoading()}>
                <div class="flex flex-col items-center justify-center h-full">
                  <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p class="text-white text-med font-medium">Loading page links...</p>
                </div>
              </Show>
              <Show when={!isLoading() && pages().length > 0}>
                <For each={pages()}>
                  {(page, index) => (
                    <p class="text-sm mb-1">
                      <a href={page.url} target="_blank"
                        class="inline-block bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >{page.title}</a>
                    </p>
                  )}
                </For>
              </Show>
              <Show when={!isLoading() && pages().length === 0}>
                <p class="text-sm text-gray-400">No pages found</p>
              </Show>
            </div>
          </div>
        </div>
        <div class="flex justify-between items-center mt-2">
          <div class="flex gap-2">
            <Button.Root
              onClick={goToPreviousPage}
              disabled={currentPage() <= 1}
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              Previous
            </Button.Root>
            <Button.Root
              onClick={goToNextPage}
              disabled={!hasMorePages()}
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              Next
            </Button.Root>
          </div>
          <Button.Root
            onClick={() => { dataStore.setState('leafNodeInfoVisible', false); }}
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
          >
            Close
          </Button.Root>
        </div>
        <div class="text-sm text-gray-300 mt-2">
          Page {currentPage()} of {dataStore.state.leafNode?.size ? Math.ceil(dataStore.state.leafNode.size / pageSize) : 1}
        </div>

      </div>
    </Show>
  );
};