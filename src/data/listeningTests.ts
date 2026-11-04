export interface DialogueTurn {
  timestampSec: number
  speaker: string
  text: string
  distractorTrap?: string
  targetQuestionId?: number
}

export interface MapPoint {
  letter: string // A, B, C, D, E, F, G, H
  x: number
  y: number
  label: string
}

export interface ListeningQuestion {
  id: number // 1 to 40
  sectionIndex: 0 | 1 | 2 | 3
  type: 'form_completion' | 'note_completion' | 'multiple_choice' | 'map_labeling'
  prompt: string
  subPrompt?: string
  options?: string[] // for multiple choice or map letters
  canonicalVariants: string[] // All valid canonical forms, e.g. ["theatre", "theater"]
  correctAnswer: string // Primary display
  spellingCheckRequired?: boolean // true if common spelling trap
  explanation: string
  distractorNote?: string
}

export interface ListeningSection {
  sectionIndex: 0 | 1 | 2 | 3
  title: string
  typeDesc: string
  readingRange: string // 'Q1–10', 'Q11–20', 'Q21–30', 'Q31–40'
  wordLimitRule: string // e.g. "NO MORE THAN TWO WORDS AND/OR A NUMBER"
  maxWords: number
  allowNumber: boolean
  instructionHeader: string
  audioDurationSec: number
  dialogueTurns: DialogueTurn[]
  mapConfig?: {
    title: string
    points: MapPoint[]
  }
  questions: ListeningQuestion[]
}

export const LISTENING_TEST: ListeningSection[] = [
  // SECTION 1: Everyday Dialogue (Form / Note Completion)
  {
    sectionIndex: 0,
    title: 'Section 1: City Cycling Club Registration',
    typeDesc: 'Everyday Social Dialogue between Club Secretary and New Resident',
    readingRange: 'Q1–10',
    wordLimitRule: 'NO MORE THAN TWO WORDS AND/OR A NUMBER',
    maxWords: 2,
    allowNumber: true,
    instructionHeader: 'Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
    audioDurationSec: 180,
    dialogueTurns: [
      {
        timestampSec: 5,
        speaker: 'Secretary',
        text: 'Good morning! Welcome to the Central High Wycombe Cycling Guild. How can I help you today?',
      },
      {
        timestampSec: 14,
        speaker: 'Applicant',
        text: 'Hello. I recently moved to the borough from Newcastle and would like to join the weekend touring group. My name is Arthur Pendelton.',
      },
      {
        timestampSec: 25,
        speaker: 'Secretary',
        text: 'Splendid. Let me take down your registration details Arthur. Could you spell your surname for the register?',
      },
      {
        timestampSec: 32,
        speaker: 'Applicant',
        text: 'Certainly, it is P-E-N-D-E-L-T-O-N.',
        targetQuestionId: 1,
      },
      {
        timestampSec: 42,
        speaker: 'Secretary',
        text: 'And your current residential address here in town?',
      },
      {
        timestampSec: 46,
        speaker: 'Applicant',
        text: 'I am living at 47 Ravenswood Terrace, right by the canal lock.',
        targetQuestionId: 2,
      },
      {
        timestampSec: 56,
        speaker: 'Secretary',
        text: 'Lovely area. And your postcode there?',
      },
      {
        timestampSec: 61,
        speaker: 'Applicant',
        text: 'Well, my landlord first told me it was HP12 4TR, but the postal authority corrected it to HP12 4YT.',
        distractorTrap: 'Speaker first mentions landlord gave HP12 4TR, but corrects to official postal authority code HP12 4YT.',
        targetQuestionId: 3,
      },
      {
        timestampSec: 75,
        speaker: 'Secretary',
        text: 'Noted: HP12 4YT. What type of bicycle will you be riding with us?',
      },
      {
        timestampSec: 82,
        speaker: 'Applicant',
        text: 'I used to ride a hybrid commuter, but for the hills around the Chilterns I have just invested in an aluminium touring bike.',
        distractorTrap: 'Applicant mentions previous hybrid commuter before specifying the current touring bike.',
        targetQuestionId: 4,
      },
      {
        timestampSec: 96,
        speaker: 'Secretary',
        text: 'Excellent. All riders in our club are required to bring a certified puncture repair kit and wear a high visibility jacket.',
        targetQuestionId: 5,
      },
      {
        timestampSec: 108,
        speaker: 'Applicant',
        text: 'Understood. What time do the Saturday morning rides set off from the square?',
      },
      {
        timestampSec: 114,
        speaker: 'Secretary',
        text: 'During the winter season we gathered at 9:00 AM, but now that daylight saving has begun, we depart promptly at 8:30 AM.',
        distractorTrap: 'Winter departure was 9:00 AM, but present schedule departs at 8:30 AM.',
        targetQuestionId: 6,
      },
      {
        timestampSec: 128,
        speaker: 'Applicant',
        text: '8:30 AM is perfect. And what is the standard annual membership tariff for adult members?',
      },
      {
        timestampSec: 135,
        speaker: 'Secretary',
        text: 'The standard individual rate is 45 pounds per year, though students pay only 30 pounds.',
        targetQuestionId: 7,
      },
      {
        timestampSec: 147,
        speaker: 'Applicant',
        text: 'Great, I will pay the 45 pounds. Who should we contact if a ride gets cancelled due to gale winds?',
      },
      {
        timestampSec: 155,
        speaker: 'Secretary',
        text: 'You can check our emergency WhatsApp broadcast or call our ride marshal, Brenda Higgins.',
        targetQuestionId: 8,
      },
      {
        timestampSec: 165,
        speaker: 'Applicant',
        text: 'Where do the group stops usually take place during the 40-kilometer route?',
      },
      {
        timestampSec: 171,
        speaker: 'Secretary',
        text: 'We always stop halfway at the Old Mill bakery for warm tea and homemade scones.',
        targetQuestionId: 9,
      },
      {
        timestampSec: 178,
        speaker: 'Secretary',
        text: 'Our first introductory social gathering is scheduled for the 14th of October.',
        targetQuestionId: 10,
      },
    ],
    questions: [
      {
        id: 1,
        sectionIndex: 0,
        type: 'form_completion',
        prompt: 'Applicant surname: [_____]',
        correctAnswer: 'PENDELTON',
        canonicalVariants: ['PENDELTON'],
        spellingCheckRequired: true,
        explanation: 'Spelled out letter-by-letter: P-E-N-D-E-L-T-O-N.',
      },
      {
        id: 2,
        sectionIndex: 0,
        type: 'form_completion',
        prompt: 'Address: 47 [_____] Terrace',
        correctAnswer: 'RAVENSWOOD',
        canonicalVariants: ['RAVENSWOOD', 'RAVENS WOOD'],
        explanation: 'The applicant lives at 47 Ravenswood Terrace.',
      },
      {
        id: 3,
        sectionIndex: 0,
        type: 'form_completion',
        prompt: 'Postal Code: [_____]',
        correctAnswer: 'HP12 4YT',
        canonicalVariants: ['HP12 4YT', 'HP124YT'],
        distractorNote: 'Distractor trap: HP12 4TR was the landlord\'s initial error, corrected to HP12 4YT.',
        explanation: 'The official postal authority code is HP12 4YT.',
      },
      {
        id: 4,
        sectionIndex: 0,
        type: 'form_completion',
        prompt: 'Bicycle Type: [_____] bike',
        correctAnswer: 'TOURING',
        canonicalVariants: ['TOURING', 'A TOURING'],
        distractorNote: 'Distractor trap: hybrid commuter was his old bike; he bought a touring bike.',
        explanation: 'He purchased a touring bike for Chilterns hills.',
      },
      {
        id: 5,
        sectionIndex: 0,
        type: 'form_completion',
        prompt: 'Compulsory equipment: certified puncture repair kit and high [_____] jacket',
        correctAnswer: 'VISIBILITY',
        canonicalVariants: ['VISIBILITY', 'VIS'],
        spellingCheckRequired: true,
        explanation: 'Secretary explicitly mandates a high visibility jacket.',
      },
      {
        id: 6,
        sectionIndex: 0,
        type: 'form_completion',
        prompt: 'Saturday ride departure time: [_____]',
        correctAnswer: '8:30 AM',
        canonicalVariants: ['8:30 AM', '8.30 AM', '8:30', '8.30', 'HALF PAST EIGHT'],
        distractorNote: 'Distractor trap: 9:00 AM was winter timetable; currently departs at 8:30 AM.',
        explanation: 'Daylight saving departure is 8:30 AM.',
      },
      {
        id: 7,
        sectionIndex: 0,
        type: 'form_completion',
        prompt: 'Annual membership fee: £[_____]',
        correctAnswer: '45',
        canonicalVariants: ['45', 'FORTY FIVE', 'FORTY-FIVE', '45 POUNDS'],
        explanation: 'Individual standard rate is 45 pounds (30 is student discount).',
      },
      {
        id: 8,
        sectionIndex: 0,
        type: 'form_completion',
        prompt: 'Ride marshal contact: Brenda [_____]',
        correctAnswer: 'HIGGINS',
        canonicalVariants: ['HIGGINS'],
        explanation: 'Secretary names Brenda Higgins as ride marshal.',
      },
      {
        id: 9,
        sectionIndex: 0,
        type: 'form_completion',
        prompt: 'Halfway rest location: Old Mill [_____]',
        correctAnswer: 'BAKERY',
        canonicalVariants: ['BAKERY', 'THE BAKERY'],
        explanation: 'The group stops halfway at the Old Mill bakery.',
      },
      {
        id: 10,
        sectionIndex: 0,
        type: 'form_completion',
        prompt: 'First social event date: [_____]',
        correctAnswer: '14TH OCTOBER',
        canonicalVariants: ['14TH OCTOBER', '14 OCTOBER', 'OCTOBER 14', 'OCTOBER 14TH', '14/10'],
        explanation: 'Scheduled for 14th of October.',
      },
    ],
  },

  // SECTION 2: Public Monologue (Map & Plan Labeling + Multiple Choice)
  {
    sectionIndex: 1,
    title: 'Section 2: Riverbank Heritage Park Redevelopment',
    typeDesc: 'Monologue by Town Conservation Officer explaining New Amenities',
    readingRange: 'Q11–20',
    wordLimitRule: 'ONE WORD AND/OR A NUMBER',
    maxWords: 1,
    allowNumber: true,
    instructionHeader: 'Complete the notes and label the map below. Write ONE WORD AND/OR A NUMBER for each answer.',
    audioDurationSec: 200,
    mapConfig: {
      title: 'Riverbank Heritage Park Visitors Plan',
      points: [
        { letter: 'A', x: 80, y: 50, label: 'North Quay' },
        { letter: 'B', x: 220, y: 70, label: 'Boathouse Pier' },
        { letter: 'C', x: 120, y: 150, label: 'Herb Garden' },
        { letter: 'D', x: 280, y: 160, label: 'Waterwheel Mill' },
        { letter: 'E', x: 70, y: 240, label: 'Childrens Meadow' },
        { letter: 'F', x: 230, y: 260, label: 'Artisan Workshop' },
        { letter: 'G', x: 150, y: 310, label: 'Picnic Pavilion' },
        { letter: 'H', x: 290, y: 320, label: 'South Gate' },
      ],
    },
    dialogueTurns: [
      {
        timestampSec: 5,
        speaker: 'Officer',
        text: 'Welcome ladies and gentlemen to the Riverbank Heritage Park public preview.',
      },
      {
        timestampSec: 16,
        speaker: 'Officer',
        text: 'Our primary objective is to restore the historical 18th-century working canal landscape while protecting native wetland waterfowl.',
      },
      {
        timestampSec: 30,
        speaker: 'Officer',
        text: 'Admission tickets for guided evening lantern walks must be reserved online at least 48 hours in advance.',
        targetQuestionId: 11,
      },
      {
        timestampSec: 45,
        speaker: 'Officer',
        text: 'All educational workshops on traditional wicker weaving are held inside the old timber barn every Wednesday.',
        targetQuestionId: 12,
      },
      {
        timestampSec: 60,
        speaker: 'Officer',
        text: 'Now if you look at the plan on your brochure: we are standing at the South Gate, labeled H at the bottom right.',
      },
      {
        timestampSec: 72,
        speaker: 'Officer',
        text: 'Directly northwest of the South Gate, across the circular pond, lies the Picnic Pavilion, marked as letter G.',
      },
      {
        timestampSec: 85,
        speaker: 'Officer',
        text: 'If you walk north along the eastern pathway towards the river, the building with the large restored wooden paddle wheel is the Waterwheel Mill at point D.',
        targetQuestionId: 13,
      },
      {
        timestampSec: 102,
        speaker: 'Officer',
        text: 'On the western bank opposite the Mill, the aromatic enclosure surrounded by clipped box hedging is the medicinal Herb Garden, located at C.',
        targetQuestionId: 14,
      },
      {
        timestampSec: 118,
        speaker: 'Officer',
        text: 'Right up at the northernmost mooring basin, where vintage barges dock, you will find the North Quay at letter A.',
        targetQuestionId: 15,
      },
      {
        timestampSec: 134,
        speaker: 'Officer',
        text: 'Just south of the North Quay, the projecting wooden boardwalk with rowboat moorings is the Boathouse Pier at point B.',
        targetQuestionId: 16,
      },
      {
        timestampSec: 148,
        speaker: 'Officer',
        text: 'Down in the southwest corner near the duck ponds, the open grassy play zone is the Childrens Meadow at letter E.',
        targetQuestionId: 17,
      },
      {
        timestampSec: 162,
        speaker: 'Officer',
        text: 'Next to the Meadow across the path sits the craft studio where potters and blacksmiths work, our Artisan Workshop at F.',
        targetQuestionId: 18,
      },
      {
        timestampSec: 178,
        speaker: 'Officer',
        text: 'Visitors should note that feeding the swans white bread is strictly prohibited because it damages their digestive system.',
        targetQuestionId: 19,
      },
      {
        timestampSec: 190,
        speaker: 'Officer',
        text: 'In the event of thunderstorm warnings, the park acoustic alarm will sound three consecutive chimes.',
        targetQuestionId: 20,
      },
    ],
    questions: [
      {
        id: 11,
        sectionIndex: 1,
        type: 'note_completion',
        prompt: 'Lantern walks must be booked at least [_____] hours beforehand.',
        correctAnswer: '48',
        canonicalVariants: ['48', 'FORTY EIGHT', 'FORTY-EIGHT'],
        explanation: 'Officer states tickets must be reserved online at least 48 hours in advance.',
      },
      {
        id: 12,
        sectionIndex: 1,
        type: 'note_completion',
        prompt: 'Wicker weaving classes are conducted on [_____].',
        correctAnswer: 'WEDNESDAY',
        canonicalVariants: ['WEDNESDAY', 'WEDNESDAYS'],
        spellingCheckRequired: true,
        explanation: 'Held every Wednesday inside the old timber barn.',
      },
      {
        id: 13,
        sectionIndex: 1,
        type: 'map_labeling',
        prompt: 'Waterwheel Mill is located at letter [_____]',
        options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        correctAnswer: 'D',
        canonicalVariants: ['D'],
        explanation: 'Eastern path building with wooden paddle wheel is letter D.',
      },
      {
        id: 14,
        sectionIndex: 1,
        type: 'map_labeling',
        prompt: 'Herb Garden is located at letter [_____]',
        options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        correctAnswer: 'C',
        canonicalVariants: ['C'],
        explanation: 'Aromatic enclosure on western bank opposite the mill is letter C.',
      },
      {
        id: 15,
        sectionIndex: 1,
        type: 'map_labeling',
        prompt: 'North Quay is located at letter [_____]',
        options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        correctAnswer: 'A',
        canonicalVariants: ['A'],
        explanation: 'Northernmost mooring basin for vintage barges is letter A.',
      },
      {
        id: 16,
        sectionIndex: 1,
        type: 'map_labeling',
        prompt: 'Boathouse Pier is located at letter [_____]',
        options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        correctAnswer: 'B',
        canonicalVariants: ['B'],
        explanation: 'Boardwalk with rowboat moorings just south of North Quay is B.',
      },
      {
        id: 17,
        sectionIndex: 1,
        type: 'map_labeling',
        prompt: 'Childrens Meadow is located at letter [_____]',
        options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        correctAnswer: 'E',
        canonicalVariants: ['E'],
        explanation: 'Southwest open grassy play zone near duck ponds is E.',
      },
      {
        id: 18,
        sectionIndex: 1,
        type: 'map_labeling',
        prompt: 'Artisan Workshop is located at letter [_____]',
        options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        correctAnswer: 'F',
        canonicalVariants: ['F'],
        explanation: 'Craft studio across path from meadow is letter F.',
      },
      {
        id: 19,
        sectionIndex: 1,
        type: 'note_completion',
        prompt: 'Feeding white [_____] to swans is prohibited.',
        correctAnswer: 'BREAD',
        canonicalVariants: ['BREAD'],
        explanation: 'White bread harms swans\' digestive systems.',
      },
      {
        id: 20,
        sectionIndex: 1,
        type: 'note_completion',
        prompt: 'Storm alarm signal sounds three consecutive [_____].',
        correctAnswer: 'CHIMES',
        canonicalVariants: ['CHIMES', 'CHIME'],
        explanation: 'The acoustic alarm sounds three consecutive chimes.',
      },
    ],
  },

  // SECTION 3: Academic Group Discussion (Tutorial Discussion)
  {
    sectionIndex: 2,
    title: 'Section 3: Sustainable Urban Architecture Tutorial',
    typeDesc: 'Academic Discussion between Tutor and Two Architecture Students',
    readingRange: 'Q21–30',
    wordLimitRule: 'NO MORE THAN TWO WORDS',
    maxWords: 2,
    allowNumber: false,
    instructionHeader: 'Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.',
    audioDurationSec: 210,
    dialogueTurns: [
      {
        timestampSec: 5,
        speaker: 'Dr. Vance',
        text: 'Good afternoon Fiona and Callum. Let us examine your dissertation methodology on geothermal heat pumps in residential retrofits.',
      },
      {
        timestampSec: 20,
        speaker: 'Fiona',
        text: 'Thank you Dr. Vance. We initially intended to focus solely on solar photovoltaic panels, but our initial feasibility study revealed that space heating accounts for the vast majority of carbon emissions in Victorian terrace housing.',
      },
      {
        timestampSec: 36,
        speaker: 'Callum',
        text: 'Exactly. So we decided to evaluate ground-source heat loops drilled vertically into back gardens.',
      },
      {
        timestampSec: 46,
        speaker: 'Dr. Vance',
        text: 'What was your greatest empirical challenge when gathering soil thermal conductivity data?',
      },
      {
        timestampSec: 54,
        speaker: 'Fiona',
        text: 'Unquestionably, the presence of heavy clay layers beneath South London. Clay retains moisture unpredictably, altering heat transfer coefficients.',
        targetQuestionId: 21,
      },
      {
        timestampSec: 70,
        speaker: 'Callum',
        text: 'And when we surveyed sixty homeowner households, their primary hesitation was not operating reliability, but rather the prohibitive installation costs.',
        distractorTrap: 'Homeowners did not worry about operating reliability; initial installation costs were the primary barrier.',
        targetQuestionId: 22,
      },
      {
        timestampSec: 88,
        speaker: 'Dr. Vance',
        text: 'Did government subsidy schemes like the Boiler Upgrade Grant influence their willingness to convert?',
      },
      {
        timestampSec: 96,
        speaker: 'Fiona',
        text: 'Somewhat, but most respondents found the administrative paperwork excessively bureaucratic and opaque.',
        targetQuestionId: 23,
      },
      {
        timestampSec: 110,
        speaker: 'Callum',
        text: 'For our comparative case study in Manchester, we collaborated with a municipal housing association.',
        targetQuestionId: 24,
      },
      {
        timestampSec: 124,
        speaker: 'Dr. Vance',
        text: 'What acoustic insulation measures did they incorporate to isolate compressor vibration?',
      },
      {
        timestampSec: 132,
        speaker: 'Callum',
        text: 'They mounted the external compressor units on recycled rubber pads to dampen low-frequency hum.',
        targetQuestionId: 25,
      },
      {
        timestampSec: 148,
        speaker: 'Fiona',
        text: 'And inside the utility room, they lined the adjoining partition wall with dense mineral wool.',
        targetQuestionId: 26,
      },
      {
        timestampSec: 162,
        speaker: 'Dr. Vance',
        text: 'Now regarding your literature review chapter: ensure you cite Professor Arbuthnot’s 2023 paper on thermodynamic equilibrium.',
        targetQuestionId: 27,
      },
      {
        timestampSec: 178,
        speaker: 'Callum',
        text: 'We also analyzed thermodynamic modeling software. We found ThermoCad was much easier to calibrate than EnergyPlus.',
        targetQuestionId: 28,
      },
      {
        timestampSec: 192,
        speaker: 'Fiona',
        text: 'Finally, our submission deadline has been moved forward to Friday afternoon.',
        targetQuestionId: 29,
      },
      {
        timestampSec: 202,
        speaker: 'Dr. Vance',
        text: 'Make sure your final appendix includes all raw calibration logs.',
        targetQuestionId: 30,
      },
    ],
    questions: [
      {
        id: 21,
        sectionIndex: 2,
        type: 'note_completion',
        prompt: 'Main geological challenge in South London: heavy [_____] layers.',
        correctAnswer: 'CLAY',
        canonicalVariants: ['CLAY'],
        explanation: 'Fiona specifies heavy clay layers beneath South London.',
      },
      {
        id: 22,
        sectionIndex: 2,
        type: 'note_completion',
        prompt: 'Primary homeowner reservation: excessive [_____] costs.',
        correctAnswer: 'INSTALLATION',
        canonicalVariants: ['INSTALLATION', 'INITIAL INSTALLATION'],
        spellingCheckRequired: true,
        distractorNote: 'Distractor trap: not operating reliability, but installation costs.',
        explanation: 'Callum highlights prohibitive installation costs.',
      },
      {
        id: 23,
        sectionIndex: 2,
        type: 'note_completion',
        prompt: 'Homeowners criticized grant application process for being overly [_____].',
        correctAnswer: 'BUREAUCRATIC',
        canonicalVariants: ['BUREAUCRATIC'],
        spellingCheckRequired: true,
        explanation: 'Fiona notes paperwork was bureaucratic and opaque.',
      },
      {
        id: 24,
        sectionIndex: 2,
        type: 'note_completion',
        prompt: 'Manchester study was conducted with a municipal [_____] association.',
        correctAnswer: 'HOUSING',
        canonicalVariants: ['HOUSING'],
        explanation: 'Collaborated with a municipal housing association.',
      },
      {
        id: 25,
        sectionIndex: 2,
        type: 'note_completion',
        prompt: 'Compressor vibration dampened using recycled [_____] pads.',
        correctAnswer: 'RUBBER',
        canonicalVariants: ['RUBBER'],
        explanation: 'Mounted external compressors on recycled rubber pads.',
      },
      {
        id: 26,
        sectionIndex: 2,
        type: 'note_completion',
        prompt: 'Adjoining walls insulated using dense [_____].',
        correctAnswer: 'MINERAL WOOL',
        canonicalVariants: ['MINERAL WOOL'],
        explanation: 'Partition wall lined with dense mineral wool.',
      },
      {
        id: 27,
        sectionIndex: 2,
        type: 'note_completion',
        prompt: 'Literature review must cite Professor [_____] (2023).',
        correctAnswer: 'ARBUTHNOT',
        canonicalVariants: ['ARBUTHNOT'],
        explanation: 'Dr. Vance instructs them to cite Professor Arbuthnot.',
      },
      {
        id: 28,
        sectionIndex: 2,
        type: 'note_completion',
        prompt: 'Modeling software preferred for ease of calibration: [_____].',
        correctAnswer: 'THERMOCAD',
        canonicalVariants: ['THERMOCAD'],
        explanation: 'ThermoCad was much easier to calibrate than EnergyPlus.',
      },
      {
        id: 29,
        sectionIndex: 2,
        type: 'note_completion',
        prompt: 'Dissertation draft submission is due this [_____].',
        correctAnswer: 'FRIDAY',
        canonicalVariants: ['FRIDAY', 'FRIDAY AFTERNOON'],
        explanation: 'Submission deadline moved forward to Friday afternoon.',
      },
      {
        id: 30,
        sectionIndex: 2,
        type: 'note_completion',
        prompt: 'Appendix must contain all raw [_____] logs.',
        correctAnswer: 'CALIBRATION',
        canonicalVariants: ['CALIBRATION'],
        explanation: 'Dr. Vance specifies raw calibration logs.',
      },
    ],
  },

  // SECTION 4: University Lecture (Monologue on Marine Biology)
  {
    sectionIndex: 3,
    title: 'Section 4: The Bioluminescent Ocean: Cephalopod Photophores',
    typeDesc: 'Monologue Lecture by Marine Biologist on Deep Sea Photophores',
    readingRange: 'Q31–40',
    wordLimitRule: 'ONE WORD ONLY',
    maxWords: 1,
    allowNumber: false,
    instructionHeader: 'Complete the notes below. Write ONE WORD ONLY for each answer.',
    audioDurationSec: 220,
    dialogueTurns: [
      {
        timestampSec: 5,
        speaker: 'Professor',
        text: 'Good morning students. Today we explore bioluminescent adaptations in the mesopelagic twilight zone between 200 and 1,000 meters beneath the surface.',
      },
      {
        timestampSec: 22,
        speaker: 'Professor',
        text: 'In this twilight habitat, sunlight is attenuated to a faint monochromatic blue hue, eliminating almost all red wavelengths.',
      },
      {
        timestampSec: 36,
        speaker: 'Professor',
        text: 'Many cephalopods, notably the firefly squid Watasenia scintillans, have evolved specialized glandular organs called photophores.',
        targetQuestionId: 31,
      },
      {
        timestampSec: 52,
        speaker: 'Professor',
        text: 'The biochemical engine driving light generation relies on a chemical substrate known as luciferin, which is oxidized by the catalyst luciferase.',
        targetQuestionId: 32,
      },
      {
        timestampSec: 70,
        speaker: 'Professor',
        text: 'Unlike thermal incandescent light sources, bioluminescence is virtually cold light, losing less than twenty percent of its energy to heat.',
        targetQuestionId: 33,
      },
      {
        timestampSec: 88,
        speaker: 'Professor',
        text: 'Perhaps the most sophisticated ecological utility of ventral photophores is counter-illumination camouflage.',
        targetQuestionId: 34,
      },
      {
        timestampSec: 104,
        speaker: 'Professor',
        text: 'When upward-looking predators swim beneath a squid, the squid emits light matching the exact intensity and wavelength of downwelling sunlight, effectively erasing its silhouette.',
        distractorTrap: 'Predators gaze upward from below, while downwelling light comes from above.',
        targetQuestionId: 35,
      },
      {
        timestampSec: 125,
        speaker: 'Professor',
        text: 'To measure downwelling light precisely, the squid utilizes dorsal photoreceptive vesicles located on its crown.',
        targetQuestionId: 36,
      },
      {
        timestampSec: 142,
        speaker: 'Professor',
        text: 'In addition to camouflage, bioluminescent bursts are deployed during courtship rituals to attract a mate.',
        targetQuestionId: 37,
      },
      {
        timestampSec: 160,
        speaker: 'Professor',
        text: 'When violently startled by apex hunters such as swordfish, squids release a glowing luminescent cloud rather than ordinary melanin ink.',
        distractorTrap: 'Startled squids eject a luminescent cloud, contrasting with black melanin ink used in shallower waters.',
        targetQuestionId: 38,
      },
      {
        timestampSec: 182,
        speaker: 'Professor',
        text: 'Recent deep-sea robotic submersibles fitted with sapphire lenses have documented collective flashing displays in Toyama Bay.',
        targetQuestionId: 39,
      },
      {
        timestampSec: 202,
        speaker: 'Professor',
        text: 'Biomedical researchers are currently cloning luciferase enzymes for use as genetic markers in cancer diagnostics.',
        targetQuestionId: 40,
      },
    ],
    questions: [
      {
        id: 31,
        sectionIndex: 3,
        type: 'note_completion',
        prompt: 'Light-producing organs in cephalopods are known as [_____].',
        correctAnswer: 'PHOTOPHORES',
        canonicalVariants: ['PHOTOPHORES', 'PHOTOPHORE'],
        spellingCheckRequired: true,
        explanation: 'Specialized glandular organs called photophores.',
      },
      {
        id: 32,
        sectionIndex: 3,
        type: 'note_completion',
        prompt: 'Light emission is catalyzed by the enzyme [_____].',
        correctAnswer: 'LUCIFERASE',
        canonicalVariants: ['LUCIFERASE'],
        spellingCheckRequired: true,
        explanation: 'Chemical substrate luciferin is oxidized by luciferase.',
      },
      {
        id: 33,
        sectionIndex: 3,
        type: 'note_completion',
        prompt: 'Bioluminescence produces minimal waste [_____].',
        correctAnswer: 'HEAT',
        canonicalVariants: ['HEAT'],
        explanation: 'Virtually cold light, losing less than 20% to heat.',
      },
      {
        id: 34,
        sectionIndex: 3,
        type: 'note_completion',
        prompt: 'Primary defense strategy: counter-illumination [_____].',
        correctAnswer: 'CAMOUFLAGE',
        canonicalVariants: ['CAMOUFLAGE'],
        spellingCheckRequired: true,
        explanation: 'Counter-illumination camouflage.',
      },
      {
        id: 35,
        sectionIndex: 3,
        type: 'note_completion',
        prompt: 'Ventral light prevents predators from detecting the animal\'s [_____].',
        correctAnswer: 'SILHOUETTE',
        canonicalVariants: ['SILHOUETTE', 'SILHOUETTES'],
        spellingCheckRequired: true,
        distractorNote: 'Matches downwelling light from above so bottom-up predators see no silhouette.',
        explanation: 'Effectively erasing its silhouette from predators below.',
      },
      {
        id: 36,
        sectionIndex: 3,
        type: 'note_completion',
        prompt: 'Downwelling sunlight is monitored by dorsal [_____] on the head.',
        correctAnswer: 'VESICLES',
        canonicalVariants: ['VESICLES', 'VESICLE'],
        explanation: 'Dorsal photoreceptive vesicles located on its crown.',
      },
      {
        id: 37,
        sectionIndex: 3,
        type: 'note_completion',
        prompt: 'Light patterns also serve to attract a [_____] during courtship.',
        correctAnswer: 'MATE',
        canonicalVariants: ['MATE', 'PARTNER'],
        explanation: 'Deployed during courtship rituals to attract a mate.',
      },
      {
        id: 38,
        sectionIndex: 3,
        type: 'note_completion',
        prompt: 'When threatened, deep squids release a glowing [_____] instead of ink.',
        correctAnswer: 'CLOUD',
        canonicalVariants: ['CLOUD'],
        distractorNote: 'Distractor trap: luminescent cloud is released, not ordinary melanin ink.',
        explanation: 'Squids release a glowing luminescent cloud.',
      },
      {
        id: 39,
        sectionIndex: 3,
        type: 'note_completion',
        prompt: 'Mass flashing aggregations observed in Toyama [_____].',
        correctAnswer: 'BAY',
        canonicalVariants: ['BAY'],
        explanation: 'Collective flashing displays in Toyama Bay.',
      },
      {
        id: 40,
        sectionIndex: 3,
        type: 'note_completion',
        prompt: 'Luciferase enzymes are used in biomedical research to detect [_____].',
        correctAnswer: 'CANCER',
        canonicalVariants: ['CANCER'],
        explanation: 'Cloning luciferase enzymes as genetic markers in cancer diagnostics.',
      },
    ],
  },
]

// ==========================================
// DETERMINISTIC ANSWER NORMALIZER ENGINE
// Handles: UK/US spelling, numbers/words, determiners, dates
// ==========================================

const UK_US_SPELLING_PAIRS: Record<string, string> = {
  COLOUR: 'COLOR',
  COLOR: 'COLOUR',
  FLAVOUR: 'FLAVOR',
  FLAVOR: 'FLAVOUR',
  THEATRE: 'THEATER',
  THEATER: 'THEATRE',
  CENTRE: 'CENTER',
  CENTER: 'CENTRE',
  METRE: 'METER',
  METER: 'METRE',
  TRAVELLING: 'TRAVELING',
  TRAVELING: 'TRAVELLING',
  PROGRAMME: 'PROGRAM',
  PROGRAM: 'PROGRAMME',
  ANALYSE: 'ANALYZE',
  ANALYZE: 'ANALYSE',
  ORGANISATION: 'ORGANIZATION',
  ORGANIZATION: 'ORGANISATION',
  ALUMINIUM: 'ALUMINUM',
  ALUMINUM: 'ALUMINIUM',
}

const NUMBER_WORDS: Record<string, string> = {
  '1': 'ONE',
  '2': 'TWO',
  '3': 'THREE',
  '4': 'FOUR',
  '5': 'FIVE',
  '6': 'SIX',
  '7': 'SEVEN',
  '8': 'EIGHT',
  '9': 'NINE',
  '10': 'TEN',
  '11': 'ELEVEN',
  '12': 'TWELVE',
  '13': 'THIRTEEN',
  '14': 'FOURTEEN',
  '15': 'FIFTEEN',
  '16': 'SIXTEEN',
  '17': 'SEVENTEEN',
  '18': 'EIGHTEEN',
  '19': 'NINETEEN',
  '20': 'TWENTY',
  '30': 'THIRTY',
  '40': 'FORTY',
  '45': 'FORTY FIVE',
  '48': 'FORTY EIGHT',
  '50': 'FIFTY',
  '60': 'SIXTY',
}

export interface NormalizerResult {
  isCorrect: boolean
  userNormalized: string
  canonicalDisplay: string
  reason: 'exact' | 'uk_us_variant' | 'number_word_equivalent' | 'determiner_stripped' | 'date_equivalent' | 'misspelled' | 'incorrect'
}

export function normalizeListeningAnswer(
  rawInput: string,
  question: ListeningQuestion
): NormalizerResult {
  const user = (rawInput || '').trim().toUpperCase().replace(/[.,;!]/g, '')
  if (!user) {
    return {
      isCorrect: false,
      userNormalized: '',
      canonicalDisplay: question.canonicalVariants.join(' / '),
      reason: 'incorrect',
    }
  }

  // Strip leading determiners like "THE ", "A ", "AN "
  const stripDeterminer = (s: string) => s.replace(/^(THE|A|AN)\s+/, '').trim()
  const userNoDet = stripDeterminer(user)

  // Direct canonical check
  for (const variant of question.canonicalVariants) {
    const v = variant.toUpperCase().trim()
    if (user === v || userNoDet === stripDeterminer(v)) {
      return {
        isCorrect: true,
        userNormalized: user,
        canonicalDisplay: question.canonicalVariants.join(' / '),
        reason: user === v ? 'exact' : 'determiner_stripped',
      }
    }
  }

  // UK / US spelling check
  for (const variant of question.canonicalVariants) {
    const v = variant.toUpperCase().trim()
    const userWords = userNoDet.split(/\s+/)
    const variantWords = stripDeterminer(v).split(/\s+/)

    if (userWords.length === variantWords.length) {
      const allMatch = userWords.every((uw, idx) => {
        const vw = variantWords[idx]
        return uw === vw || UK_US_SPELLING_PAIRS[uw] === vw
      })
      if (allMatch) {
        return {
          isCorrect: true,
          userNormalized: user,
          canonicalDisplay: question.canonicalVariants.join(' / '),
          reason: 'uk_us_variant',
        }
      }
    }
  }

  // Number / Word equivalence check (e.g. "45" vs "FORTY FIVE")
  for (const variant of question.canonicalVariants) {
    const v = variant.toUpperCase().trim()
    const mappedWord = NUMBER_WORDS[userNoDet]
    const mappedNumber = Object.entries(NUMBER_WORDS).find(([, val]) => val === userNoDet)?.[0]

    if (mappedWord === v || mappedNumber === v) {
      return {
        isCorrect: true,
        userNormalized: user,
        canonicalDisplay: question.canonicalVariants.join(' / '),
        reason: 'number_word_equivalent',
      }
    }
  }

  // Date normalization: e.g. "14TH OCTOBER", "OCTOBER 14", "14 OCTOBER"
  const isDateQ = question.canonicalVariants.some((c) => c.includes('OCTOBER'))
  if (isDateQ) {
    const normUser = userNoDet.replace(/(\d+)(ST|ND|RD|TH)/, '$1').replace(/\s+/, ' ')
    const dateMatches = question.canonicalVariants.some((c) => {
      const normC = c.toUpperCase().replace(/(\d+)(ST|ND|RD|TH)/, '$1').replace(/\s+/, ' ')
      return normUser === normC || normUser === '14 OCTOBER' || normUser === 'OCTOBER 14'
    })
    if (dateMatches) {
      return {
        isCorrect: true,
        userNormalized: user,
        canonicalDisplay: question.canonicalVariants.join(' / '),
        reason: 'date_equivalent',
      }
    }
  }

  // Check if likely misspelled (Levenshtein distance <= 2 for words >= 6 chars)
  const isLikelyMisspelled = question.canonicalVariants.some((c) => {
    const target = stripDeterminer(c.toUpperCase())
    if (userNoDet.length >= 5 && target.length >= 5) {
      return levenshteinDistance(userNoDet, target) <= 2
    }
    return false
  })

  return {
    isCorrect: false,
    userNormalized: user,
    canonicalDisplay: question.canonicalVariants.join(' / '),
    reason: isLikelyMisspelled ? 'misspelled' : 'incorrect',
  }
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const d: number[][] = []

  for (let i = 0; i <= m; i++) d[i] = [i]
  for (let j = 0; j <= n; j++) d[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      )
    }
  }
  return d[m][n]
}

export function calculateListeningBandScore(rawScore: number): number {
  if (rawScore >= 39) return 9.0
  if (rawScore >= 37) return 8.5
  if (rawScore >= 35) return 8.0
  if (rawScore >= 32) return 7.5
  if (rawScore >= 30) return 7.0
  if (rawScore >= 26) return 6.5
  if (rawScore >= 23) return 6.0
  if (rawScore >= 18) return 5.5
  if (rawScore >= 16) return 5.0
  if (rawScore >= 13) return 4.5
  if (rawScore >= 10) return 4.0
  if (rawScore >= 8) return 3.5
  if (rawScore >= 6) return 3.0
  return 2.5
}
