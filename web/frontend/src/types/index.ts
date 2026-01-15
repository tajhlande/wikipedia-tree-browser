// TypeScript interfaces for API responses and application state

// Basic types
export type Vector3D = [number, number, number];

export interface Namespace {
  name: string;
  display_name: string;
  language: string;
}

export interface ClusterNode {
  id: number;
  namespace: string;
  label: string;
  final_label: string;
  depth: number;
  is_leaf: boolean;
  centroid: Vector3D;
  size: number;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: number;
  namespace: string;
  title: string;
  page_id: number;
  cluster_id: number;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Application state types
export type AppState = {
  currentView: 'namespace_selection' | 'node_view';
  currentNamespace: string | null;
  currentNode: ClusterNode | null;
  showBillboards: boolean; // Whether billboard labels are visible
  loading: boolean;
  leafNode: ClusterNode | null;
  leafNodeInfoVisible: boolean; // whether leaf node info is showing or not
  error: string | null;
};

export type NodeCache = {
  [key: string]: ClusterNode | ClusterNode[];
};

export type PageCache = {
  [key: string]: Page | Page[];
};

// Ancestor visualization constants
export const ANCESTOR_VISUALIZATION = {
  EXTENDED_LINK_LENGTH_MULTIPLIER: 3, // 3x normal link length
  ANCESTOR_NODE_SCALE: 0.7, // Smaller size for ancestor nodes
  ANCESTOR_LINK_OPACITY: 0.6, // Semi-transparent links for ancestors
  ANCESTOR_NODE_OPACITY: 0.8, // Semi-transparent nodes for ancestors
};

// Constants
export const API_BASE_URL = 'http://localhost:8000/api';

export const COLORS = {
  ROOT: '#FF0000', // Red
  LEAF: '#3366CC', // Wikipedia blue
  DEPTH: [
    '#FF8C00', // Orange
    '#FFA500',
    '#FFB700',
    '#FFC900',
    '#FFD900',
    '#FFE900',
    '#E6FF00',
    '#CCFF00',
    '#B3FF00',
    '#99FF00',
    '#80FF00', // Green
  ]
};

export const MESH_SETTINGS = {
  SPHERE_SEGMENTS: 16,
  LINK_SEGMENTS: 8,
  SPHERE_DIAMETER: 0.5,
  LINK_THICKNESS: 0.1,
  LINK_END_OFFSET: 0.2,
};