import { GraphNode, GraphEdge } from '@/types';
import { stratify, tree } from 'd3-hierarchy';

/**
 * D3ベースの改良された放射状レイアウトアルゴリズム
 * ツリー構造を最適化して配置し、ノードの重なりを防ぐ
 */
export function calculateRadialLayout(
  nodes: GraphNode[],
  edges: GraphEdge[]
): GraphNode[] {
  // 中心ノードを見つける
  const centerNode = nodes.find(n => n.nodeType === 'center');
  if (!centerNode) {
    return calculateGridLayout(nodes);
  }

  // 階層構造を構築
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  edges.forEach(edge => {
    const sourceId = edge.fromNodeId;
    const targetId = edge.toNodeId;

    if (!childrenMap.has(sourceId)) {
      childrenMap.set(sourceId, []);
    }
    childrenMap.get(sourceId)!.push(targetId);
    parentMap.set(targetId, sourceId);
  });

  // 階層データを構築（D3用）
  interface HierarchyData {
    id: string;
    parentId: string | null;
    node: GraphNode;
  }

  const hierarchyData: HierarchyData[] = nodes.map(node => ({
    id: node.id,
    parentId: parentMap.get(node.id) || null,
    node,
  }));

  try {
    // D3のstratifyで階層構造を作成
    const root = stratify<HierarchyData>()
      .id(d => d.id)
      .parentId(d => d.parentId)
      (hierarchyData);

    // ツリーレイアウトを適用（デカルト座標）
    const treeLayout = tree<HierarchyData>()
      .size([2 * Math.PI, 1]) // 角度と深さ
      .separation((a, b) => {
        // 兄弟ノード間の距離を調整
        return (a.parent === b.parent ? 1 : 2) / a.depth;
      });

    const treeRoot = treeLayout(root);

    // ノード位置を計算（放射状に変換）
    const layoutNodes: GraphNode[] = [];
    const minNodeDistance = 200; // ノード間の最小距離

    treeRoot.each(node => {
      const graphNode = node.data.node;

      if (node.depth === 0) {
        // 中心ノード
        layoutNodes.push({
          ...graphNode,
          positionX: 0,
          positionY: 0,
        });
      } else {
        // 角度と半径を計算
        const angle = node.x; // D3が計算した角度（0-2π）

        // 深さに基づく半径（子の数に応じて動的に調整）
        const baseRadius = 350;
        const radiusIncrement = 300;

        // サブツリーのサイズに基づいて半径を調整
        const descendants = node.descendants().length;
        const radiusAdjustment = Math.log(descendants + 1) * 50;

        const radius = baseRadius + (node.depth - 1) * radiusIncrement + radiusAdjustment;

        // 極座標からデカルト座標に変換
        const x = Math.cos(angle - Math.PI / 2) * radius;
        const y = Math.sin(angle - Math.PI / 2) * radius;

        layoutNodes.push({
          ...graphNode,
          positionX: x,
          positionY: y,
        });
      }
    });

    // 衝突検出と調整
    const adjustedNodes = adjustForCollisions(layoutNodes, minNodeDistance);

    return adjustedNodes;
  } catch (error) {
    console.error('D3 layout error:', error);
    // フォールバック：旧アルゴリズム
    return calculateRadialLayoutFallback(nodes, edges);
  }
}

/**
 * 衝突検出と位置調整
 */
function adjustForCollisions(nodes: GraphNode[], minDistance: number): GraphNode[] {
  const adjustedNodes = [...nodes];
  const iterations = 50;
  const pushStrength = 5;

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < adjustedNodes.length; i++) {
      for (let j = i + 1; j < adjustedNodes.length; j++) {
        const nodeA = adjustedNodes[i];
        const nodeB = adjustedNodes[j];

        // 中心ノードは動かさない
        if (nodeA.nodeType === 'center' || nodeB.nodeType === 'center') {
          continue;
        }

        const dx = nodeB.positionX - nodeA.positionX;
        const dy = nodeB.positionY - nodeA.positionY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance && distance > 0) {
          // 重なっているので押し離す
          const angle = Math.atan2(dy, dx);
          const pushDistance = (minDistance - distance) / 2 * pushStrength / iterations;

          nodeA.positionX -= Math.cos(angle) * pushDistance;
          nodeA.positionY -= Math.sin(angle) * pushDistance;
          nodeB.positionX += Math.cos(angle) * pushDistance;
          nodeB.positionY += Math.sin(angle) * pushDistance;
        }
      }
    }
  }

  return adjustedNodes;
}

/**
 * 旧アルゴリズムのフォールバック
 */
function calculateRadialLayoutFallback(
  nodes: GraphNode[],
  edges: GraphEdge[]
): GraphNode[] {
  const centerNode = nodes.find(n => n.nodeType === 'center');
  if (!centerNode) {
    return calculateGridLayout(nodes);
  }

  const layoutNodes: GraphNode[] = nodes.map(n => ({
    ...n,
    positionX: 0,
    positionY: 0
  }));

  const centerIndex = layoutNodes.findIndex(n => n.id === centerNode.id);
  layoutNodes[centerIndex].positionX = 0;
  layoutNodes[centerIndex].positionY = 0;

  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  edges.forEach(edge => {
    const sourceId = edge.fromNodeId;
    const targetId = edge.toNodeId;

    if (!childrenMap.has(sourceId)) {
      childrenMap.set(sourceId, []);
    }
    childrenMap.get(sourceId)!.push(targetId);
    parentMap.set(targetId, sourceId);
  });

  const nodeAngles = new Map<string, number>();
  const queue: string[] = [centerNode.id];
  const visited = new Set<string>([centerNode.id]);
  let level = 0;

  while (queue.length > 0) {
    const levelSize = queue.length;
    const nodesAtLevel: GraphNode[] = [];

    for (let i = 0; i < levelSize; i++) {
      const nodeId = queue.shift()!;
      const node = layoutNodes.find(n => n.id === nodeId)!;
      nodesAtLevel.push(node);

      const children = childrenMap.get(nodeId) || [];
      children.forEach(childId => {
        if (!visited.has(childId)) {
          visited.add(childId);
          queue.push(childId);
        }
      });
    }

    if (level === 1) {
      const radius = 350;
      const angleStep = (2 * Math.PI) / nodesAtLevel.length;
      nodesAtLevel.forEach((node, index) => {
        const angle = index * angleStep - Math.PI / 2;
        node.positionX = Math.cos(angle) * radius;
        node.positionY = Math.sin(angle) * radius;
        nodeAngles.set(node.id, angle);
      });
    } else if (level > 1) {
      const radius = 350 + (level - 1) * 300;
      nodesAtLevel.forEach(node => {
        const parentId = parentMap.get(node.id);
        const parentAngle = nodeAngles.get(parentId || '') || 0;
        node.positionX = Math.cos(parentAngle) * radius;
        node.positionY = Math.sin(parentAngle) * radius;
        nodeAngles.set(node.id, parentAngle);
      });
    }

    level++;
  }

  return layoutNodes;
}

/**
 * グリッドレイアウト（フォールバック用）
 */
export function calculateGridLayout(nodes: GraphNode[]): GraphNode[] {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const spacing = 350;

  return nodes.map((node, index) => ({
    ...node,
    positionX: (index % cols) * spacing,
    positionY: Math.floor(index / cols) * spacing,
  }));
}

/**
 * 力指向グラフレイアウト（簡易版）
 */
export function calculateForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  iterations: number = 50
): GraphNode[] {
  const layoutNodes = nodes.map(n => ({
    ...n,
    vx: 0,
    vy: 0,
  }));

  const repulsionStrength = 5000;
  const attractionStrength = 0.01;
  const damping = 0.8;

  for (let iter = 0; iter < iterations; iter++) {
    // 反発力（全ノード間）
    for (let i = 0; i < layoutNodes.length; i++) {
      for (let j = i + 1; j < layoutNodes.length; j++) {
        const dx = layoutNodes[j].positionX - layoutNodes[i].positionX;
        const dy = layoutNodes[j].positionY - layoutNodes[i].positionY;
        const distance = Math.sqrt(dx * dx + dy * dy) + 0.1;
        const force = repulsionStrength / (distance * distance);

        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        layoutNodes[i].vx -= fx;
        layoutNodes[i].vy -= fy;
        layoutNodes[j].vx += fx;
        layoutNodes[j].vy += fy;
      }
    }

    // 引力（エッジでつながったノード間）
    edges.forEach(edge => {
      const source = layoutNodes.find(n => n.id === edge.fromNodeId);
      const target = layoutNodes.find(n => n.id === edge.toNodeId);
      if (!source || !target) return;

      const dx = target.positionX - source.positionX;
      const dy = target.positionY - source.positionY;
      const force = attractionStrength;

      const fx = dx * force;
      const fy = dy * force;

      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    });

    // 位置更新
    layoutNodes.forEach(node => {
      // 中心ノードは固定
      if (node.nodeType === 'center') {
        node.positionX = 0;
        node.positionY = 0;
        node.vx = 0;
        node.vy = 0;
        return;
      }

      node.positionX += node.vx;
      node.positionY += node.vy;
      node.vx *= damping;
      node.vy *= damping;
    });
  }

  return layoutNodes;
}
