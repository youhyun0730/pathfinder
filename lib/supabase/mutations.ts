import { supabase } from './client';
import { GraphNode, GraphEdge, Goal, OnboardingAnswer } from '@/types';

// プロファイル作成
export const createUserProfile = async (
  userId: string,
  answers: OnboardingAnswer[]
) => {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      answers: answers.reduce((acc, a) => ({ ...acc, [a.questionId]: a.answer }), {}),
    })
    .select()
    .single();

  if (error) {
    if (error.code === '42501' || error.message?.includes('quota')) {
      throw new Error('DATABASE_QUOTA_EXCEEDED');
    }
    if (error.code === '23505') {
      throw new Error('PROFILE_ALREADY_EXISTS');
    }
    throw error;
  }
  return data;
};

// グラフ作成
export const createGraph = async (userId: string) => {
  const { data, error } = await supabase
    .from('graphs')
    .insert({
      user_id: userId,
      version: 1,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '42501' || error.message?.includes('quota')) {
      throw new Error('DATABASE_QUOTA_EXCEEDED');
    }
    throw error;
  }
  return data;
};

// ノード作成（複数）
export const createNodes = async (nodes: Omit<GraphNode, 'id' | 'createdAt'>[]) => {
  const { data, error } = await supabase
    .from('nodes')
    .insert(nodes)
    .select();

  if (error) {
    if (error.code === '42501' || error.message?.includes('quota')) {
      throw new Error('DATABASE_QUOTA_EXCEEDED');
    }
    throw error;
  }
  return data;
};

// ノード更新
export const updateNode = async (
  nodeId: string,
  updates: Partial<Omit<GraphNode, 'id' | 'createdAt'>>
) => {
  const { data, error } = await supabase
    .from('nodes')
    .update(updates)
    .eq('id', nodeId)
    .select()
    .single();

  if (error) {
    if (error.code === '42501' || error.message?.includes('quota')) {
      throw new Error('DATABASE_QUOTA_EXCEEDED');
    }
    throw error;
  }
  return data;
};

// ノード削除（子孫も削除）
export const deleteNodeAndDescendants = async (nodeId: string, graphId: string) => {
  // 子孫ノードを再帰的に取得
  const descendants = await getDescendantNodes(nodeId, graphId);
  const allNodeIds = [nodeId, ...descendants.map(n => n.id)];

  // エッジ削除
  await supabase
    .from('edges')
    .delete()
    .in('from_node_id', allNodeIds)
    .eq('graph_id', graphId);

  await supabase
    .from('edges')
    .delete()
    .in('to_node_id', allNodeIds)
    .eq('graph_id', graphId);

  // ノード削除
  const { error } = await supabase
    .from('nodes')
    .delete()
    .in('id', allNodeIds);

  if (error) {
    if (error.code === '42501' || error.message?.includes('quota')) {
      throw new Error('DATABASE_QUOTA_EXCEEDED');
    }
    throw error;
  }
  return allNodeIds;
};

// エッジ作成（複数）
export const createEdges = async (edges: Omit<GraphEdge, 'id'>[]) => {
  const { data, error } = await supabase
    .from('edges')
    .insert(edges)
    .select();

  if (error) {
    if (error.code === '42501' || error.message?.includes('quota')) {
      throw new Error('DATABASE_QUOTA_EXCEEDED');
    }
    throw error;
  }
  return data;
};

// 目標作成
export const createGoal = async (
  userId: string,
  description: string,
  targetNodeId: string,
  recommendedPath: string[]
) => {
  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      description,
      target_node_id: targetNodeId,
      recommended_path: recommendedPath,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '42501' || error.message?.includes('quota')) {
      throw new Error('DATABASE_QUOTA_EXCEEDED');
    }
    throw error;
  }
  return data;
};

// ノードEXP更新
export const updateNodeExp = async (nodeId: string, expIncrement: number) => {
  const { data: node } = await supabase
    .from('nodes')
    .select('current_exp, required_exp')
    .eq('id', nodeId)
    .single();

  if (!node) throw new Error('Node not found');

  const newExp = Math.min(node.current_exp + expIncrement, node.required_exp);

  return updateNode(nodeId, { currentExp: newExp });
};

// ヘルパー: 子孫ノード取得
async function getDescendantNodes(nodeId: string, graphId: string): Promise<GraphNode[]> {
  const { data: edges } = await supabase
    .from('edges')
    .select('to_node_id')
    .eq('from_node_id', nodeId)
    .eq('graph_id', graphId);

  if (!edges || edges.length === 0) return [];

  const childIds = edges.map(e => e.to_node_id);
  const { data: children } = await supabase
    .from('nodes')
    .select('*')
    .in('id', childIds);

  if (!children) return [];

  const allDescendants = [...children];
  for (const child of children) {
    const descendants = await getDescendantNodes(child.id, graphId);
    allDescendants.push(...descendants);
  }

  return allDescendants;
}
