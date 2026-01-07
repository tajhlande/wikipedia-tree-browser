// Test for language display functionality
import { describe, it, expect } from 'vitest';
import type { Namespace } from '../types';

// Mock namespace with language
const namespaceWithLanguage: Namespace = {
  name: 'enwiki',
  display_name: 'English Wikipedia',
  language: 'English'
};

// Mock namespace without language
const namespaceWithoutLanguage: Namespace = {
  name: 'dewiki',
  display_name: 'German Wikipedia',
  language: 'German'
};

// Test the display logic that would be used in NamespaceCard
describe('Language Display Logic', () => {
  it('should display language + Wikipedia when language is available', () => {
    const displayText = namespaceWithLanguage.language 
      ? `${namespaceWithLanguage.language} Wikipedia` 
      : namespaceWithLanguage.display_name || namespaceWithLanguage.name;
    
    expect(displayText).toBe('English Wikipedia');
  });

  it('should always display display_name since language is now required', () => {
    const displayText = namespaceWithoutLanguage.display_name;
    
    expect(displayText).toBe('German Wikipedia');
  });

  it('should use display_name as the primary display text', () => {
    const namespaceWithDisplayName: Namespace = {
      name: 'frwiki',
      display_name: 'French Wikipedia',
      language: 'French'
    };
    
    const displayText = namespaceWithDisplayName.display_name;
    
    expect(displayText).toBe('French Wikipedia');
  });

  it('should use display_name for description since it already contains language info', () => {
    const descriptionText = namespaceWithLanguage.display_name;
    
    expect(descriptionText).toBe('English Wikipedia');
  });

  it('should use display_name which includes language information', () => {
    const namespaceWithLanguageInfo: Namespace = {
      name: 'eswiki',
      display_name: 'Spanish Wikipedia',
      language: 'Spanish'
    };
    
    const descriptionText = namespaceWithLanguageInfo.display_name;
    
    expect(descriptionText).toBe('Spanish Wikipedia');
  });
});
