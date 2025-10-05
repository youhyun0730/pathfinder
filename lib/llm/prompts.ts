import { OnboardingAnswer, CurrentPositionClassification } from '@/types';

// 現在地分類プロンプト
export function createClassifyPrompt(answers: OnboardingAnswer[]): string {
  const answersText = answers
    .map((a) => `Q: ${a.question}\nA: ${JSON.stringify(a.answer)}`)
    .join('\n\n');

  return `あなたは人生コーチです。ユーザーのオンボーディング回答を分析し、現在地を複数の軸で分類してください。

## ユーザーの回答
${answersText}

## タスク
上記の回答から、ユーザーの現在地を2-4個の異なる軸（カテゴリ）で分類してください。
各軸は独立しており、キャリア、趣味、スキル、興味関心などの観点から設定してください。

## 出力形式
必ず以下のJSON配列形式で出力してください：

[
  {
    "category": "カテゴリ名（例: テクノロジー、クリエイティブ、ビジネスなど）",
    "currentPosition": "現在のポジション名（例: JavaScript Jr.エンジニア、趣味カメラマンなど）",
    "reasoning": "なぜこのポジションに分類したかの簡潔な理由"
  }
]

出力は2-4個のオブジェクトを含む配列とし、JSON形式のみを返してください。`;
}

// ツリー生成プロンプト
export function createTreeGenerationPrompt(
  currentPosition: CurrentPositionClassification
): string {
  return `あなたはキャリア・スキル開発のエキスパートです。
ユーザーの現在地から成長できるスキルツリーを生成してください。

## 現在地
- カテゴリ: ${currentPosition.category}
- 現在のポジション: ${currentPosition.currentPosition}
- 理由: ${currentPosition.reasoning}

## タスク
このポジションから成長できる3-5段階のスキルツリーを生成してください。
ツリーには以下のノードタイプを含めることができます：

1. **skill** - 習得すべき技術・能力
2. **cert** - 取得可能な資格
3. **position** - 到達できる職業・役職

## ルール
- 初級から上級まで段階的なツリーを作成
- 各ノードには適切な難易度を設定（EXP: 50-1000）
- 親ノードが完了しないと子ノードに進めない構造
- 実践的で達成可能な内容
- 各ノードに学習リソースのヒントを含める

## 出力形式
以下のJSON形式で出力してください：

{
  "nodes": [
    {
      "nodeType": "skill" | "cert" | "position",
      "label": "ノード名",
      "description": "詳細な説明（2-3文）",
      "requiredExp": 数値（50-1000）,
      "parentLabels": ["親ノードのlabel配列"],
      "suggestedResources": ["学習リソース1", "学習リソース2"]
    }
  ],
  "reasoning": "このツリー構造を提案した理由"
}

**重要なルール**:
1. **ツリー構造**: 各ノードは必ず1つの親のみを持つこと（複数の親は禁止）
2. **循環禁止**: 親→子の関係で循環してはいけない（A→B→A のような構造は禁止）
3. **木構造の成長**: まるで木が枝分かれするように、親から子へ一方向に伸びること
4. **parentLabels**:
   - 配列形式だが、必ず1つの親ラベルのみを含むこと
   - 最初のノード（現在地から直接派生）は ["${currentPosition}"]
   - それ以降は、既に生成された親ノードのlabel（1つだけ）を指定

ノード数は5-10個程度が適切です。JSON形式のみを返してください。`;
}

// ツリー拡張プロンプト
export function createTreeExpansionPrompt(
  nodeLabel: string,
  nodeDescription: string,
  nodeType: string,
  category: string
): string {
  return `あなたはキャリア・スキル開発のエキスパートです。
既存のスキルツリーノードから、次のステップを提案してください。

## 選択されたノード
- ノード名: ${nodeLabel}
- 説明: ${nodeDescription}
- タイプ: ${nodeType}
- カテゴリ: ${category}

## タスク
このノードを達成した後に進むべき成長パスを提案してください。
複数のレベルにわたる段階的なツリーを生成できます（例: 初級→中級→上級）。
合計で5-12個程度のノードを生成してください。

以下のノードタイプから適切なものを選択：

1. **skill** - 次に習得すべき技術・能力
2. **cert** - 取得可能な資格
3. **position** - 到達できる職業・役職

## 出力形式
以下のJSON形式で出力してください：

{
  "nodes": [
    {
      "nodeType": "skill" | "cert" | "position",
      "label": "ノード名",
      "description": "詳細な説明（2-3文）",
      "requiredExp": 数値（50-1000）,
      "parentLabels": ["親ノードのlabel"],
      "suggestedResources": ["学習リソース1", "学習リソース2"]
    }
  ],
  "reasoning": "このツリー構造を提案した理由"
}

**重要なルール**:
1. **ツリー構造**: 各ノードは必ず1つの親のみを持つこと
2. **parentLabels**:
   - 配列形式だが、必ず1つの親ラベルのみを含むこと
   - 最初のノード（選択ノードから直接派生）は ["${nodeLabel}"]
   - それ以降のノードは、既に生成した他のノードのlabelを親として指定できる
   - 例: ノードAが ["${nodeLabel}"] を親に持ち、ノードBが ["ノードA"] を親に持つことで、2段階の成長パスを作れる
3. **段階的な成長**: 初級スキル→中級スキル→上級スキルのように、段階的な成長パスを含めること
4. **木構造の成長**: まるで木が枝分かれするように、親から子へ一方向に伸びること

JSON形式のみを返してください。`;
}

// 目標からの逆算ツリー生成プロンプト
export function createGoalBasedTreePrompt(
  goalDescription: string,
  currentNodes: { label: string; nodeType: string; description: string }[],
  category: string
): string {
  const nodesText = currentNodes
    .map((n) => `- [${n.nodeType}] ${n.label}: ${n.description}`)
    .join('\n');

  return `あなたはキャリア・スキル開発のエキスパートです。
ユーザーの目標に到達するための最適なパスを提案してください。

## ユーザーの目標
${goalDescription}

## カテゴリ
${category}

## 既存のスキルツリー
${nodesText || '（まだノードがありません）'}

## タスク
目標に到達するために必要なスキル・資格・ポジションを提案してください。
既存のノードを活用できる場合はそれを考慮し、足りないノードのみを追加してください。

## 出力形式
以下のJSON形式で出力してください：

{
  "targetNode": {
    "nodeType": "position",
    "label": "目標のポジション名",
    "description": "目標の詳細説明",
    "requiredExp": 数値（500-1000）,
    "suggestedResources": ["リソース1", "リソース2"]
  },
  "pathNodes": [
    {
      "nodeType": "skill" | "cert" | "position",
      "label": "ノード名",
      "description": "詳細な説明",
      "requiredExp": 数値（50-1000）,
      "parentLabels": ["親ノードのlabel配列"],
      "suggestedResources": ["リソース1", "リソース2"]
    }
  ],
  "recommendedPath": ["ノードlabelの順序配列"],
  "reasoning": "このパスを提案した理由"
}

JSON形式のみを返してください。`;
}
