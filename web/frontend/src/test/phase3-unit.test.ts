import { describe, it, expect, beforeEach } from 'vitest';
import type { ClusterNode } from '../types';

/**
 * Unit Tests for Phase 3 Core Logic
 * Tests the business logic without requiring Babylon.js 3D environment
 */
describe('Phase 3: Core Logic Unit Tests', () => {
  
  describe('Node Color Determination', () => {
    
    const getNodeColor = (node: ClusterNode): string => {
      // This mimics the logic from NodeManager
      if (node.depth === 0) {
        return 'root'; // Red
      } else if (node.is_leaf) {
        return 'leaf'; // Wikipedia blue
      } else {
        // Depth-based color (0-11)
        const depthIndex = Math.min(Math.max(0, node.depth - 1), 11);
        return `depth_${depthIndex}`;
      }
    };
    
    it('should return root color for depth 0 nodes', () => {
      const rootNode: ClusterNode = {
        id: 1,
        namespace: 'test',
        label: 'Root',
        final_label: 'Root',
        depth: 0,
        is_leaf: false,
        centroid: [0, 0, 0],
        size: 1,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      expect(getNodeColor(rootNode)).toBe('root');
    });
    
    it('should return leaf color for leaf nodes', () => {
      const leafNode: ClusterNode = {
        id: 2,
        namespace: 'test',
        label: 'Leaf',
        final_label: 'Leaf',
        depth: 5,
        is_leaf: true,
        centroid: [1, 1, 1],
        size: 1,
        parent_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      expect(getNodeColor(leafNode)).toBe('leaf');
    });
    
    it('should return depth-based colors for non-root, non-leaf nodes', () => {
      const testCases = [
        { depth: 1, expected: 'depth_0' },
        { depth: 2, expected: 'depth_1' },
        { depth: 5, expected: 'depth_4' },
        { depth: 12, expected: 'depth_11' }, // Max depth
        { depth: 100, expected: 'depth_11' }, // Clamped to max
      ];
      
      testCases.forEach(({ depth, expected }) => {
        const node: ClusterNode = {
          id: depth,
          namespace: 'test',
          label: `Node ${depth}`,
          final_label: `Node ${depth}`,
          depth: depth,
          is_leaf: false,
          centroid: [0, 0, 0],
          size: 1,
          parent_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        expect(getNodeColor(node)).toBe(expected);
      });
    });
  });
  
  describe('Parent Node Logic', () => {
    
    const shouldCreateParentNode = (node: ClusterNode): boolean => {
      // Root nodes (depth 0) should not have parents
      return node.depth > 0;
    };
    
    it('should not create parent for root node', () => {
      const rootNode: ClusterNode = {
        id: 1,
        namespace: 'test',
        label: 'Root',
        final_label: 'Root',
        depth: 0,
        is_leaf: false,
        centroid: [0, 0, 0],
        size: 1,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      expect(shouldCreateParentNode(rootNode)).toBe(false);
    });
    
    it('should create parent for non-root nodes', () => {
      const childNode: ClusterNode = {
        id: 2,
        namespace: 'test',
        label: 'Child',
        final_label: 'Child',
        depth: 1,
        is_leaf: false,
        centroid: [1, 0, 0],
        size: 1,
        parent_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      expect(shouldCreateParentNode(childNode)).toBe(true);
    });
  });
  
  describe('Node Position Validation', () => {
    
    const isValidPosition = (centroid: number[] | undefined | null): boolean => {
      return centroid !== null && 
             centroid !== undefined && 
             centroid.length === 3 &&
             !centroid.some(c => isNaN(c) || !isFinite(c));
    };
    
    it('should validate correct 3D positions', () => {
      expect(isValidPosition([0, 0, 0])).toBe(true);
      expect(isValidPosition([1.5, -2.3, 0.7])).toBe(true);
      expect(isValidPosition([100, 200, 300])).toBe(true);
    });
    
    it('should reject invalid positions', () => {
      expect(isValidPosition(undefined)).toBe(false);
      expect(isValidPosition(null as any)).toBe(false);
      expect(isValidPosition([0, 0])).toBe(false); // Wrong length
      expect(isValidPosition([NaN, 0, 0])).toBe(false); // NaN
      expect(isValidPosition([Infinity, 0, 0])).toBe(false); // Infinity
    });
  });
  
  describe('Link Key Generation', () => {
    
    const generateLinkKey = (parentId: number, childId: number): string => {
      return `link_${parentId}_${childId}`;
    };
    
    it('should generate consistent link keys', () => {
      expect(generateLinkKey(1, 2)).toBe('link_1_2');
      expect(generateLinkKey(5, 10)).toBe('link_5_10');
      expect(generateLinkKey(100, 200)).toBe('link_100_200');
    });
    
    it('should generate unique keys for different node pairs', () => {
      const key1 = generateLinkKey(1, 2);
      const key2 = generateLinkKey(2, 1);
      const key3 = generateLinkKey(1, 3);
      
      expect(key1).not.toBe(key2); // Different direction
      expect(key1).not.toBe(key3); // Different child
    });
  });
  
  describe('Root Node Parent Handling', () => {
    
    const handleParentResponse = (parentResponse: any, nodeId: number): any => {
      // This mimics the logic from dataStore.loadNodeView
      if (!parentResponse.success || parentResponse.data === null) {
        if (parentResponse.error && !parentResponse.error.includes('no parent') && !parentResponse.error.includes('not found')) {
          console.warn(`[DATA] Parent load warning: ${parentResponse.error}`);
        }
        // Set parent to null if not found (expected for root node)
        parentResponse.data = null;
        console.log(`[DATA] No parent found for node ${nodeId} - this is expected for root nodes`);
      }
      return parentResponse;
    };
    
    it('should handle null parent response for root node', () => {
      const nullParentResponse = {
        success: false,
        data: null,
        error: 'Parent not found',
        timestamp: new Date().toISOString()
      };
      
      const result = handleParentResponse(nullParentResponse, 1);
      expect(result.data).toBeNull();
    });
    
    it('should handle missing parent error gracefully', () => {
      const notFoundResponse = {
        success: false,
        data: null,
        error: 'Parent node not found',
        timestamp: new Date().toISOString()
      };
      
      const result = handleParentResponse(notFoundResponse, 1);
      expect(result.data).toBeNull();
    });
    
    it('should warn about unexpected parent errors', () => {
      const unexpectedError = {
        success: false,
        data: null,
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      };
      
      // Mock console.warn to capture the warning
      const originalWarn = console.warn;
      let warningCaptured = '';
      console.warn = (msg: string) => { warningCaptured = msg; };
      
      handleParentResponse(unexpectedError, 1);
      
      // Restore console.warn
      console.warn = originalWarn;
      
      expect(warningCaptured).toContain('Database connection failed');
    });
  });
  
  describe('Mesh Quality Settings', () => {
    
    interface MeshQualitySettings {
      segments: number;
      diameter: number;
    }
    
    const validateMeshQuality = (settings: MeshQualitySettings): boolean => {
      return settings.segments > 0 && settings.diameter > 0;
    };
    
    it('should validate positive mesh quality values', () => {
      expect(validateMeshQuality({ segments: 16, diameter: 0.5 })).toBe(true);
      expect(validateMeshQuality({ segments: 32, diameter: 1.0 })).toBe(true);
    });
    
    it('should reject invalid mesh quality values', () => {
      expect(validateMeshQuality({ segments: 0, diameter: 0.5 })).toBe(false);
      expect(validateMeshQuality({ segments: 16, diameter: 0 })).toBe(false);
      expect(validateMeshQuality({ segments: -1, diameter: 0.5 })).toBe(false);
    });
  });
});