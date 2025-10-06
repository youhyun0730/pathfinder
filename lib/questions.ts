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
    question: '現在の職業における経験年数や習熟度を教えてください',
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
    id: 'goals',
    question: '5年後、どんな自分になっていたいですか？',
    type: 'text',
    placeholder: '自由に記述してください',
  },
];
