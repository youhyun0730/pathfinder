'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { onboardingQuestions } from '@/lib/questions';
import QuestionCard from '@/components/onboarding/QuestionCard';
import { OnboardingAnswer } from '@/types';

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const currentQuestion = onboardingQuestions[currentStep];
  const progress = ((currentStep + 1) / onboardingQuestions.length) * 100;

  const handleAnswer = (value: string | string[]) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: value,
    });
  };

  const handleNext = () => {
    if (currentStep < onboardingQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // 現在のユーザーを取得
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('ユーザーが見つかりません');
      }

      // 回答をOnboardingAnswer形式に変換
      const formattedAnswers: OnboardingAnswer[] = onboardingQuestions.map((q) => ({
        questionId: q.id,
        question: q.question,
        answer: answers[q.id] || '',
      }));

      // LLMで現在地分類
      const classifyResponse = await fetch('/api/llm/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: formattedAnswers }),
      });

      if (!classifyResponse.ok) {
        throw new Error('現在地の分類に失敗しました');
      }

      const { classifications } = await classifyResponse.json();

      // プロファイルを作成
      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        answers: answers,
      });

      if (profileError) throw profileError;

      // グラフを作成
      const { data: graph, error: graphError } = await supabase
        .from('graphs')
        .insert({
          user_id: user.id,
          version: 1,
        })
        .select()
        .single();

      if (graphError) throw graphError;

      // 各現在地に対してスキルツリーを生成
      const allNodes = [];
      const allEdges = [];

      // 中心ノードを作成
      const centerNode = {
        graph_id: graph.id,
        node_type: 'center' as const,
        label: 'あなた',
        description: 'スキルツリーの中心',
        required_exp: 0,
        current_exp: 0,
        parent_ids: [],
        position_x: 0,
        position_y: 0,
        color: '#FFD700',
        metadata: {},
      };

      const { data: createdCenter } = await supabase
        .from('nodes')
        .insert(centerNode)
        .select()
        .single();

      if (!createdCenter) throw new Error('中心ノードの作成に失敗しました');

      // 各現在地分類に対してツリー生成
      for (let i = 0; i < classifications.length; i++) {
        const classification = classifications[i];

        // ツリー生成APIを呼び出し
        const generateResponse = await fetch('/api/llm/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPosition: classification }),
        });

        if (!generateResponse.ok) continue;

        const { tree } = await generateResponse.json();

        // 現在地ノードを作成
        const angle = (i / classifications.length) * 2 * Math.PI;
        const radius = 200;

        const currentPosNode = {
          graph_id: graph.id,
          node_type: 'current' as const,
          label: classification.currentPosition,
          description: classification.reasoning,
          required_exp: 0,
          current_exp: 0,
          parent_ids: [createdCenter.id],
          position_x: Math.cos(angle) * radius,
          position_y: Math.sin(angle) * radius,
          color: '#4A90E2',
          metadata: { category: classification.category },
        };

        const { data: createdCurrent } = await supabase
          .from('nodes')
          .insert(currentPosNode)
          .select()
          .single();

        if (!createdCurrent) continue;

        // 中心ノード→現在地ノードのエッジ
        await supabase.from('edges').insert({
          graph_id: graph.id,
          from_node_id: createdCenter.id,
          to_node_id: createdCurrent.id,
        });

        // ツリーのノードを作成
        const nodeMap = new Map<string, string>(); // label -> id
        nodeMap.set(classification.currentPosition, createdCurrent.id);

        for (const node of tree.nodes) {
          const parentIds = node.parentLabels?.map((label) => nodeMap.get(label)).filter(Boolean) as string[] || [createdCurrent.id];

          const colorMap: Record<string, string> = {
            skill: '#7ED321',
            cert: '#9013FE',
            position: '#F5A623',
          };

          const newNode = {
            graph_id: graph.id,
            node_type: node.nodeType,
            label: node.label,
            description: node.description,
            required_exp: node.requiredExp,
            current_exp: 0,
            parent_ids: parentIds,
            position_x: Math.cos(angle) * (radius + 100 * (parentIds.length + 1)),
            position_y: Math.sin(angle) * (radius + 100 * (parentIds.length + 1)),
            color: colorMap[node.nodeType] || '#4A90E2',
            metadata: { suggestedResources: node.suggestedResources || [] },
          };

          const { data: createdNode } = await supabase
            .from('nodes')
            .insert(newNode)
            .select()
            .single();

          if (createdNode) {
            nodeMap.set(node.label, createdNode.id);

            // エッジを作成
            for (const parentId of parentIds) {
              await supabase.from('edges').insert({
                graph_id: graph.id,
                from_node_id: parentId,
                to_node_id: createdNode.id,
              });
            }
          }
        }
      }

      // グラフページにリダイレクト
      router.push('/graph');
    } catch (error) {
      console.error('オンボーディングエラー:', error);
      alert('エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const isAnswered = answers[currentQuestion.id] !== undefined && answers[currentQuestion.id] !== '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4 flex flex-col items-center justify-center">
      {/* プログレスバー */}
      <div className="w-full max-w-2xl mb-8">
        <div className="bg-white/30 rounded-full h-2 overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-white text-center mt-2">
          {currentStep + 1} / {onboardingQuestions.length}
        </p>
      </div>

      {/* 質問カード */}
      <QuestionCard
        question={currentQuestion}
        value={answers[currentQuestion.id] || (currentQuestion.type === 'multiselect' ? [] : '')}
        onChange={handleAnswer}
      />

      {/* ナビゲーション */}
      <div className="flex gap-4 mt-8">
        {currentStep > 0 && (
          <button
            onClick={handleBack}
            className="px-8 py-3 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition"
          >
            戻る
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!isAnswered || loading}
          className="px-8 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? '生成中...'
            : currentStep === onboardingQuestions.length - 1
            ? 'スキルツリーを生成'
            : '次へ'}
        </button>
      </div>
    </div>
  );
}
