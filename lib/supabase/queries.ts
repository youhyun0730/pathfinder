import { supabase } from './client';
import { GraphNode, GraphEdge, Graph, Goal, UserProfile } from '@/types';

// プロファイル取得
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as UserProfile;
};

// グラフ取得
export const getUserGraph = async (userId: string) => {
  const { data, error } = await supabase
    .from('graphs')
    .select('*')
    .eq('user_id', userId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data as Graph;
};

// ノード取得
export const getGraphNodes = async (graphId: string) => {
  const { data, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('graph_id', graphId);

  if (error) throw error;
  return data as GraphNode[];
};

// エッジ取得
export const getGraphEdges = async (graphId: string) => {
  const { data, error } = await supabase
    .from('edges')
    .select('*')
    .eq('graph_id', graphId);

  if (error) throw error;
  return data as GraphEdge[];
};

// 目標取得
export const getUserGoals = async (userId: string) => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Goal[];
};

// 完全なグラフデータ取得
export const getFullGraphData = async (userId: string) => {
  const graph = await getUserGraph(userId);
  const [nodes, edges, goals] = await Promise.all([
    getGraphNodes(graph.id),
    getGraphEdges(graph.id),
    getUserGoals(userId),
  ]);

  return { graph, nodes, edges, goals };
};
