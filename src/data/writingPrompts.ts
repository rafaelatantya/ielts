export interface ChartDataSeries {
  label: string
  color: string
  values: number[]
}

export interface WritingPrompt {
  id: string
  taskNumber: 1 | 2
  track: 'academic' | 'general'
  title: string
  instructions: string
  category: string
  timeLimitMins: number
  minWords: number
  // Academic Task 1 visual spec
  chartType?: 'line' | 'bar' | 'pie' | 'table'
  chartSpec?: {
    title: string
    xAxisLabels: string[]
    yAxisLabel: string
    series: ChartDataSeries[]
    keyTrends: string[]
  }
  // General Training Task 1 spec
  register?: 'Formal' | 'Semi-Formal' | 'Informal'
  bulletPoints?: string[]
  // Task 2 spec
  essayType?: 'Opinion' | 'Discussion + Opinion' | 'Problem & Solution' | 'Two-Part Question' | 'Advantages vs Disadvantages'
  // Curated Model Essay & Ground Truth
  band85ModelEssay: string
  modelCommentary: {
    overviewOrThesis: string
    coherenceStrategy: string
    lexicalHighlights: string[]
    grammaticalHighlights: string[]
  }
}

export const CURATED_WRITING_PROMPTS: WritingPrompt[] = [
  {
    id: 'wrt-acad-t1-01',
    taskNumber: 1,
    track: 'academic',
    title: 'Electricity Production from Renewables (1995–2020)',
    instructions:
      'The chart below shows electricity production by three renewable energy sources (Wind, Solar, Hydroelectric) in Terawatt-hours (TWh) in a European nation between 1995 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    category: 'Academic Task 1: Line Graph',
    timeLimitMins: 20,
    minWords: 150,
    chartType: 'line',
    chartSpec: {
      title: 'Renewable Electricity Generation (TWh)',
      xAxisLabels: ['1995', '2000', '2005', '2010', '2015', '2020'],
      yAxisLabel: 'Terawatt-hours (TWh)',
      series: [
        { label: 'Hydroelectric', color: '#1E3A5F', values: [110, 115, 120, 118, 122, 125] },
        { label: 'Wind Power', color: '#9A3412', values: [15, 30, 60, 95, 135, 170] },
        { label: 'Solar Energy', color: '#1E4631', values: [2, 5, 18, 45, 90, 140] },
      ],
      keyTrends: [
        'Wind and solar power experienced dramatic, exponential surges over the 25-year period.',
        'Hydroelectric power remained the dominant source initially but showed modest, stable growth throughout.',
        'By 2020, wind power surpassed hydroelectricity to become the leading renewable energy producer.',
      ],
    },
    band85ModelEssay:
      'The line graph illustrates the volume of electricity generated from three distinct renewable sources—hydroelectric, wind, and solar—measured in terawatt-hours (TWh) within a European country across a twenty-five-year timeframe from 1995 to 2020.\n\nOverall, it is readily apparent that while hydroelectric power maintained a relatively steady upward trajectory throughout the period, wind and solar power both experienced substantial, exponential increases. By the end of the timeline, wind had overtaken hydroelectricity to become the primary renewable electricity producer.\n\nIn 1995, hydroelectricity was decisively the leading source, generating approximately 110 TWh. This figure experienced marginal fluctuations but generally rose to 120 TWh in 2005 before plateauing slightly and concluding at 125 TWh in 2020. Conversely, both wind and solar power commenced at negligible quantities, registering 15 TWh and roughly 2 TWh respectively in 1995.\n\nOver the subsequent decades, wind production surged dramatically, escalating to 95 TWh by 2010 and subsequently overtaking hydroelectric output around 2017 to finish at a peak of 170 TWh. Similarly, solar generation demonstrated phenomenal acceleration after 2005, climbing sharply from 18 TWh to reach 140 TWh by 2020, closely trailing wind generation.',
    modelCommentary: {
      overviewOrThesis:
        'Contains an explicit, macro-level Overview paragraph identifying the comparative trajectories: hydroelectric stability vs. wind/solar exponential escalation, and the 2020 leadership crossover.',
      coherenceStrategy:
        'Logical grouping dividing the data into an introduction/overview, followed by the baseline leader (Hydro) and the ascending dynamic pair (Wind & Solar). Cohesive linkers (Overall, In 1995, Conversely, Over the subsequent decades) flow naturally without mechanical rigidity.',
      lexicalHighlights: [
        'terawatt-hours',
        'upward trajectory',
        'exponential increases',
        'negligible quantities',
        'surged dramatically',
        'phenomenal acceleration',
      ],
      grammaticalHighlights: [
        'Passive synthesis: "measured in terawatt-hours"',
        'Compound complex sentence: "while hydroelectric power maintained..., wind and solar power both experienced..."',
        'Participial clauses: "closely trailing wind generation"',
      ],
    },
  },
  {
    id: 'wrt-acad-t1-02',
    taskNumber: 1,
    track: 'academic',
    title: 'University Graduate Employment by Sector (2015 vs 2023)',
    instructions:
      'The bar chart compares the percentage of university graduates entering four major employment sectors (Technology, Public Healthcare, Finance, and Education) in 2015 and 2023.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    category: 'Academic Task 1: Bar Chart',
    timeLimitMins: 20,
    minWords: 150,
    chartType: 'bar',
    chartSpec: {
      title: 'Graduate Sector Placement (% of cohort)',
      xAxisLabels: ['Technology', 'Healthcare', 'Finance', 'Education'],
      yAxisLabel: 'Percentage of Graduates (%)',
      series: [
        { label: '2015', color: '#1E3A5F', values: [28, 22, 26, 24] },
        { label: '2023', color: '#9A3412', values: [42, 29, 18, 11] },
      ],
      keyTrends: [
        'Technology recorded the most significant increase, growing from 28% to 42%.',
        'Healthcare also experienced notable expansion from 22% to 29%.',
        'Education suffered the steepest decline, dropping by more than half to 11%.',
      ],
    },
    band85ModelEssay:
      'The bar chart delineates the proportion of university graduates securing roles across four primary sectors—technology, healthcare, finance, and education—contrasting data between 2015 and 2023.\n\nOverall, the technology and healthcare industries witnessed noticeable gains in graduate recruitment over the eight-year span, whereas the proportions entering finance and education diminished noticeably, with education experiencing the steepest decline.\n\nIn 2015, graduate intake was fairly evenly distributed among all four categories, ranging from 22% in healthcare to 28% in technology. Finance and education occupied intermediate positions at 26% and 24% respectively.\n\nBy 2023, technology had expanded considerably to claim 42% of all university leavers, solidifying its rank as the predominant destination. Healthcare similarly observed an upward shift, rising to 29%. In stark contrast, recruitment in the financial domain shrank to 18%, while education plunged to a mere 11%, representing a contraction of more than fifty percent compared to its 2015 standing.',
    modelCommentary: {
      overviewOrThesis:
        'Clear overview summarizing divergence: growth sectors (tech & healthcare) versus contracting sectors (finance & education).',
      coherenceStrategy:
        'Chronological and comparative balance: paragraph 3 establishes baseline parity; paragraph 4 maps diverging paths.',
      lexicalHighlights: ['delineates', 'proportion', 'diminished noticeably', 'predominant destination', 'stark contrast', 'contraction'],
      grammaticalHighlights: [
        'Participle phrases: "solidifying its rank", "representing a contraction"',
        'Prepositional contrast: "In stark contrast..."',
      ],
    },
  },
  {
    id: 'wrt-gen-t1-01',
    taskNumber: 1,
    track: 'general',
    title: 'Formal Letter: Local Council Infrastructure Proposal',
    instructions:
      'You have noticed that a historic public park in your town is neglected and lacks adequate pedestrian lighting and waste bins.\n\nWrite a letter to the local municipal council officer. In your letter:\n• Describe the current condition of the park\n• Explain how this deterioration affects local residents\n• Suggest specific improvements that should be implemented promptly',
    category: 'General Training Task 1: Formal Letter',
    timeLimitMins: 20,
    minWords: 150,
    register: 'Formal',
    bulletPoints: [
      'Describe the current condition of the park',
      'Explain how this deterioration affects local residents',
      'Suggest specific improvements that should be implemented promptly',
    ],
    band85ModelEssay:
      'Dear Sir or Madam,\n\nI am writing to draw your urgent attention to the deteriorating state of St. Jude\'s Park on Millfield Road, a recreational space that has long served as a vital community hub for local families.\n\nOver the past six months, the park has suffered noticeable neglect. The existing tarmac footpaths are severely cracked, and an acute shortage of waste receptacles has resulted in unsightly litter accumulating around the perimeter benches. Furthermore, the majority of the Victorian-era lampposts are either malfunctioning or completely non-operational once dusk arrives.\n\nThis lack of upkeep poses substantial challenges for residents. Senior citizens and parents with prams find the uneven walkways hazardous, while the absence of evening illumination has understandably raised safety apprehensions, virtually discouraging residents from utilising the grounds after sunset.\n\nTo remediate this situation, I would respectfully recommend that the council install solar-powered LED lighting along the principal avenues and introduce segregated recycling receptacles. Resurfacing the primary pathway would also restore accessibility. Thank you for your consideration of this pressing matter, and I look forward to your response.\n\nYours faithfully,\n\nArthur Pendelton',
    modelCommentary: {
      overviewOrThesis:
        'Formal opening stating reason for writing; closing with conventional polite formal sign-off ("Yours faithfully").',
      coherenceStrategy:
        'Exact structural correspondence to the three prompt bullet points across dedicated body paragraphs.',
      lexicalHighlights: ['deteriorating state', 'vital community hub', 'acute shortage', 'unsightly litter', 'remediate this situation'],
      grammaticalHighlights: [
        'Subjunctive/Modal formal tone: "I would respectfully recommend that the council install..."',
        'Complex participial modifiers: "virtually discouraging residents..."',
      ],
    },
  },
  {
    id: 'wrt-task2-01',
    taskNumber: 2,
    track: 'academic',
    title: 'Artificial Intelligence & Human Workforce Automation',
    instructions:
      'Some people believe that artificial intelligence and automation will replace human workers across most industries, leading to mass unemployment. Others contend that technology creates more meaningful employment opportunities than it eliminates.\n\nDiscuss both views and give your own opinion.',
    category: 'Task 2: Discursive Essay',
    timeLimitMins: 40,
    minWords: 250,
    essayType: 'Discussion + Opinion',
    band85ModelEssay:
      'The rapid proliferation of artificial intelligence and automated systems across modern industries has sparked contentious debate regarding the future of work. While a significant body of observers cautions that widespread automation will precipitate pervasive job displacement, proponents maintain that technological innovation inevitably births novel, elevated employment paradigms. In my view, although transient economic dislocation is inevitable, automation ultimately elevates human labour toward intellectually substantive vocations rather than causing permanent mass unemployment.\n\nOn the one hand, apprehensions regarding workforce redundancy are grounded in empirical realities. Machine learning algorithms and robotics now outperform human personnel not merely in repetitive manual tasks, but increasingly in cognitive domains such as legal discovery, medical diagnostics, and financial analysis. When commercial enterprises substitute human staff with algorithmic infrastructure to minimise operational expenditure, routine clerical and assembly positions are rapidly dissolved. Without comprehensive retraining programs, lower-skilled workers are disproportionately vulnerable to structural unemployment and prolonged economic hardship.\n\nOn the other hand, historical precedence demonstrates that industrial transformations expand net employment rather than diminish it. The automation of tedious tasks liberates human capital to pursue positions requiring emotional empathy, strategic negotiation, and interdisciplinary creativity—capacities that remain fundamentally beyond synthetic intelligence. Moreover, the technological ecosystem itself generates burgeoning industries; roles in ethical governance, data engineering, and autonomous systems oversight were virtually non-existent two decades ago. As machines handle routine computational burdens, workers can transition into higher-value roles.\n\nIn conclusion, while the displacement of routine cognitive and manual jobs poses immediate socio-economic challenges, I firmly believe that automation will not culminate in widespread joblessness. Provided governments invest proactively in vocational upskilling, technological progress will enrich the workforce by redirecting human intellect toward creative and strategic pursuits.',
    modelCommentary: {
      overviewOrThesis:
        'Unambiguous thesis statement in the introduction acknowledging both perspectives and outlining the author\'s position; reaffirmed consistently in the conclusion.',
      coherenceStrategy:
        'Balanced 4-paragraph structure with clear topic sentences introducing the danger of displacement (Paragraph 2) and the generative economic reality (Paragraph 3).',
      lexicalHighlights: [
        'rapid proliferation',
        'pervasive job displacement',
        'transient economic dislocation',
        'substantive vocations',
        'empirical realities',
        'burgeoning industries',
        'vocational upskilling',
      ],
      grammaticalHighlights: [
        'Inversion / Complex conditionals: "Without comprehensive retraining programs, lower-skilled workers are..."',
        'Emphatic subordination: "While a significant body of observers cautions..., proponents maintain that..."',
        'Prepositional governance: "Provided governments invest proactively..."',
      ],
    },
  },
  {
    id: 'wrt-task2-02',
    taskNumber: 2,
    track: 'academic',
    title: 'Environmental Responsibility: Corporations vs Individuals',
    instructions:
      'Many argue that individual lifestyle changes are insufficient to address global environmental crises, and that governments should instead impose strict legal regulations on major corporations.\n\nTo what extent do you agree or disagree?',
    category: 'Task 2: Discursive Essay',
    timeLimitMins: 40,
    minWords: 250,
    essayType: 'Opinion',
    band85ModelEssay:
      'As planetary ecological crises intensify, skepticism has mounted regarding the efficacy of voluntary individual lifestyle adjustments, prompting calls for stringent governmental regulation of industrial conglomerates. I unequivocally agree with this perspective, as corporate greenhouse emissions and resource extraction vastly outweigh personal footprints, and binding legislative mandates remain the sole mechanism capable of enforcing systemic environmental remediation.\n\nTo begin with, the scale of corporate ecological degradation dwarfs individual consumption patterns. Rigorous environmental audits reveal that a modest cohort of fossil fuel enterprises and multinational manufacturers is responsible for the overwhelming preponderance of global carbon emissions and industrial waste. While conscientious consumers may recycle packaging or curtail private vehicle use, these localized conservation efforts are mathematically rendered trivial when multinational conglomerates continue unregulated toxic effluent discharges and deforestation. Without state-enforced statutory ceilings and substantial carbon penalties, voluntary consumer ethics cannot alter macroscopic industrial outputs.\n\nFurthermore, only centralized government intervention possesses the coercive legal authority necessary to steer industrial practices toward sustainability. Free market incentives frequently prioritize quarterly commercial profits over long-term planetary viability; thus, corporations rarely adopt expensive eco-friendly technologies voluntarily. When legislative bodies enact rigorous emission benchmarks, impose steep environmental taxation, and subsidize green infrastructure, companies are legally compelled to decarbonize supply chains and invest in circular manufacturing models. Historical interventions, such as the global phased ban on chlorofluorocarbons under the Montreal Protocol, conclusively illustrate that top-down regulation yields tangible global recovery.\n\nIn conclusion, I firmly agree that combating environmental degradation requires decisive governmental regulation of corporations rather than relying on private citizen restraint. Only through uncompromising statutory enforcement can systemic ecological sustainability be achieved.',
    modelCommentary: {
      overviewOrThesis:
        'Crystal-clear unequivocal stance ("I unequivocally agree with this perspective") in introduction, defended in two robust body paragraphs.',
      coherenceStrategy:
        'Strong cohesive progression: "To begin with", "Furthermore", "In conclusion" with cohesive topic sentences.',
      lexicalHighlights: [
        'unequivocally agree',
        'systemic environmental remediation',
        'overwhelming preponderance',
        'centralized government intervention',
        'statutory enforcement',
      ],
      grammaticalHighlights: [
        'Nominal clauses: "reveals that a modest cohort of fossil fuel enterprises is responsible..."',
        'Correlative constructions: "rather than relying on private citizen restraint"',
      ],
    },
  },
]
