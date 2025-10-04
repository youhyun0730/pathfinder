export interface Question {
  id: string;
  question: string;
  type: 'text' | 'select' | 'multiselect' | 'slider';
  options?: string[];
  placeholder?: string;
}

export const onboardingQuestions: Question[] = [
  {
    id: 'occupation',
    question: '現在の職業を教えてください',
    type: 'text',
    placeholder: '例: Webエンジニア、学生、フリーランスなど',
  },
  {
    id: 'experience',
    question: 'あなたの経験年数や習熟度を教えてください',
    type: 'select',
    options: [
      '未経験・これから始める',
      '1年未満',
      '1-3年',
      '3-5年',
      '5年以上',
    ],
  },
  {
    id: 'skills',
    question: '現在持っているスキルや得意なことを教えてください',
    type: 'text',
    placeholder: '例: プログラミング、デザイン、マーケティング、料理など',
  },
  {
    id: 'interests',
    question: '興味がある分野や学びたいことは何ですか？',
    type: 'text',
    placeholder: '例: AI、Web開発、起業、クリエイティブなど',
  },
  {
    id: 'hobbies',
    question: '趣味や日常的に時間を使っていることはありますか？',
    type: 'text',
    placeholder: '例: 写真、音楽、読書、スポーツなど',
  },
  {
    id: 'goals',
    question: '5年後、どんな自分になっていたいですか？',
    type: 'text',
    placeholder: '自由に記述してください',
  },
  {
    id: 'learning_style',
    question: '学習スタイルはどちらに近いですか？',
    type: 'select',
    options: [
      '体系的に基礎から学びたい',
      '実践しながら学びたい',
      '独学で進めたい',
      '誰かに教わりたい',
      'コミュニティで学びたい',
    ],
  },
  {
    id: 'time_commitment',
    question: 'スキル習得に使える時間はどのくらいですか？',
    type: 'select',
    options: [
      '週1-2時間',
      '週3-5時間',
      '週6-10時間',
      '週10時間以上',
      '毎日コツコツ',
    ],
  },
];
