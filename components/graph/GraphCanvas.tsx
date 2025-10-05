'use client';

import { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GraphNode, GraphEdge } from '@/types';
import SkillNode from './SkillNode';

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  onNodeLongPress?: (node: GraphNode, event: React.MouseEvent) => void;
  highlightedNodeId?: string; // Single node ID to highlight (goal node)
  onPaneClick?: () => void;
  onMove?: () => void;
}

export default function GraphCanvas({ nodes: graphNodes, edges: graphEdges, onNodeClick, onNodeLongPress, highlightedNodeId, onPaneClick, onMove }: GraphCanvasProps) {
  // GraphNodeをReact Flow Nodeに変換
  const initialNodes: Node[] = useMemo(() => {
    return graphNodes.map((node) => ({
      id: node.id,
      type: 'skillNode',
      position: node.position,
      data: {
        ...node,
        isHighlighted: node.id === highlightedNodeId,
      },
    }));
  }, [graphNodes, highlightedNodeId]);

  // GraphEdgeをReact Flow Edgeに変換
  const initialEdges: Edge[] = useMemo(() => {
    return graphEdges.map((edge) => {
      const sourceId = edge.sourceId || edge.source_id || edge.fromNodeId || edge.from_node_id;
      const targetId = edge.targetId || edge.target_id || edge.toNodeId || edge.to_node_id;

      return {
        id: edge.id,
        source: sourceId,
        target: targetId,
        sourceHandle: null, // 中央から接続
        targetHandle: null, // 中央に接続
        type: 'straight',
        animated: false,
        style: {
          stroke: '#ffffff',
          strokeWidth: 3,
          strokeOpacity: 0.7,
        },
        zIndex: -1,
      };
    });
  }, [graphEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // graphNodesが更新されたらReact Flowのノードも更新
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        onNodeClick(node.data as GraphNode);
      }
    },
    [onNodeClick]
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      if (onNodeLongPress) {
        onNodeLongPress(node.data as GraphNode, event);
      }
    },
    [onNodeLongPress]
  );


  // カスタムノードタイプの定義
  const nodeTypes = useMemo(
    () => ({
      skillNode: SkillNode,
    }),
    []
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={onPaneClick}
        onMove={onMove}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const graphNode = node.data as GraphNode;
            return graphNode.color;
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}
