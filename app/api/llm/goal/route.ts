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

ユーザーが入力した目標:
"${goalDescription}"

現在のスキルツリーノード:
${nodesSummary}

タスク:
1. **目標の解釈**: ユーザーが入力した抽象的または具体的な目標を分析し、達成すべき明確な状態として定義してください
   - 目標の具体的な内容（何を達成するか）
   - 必要な能力やスキルのレベル
   - この目標がどのような状態を意味するか

2. **起点の判断**: この目標を達成するための最適な出発点を決定してください
   - **既存ノードから伸ばせる場合**: 現在のスキルツリーから、目標と関連性が高く、そこから自然に伸ばせるノードを選択
   - **既存ノードから伸ばしづらい場合**: 新しい現在地（currentノード）を作成する必要があると判断
     * 例: 既存のツリーが「プログラミング」関連だが、目標が「TOEIC 900点」のように全く異なる分野
     * 例: 目標が既存のスキルツリーと接続点を見つけるのが困難または不自然な場合
     * この場合、centerノードを親とする新しいcurrentノードが作成されます

3. **ステップの設計**: 起点から目標までの学習・成長のステップを設計してください
   - 各ステップで何を習得・達成する必要があるか
   - 段階的に難易度が上がるように設計
   - ステップ数は3〜7ステップが理想的

4. **必要なノードの生成**: 各ステップで必要となる新しいノード（既存のスキルツリーにないもの）を提案してください
   - 各ステップに対応するスキル、資格、ポジション
   - 前のステップのノードを親として、段階的に繋がるように設計

出力形式（JSON）:
{
  "goalNode": {
    "label": "目標の簡潔な名称（30文字以内）",
    "description": "目標の詳細な説明と達成基準",
    "reasoning": "なぜこれが適切な目標の定義か"
  },
  "needsNewCenter": true | false,
  "newCurrentNode": {
    "label": "新しい現在地の名称",
    "description": "この分野における現在の状態"
  },
  "startingNodeLabel": "起点となる既存ノードのラベル（needsNewCenter=falseの場合のみ使用）",
  "pathSteps": [
    {
      "stepNumber": 1,
      "description": "このステップで達成すること",
      "nodeType": "skill" | "cert" | "position",
      "label": "ノード名",
      "nodeDescription": "ノードの詳細な説明",
      "requiredExp": 100,
      "suggestedResources": ["リソース1", "リソース2"],
      "isExistingNode": false,
      "existingNodeLabel": "既存ノードを使う場合のみ、そのラベル"
    }
  ],
  "reasoning": "このパス全体の設計理由と学習戦略の説明。needsNewCenter=trueの場合は、なぜ新しいツリーが必要かも説明"
}

重要な注意点:
- **needsNewCenterの判断**: 目標が既存のスキルツリーと分野・領域が大きく異なる場合はtrue、既存ツリーから自然に伸ばせる場合はfalse
- needsNewCenter=trueの場合、newCurrentNodeに新しい現在地（currentノード）の情報を含めてください
- needsNewCenter=falseの場合、startingNodeLabelに既存ノードのラベルを指定してください
- pathStepsは起点ノードから目標ノードまでの**中間ステップ**のみを含めてください（起点と目標自体は含めない）
- 各ステップは前のステップを親として繋がるように設計してください
- 既存のノードで代用できる場合は、isExistingNode: true とし、existingNodeLabelを指定してください
- 目標が既存のノードで達成可能な場合、pathStepsは空配列でも構いません
- ステップは論理的な順序で、段階的に難易度が上がるように配置してください`;

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
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

    let startingNode: { id: string; x: number; y: number } | undefined;
    let createdCurrentNode: { id: string; x: number; y: number } | null = null;

    // Check if we need to create a new current node for a different domain
    if (goalData.needsNewCenter) {
      console.log('Creating new current node for different domain');

      // Find the center node
      const centerNode = existingNodes.find(n => n.node_type === 'center');
      if (!centerNode) {
        return NextResponse.json(
          { error: 'centerノードが見つかりません' },
          { status: 404 }
        );
      }

      // Create a new current node (starting point for this new domain)
      const newCurrent = {
        graph_id: graphId,
        node_type: 'current',
        label: goalData.newCurrentNode.label,
        description: goalData.newCurrentNode.description,
        required_exp: 100,
        current_exp: 0,
        parent_ids: [centerNode.id],
        color: '#FF6B6B',
        is_locked: false,
        metadata: {
          isGoalOriented: true,
          originalGoal: goalDescription
        },
      };

      const { data: currentNode, error: currentError } = await supabase
        .from('nodes')
        .insert(newCurrent)
        .select()
        .single();

      if (currentError) {
        console.error('Current node creation error:', currentError);
        throw new Error('新しい現在地ノードの作成に失敗しました');
      }

      // Create edge from center to new current node
      await supabase.from('edges').insert({
        graph_id: graphId,
        from_node_id: centerNode.id,
        to_node_id: currentNode.id,
      });

      startingNode = currentNode;
      createdCurrentNode = currentNode;
      console.log('Created new current node:', currentNode.id);
    } else {
      // Find the starting node from existing nodes (柔軟なマッチング)
      startingNode = existingNodes.find(
        n => n.label === goalData.startingNodeLabel
      );

      // 完全一致しない場合、部分一致を試みる
      if (!startingNode) {
        const cleanedLabel = goalData.startingNodeLabel.replace(/\s*\((skill|cert|position)\)\s*$/i, '').trim();
        startingNode = existingNodes.find(n => n.label === cleanedLabel);
        console.log('Cleaned label:', cleanedLabel);
      }

      if (!startingNode) {
        console.error('Starting node not found. Available labels:', existingNodes.map(n => n.label));
        console.error('Looking for:', goalData.startingNodeLabel);
        return NextResponse.json(
          {
            error: '起点ノードが見つかりません',
            availableNodes: existingNodes.map(n => n.label),
            requestedLabel: goalData.startingNodeLabel
          },
          { status: 404 }
        );
      }
    }

    // startingNodeが必ず存在することを保証
    if (!startingNode) {
      return NextResponse.json(
        { error: '起点ノードが見つかりません' },
        { status: 404 }
      );
    }

    // Build recommended path starting from the starting node
    // At this point, startingNode is guaranteed to be defined (early return if undefined)
    const recommendedPath: string[] = [startingNode!.id];
    const colorMap: Record<string, string> = {
      skill: '#7ED321',
      cert: '#9013FE',
      position: '#F5A623',
    };

    // Process path steps and create nodes
    let newNodesCount = 0;
    let lastParentId = startingNode!.id;

    if (goalData.pathSteps && goalData.pathSteps.length > 0) {
      // Sort steps by stepNumber to ensure correct order
      const sortedSteps = [...goalData.pathSteps].sort((a, b) => a.stepNumber - b.stepNumber);

      for (const step of sortedSteps) {
        let stepNodeId: string;

        // Check if this step uses an existing node
        if (step.isExistingNode && step.existingNodeLabel) {
          let existingNode = existingNodes.find(n => n.label === step.existingNodeLabel);

          if (!existingNode) {
            const cleanedLabel = step.existingNodeLabel.replace(/\s*\((skill|cert|position)\)\s*$/i, '').trim();
            existingNode = existingNodes.find(n => n.label === cleanedLabel);
          }

          if (existingNode) {
            stepNodeId = existingNode.id;
            recommendedPath.push(stepNodeId);

            // Create edge from last parent to this existing node if not already connected
            const { error: edgeError } = await supabase.from('edges').insert({
              graph_id: graphId,
              from_node_id: lastParentId,
              to_node_id: stepNodeId,
            });

            if (edgeError && !edgeError.message.includes('duplicate')) {
              console.error('Edge creation error:', edgeError);
            }

            lastParentId = stepNodeId;
            continue;
          }
        }

        // Create new node for this step
        const newNode = {
          graph_id: graphId,
          node_type: step.nodeType,
          label: step.label,
          description: step.nodeDescription || step.description,
          required_exp: step.requiredExp || 100,
          current_exp: 0,
          parent_ids: [lastParentId],
          color: colorMap[step.nodeType] || '#4A90E2',
          is_locked: true,
          metadata: {
            suggestedResources: step.suggestedResources || [],
            stepNumber: step.stepNumber,
            stepDescription: step.description
          },
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
          stepNodeId = createdNode.id;
          recommendedPath.push(stepNodeId);
          newNodesCount++;

          // Create edge from last parent to this new node
          const { error: edgeError } = await supabase.from('edges').insert({
            graph_id: graphId,
            from_node_id: lastParentId,
            to_node_id: stepNodeId,
          });

          if (edgeError) {
            console.error('Edge creation error:', edgeError);
          }

          lastParentId = stepNodeId;
        }
      }
    }

    // Create the goal node
    const goalNode = {
      graph_id: graphId,
      node_type: 'goal',
      label: goalData.goalNode.label,
      description: goalData.goalNode.description,
      required_exp: 0,
      current_exp: 0,
      parent_ids: [lastParentId],
      color: '#FF6B9D',
      is_locked: true,
      metadata: {
        reasoning: goalData.goalNode.reasoning,
        originalDescription: goalDescription,
        pathReasoning: goalData.reasoning
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

    // Create edge from last step to goal node
    await supabase.from('edges').insert({
      graph_id: graphId,
      from_node_id: lastParentId,
      to_node_id: createdGoalNode.id,
    });

    // Add goal node to recommended path
    recommendedPath.push(createdGoalNode.id);

    console.log('Final recommended path (IDs):', recommendedPath);
    console.log('Path steps count:', goalData.pathSteps?.length || 0);

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
      newNodes: newNodesCount + 1 + (createdCurrentNode ? 1 : 0), // +1 for goal node, +1 for current node if created
      reasoning: goalData.reasoning,
      pathStepsCount: goalData.pathSteps?.length || 0,
      createdNewCenter: !!createdCurrentNode,
      currentNode: createdCurrentNode,
    });
  } catch (error) {
    console.error('Goal generation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'QUOTA_EXCEEDED' || errorMessage === 'SERVICE_OVERLOADED') {
      return NextResponse.json(
        { error: 'サービスが混み合っています。しばらく時間をおいてから再度お試しください。' },
        { status: 503 }
      );
    }

    if (errorMessage === 'DATABASE_QUOTA_EXCEEDED') {
      return NextResponse.json(
        { error: 'サービスが混み合っています。しばらく時間をおいてから再度お試しください。' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: '目標の生成に失敗しました。もう一度お試しください。' },
      { status: 500 }
    );
  }
}
