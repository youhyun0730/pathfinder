import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // Create Supabase client with user's token
    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { goalDescription, graphId } = await request.json();

    if (!goalDescription || !graphId) {
      return NextResponse.json(
        { error: '目標の説明とグラフIDが必要です' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    // Get the user's current graph nodes
    const { data: existingNodes } = await supabase
      .from('nodes')
      .select('*')
      .eq('graph_id', graphId);

    if (!existingNodes || existingNodes.length === 0) {
      return NextResponse.json(
        { error: 'グラフにノードが見つかりません' },
        { status: 404 }
      );
    }

    // Get graph to verify ownership
    const { data: graph } = await supabase
      .from('graphs')
      .select('user_id')
      .eq('id', graphId)
      .single();

    if (!graph) {
      return NextResponse.json(
        { error: 'グラフが見つかりません' },
        { status: 404 }
      );
    }

    const userId = user.id;

    // Prepare node information for LLM
    const nodesSummary = existingNodes
      .map(n => `- ${n.label} (${n.node_type}): ${n.description}`)
      .join('\n');

    // Create the prompt
    const prompt = `あなたは人生とキャリアのコーチです。ユーザーの目標達成を支援してください。

ユーザーの目標:
${goalDescription}

現在のスキルツリーノード:
${nodesSummary}

タスク:
1. ユーザーの目標を分析する
2. 現在のスキルツリーから、目標達成に最も関連するノードを特定する
3. 目標達成までの推奨パス（ノードのラベルの配列）を提案する
4. 必要に応じて、追加すべき新しいノード（スキル、資格、ポジション）を提案する

出力形式（JSON）:
{
  "targetNodeLabel": "目標に最も近い既存ノードのラベル",
  "recommendedPath": ["ノード1のラベル", "ノード2のラベル", ...],
  "reasoning": "推奨パスの理由の説明",
  "suggestedNewNodes": [
    {
      "nodeType": "skill" | "cert" | "position",
      "label": "ノード名",
      "description": "詳細な説明",
      "requiredExp": 100,
      "parentLabel": "親ノードのラベル",
      "suggestedResources": ["リソース1", "リソース2"]
    }
  ]
}

既存のノードで目標達成が可能な場合は、suggestedNewNodesは空配列にしてください。
推奨パスは、現在地から目標まで段階的に進むべきノードの順序です。`;

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log('LLM Response:', responseText);

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from LLM response');
      throw new Error('LLMからの応答が不正です');
    }

    const goalData = JSON.parse(jsonMatch[0]);
    console.log('Parsed goal data:', goalData);
    console.log('Looking for target node with label:', goalData.targetNodeLabel);
    console.log('Available nodes:', existingNodes.map(n => n.label));

    // Find the target node (柔軟なマッチング)
    // LLMが "ノード名 (type)" の形式で返す場合に対応
    let targetNode = existingNodes.find(
      n => n.label === goalData.targetNodeLabel
    );

    // 完全一致しない場合、部分一致を試みる
    if (!targetNode) {
      // " (skill)", " (cert)", " (position)" を除去して再検索
      const cleanedLabel = goalData.targetNodeLabel.replace(/\s*\((skill|cert|position)\)\s*$/i, '').trim();
      targetNode = existingNodes.find(n => n.label === cleanedLabel);

      console.log('Cleaned label:', cleanedLabel);
    }

    if (!targetNode) {
      console.error('Target node not found. Available labels:', existingNodes.map(n => n.label));
      console.error('Looking for:', goalData.targetNodeLabel);
      return NextResponse.json(
        { error: '目標ノードが見つかりません',
          availableNodes: existingNodes.map(n => n.label),
          requestedLabel: goalData.targetNodeLabel
        },
        { status: 404 }
      );
    }

    // Build recommended path (array of node IDs) - will be built as we create nodes
    const recommendedPath: string[] = [];
    const nodeMap = new Map<string, string>();
    existingNodes.forEach(n => nodeMap.set(n.label, n.id));

    // Add existing nodes from LLM's recommended path to the map
    for (const label of goalData.recommendedPath || []) {
      // 完全一致を試みる
      let node = existingNodes.find(n => n.label === label);

      // 完全一致しない場合、タイプ情報を除去して再検索
      if (!node) {
        const cleanedLabel = label.replace(/\s*\((skill|cert|position)\)\s*$/i, '').trim();
        node = existingNodes.find(n => n.label === cleanedLabel);
      }

      if (node) {
        recommendedPath.push(node.id);
      }
    }

    // Create new nodes if suggested
    let newNodesCount = 0;
    const colorMap: Record<string, string> = {
      skill: '#7ED321',
      cert: '#9013FE',
      position: '#F5A623',
    };

    if (goalData.suggestedNewNodes && goalData.suggestedNewNodes.length > 0) {
      for (const newNodeData of goalData.suggestedNewNodes) {
        // 親ノードを検索（柔軟なマッチング）
        let parentNode = existingNodes.find(
          n => n.label === newNodeData.parentLabel
        );

        // 完全一致しない場合、タイプ情報を除去して再検索
        if (!parentNode) {
          const cleanedLabel = newNodeData.parentLabel.replace(/\s*\((skill|cert|position)\)\s*$/i, '').trim();
          parentNode = existingNodes.find(n => n.label === cleanedLabel);
        }

        if (!parentNode) {
          console.error('Parent node not found for:', newNodeData.label, 'Parent:', newNodeData.parentLabel);
          continue;
        }

        const newNode = {
          graph_id: graphId,
          node_type: newNodeData.nodeType,
          label: newNodeData.label,
          description: newNodeData.description,
          required_exp: newNodeData.requiredExp || 100,
          current_exp: 0,
          parent_ids: [parentNode.id],
          color: colorMap[newNodeData.nodeType] || '#4A90E2',
          is_locked: true,
          metadata: { suggestedResources: newNodeData.suggestedResources || [] },
        };

        const { data: createdNode, error: nodeError } = await supabase
          .from('nodes')
          .insert(newNode)
          .select()
          .single();

        if (nodeError) {
          console.error('Node creation error:', nodeError);
          console.error('Failed node data:', newNode);
          continue;
        }

        if (createdNode) {
          nodeMap.set(newNodeData.label, createdNode.id);
          recommendedPath.push(createdNode.id);
          newNodesCount++;

          // Create edge
          const { error: edgeError } = await supabase.from('edges').insert({
            graph_id: graphId,
            from_node_id: parentNode.id,
            to_node_id: createdNode.id,
          });

          if (edgeError) {
            console.error('Edge creation error:', edgeError);
          }
        }
      }
    }

    // 目標ノードを作成
    const goalNode = {
      graph_id: graphId,
      node_type: 'goal',
      label: `目標: ${goalDescription.substring(0, 30)}${goalDescription.length > 30 ? '...' : ''}`,
      description: goalDescription,
      required_exp: 0,
      current_exp: 0,
      parent_ids: [targetNode.id],
      color: '#FF6B9D',
      is_locked: true,
      metadata: {
        reasoning: goalData.reasoning,
        originalDescription: goalDescription
      },
    };

    const { data: createdGoalNode, error: goalNodeError } = await supabase
      .from('nodes')
      .insert(goalNode)
      .select()
      .single();

    if (goalNodeError) {
      console.error('Goal node creation error:', goalNodeError);
      throw new Error('目標ノードの作成に失敗しました');
    }

    // 目標ノードへのエッジを作成
    await supabase.from('edges').insert({
      graph_id: graphId,
      from_node_id: targetNode.id,
      to_node_id: createdGoalNode.id,
    });

    // 推奨パスに目標ノードを追加
    recommendedPath.push(createdGoalNode.id);

    console.log('Final recommended path (IDs):', recommendedPath);
    console.log('Final recommended path (labels):', recommendedPath.map(id => {
      const node = [...existingNodes, createdGoalNode].find(n => n.id === id);
      return node ? node.label : 'Unknown';
    }));

    // Save the goal
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        description: goalDescription,
        target_node_id: createdGoalNode.id,
        recommended_path: recommendedPath,
      })
      .select()
      .single();

    if (goalError) {
      throw goalError;
    }

    return NextResponse.json({
      success: true,
      goal,
      goalNode: createdGoalNode,
      newNodes: newNodesCount + 1,
      reasoning: goalData.reasoning,
    });
  } catch (error) {
    console.error('Goal generation error:', error);
    return NextResponse.json(
      { error: '目標の生成に失敗しました', details: (error as Error).message },
      { status: 500 }
    );
  }
}
