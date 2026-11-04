export interface QuestionBase {
  id: number // 1 to 40
  passageIndex: 0 | 1 | 2
  type:
    | 'tfng'
    | 'matching_headings'
    | 'multiple_choice'
    | 'summary_completion'
  prompt: string
  options?: string[] // for multiple choice
  headingsList?: { roman: string; title: string }[] // for matching headings
  targetParagraph?: string // e.g., 'Paragraph A'
  correctAnswer: string // uppercase or normalized
  explanation: string
  evidenceParagraph: string // 'A', 'B', 'C', 'D', 'E', 'F'
  evidenceText: string
  falseVsNotGivenRationale?: string
  academicVocab?: {
    word: string
    ipa: string
    cefr: string
    definition: string
  }
}

export interface ReadingParagraph {
  letter: string // 'A', 'B', 'C', etc.
  content: string // Text containing segments with evidence references
  evidenceQuestions: number[] // question numbers anchored in this paragraph
}

export interface ReadingPassage {
  id: string
  passageIndex: 0 | 1 | 2
  title: string
  subtitle: string
  readingRange: string // 'Q1–13', 'Q14–26', 'Q27–40'
  paragraphs: ReadingParagraph[]
  questions: QuestionBase[]
}

export const READING_PASSAGES: ReadingPassage[] = [
  {
    id: 'rdg-passage-1',
    passageIndex: 0,
    title: 'The Secret Life of Urban Forests: Microclimates and Canopy Ecology',
    subtitle: 'How dense temperate canopies in modern metropolises reshape precipitation, evapotranspiration, and human cognitive restoration.',
    readingRange: 'Q1–13',
    paragraphs: [
      {
        letter: 'A',
        content:
          'Across the industrialized globe, civil planners have long acknowledged the aesthetic contribution of tree-lined boulevards and civic botanical gardens. However, contemporary urban forestry has moved well beyond ornamental landscape architecture. High-resolution infrared satellite radiometry indicates that contiguous urban canopies act as thermodynamic heat sinks, curtailing the urban heat island (UHI) phenomenon by up to 4.2 degrees Celsius during midsummer peak insolation.',
        evidenceQuestions: [1, 2],
      },
      {
        letter: 'B',
        content:
          'The operational mechanism behind this thermal moderation is twofold: direct foliar shading of asphalt pavements and the continuous physical process of evapotranspiration. Mature deciduous trees such as Quercus robur and Platanus acerifolia draw substantial groundwater through deep xylem vessels, converting solar radiation directly into latent heat as moisture transpires through microscopic stomata.',
        evidenceQuestions: [3, 4],
      },
      {
        letter: 'C',
        content:
          'Crucially, the ecological benefits are not evenly dispersed across urban socioeconomic topography. Research conducted across fourteen European municipalities revealed that affluent residential quarters consistently enjoy double the canopy density of industrial and working-class sectors. This disparity directly precipitates environmental injustice, as lower-income residents face elevated heat-stroke hospitalization rates during extreme climatic anomalies.',
        evidenceQuestions: [5, 6, 7],
      },
      {
        letter: 'D',
        content:
          'In response, forward-thinking metropolitan councils have adopted targeted reforestation initiatives. Rather than dispersing saplings uniformly, arborists deploy algorithmic spatial models to prioritize impervious asphalt zones adjacent to primary transit corridors and public educational campuses. Such strategic interventions yield accelerated cooling yields per hectare planted.',
        evidenceQuestions: [8, 9, 10],
      },
      {
        letter: 'E',
        content:
          'Furthermore, emerging neurobiological evidence demonstrates that visual proximity to diverse fractal foliage lowers salivary cortisol concentrations and fosters attentional restoration. Exposure to volatile airborne phytoncides released by conifer stands additionally correlates with heightened natural killer (NK) immune cell activity among daily commuters.',
        evidenceQuestions: [11, 12, 13],
      },
    ],
    questions: [
      {
        id: 1,
        passageIndex: 0,
        type: 'tfng',
        prompt: 'Infrared satellite readings confirm that urban canopies reduce peak midsummer temperatures by over 4 degrees Celsius.',
        correctAnswer: 'TRUE',
        explanation: 'Paragraph A confirms that satellite radiometry shows contiguous urban canopies curtail UHI by up to 4.2 degrees Celsius during midsummer peak insolation.',
        evidenceParagraph: 'A',
        evidenceText: 'High-resolution infrared satellite radiometry indicates that contiguous urban canopies act as thermodynamic heat sinks, curtailing the urban heat island (UHI) phenomenon by up to 4.2 degrees Celsius during midsummer peak insolation.',
        academicVocab: {
          word: 'insolation',
          ipa: '/ˌɪn.soʊˈleɪ.ʃən/',
          cefr: 'C2',
          definition: 'Exposure to the sun\'s rays; the amount of solar radiation reaching a given area.',
        },
      },
      {
        id: 2,
        passageIndex: 0,
        type: 'tfng',
        prompt: 'Civil planners originally instituted tree-lined boulevards primarily to regulate precipitation patterns.',
        correctAnswer: 'FALSE',
        explanation: 'The passage contradicts this statement, noting planners initially acknowledged the aesthetic (ornamental) contribution, not precipitation regulation.',
        evidenceParagraph: 'A',
        evidenceText: 'Across the industrialized globe, civil planners have long acknowledged the aesthetic contribution of tree-lined boulevards and civic botanical gardens.',
        falseVsNotGivenRationale: 'FALSE because the text explicitly states the historical motivation was "aesthetic contribution" and "ornamental landscape architecture", directly contradicting the claim of precipitation control.',
        academicVocab: {
          word: 'ornamental',
          ipa: '/ˌɔːr.nəˈmen.təl/',
          cefr: 'C1',
          definition: 'Serving or intended as an ornament; decorative rather than functional.',
        },
      },
      {
        id: 3,
        passageIndex: 0,
        type: 'tfng',
        prompt: 'Coniferous species like pines transpire more water per hour than Quercus robur in city parks.',
        correctAnswer: 'NOT GIVEN',
        explanation: 'The passage mentions Quercus robur transpires water through stomata, but makes no hourly comparison with coniferous species.',
        evidenceParagraph: 'B',
        evidenceText: 'Mature deciduous trees such as Quercus robur and Platanus acerifolia draw substantial groundwater through deep xylem vessels, converting solar radiation directly into latent heat as moisture transpires through microscopic stomata.',
        falseVsNotGivenRationale: 'NOT GIVEN because while Quercus robur is mentioned alongside its transpiration process, the text never compares its hourly transpiration rate against coniferous trees.',
        academicVocab: {
          word: 'stomata',
          ipa: '/ˈstoʊ.mə.tə/',
          cefr: 'C2',
          definition: 'Minute pores in the epidermis of the leaf or stem of a plant through which gases and water vapor pass.',
        },
      },
      {
        id: 4,
        passageIndex: 0,
        type: 'tfng',
        prompt: 'Evapotranspiration cools the surrounding atmosphere by converting incoming solar energy into latent heat.',
        correctAnswer: 'TRUE',
        explanation: 'Paragraph B explicitly states that trees convert solar radiation directly into latent heat as moisture transpires.',
        evidenceParagraph: 'B',
        evidenceText: 'converting solar radiation directly into latent heat as moisture transpires through microscopic stomata.',
        academicVocab: {
          word: 'evapotranspiration',
          ipa: '/ɪˌvæp.oʊ.træn.spɪˈreɪ.ʃən/',
          cefr: 'C2',
          definition: 'The process by which water is transferred from the land to the atmosphere by evaporation from the soil and other surfaces and by transpiration from plants.',
        },
      },
      {
        id: 5,
        passageIndex: 0,
        type: 'tfng',
        prompt: 'Low-income quarters in the studied European cities possessed identical canopy density to wealthy areas.',
        correctAnswer: 'FALSE',
        explanation: 'Paragraph C states affluent residential quarters consistently enjoy double the canopy density of industrial and working-class sectors.',
        evidenceParagraph: 'C',
        evidenceText: 'affluent residential quarters consistently enjoy double the canopy density of industrial and working-class sectors.',
        falseVsNotGivenRationale: 'FALSE because the text states affluent areas have "double the canopy density" of working-class sectors, directly contradicting the assertion of identical density.',
        academicVocab: {
          word: 'disparity',
          ipa: '/dɪˈspær.ə.t̬i/',
          cefr: 'C1',
          definition: 'A great difference or inequality in amount, status, or quality.',
        },
      },
      {
        id: 6,
        passageIndex: 0,
        type: 'tfng',
        prompt: 'National governments have enacted strict fines for European cities failing to eliminate canopy inequalities.',
        correctAnswer: 'NOT GIVEN',
        explanation: 'Paragraph C discusses socioeconomic disparities and heat-stroke hospitalizations, but never mentions government fines or sanctions.',
        evidenceParagraph: 'C',
        evidenceText: 'This disparity directly precipitates environmental injustice, as lower-income residents face elevated heat-stroke hospitalization rates during extreme climatic anomalies.',
        falseVsNotGivenRationale: 'NOT GIVEN because while canopy disparities and health consequences are detailed, government fines or regulatory penalties are never mentioned anywhere in the passage.',
      },
      {
        id: 7,
        passageIndex: 0,
        type: 'multiple_choice',
        prompt: 'According to Paragraph C, what is the primary consequence of disparate urban canopy distribution?',
        options: [
          'A: Higher tax rates for affluent neighborhoods',
          'B: Elevated heat-stroke hospitalizations among lower-income communities',
          'C: Migration of industrial factories outside municipal borders',
          'D: Accelerated wear and tear on European rail transit lines',
        ],
        correctAnswer: 'B',
        explanation: 'Paragraph C specifies: "lower-income residents face elevated heat-stroke hospitalization rates during extreme climatic anomalies."',
        evidenceParagraph: 'C',
        evidenceText: 'lower-income residents face elevated heat-stroke hospitalization rates during extreme climatic anomalies.',
      },
      {
        id: 8,
        passageIndex: 0,
        type: 'multiple_choice',
        prompt: 'Municipal councils optimize reforestation outcomes primarily by using:',
        options: [
          'A: Uniform grid planting across all suburban parks',
          'B: Algorithmic spatial models targeting impervious asphalt zones',
          'C: Public volunteer voting schemes in residential districts',
          'D: Importing non-native drought-resistant shrubbery',
        ],
        correctAnswer: 'B',
        explanation: 'Paragraph D mentions arborists deploy algorithmic spatial models to prioritize impervious asphalt zones.',
        evidenceParagraph: 'D',
        evidenceText: 'Rather than dispersing saplings uniformly, arborists deploy algorithmic spatial models to prioritize impervious asphalt zones adjacent to primary transit corridors and public educational campuses.',
      },
      {
        id: 9,
        passageIndex: 0,
        type: 'summary_completion',
        prompt: 'Complete the summary: Algorithmic models prioritize zones adjacent to transit corridors and educational campuses to achieve accelerated [_____] per hectare.',
        correctAnswer: 'COOLING',
        explanation: 'Paragraph D concludes: "Such strategic interventions yield accelerated cooling yields per hectare planted."',
        evidenceParagraph: 'D',
        evidenceText: 'yield accelerated cooling yields per hectare planted.',
      },
      {
        id: 10,
        passageIndex: 0,
        type: 'summary_completion',
        prompt: 'Complete the summary: Instead of planting saplings [_____], arborists focus on asphalt regions with greatest need.',
        correctAnswer: 'UNIFORMLY',
        explanation: 'Paragraph D notes: "Rather than dispersing saplings uniformly, arborists deploy algorithmic spatial models..."',
        evidenceParagraph: 'D',
        evidenceText: 'Rather than dispersing saplings uniformly, arborists deploy algorithmic spatial models',
      },
      {
        id: 11,
        passageIndex: 0,
        type: 'summary_completion',
        prompt: 'Complete the summary: Observation of natural fractal patterns has been shown to decrease salivary [_____] in urban subjects.',
        correctAnswer: 'CORTISOL',
        explanation: 'Paragraph E explains that proximity to fractal foliage lowers salivary cortisol concentrations.',
        evidenceParagraph: 'E',
        evidenceText: 'visual proximity to diverse fractal foliage lowers salivary cortisol concentrations and fosters attentional restoration.',
        academicVocab: {
          word: 'cortisol',
          ipa: '/ˈkɔːr.tɪ.zɒl/',
          cefr: 'C1',
          definition: 'A steroid hormone produced by the adrenal glands, released in response to stress.',
        },
      },
      {
        id: 12,
        passageIndex: 0,
        type: 'summary_completion',
        prompt: 'Complete the summary: Inhaling airborne [_____] emitted by conifer stands stimulates human natural killer cells.',
        correctAnswer: 'PHYTONCIDES',
        explanation: 'Paragraph E states exposure to volatile airborne phytoncides correlates with heightened natural killer immune cell activity.',
        evidenceParagraph: 'E',
        evidenceText: 'Exposure to volatile airborne phytoncides released by conifer stands additionally correlates with heightened natural killer (NK) immune cell activity',
        academicVocab: {
          word: 'phytoncide',
          ipa: '/faɪˈtɒn.saɪd/',
          cefr: 'C2',
          definition: 'Antimicrobial volatile organic compounds derived from plants that affect surrounding organisms.',
        },
      },
      {
        id: 13,
        passageIndex: 0,
        type: 'multiple_choice',
        prompt: 'Which bodily mechanism is directly enhanced by commuting through coniferous foliage?',
        options: [
          'A: Bone mineral density',
          'B: Natural killer immune cell activity',
          'C: Red blood cell regeneration',
          'D: Visual acuity in low light',
        ],
        correctAnswer: 'B',
        explanation: 'Paragraph E directly connects phytoncides from conifers with heightened natural killer (NK) immune cell activity.',
        evidenceParagraph: 'E',
        evidenceText: 'heightened natural killer (NK) immune cell activity among daily commuters.',
      },
    ],
  },
  {
    id: 'rdg-passage-2',
    passageIndex: 1,
    title: 'The Cartographic Renaissance: Portolan Charts and the Navigation Revolution',
    subtitle: 'From medieval parchment to mathematical rhumb lines: the intellectual transformation of maritime navigation in Renaissance Europe.',
    readingRange: 'Q14–26',
    paragraphs: [
      {
        letter: 'A',
        content:
          'Before the mid-thirteenth century, maritime voyaging across the Mediterranean and Atlantic littorals was predominantly cabotage — the practice of hugging coastal contours without venturing beyond eyesight of terra firma. The emergence of the Portolan chart completely revolutionized this empirical tradition. Inscribed meticulously upon treated calf vellum, these navigation instruments provided mariners with an unprecedented degree of geographic certitude.',
        evidenceQuestions: [14, 15],
      },
      {
        letter: 'B',
        content:
          'Unlike modern nautical charts oriented around orthogonal Mercator projections with consistent parallels of latitude and meridians of longitude, Portolan charts employed a spiderweb network of crisscrossing rhumb lines, or loxodromes. Radiating outwards from ornate 32-point compass roses, these lines allowed helmsmen to maintain a constant magnetic compass heading between major trading ports, even when blown far off course by adverse squalls.',
        evidenceQuestions: [16, 17, 18],
      },
      {
        letter: 'C',
        content:
          'A distinguishing stylistic trait of Portolan draftsmanship was the inward-facing orientation of coastal place names. To facilitate easy reading while unfurling oversized skins across pitching cabin tables, scribes oriented all toponyms perpendicular to the coastline into the terrestrial interior. This left maritime shipping lanes visually uncluttered, reserving open sea expanses for wind roses and heraldic flags.',
        evidenceQuestions: [19, 20],
      },
      {
        letter: 'D',
        content:
          'The historical provenance of Portolan cartography remains fiercely contested among manuscript conservators. The Carta Pisana, discovered in Pisa and dated approximately to 1275 CE, stands as the earliest surviving parchment specimen. Intriguingly, its accuracy in delineating Mediterranean coastlines exceeds any surviving Classical Roman or Greek predecessor, suggesting a rapid leap in empirical measurement rather than incremental theoretical compilation.',
        evidenceQuestions: [21, 22, 23],
      },
      {
        letter: 'E',
        content:
          'Commercial secrecy surrounding Portolan cartography was rigorous. Major maritime republics like Venice and Genoa regarded these hand-illuminated charts as paramount state secrets. Unauthorized export or reproduction of navigational vellum was classified as high treason, punishable by banishment or death. Despite these draconian edicts, Catalan workshops in Mallorca eventually established an open merchant atelier, disseminating Portolans to Flemish and English trading guilds.',
        evidenceQuestions: [24, 25, 26],
      },
    ],
    questions: [
      {
        id: 14,
        passageIndex: 1,
        type: 'matching_headings',
        prompt: 'Choose the correct heading for Paragraph A from the list of headings below.',
        targetParagraph: 'Paragraph A',
        headingsList: [
          { roman: 'i', title: 'The shift from coastal cabotage to oceanic certitude' },
          { roman: 'ii', title: 'Mathematical principles of crisscrossing rhumb lines' },
          { roman: 'iii', title: 'State secrecy and penalties for unauthorized chart copies' },
          { roman: 'iv', title: 'Toponym orientation and uncluttered maritime lanes' },
          { roman: 'v', title: 'Debates surrounding the provenance of early manuscripts' },
        ],
        correctAnswer: 'i',
        explanation: 'Paragraph A describes how mariners shifted from coastal hugging (cabotage) to using Portolan charts on calf vellum for geographic certitude.',
        evidenceParagraph: 'A',
        evidenceText: 'Before the mid-thirteenth century, maritime voyaging across the Mediterranean and Atlantic littorals was predominantly cabotage... The emergence of the Portolan chart completely revolutionized this empirical tradition.',
        academicVocab: {
          word: 'cabotage',
          ipa: '/ˈkæb.ə.tɑːʒ/',
          cefr: 'C2',
          definition: 'Coastal navigation and trade, especially along waters between ports of the same country.',
        },
      },
      {
        id: 15,
        passageIndex: 1,
        type: 'matching_headings',
        prompt: 'Choose the correct heading for Paragraph B from the list of headings below.',
        targetParagraph: 'Paragraph B',
        headingsList: [
          { roman: 'i', title: 'The shift from coastal cabotage to oceanic certitude' },
          { roman: 'ii', title: 'Mathematical principles of crisscrossing rhumb lines' },
          { roman: 'iii', title: 'State secrecy and penalties for unauthorized chart copies' },
          { roman: 'iv', title: 'Toponym orientation and uncluttered maritime lanes' },
          { roman: 'v', title: 'Debates surrounding the provenance of early manuscripts' },
        ],
        correctAnswer: 'ii',
        explanation: 'Paragraph B explains the network of crisscrossing rhumb lines (loxodromes) and 32-point compass roses used to steer headings.',
        evidenceParagraph: 'B',
        evidenceText: 'Portolan charts employed a spiderweb network of crisscrossing rhumb lines, or loxodromes. Radiating outwards from ornate 32-point compass roses, these lines allowed helmsmen to maintain a constant magnetic compass heading',
        academicVocab: {
          word: 'loxodrome',
          ipa: '/ˈlɒk.sə.droʊm/',
          cefr: 'C2',
          definition: 'An imaginary line on the earth\'s surface cutting all meridians at the same angle; a rhumb line.',
        },
      },
      {
        id: 16,
        passageIndex: 1,
        type: 'matching_headings',
        prompt: 'Choose the correct heading for Paragraph C from the list of headings below.',
        targetParagraph: 'Paragraph C',
        headingsList: [
          { roman: 'i', title: 'The shift from coastal cabotage to oceanic certitude' },
          { roman: 'ii', title: 'Mathematical principles of crisscrossing rhumb lines' },
          { roman: 'iii', title: 'State secrecy and penalties for unauthorized chart copies' },
          { roman: 'iv', title: 'Toponym orientation and uncluttered maritime lanes' },
          { roman: 'v', title: 'Debates surrounding the provenance of early manuscripts' },
        ],
        correctAnswer: 'iv',
        explanation: 'Paragraph C details how scribes placed coastal place names (toponyms) inward into land so sea lanes stayed visually clear.',
        evidenceParagraph: 'C',
        evidenceText: 'A distinguishing stylistic trait of Portolan draftsmanship was the inward-facing orientation of coastal place names... This left maritime shipping lanes visually uncluttered',
        academicVocab: {
          word: 'toponym',
          ipa: '/ˈtɒp.ə.nɪm/',
          cefr: 'C1',
          definition: 'A place name, especially one derived from a topographical feature.',
        },
      },
      {
        id: 17,
        passageIndex: 1,
        type: 'matching_headings',
        prompt: 'Choose the correct heading for Paragraph D from the list of headings below.',
        targetParagraph: 'Paragraph D',
        headingsList: [
          { roman: 'i', title: 'The shift from coastal cabotage to oceanic certitude' },
          { roman: 'ii', title: 'Mathematical principles of crisscrossing rhumb lines' },
          { roman: 'iii', title: 'State secrecy and penalties for unauthorized chart copies' },
          { roman: 'iv', title: 'Toponym orientation and uncluttered maritime lanes' },
          { roman: 'v', title: 'Debates surrounding the provenance of early manuscripts' },
        ],
        correctAnswer: 'v',
        explanation: 'Paragraph D discusses the Carta Pisana and scholarly debates regarding where Portolan accuracy originated.',
        evidenceParagraph: 'D',
        evidenceText: 'The historical provenance of Portolan cartography remains fiercely contested among manuscript conservators. The Carta Pisana, discovered in Pisa and dated approximately to 1275 CE',
        academicVocab: {
          word: 'provenance',
          ipa: '/ˈprɒv.ən.əns/',
          cefr: 'C2',
          definition: 'The place of origin or earliest known history of something.',
        },
      },
      {
        id: 18,
        passageIndex: 1,
        type: 'matching_headings',
        prompt: 'Choose the correct heading for Paragraph E from the list of headings below.',
        targetParagraph: 'Paragraph E',
        headingsList: [
          { roman: 'i', title: 'The shift from coastal cabotage to oceanic certitude' },
          { roman: 'ii', title: 'Mathematical principles of crisscrossing rhumb lines' },
          { roman: 'iii', title: 'State secrecy and penalties for unauthorized chart copies' },
          { roman: 'iv', title: 'Toponym orientation and uncluttered maritime lanes' },
          { roman: 'v', title: 'Debates surrounding the provenance of early manuscripts' },
        ],
        correctAnswer: 'iii',
        explanation: 'Paragraph E describes severe state secret laws in Venice and Genoa punishing chart leaks with banishment or death.',
        evidenceParagraph: 'E',
        evidenceText: 'Major maritime republics like Venice and Genoa regarded these hand-illuminated charts as paramount state secrets. Unauthorized export or reproduction of navigational vellum was classified as high treason, punishable by banishment or death.',
      },
      {
        id: 19,
        passageIndex: 1,
        type: 'tfng',
        prompt: 'Portolan charts used the same orthogonal Mercator projection seen on modern school atlas maps.',
        correctAnswer: 'FALSE',
        explanation: 'Paragraph B explicitly contrasts Portolans against Mercator projections: "Unlike modern nautical charts oriented around orthogonal Mercator projections... Portolan charts employed a spiderweb network of crisscrossing rhumb lines".',
        evidenceParagraph: 'B',
        evidenceText: 'Unlike modern nautical charts oriented around orthogonal Mercator projections with consistent parallels of latitude and meridians of longitude, Portolan charts employed a spiderweb network of crisscrossing rhumb lines',
        falseVsNotGivenRationale: 'FALSE because the text states Portolan charts operated "Unlike modern nautical charts oriented around orthogonal Mercator projections", explicitly refuting the statement.',
      },
      {
        id: 20,
        passageIndex: 1,
        type: 'tfng',
        prompt: 'Inward-oriented place names allowed sailors to read locations easily when charts were spread across table surfaces.',
        correctAnswer: 'TRUE',
        explanation: 'Paragraph C states: "To facilitate easy reading while unfurling oversized skins across pitching cabin tables, scribes oriented all toponyms perpendicular to the coastline into the terrestrial interior."',
        evidenceParagraph: 'C',
        evidenceText: 'To facilitate easy reading while unfurling oversized skins across pitching cabin tables, scribes oriented all toponyms perpendicular to the coastline into the terrestrial interior.',
      },
      {
        id: 21,
        passageIndex: 1,
        type: 'tfng',
        prompt: 'The Carta Pisana was drawn directly from surviving cartographic records of Ptolemy.',
        correctAnswer: 'FALSE',
        explanation: 'Paragraph D states the Carta Pisana exceeds any Classical Roman or Greek predecessor and suggests an empirical leap rather than theoretical compilation from classical sources.',
        evidenceParagraph: 'D',
        evidenceText: 'its accuracy in delineating Mediterranean coastlines exceeds any surviving Classical Roman or Greek predecessor, suggesting a rapid leap in empirical measurement rather than incremental theoretical compilation.',
        falseVsNotGivenRationale: 'FALSE because the evidence states its accuracy surpassed classical forebears through an empirical measurement leap rather than incremental theoretical copying.',
      },
      {
        id: 22,
        passageIndex: 1,
        type: 'tfng',
        prompt: 'Mallorcan cartographers charged higher gold guilders for their charts than Venetian government guilds.',
        correctAnswer: 'NOT GIVEN',
        explanation: 'Paragraph E discusses Catalan workshops in Mallorca establishing open ateliers, but never gives or compares the prices charged in gold guilders.',
        evidenceParagraph: 'E',
        evidenceText: 'Catalan workshops in Mallorca eventually established an open merchant atelier, disseminating Portolans to Flemish and English trading guilds.',
        falseVsNotGivenRationale: 'NOT GIVEN because price figures, currencies, and cost comparisons between Mallorcan and Venetian workshops are completely absent from the text.',
      },
      {
        id: 23,
        passageIndex: 1,
        type: 'summary_completion',
        prompt: 'Complete the summary: Early Mediterranean sailors mostly relied on [_____], a navigational technique restricted to visual sight of the coast.',
        correctAnswer: 'CABOTAGE',
        explanation: 'Paragraph A establishes: "maritime voyaging across the Mediterranean and Atlantic littorals was predominantly cabotage — the practice of hugging coastal contours without venturing beyond eyesight of terra firma."',
        evidenceParagraph: 'A',
        evidenceText: 'predominantly cabotage — the practice of hugging coastal contours without venturing beyond eyesight of terra firma.',
      },
      {
        id: 24,
        passageIndex: 1,
        type: 'summary_completion',
        prompt: 'Complete the summary: Rhumb lines on Portolan vellums radiated from a thirty-two point [_____] rose.',
        correctAnswer: 'COMPASS',
        explanation: 'Paragraph B explains: "Radiating outwards from ornate 32-point compass roses, these lines allowed helmsmen..."',
        evidenceParagraph: 'B',
        evidenceText: 'Radiating outwards from ornate 32-point compass roses',
      },
      {
        id: 25,
        passageIndex: 1,
        type: 'summary_completion',
        prompt: 'Complete the summary: The oldest extant specimen of a Portolan chart is recognized as the [_____] Pisana.',
        correctAnswer: 'CARTA',
        explanation: 'Paragraph D mentions: "The Carta Pisana, discovered in Pisa and dated approximately to 1275 CE, stands as the earliest surviving parchment specimen."',
        evidenceParagraph: 'D',
        evidenceText: 'The Carta Pisana, discovered in Pisa and dated approximately to 1275 CE',
      },
      {
        id: 26,
        passageIndex: 1,
        type: 'summary_completion',
        prompt: 'Complete the summary: Venetian laws classified unauthorized distribution of navigation charts as high [_____].',
        correctAnswer: 'TREASON',
        explanation: 'Paragraph E states: "Unauthorized export or reproduction of navigational vellum was classified as high treason, punishable by banishment or death."',
        evidenceParagraph: 'E',
        evidenceText: 'reproduction of navigational vellum was classified as high treason, punishable by banishment or death.',
        academicVocab: {
          word: 'treason',
          ipa: '/ˈtriː.zən/',
          cefr: 'C1',
          definition: 'The crime of betraying one\'s country or sovereign state.',
        },
      },
    ],
  },
  {
    id: 'rdg-passage-3',
    passageIndex: 2,
    title: 'The Neurological Architecture of Deep Reading in the Digital Era',
    subtitle: 'Bi-literacy circuits, skimming habits, and cognitive stamina: how screen-based consumption reshapes the brain’s synaptic architecture.',
    readingRange: 'Q27–40',
    paragraphs: [
      {
        letter: 'A',
        content:
          'Unlike spoken language acquisition, which is genetically hard-wired into Homo sapiens through evolutionary adaptations spanning hundreds of millennia, reading is an entirely unnatural invention. The human brain possesses no dedicated reading organ or biological circuit pre-allocated for deciphering phonetic scripts. Instead, the brain exploits remarkable neuroplasticity, assembling an ad-hoc reading circuit by repurposing neural structures initially evolved for visual object recognition, auditory discrimination, and conceptual synthesis.',
        evidenceQuestions: [27, 28],
      },
      {
        letter: 'B',
        content:
          'Cognitive neuroscientist Maryanne Wolf terms this malleable network the "reading brain circuit." Under sustained engagement with linear print typography, this circuit forms deep synapses connecting the visual cortex, Wernicke’s area, Broca’s area, and the prefrontal lobes. This intricate wiring underpins slow, contemplative cognitive processes: inferential reasoning, analogical deduction, perspective-taking, and critical evaluation — collectively designated as "deep reading."',
        evidenceQuestions: [29, 30],
      },
      {
        letter: 'C',
        content:
          'The transition toward omnipresent digital glass displays has exerted profound selective pressure on this neural apparatus. Eye-tracking analytics reveal that digital reading rarely follows linear left-to-right cadence; rather, readers engage in rapid F-shaped scanning heuristics, darting across the opening two lines before descending rapidly down the left margin in search of hyperlinked anchor words or bolded phrases.',
        evidenceQuestions: [31, 32, 33],
      },
      {
        letter: 'D',
        content:
          'This constant skimming environment trains the brain to prioritize rapid information triage over contemplative scrutiny. Neuroimaging scans of heavy digital readers reveal reduced activation within the deep lateral sulcus and inferior frontal gyrus during sustained textual comprehension. When confronted with syntactically complex prose — such as Victorian literature or dense academic monographs — cognitive stamina falters within minutes.',
        evidenceQuestions: [34, 35, 36],
      },
      {
        letter: 'E',
        content:
          'Crucially, the educational response must not succumb to naive Luddite rejection of digital platforms. Given the inescapable primacy of digital communication in scientific, civic, and commercial life, pedagogical theorists champion the cultivation of a "bi-literate brain." By explicitly conditioning students to adopt distinct cognitive postures for physical print (slow, inferential contemplation) versus digital screens (efficient triage and critical synthesis), we preserve deep cognitive architecture while navigating information abundancy.',
        evidenceQuestions: [37, 38, 39, 40],
      },
    ],
    questions: [
      {
        id: 27,
        passageIndex: 2,
        type: 'tfng',
        prompt: 'Human beings have developed an innate reading organ through millions of years of genetic evolution.',
        correctAnswer: 'FALSE',
        explanation: 'Paragraph A establishes that reading is unnatural and there is no dedicated reading organ; rather, the brain co-opts existing structures via neuroplasticity.',
        evidenceParagraph: 'A',
        evidenceText: 'The human brain possesses no dedicated reading organ or biological circuit pre-allocated for deciphering phonetic scripts.',
        falseVsNotGivenRationale: 'FALSE because the text states human beings possess "no dedicated reading organ", directly contradicting the assertion of an innate organ evolved genetically.',
        academicVocab: {
          word: 'neuroplasticity',
          ipa: '/ˌnʊr.oʊ.plæsˈtɪs.ə.t̬i/',
          cefr: 'C2',
          definition: 'The ability of the brain to form and reorganize synaptic connections, especially in response to learning or experience.',
        },
      },
      {
        id: 28,
        passageIndex: 2,
        type: 'tfng',
        prompt: 'Spoken language development relies on evolutionary genetic mechanisms that predate phonetic reading.',
        correctAnswer: 'TRUE',
        explanation: 'Paragraph A begins: "Unlike spoken language acquisition, which is genetically hard-wired into Homo sapiens through evolutionary adaptations spanning hundreds of millennia..."',
        evidenceParagraph: 'A',
        evidenceText: 'Unlike spoken language acquisition, which is genetically hard-wired into Homo sapiens through evolutionary adaptations spanning hundreds of millennia',
      },
      {
        id: 29,
        passageIndex: 2,
        type: 'multiple_choice',
        prompt: 'What constitutes the psychological phenomenon designated as "deep reading"?',
        options: [
          'A: Speed reading techniques enabling 1,000 words per minute',
          'B: Rapid visual scanning to identify hyperlinked keywords',
          'C: Inferential reasoning, analogical deduction, and contemplative evaluation',
          'D: Memorization of long classical poetry verses verbatim',
        ],
        correctAnswer: 'C',
        explanation: 'Paragraph B explicitly specifies: "inferential reasoning, analogical deduction, perspective-taking, and critical evaluation — collectively designated as \'deep reading\'."',
        evidenceParagraph: 'B',
        evidenceText: 'This intricate wiring underpins slow, contemplative cognitive processes: inferential reasoning, analogical deduction, perspective-taking, and critical evaluation — collectively designated as "deep reading."',
      },
      {
        id: 30,
        passageIndex: 2,
        type: 'multiple_choice',
        prompt: 'Which brain region collaborates with Wernicke’s and Broca’s areas in the deep reading circuit?',
        options: [
          'A: Cerebellum and spinal cord',
          'B: Prefrontal lobes and visual cortex',
          'C: Hippocampus and pineal gland',
          'D: Brainstem and olfactory bulb',
        ],
        correctAnswer: 'B',
        explanation: 'Paragraph B notes synaptic connections linking "the visual cortex, Wernicke’s area, Broca’s area, and the prefrontal lobes."',
        evidenceParagraph: 'B',
        evidenceText: 'forms deep synapses connecting the visual cortex, Wernicke’s area, Broca’s area, and the prefrontal lobes.',
      },
      {
        id: 31,
        passageIndex: 2,
        type: 'summary_completion',
        prompt: 'Complete the summary: Eye-tracking research shows screen readers follow an [_____] pattern instead of linear reading.',
        correctAnswer: 'F-SHAPED',
        explanation: 'Paragraph C describes: "readers engage in rapid F-shaped scanning heuristics, darting across the opening two lines..."',
        evidenceParagraph: 'C',
        evidenceText: 'readers engage in rapid F-shaped scanning heuristics, darting across the opening two lines before descending rapidly down the left margin',
      },
      {
        id: 32,
        passageIndex: 2,
        type: 'summary_completion',
        prompt: 'Complete the summary: Digital readers dart along the left margin searching for keywords and [_____] text.',
        correctAnswer: 'BOLDED',
        explanation: 'Paragraph C states readers search for "hyperlinked anchor words or bolded phrases."',
        evidenceParagraph: 'C',
        evidenceText: 'descending rapidly down the left margin in search of hyperlinked anchor words or bolded phrases.',
      },
      {
        id: 33,
        passageIndex: 2,
        type: 'tfng',
        prompt: 'Screen readers read digital content from bottom to top on handheld mobile screens.',
        correctAnswer: 'FALSE',
        explanation: 'Paragraph C specifies screen readers dart across the opening two lines before descending down the left margin in an F-shaped pattern, not bottom to top.',
        evidenceParagraph: 'C',
        evidenceText: 'darting across the opening two lines before descending rapidly down the left margin',
        falseVsNotGivenRationale: 'FALSE because the passage describes an F-shaped downward pattern (darting across the top lines, then descending down the left margin), directly contradicting bottom-to-top reading.',
      },
      {
        id: 34,
        passageIndex: 2,
        type: 'tfng',
        prompt: 'Neuroimaging scans show diminished activation in the inferior frontal gyrus among chronic digital skimmers.',
        correctAnswer: 'TRUE',
        explanation: 'Paragraph D states: "Neuroimaging scans of heavy digital readers reveal reduced activation within the deep lateral sulcus and inferior frontal gyrus during sustained textual comprehension."',
        evidenceParagraph: 'D',
        evidenceText: 'Neuroimaging scans of heavy digital readers reveal reduced activation within the deep lateral sulcus and inferior frontal gyrus during sustained textual comprehension.',
      },
      {
        id: 35,
        passageIndex: 2,
        type: 'tfng',
        prompt: 'Heavy digital readers consistently maintain cognitive focus for two hours when reading Victorian novels.',
        correctAnswer: 'FALSE',
        explanation: 'Paragraph D states: "When confronted with syntactically complex prose — such as Victorian literature or dense academic monographs — cognitive stamina falters within minutes."',
        evidenceParagraph: 'D',
        evidenceText: 'When confronted with syntactically complex prose — such as Victorian literature or dense academic monographs — cognitive stamina falters within minutes.',
        falseVsNotGivenRationale: 'FALSE because the text states cognitive stamina "falters within minutes", contradicting the claim that focus is maintained for two hours.',
      },
      {
        id: 36,
        passageIndex: 2,
        type: 'tfng',
        prompt: 'All brain regions permanently lose their plasticity after five years of daily smartphone screen exposure.',
        correctAnswer: 'NOT GIVEN',
        explanation: 'Paragraph D discusses reduced activation and faltering stamina, but never mentions permanent loss of plasticity after five years.',
        evidenceParagraph: 'D',
        evidenceText: 'This constant skimming environment trains the brain to prioritize rapid information triage over contemplative scrutiny.',
        falseVsNotGivenRationale: 'NOT GIVEN because the passage never sets a five-year timeline nor claims permanent irreversible loss of neural plasticity.',
      },
      {
        id: 37,
        passageIndex: 2,
        type: 'multiple_choice',
        prompt: 'What strategy do modern educational theorists advocate regarding screen reading?',
        options: [
          'A: Complete prohibition of electronic devices in schools and universities',
          'B: Replacing all printed paper textbooks with tablet computers',
          'C: Developing a bi-literate brain that adapts different modes to medium',
          'D: Mandatory speed-reading software training for elementary pupils',
        ],
        correctAnswer: 'C',
        explanation: 'Paragraph E states theorists champion cultivation of a "bi-literate brain" conditioning students to adopt distinct postures for print vs screens.',
        evidenceParagraph: 'E',
        evidenceText: 'pedagogical theorists champion the cultivation of a "bi-literate brain." By explicitly conditioning students to adopt distinct cognitive postures for physical print... versus digital screens',
        academicVocab: {
          word: 'pedagogical',
          ipa: '/ˌped.əˈɡɑː.dʒɪ.kəl/',
          cefr: 'C1',
          definition: 'Relating to teaching or education methods and principles.',
        },
      },
      {
        id: 38,
        passageIndex: 2,
        type: 'summary_completion',
        prompt: 'Complete the summary: Educational theorists reject a naive [_____] refusal to engage with digital technologies.',
        correctAnswer: 'LUDDITE',
        explanation: 'Paragraph E warns that the educational response "must not succumb to naive Luddite rejection of digital platforms."',
        evidenceParagraph: 'E',
        evidenceText: 'Crucially, the educational response must not succumb to naive Luddite rejection of digital platforms.',
        academicVocab: {
          word: 'Luddite',
          ipa: '/ˈlʌd.aɪt/',
          cefr: 'C2',
          definition: 'A person opposed to new technology or ways of working, named after 19th-century English textile artisans.',
        },
      },
      {
        id: 39,
        passageIndex: 2,
        type: 'summary_completion',
        prompt: 'Complete the summary: A bi-literate reader applies slow contemplation to print and efficient [_____] to digital displays.',
        correctAnswer: 'TRIAGE',
        explanation: 'Paragraph E concludes: "physical print (slow, inferential contemplation) versus digital screens (efficient triage and critical synthesis)".',
        evidenceParagraph: 'E',
        evidenceText: 'versus digital screens (efficient triage and critical synthesis), we preserve deep cognitive architecture',
        academicVocab: {
          word: 'triage',
          ipa: '/ˈtriː.ɑːʒ/',
          cefr: 'C1',
          definition: 'The assignment of degrees of urgency to decide the order of treatment or attention.',
        },
      },
      {
        id: 40,
        passageIndex: 2,
        type: 'summary_completion',
        prompt: 'Complete the summary: Deep reading fosters analogical deduction and [_____] reasoning in learners.',
        correctAnswer: 'INFERENTIAL',
        explanation: 'Paragraph B explicitly states: "inferential reasoning, analogical deduction, perspective-taking, and critical evaluation".',
        evidenceParagraph: 'B',
        evidenceText: 'slow, contemplative cognitive processes: inferential reasoning, analogical deduction',
        academicVocab: {
          word: 'inferential',
          ipa: '/ˌɪn.fəˈren.ʃəl/',
          cefr: 'C2',
          definition: 'Characterized by or based on reasoning by inference.',
        },
      },
    ],
  },
]

export function calculateReadingBandScore(rawScore: number): number {
  if (rawScore >= 39) return 9.0
  if (rawScore >= 37) return 8.5
  if (rawScore >= 35) return 8.0
  if (rawScore >= 33) return 7.5
  if (rawScore >= 30) return 7.0
  if (rawScore >= 27) return 6.5
  if (rawScore >= 23) return 6.0
  if (rawScore >= 19) return 5.5
  if (rawScore >= 15) return 5.0
  if (rawScore >= 13) return 4.5
  if (rawScore >= 10) return 4.0
  if (rawScore >= 8) return 3.5
  if (rawScore >= 6) return 3.0
  return 2.5
}
