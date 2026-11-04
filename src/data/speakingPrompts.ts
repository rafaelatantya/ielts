export interface SpeakingPrompt {
  id: string
  part: 1 | 2 | 3
  category: string
  title: string
  description?: string
  bullet_points?: string[]
  collocations: string[]
  follow_up_questions?: string[]
}

export const CURATED_SPEAKING_PROMPTS: SpeakingPrompt[] = [
  {
    id: 'spk-tech-01',
    part: 2,
    category: 'Technology',
    title: 'Describe a piece of electronic equipment that you find useful',
    description: 'Describe an electronic device (other than your phone) that you regularly rely on in daily life.',
    bullet_points: [
      'What the piece of equipment is and when you acquired it',
      'How often you use it and what you use it for',
      'What features or aspects make it particularly helpful',
      'And explain why you would find it difficult to manage without it',
    ],
    collocations: ['indispensable tool', 'steep learning curve', 'streamline workflow', 'state-of-the-art'],
  },
  {
    id: 'spk-env-01',
    part: 2,
    category: 'Environment',
    title: 'Describe an environmental law or initiative that improves your community',
    description: 'Talk about a green policy, recycling campaign, or environmental project you are familiar with.',
    bullet_points: [
      'What the initiative is and who introduced it',
      'How local residents responded initially',
      'What positive tangible effects it has generated',
      'And explain whether you think more measures like this should be adopted',
    ],
    collocations: ['carbon footprint', 'sustainable development', 'mitigate climate change', 'ecological balance'],
  },
  {
    id: 'spk-edu-01',
    part: 1,
    category: 'Education',
    title: 'Studies & Classroom Learning Environments',
    description: 'Everyday dialogue exploring study habits, preferred disciplines, and classroom technologies.',
    collocations: ['academic rigor', 'broaden horizons', 'rote memorization', 'critical thinking'],
  },
  {
    id: 'spk-work-01',
    part: 3,
    category: 'Work & Economy',
    title: 'The Future of Automation, Remote Labor, and the Global Economy',
    description: 'In-depth analytical questions comparing employment stability, AI adoption, and workforce reskilling.',
    collocations: ['gig economy', 'labor market disruption', 'remote collaboration', 'competitive advantage'],
  },
  {
    id: 'spk-cul-01',
    part: 2,
    category: 'Culture & Society',
    title: 'Describe a traditional festival or cultural celebration in your region',
    description: 'Describe an annual gathering, ritual, or festival that holds historical and cultural significance.',
    bullet_points: [
      'When and where the celebration occurs',
      'What traditional customs or foods are involved',
      'Who typically participates in the festivities',
      'And explain why this festival is culturally significant to you',
    ],
    collocations: ['cultural heritage', 'pass down through generations', 'foster solidarity', 'sense of identity'],
  },
  {
    id: 'spk-tech-02',
    part: 3,
    category: 'Technology',
    title: 'Ethical Implications of Artificial Intelligence and Automated Decisions',
    description: 'Speculative discourse on algorithmic bias, data privacy, and societal dependency on algorithms.',
    collocations: ['algorithmic bias', 'data sovereignty', 'unprecedented speed', 'ethical dilemmas'],
  },
  {
    id: 'spk-env-02',
    part: 1,
    category: 'Environment',
    title: 'Weather Patterns, Parks, and Open Natural Spaces',
    description: 'Everyday questions about local climate, visiting nature reserves, and recycling routines.',
    collocations: ['urban green spaces', 'biodegradable materials', 'unpredictable weather', 'reconnect with nature'],
  },
  {
    id: 'spk-work-02',
    part: 1,
    category: 'Work & Economy',
    title: 'Daily Work Routines and Professional Ambitions',
    description: 'Rapid-fire responses discussing job satisfaction, work-life balance, and career milestones.',
    collocations: ['work-life balance', 'career trajectory', 'fast-paced environment', 'job satisfaction'],
  },
]
