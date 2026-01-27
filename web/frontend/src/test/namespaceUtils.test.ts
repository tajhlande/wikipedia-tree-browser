// Simple utility tests for namespace functionality
import { describe, it, expect } from 'vitest';

// Simple utility function to test
const filterNamespaces = (namespaces: any[], query: string) => {
  if (!query) return namespaces;

  const lowerQuery = query.toLowerCase();
  return namespaces.filter(namespace =>
    namespace.name.toLowerCase().includes(lowerQuery) ||
    namespace.english_wiki_name.toLowerCase().includes(lowerQuery) ||
    namespace.localized_wiki_name.toLowerCase().includes(lowerQuery) ||
    namespace.language.toLowerCase().includes(lowerQuery)
  );
};

describe('Namespace Utility Functions', () => {

  const mockNamespaces = [
    {
      name: 'enwiki_namespace_0',
      language: 'English',
      english_wiki_name: 'English Wikipedia',
      localized_wiki_name: 'English Wikipedia'
    },
    {
      name: 'dewiki',
      language: 'German',
      english_wiki_name: 'German Wikipedia',
      localized_wiki_name: 'Deutschsprachige Wikipedia'
    }
  ];

  it('should return all namespaces when query is empty', () => {
    const result = filterNamespaces(mockNamespaces, '');
    expect(result.length).toBe(2);
  });

  it('should filter namespaces by name', () => {
    const result = filterNamespaces(mockNamespaces, 'enwiki_namespace_0');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('enwiki_namespace_0');
  });

  it('should filter namespaces by english wiki name', () => {
    const result = filterNamespaces(mockNamespaces, 'english');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('enwiki_namespace_0');
  });

  it('should filter namespaces by localized wiki name', () => {
    const result = filterNamespaces(mockNamespaces, 'deutschsprachige');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('dewiki');
  });

  it('should filter namespaces by language', () => {
    const result = filterNamespaces(mockNamespaces, 'german');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('dewiki');
  });

  it('should return empty array when no matches', () => {
    const result = filterNamespaces(mockNamespaces, 'nonexistent');
    expect(result.length).toBe(0);
  });
});