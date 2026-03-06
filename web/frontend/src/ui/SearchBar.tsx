import { createSignal, Show, For, onMount, onCleanup } from 'solid-js';
import { BsSearch } from 'solid-icons/bs';
import { useI18n } from '../i18n';
import { apiClient } from '../services/apiClient';

interface SearchBarProps {
  namespace: string;
  onNodeSelect: (nodeId: number) => void;
}

interface SearchResult {
  node_id: number;
  namespace: string;
  node_label: string;
  match_type: 'node_label' | 'page_titles';
  depth: number;
  parent_id?: number;
}

export function SearchBar(props: SearchBarProps) {
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = createSignal('');
  const [searchResults, setSearchResults] = createSignal<SearchResult[]>([]);
  const [isSearching, setIsSearching] = createSignal(false);
  const [showResults, setShowResults] = createSignal(false);
  const [selectedIndex, setSelectedIndex] = createSignal(-1);
  const [totalResults, setTotalResults] = createSignal(0);

  const getLanguageCode = (ns: string): string => {
    const match = ns.match(/^([a-z]+)wiki/);
    return match ? match[1] : 'en';
  };

  const handleSearch = async () => {
    if (!searchQuery().trim()) return;

    setIsSearching(true);
    try {
      const languageCode = getLanguageCode(props.namespace);
      const response = await apiClient.searchNodes(
        props.namespace,
        searchQuery(),
        languageCode,
        50
      );
      if (response.success && response.data) {
        setSearchResults(response.data.results);
        setTotalResults(response.data.total_count);
        setShowResults(true);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        handleSearch();
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        const results = searchResults();
        const visibleCount = Math.min(10, results.length);
        setSelectedIndex(Math.min(selectedIndex() + 1, visibleCount - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(Math.max(selectedIndex() - 1, 0));
        break;
    }
  };

  const handleResultSelect = (result: SearchResult) => {
    props.onNodeSelect(result.node_id);
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
    setSelectedIndex(-1);
  };

  const handleResultKeyDown = (e: KeyboardEvent, result: SearchResult, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleResultSelect(result);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.search-bar-container')) {
      setShowResults(false);
      setSelectedIndex(-1);
    }
  };

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener('click', handleClickOutside);
  });

  return (
    <div class="search-bar-container relative flex-1 max-w-md">
      <input
        type="text"
        placeholder={t("search.placeholder")}
        class="w-full px-4 py-2 pr-10 rounded-lg  border
               focus:outline-none focus:ring-2 focus:ring-blue-500
               bg-black/65 text-white border-gray-600 shadow-lg"
        value={searchQuery()}
        onInput={(e) => setSearchQuery(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />

      <button
        class="absolute right-2 top-1/2 -translate-y-1/2 p-1
               bg-gray-400 rounded-full"
        onClick={handleSearch}
        disabled={isSearching()}
        aria-label={t("search.placeholder")}
      >
        <BsSearch class="w-5 h-5" />
      </button>

      <Show when={showResults() && searchResults().length > 0}>
        <div class="absolute top-full left-0 right-0 mt-2
                    bg-black/80 border-gray-600 border rounded-lg shadow-lg z-50">
          <div class="px-4 py-2 border-b text-sm text-gray-200">
            {t("search.resultsHeader", {
              showing: Math.min(10, searchResults().length)
            })}
          </div>

          <div class="max-h-80 overflow-y-auto">
            <For each={searchResults().slice(0, 10)}>
              {(result, index) => (
                <button
                  class={`w-full px-4 py-3 text-left hover:bg-gray-600
                          transition-colors
                          ${index() === selectedIndex() ? 'bg-blue-50 dark:bg-blue-900' : ''}`}
                  onClick={() => handleResultSelect(result)}
                  onKeyDown={(e) => handleResultKeyDown(e, result, index())}
                  aria-selected={index() === selectedIndex()}
                  role="option"
                >
                  <div class="font-medium text-gray-200 dark:text-gray-100">
                    {result.node_label}
                  </div>
                  <Show when={result.match_type === 'page_titles'}>
                    <div class="text-sm text-gray-300 dark:text-gray-400">
                      (page titles match)
                    </div>
                  </Show>
                </button>
              )}
            </For>
          </div>

          <Show when={totalResults() > 10}>
            <div class="px-4 py-2 border-t text-sm text-gray-600 text-center">
              {t("search.moreResults", { count: totalResults() - 10 })}
            </div>
          </Show>
        </div>
      </Show>

      <Show when={showResults() && searchResults().length === 0 && !isSearching()}>
        <div class="absolute top-full left-0 right-0 mt-2
                    bg-black/80  border rounded-lg shadow-lg z-50">
          <div class="px-4 py-3 text-sm text-gray-300 ">
            {t("search.noResults")}
          </div>
        </div>
      </Show>

      <Show when={isSearching()}>
        <div class="absolute top-full left-0 right-0 mt-2
                    bg-black/80 border rounded-lg shadow-lg z-50">
          <div class="px-4 py-3 text-sm text-gray-300 ">
            {t("search.searching")}
          </div>
        </div>
      </Show>
    </div>
  );
}

export default SearchBar;
