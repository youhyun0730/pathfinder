// ノードタイプ
export type NodeType = 'center' | 'current' | 'skill' | 'cert' | 'position' | 'goal';

// ノード定義
export interface GraphNode {
  id: string;
  graphId: string;
  nodeType: NodeType;
  label: string;
  description: string;
  requiredExp: number;
  currentExp: number;
  parentIds: string[];
  positionX: number;
  positionY: number;
  color: string;
  metadata?: {
    suggestedResources?: string[];
    [key: string]: any;
  };
  createdAt: string;
}

// エッジ定義
export interface GraphEdge {
  id: string;
  graphId: string;
  fromNodeId: string;
  toNodeId: string;
}

// グラフ定義
export interface Graph {
  id: string;
  userId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// プロファイル定義
export interface UserProfile {
  id: string;
  answers: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// 目標定義
export interface Goal {
  id: string;
  userId: string;
  description: string;
  targetNodeId: string;
  recommendedPath: string[];
  createdAt: string;
}

// オンボーディング回答
export interface OnboardingAnswer {
  questionId: string;
  question: string;
  answer: string | string[] | number;
}

// LLM現在地分類レスポンス
export interface CurrentPositionClassification {
  category: string;
  currentPosition: string;
  reasoning: string;
}

// LLMツリー生成レスポンス
export interface GeneratedNode {
  nodeType: NodeType;
  label: string;
  description: string;
  requiredExp: number;
  parentLabels?: string[];
  suggestedResources?: string[];
}

export interface TreeGenerationResponse {
  nodes: GeneratedNode[];
  reasoning: string;
}

// React Flow用の型拡張
export interface FlowNode extends GraphNode {
  position: { x: number; y: number };
  data: {
    label: string;
    progress: number;
    isLocked: boolean;
    nodeType: NodeType;
  };
}

export interface FlowEdge extends GraphEdge {
  source: string;
  target: string;
}

// Supabase Database型定義
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>;
        Update: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>>;
      };
      graphs: {
        Row: Graph;
        Insert: Omit<Graph, 'id' | 'createdAt' | 'updatedAt'>;
        Update: Partial<Omit<Graph, 'id' | 'createdAt' | 'updatedAt'>>;
      };
      nodes: {
        Row: GraphNode;
        Insert: Omit<GraphNode, 'id' | 'createdAt'>;
        Update: Partial<Omit<GraphNode, 'id' | 'createdAt'>>;
      };
      edges: {
        Row: GraphEdge;
        Insert: Omit<GraphEdge, 'id'>;
        Update: Partial<Omit<GraphEdge, 'id'>>;
      };
      goals: {
        Row: Goal;
        Insert: Omit<Goal, 'id' | 'createdAt'>;
        Update: Partial<Omit<Goal, 'id' | 'createdAt'>>;
      };
    };
  };
}
