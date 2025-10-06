'use client';

import { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
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
    return graphNodes.map((node) => {
      // centerとcurrentノードは常にアンロック
      const isCenterOrCurrent = node.nodeType === 'center' || node.nodeType === 'current';

      // ロック状態を計算（parentIdsが存在する場合のみチェック）
      const parentIds = node.parentIds || [];
      const isLocked = !isCenterOrCurrent && parentIds.length > 0 && parentIds.some(parentId => {
        const parentNode = graphNodes.find(n => n.id === parentId);
        if (!parentNode) return true;
        const parentCurrentExp = parentNode.currentExp || 0;
        const parentRequiredExp = parentNode.requiredExp || 100;
        return parentCurrentExp < parentRequiredExp * 0.5;
      });

      return {
        id: node.id,
        type: 'skillNode',
        position: { x: node.positionX, y: node.positionY },
        data: {
          ...node,
          isHighlighted: node.id === highlightedNodeId,
          isLocked,
          onLongPress: onNodeLongPress,
        },
      };
    });
  }, [graphNodes, highlightedNodeId, onNodeLongPress]);

  // GraphEdgeをReact Flow Edgeに変換
  const initialEdges: Edge[] = useMemo(() => {
    return graphEdges.map((edge) => {
      return {
        id: edge.id,
        source: edge.fromNodeId,
        target: edge.toNodeId,
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
