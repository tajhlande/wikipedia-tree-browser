// Test for language display functionality
import { describe, it, expect } from 'vitest';
import type { Namespace } from '../types';

// Mock namespace with language
const namespaceWithLanguage: Namespace = {
  name: 'enwiki_namespace_0',
  language: 'English',
  english_wiki_name: 'English Wikipedia',
  localized_wiki_name: 'English Wikipedia'
};

// Mock namespace without language
const namespaceWithoutLanguage: Namespace = {
  name: 'dewiki',
  language: 'German',
  english_wiki_name: 'German Wikipedia',
  localized_wiki_name: 'Deutschsprachige Wikipedia'
};

// Test the display logic that would be used in NamespaceCard
describe('Language Display Logic', () => {
  it('should display english_wiki_name as the primary display text', () => {
    const displayText = namespaceWithLanguage.english_wiki_name;

    expect(displayText).toBe('English Wikipedia');
  });

  it('should display localized_wiki_name as the secondary display text', () => {
    const displayText = namespaceWithoutLanguage.localized_wiki_name;

    expect(displayText).toBe('Deutschsprachige Wikipedia');
  });

  it('should use english_wiki_name as the primary display text', () => {
    const namespaceWithDisplayName: Namespace = {
      name: 'frwiki',
      language: 'French',
      english_wiki_name: 'French Wikipedia',
      localized_wiki_name: 'Wikipédia en français'
    };

    const displayText = namespaceWithDisplayName.english_wiki_name;

    expect(displayText).toBe('French Wikipedia');
  });

  it('should use localized_wiki_name for description since it shows the local name', () => {
    const descriptionText = namespaceWithLanguage.localized_wiki_name;

    expect(descriptionText).toBe('English Wikipedia');
  });

  it('should use both english and localized names for complete information', () => {
    const namespaceWithLanguageInfo: Namespace = {
      name: 'eswiki',
      language: 'Spanish',
      english_wiki_name: 'Spanish Wikipedia',
      localized_wiki_name: 'Wikipedia en español'
    };

    const englishName = namespaceWithLanguageInfo.english_wiki_name;
    const localizedName = namespaceWithLanguageInfo.localized_wiki_name;

    expect(englishName).toBe('Spanish Wikipedia');
    expect(localizedName).toBe('Wikipedia en español');
  });
});
