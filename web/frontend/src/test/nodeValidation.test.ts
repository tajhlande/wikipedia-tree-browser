import { describe, it, expect } from 'vitest';
import type { ClusterNode } from '../types';

/**
 * Node Validation Tests
 * Tests for node data validation logic
 */
describe('Node Validation', () => {
  
  const validateNode = (node: ClusterNode): { valid: boolean; reason?: string } => {
    if (!node || !node.id) {
      return { valid: false, reason: 'Missing required fields' };
    }
    
    if (node.centroid === undefined) {
      return { valid: true, reason: 'Missing centroid (will use origin)' };
    }
    
    if (!Array.isArray(node.centroid) || node.centroid.length !== 3) {
      return { valid: false, reason: 'Invalid centroid format' };
    }
    
    // Check for NaN or Infinite values
    const [x, y, z] = node.centroid;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number' ||
        isNaN(x) || isNaN(y) || isNaN(z) || !isFinite(x) || !isFinite(y) || !isFinite(z)) {
      return { valid: false, reason: 'Invalid centroid values (non-number, NaN or Infinite)' };
    }
    
    return { valid: true };
  };
  
  describe('Valid Nodes', () => {
    
    it('should accept nodes with valid centroids', () => {
      const validNode: ClusterNode = {
        id: 1,
        namespace: 'test',
        label: 'Valid Node',
        final_label: 'Valid Node',
        depth: 1,
        is_leaf: false,
        centroid: [1.5, -2.3, 0.7],
        size: 100,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = validateNode(validNode);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });
    
    it('should accept nodes with zero centroids', () => {
      const zeroNode: ClusterNode = {
        id: 2,
        namespace: 'test',
        label: 'Zero Node',
        final_label: 'Zero Node',
        depth: 1,
        is_leaf: false,
        centroid: [0, 0, 0],
        size: 100,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = validateNode(zeroNode);
      expect(result.valid).toBe(true);
    });
    
    it('should accept nodes with large centroid values', () => {
      const largeNode: ClusterNode = {
        id: 3,
        namespace: 'test',
        label: 'Large Node',
        final_label: 'Large Node',
        depth: 1,
        is_leaf: false,
        centroid: [1000, -2000, 3000],
        size: 100,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = validateNode(largeNode);
      expect(result.valid).toBe(true);
    });
    
    it('should accept nodes with missing centroids (will use fallback position)', () => {
      const missingCentroidNode: ClusterNode = {
        id: 4,
        namespace: 'test',
        label: 'Missing Centroid',
        final_label: 'Missing Centroid',
        depth: 1,
        is_leaf: false,
        centroid: undefined,
        size: 100,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = validateNode(missingCentroidNode);
      expect(result.valid).toBe(true);
      expect(result.reason).toContain('Missing centroid');
    });
  });
  
  describe('Invalid Nodes', () => {
    
    it('should reject nodes with missing ID', () => {
      const missingIdNode = {
        namespace: 'test',
        label: 'Missing ID',
        final_label: 'Missing ID',
        depth: 1,
        is_leaf: false,
        centroid: [1, 2, 3],
        size: 100,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any as ClusterNode;
      
      const result = validateNode(missingIdNode);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Missing required fields');
    });
    
    it('should reject nodes with null data', () => {
      const result = validateNode(null as any);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Missing required fields');
    });
    
    it('should reject nodes with invalid centroid format', () => {
      const invalidFormatNode: ClusterNode = {
        id: 5,
        namespace: 'test',
        label: 'Invalid Format',
        final_label: 'Invalid Format',
        depth: 1,
        is_leaf: false,
        centroid: [1, 2] as any, // Wrong length
        size: 100,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = validateNode(invalidFormatNode);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid centroid format');
    });
    
    it('should reject nodes with non-array centroids', () => {
      const nonArrayNode: ClusterNode = {
        id: 6,
        namespace: 'test',
        label: 'Non-Array Centroid',
        final_label: 'Non-Array Centroid',
        depth: 1,
        is_leaf: false,
        centroid: 'not an array' as any,
        size: 100,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = validateNode(nonArrayNode);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid centroid format');
    });
    
    it('should reject nodes with NaN centroid values', () => {
      const nanNode: ClusterNode = {
        id: 7,
        namespace: 'test',
        label: 'NaN Node',
        final_label: 'NaN Node',
        depth: 1,
        is_leaf: false,
        centroid: [NaN, 2, 3],
        size: 100,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = validateNode(nanNode);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid centroid values');
    });
    
    it('should reject nodes with Infinite centroid values', () => {
      const infiniteNode: ClusterNode = {
        id: 8,
        namespace: 'test',
        label: 'Infinite Node',
        final_label: 'Infinite Node',
        depth: 1,
        is_leaf: false,
        centroid: [Infinity, 2, 3],
        size: 100,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = validateNode(infiniteNode);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid centroid values');
    });
    
    it('should reject nodes with string centroid values', () => {
      const stringNode: ClusterNode = {
        id: 9,
        namespace: 'test',
        label: 'String Node',
        final_label: 'String Node',
        depth: 1,
        is_leaf: false,
        centroid: ['1', '2', '3'] as any,
        size: 100,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = validateNode(stringNode);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid centroid values');
    });
  });
  
  describe('Edge Cases', () => {
    
    it('should handle very small centroid values', () => {
      const smallNode: ClusterNode = {
        id: 10,
        namespace: 'test',
        label: 'Small Node',
        final_label: 'Small Node',
        depth: 1,
        is_leaf: false,
        centroid: [0.0001, -0.0001, 0.0001],
        size: 100,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = validateNode(smallNode);
      expect(result.valid).toBe(true);
    });
    
    it('should handle negative centroid values', () => {
      const negativeNode: ClusterNode = {
        id: 11,
        namespace: 'test',
        label: 'Negative Node',
        final_label: 'Negative Node',
        depth: 1,
        is_leaf: false,
        centroid: [-100, -200, -300],
        size: 100,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = validateNode(negativeNode);
      expect(result.valid).toBe(true);
    });
  });
  
  describe('Fallback Position Strategy', () => {
    
    const calculateFallbackPosition = (index: number): {x: number, y: number, z: number} => {
      const FALLBACK_RADIUS = 10;
      const FALLBACK_ANGLE_INCREMENT = Math.PI / 4;
      
      const angle = index * FALLBACK_ANGLE_INCREMENT;
      const x = FALLBACK_RADIUS * Math.cos(angle);
      const z = FALLBACK_RADIUS * Math.sin(angle);
      const y = index % 2 === 0 ? 1 : -1;
      
      return { x, y, z };
    };
    
    it('should generate unique positions for multiple fallback nodes', () => {
      const positions = [];
      for (let i = 0; i < 8; i++) {
        const pos = calculateFallbackPosition(i);
        positions.push(pos);
      }
      
      // All positions should be unique
      const uniquePositions = new Set(positions.map(p => `${p.x},${p.y},${p.z}`));
      expect(uniquePositions.size).toBe(8);
      
      // All positions should be away from origin
      positions.forEach(pos => {
        const distanceFromOrigin = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
        expect(distanceFromOrigin).toBeGreaterThan(9); // FALLBACK_RADIUS = 10
      });
    });
    
    it('should alternate Y positions for better visual distinction', () => {
      const positions = [];
      for (let i = 0; i < 4; i++) {
        const pos = calculateFallbackPosition(i);
        positions.push(pos);
      }
      
      // Should alternate between y=1 and y=-1
      expect(positions[0].y).toBe(1);
      expect(positions[1].y).toBe(-1);
      expect(positions[2].y).toBe(1);
      expect(positions[3].y).toBe(-1);
    });
    
    it('should position nodes in a circle pattern', () => {
      const positions = [];
      for (let i = 0; i < 8; i++) {
        const pos = calculateFallbackPosition(i);
        positions.push(pos);
      }
      
      // All positions should be on a circle in X-Z plane
      const radius = 10;
      positions.forEach(pos => {
        const xzDistance = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        expect(xzDistance).toBeCloseTo(radius, 0.01);
      });
    });
  });
});