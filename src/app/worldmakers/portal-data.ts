export type WorldMakersAdventure = {
  slug: string;
  title: string;
  eyebrow: string;
  disciplines: string[];
  premise: string;
  challenge: string;
  playerActions: string[];
  learningEvidence: string[];
  concepts: string[];
  status: 'Vertical slice' | 'Adventure candidate';
};

export const adventures: WorldMakersAdventure[] = [
  {
    slug: 'caribbean-rainforest',
    title: 'Caribbean Rainforest',
    eyebrow: 'Reference vertical slice',
    disciplines: ['Ecology', 'Biology', 'Science'],
    premise: 'A living Caribbean rainforest changes as water, habitat quality, biodiversity pressure and player construction interact.',
    challenge: 'Observe the ecosystem, intervene carefully and determine whether your solution actually improves the system over time.',
    playerActions: ['Explore zones and points of interest', 'Observe species and environmental state', 'Build ecological interventions', 'Measure visible consequences'],
    learningEvidence: ['Observation and classification', 'Prediction before intervention', 'Cause-and-effect reasoning', 'Revision after ecosystem feedback'],
    concepts: ['ecosystem', 'habitat', 'biodiversity', 'water systems', 'causal models'],
    status: 'Vertical slice',
  },
  {
    slug: 'vault-infinite-staircase',
    title: 'The Vault of the Infinite Staircase',
    eyebrow: 'Mathematics adventure',
    disciplines: ['Mathematics'],
    premise: 'A tower rearranges itself every night. Its path can only be reconstructed by discovering the numerical rules behind the architecture.',
    challenge: 'Find the pattern that governs the staircase and build a route that satisfies the tower’s changing constraints.',
    playerActions: ['Estimate and compare quantities', 'Recognize patterns', 'Build equivalent structures', 'Optimize a route under constraints'],
    learningEvidence: ['Successful pattern construction', 'Equivalence', 'Estimation', 'Explanation of a numerical rule'],
    concepts: ['patterns', 'fractions', 'ratios', 'equations', 'optimization'],
    status: 'Adventure candidate',
  },
  {
    slug: 'architects-impossible-city',
    title: 'Architects of the Impossible City',
    eyebrow: 'Geometry adventure',
    disciplines: ['Geometry', 'Mathematics'],
    premise: 'A floating city is collapsing because its bridges, domes and plazas no longer fit together.',
    challenge: 'Rebuild structures whose geometry must actually work inside the world rather than merely look correct.',
    playerActions: ['Transform and align structures', 'Use scale and symmetry', 'Measure area and volume', 'Test geometric constraints'],
    learningEvidence: ['Constraint-satisfying constructions', 'Spatial reasoning', 'Transformation accuracy', 'Geometric revision'],
    concepts: ['symmetry', 'transformations', 'angles', 'area', 'volume', 'scale'],
    status: 'Adventure candidate',
  },
  {
    slug: 'dragon-lost-words',
    title: 'The Dragon Who Lost His Words',
    eyebrow: 'English adventure',
    disciplines: ['English language'],
    premise: 'A multilingual dragon can no longer activate ancient machines because the inscriptions that gave them meaning have fragmented.',
    challenge: 'Restore meaning through contextual vocabulary, inference and communication instead of isolated drills.',
    playerActions: ['Interpret environmental language', 'Choose meaning in context', 'Communicate with intended meaning', 'Repair inscriptions and machines'],
    learningEvidence: ['Contextual comprehension', 'Target-language communication', 'Inference', 'Appropriate register'],
    concepts: ['vocabulary', 'syntax', 'register', 'listening', 'inference'],
    status: 'Adventure candidate',
  },
  {
    slug: 'biblioteca-palabras-perdidas',
    title: 'La Biblioteca de las Palabras Perdidas',
    eyebrow: 'Spanish adventure',
    disciplines: ['Spanish language'],
    premise: 'A living library transforms when words are used precisely and relationships between meanings are restored.',
    challenge: 'Reconstruct language that changes the environment and reveals new paths through the library.',
    playerActions: ['Reconstruct sentences', 'Distinguish meanings', 'Interpret figurative language', 'Assemble short texts'],
    learningEvidence: ['Semantic precision', 'Syntax', 'Inference', 'Contextually appropriate expression'],
    concepts: ['meaning', 'syntax', 'figurative language', 'context', 'expression'],
    status: 'Adventure candidate',
  },
  {
    slug: 'labyrinth-stories',
    title: 'The Labyrinth of Stories',
    eyebrow: 'Literature adventure',
    disciplines: ['Literature', 'Culture'],
    premise: 'A shifting labyrinth is built from myths and legends whose paths change depending on how the player interprets point of view, motives and symbols.',
    challenge: 'Read the world itself as a narrative and use interpretation to reveal what the maze hides.',
    playerActions: ['Compare versions of a story', 'Infer motives', 'Track point of view', 'Interpret symbols and recurring structures'],
    learningEvidence: ['Narrative inference', 'Point-of-view interpretation', 'Source-aware comparison', 'Evidence-based reading'],
    concepts: ['narrator', 'symbol', 'motif', 'myth', 'adaptation', 'inference'],
    status: 'Adventure candidate',
  },
  {
    slug: 'city-inside-cell',
    title: 'The City Inside a Cell',
    eyebrow: 'Biology adventure',
    disciplines: ['Biology'],
    premise: 'The player is miniaturized into a living cell where cellular systems become functional districts that must remain in balance.',
    challenge: 'Repair the cell as a system: energy, transport, membrane integrity, information, nutrients and waste all affect one another.',
    playerActions: ['Explore cellular districts', 'Trace flows through the system', 'Diagnose imbalance', 'Repair interacting subsystems'],
    learningEvidence: ['Causal system modeling', 'Process tracing', 'Diagnosis', 'Successful systemic repair'],
    concepts: ['cell membrane', 'energy', 'transport', 'information', 'nutrients', 'waste'],
    status: 'Adventure candidate',
  },
  {
    slug: 'alchemists-archipelago',
    title: "The Alchemist's Archipelago",
    eyebrow: 'Chemistry adventure',
    disciplines: ['Chemistry'],
    premise: 'An archipelago is governed by material properties and transformations that behave according to a deterministic virtual chemistry model.',
    challenge: 'Investigate materials, predict outcomes and use transformations to solve island-scale problems safely inside the simulation.',
    playerActions: ['Inspect material properties', 'Predict transformations', 'Separate mixtures', 'Test reactions and revise predictions'],
    learningEvidence: ['Prediction-test-revise cycles', 'Conservation reasoning', 'Material classification', 'Successful virtual manipulation'],
    concepts: ['matter', 'mixtures', 'solutions', 'separation', 'reactions', 'conservation of mass'],
    status: 'Adventure candidate',
  },
  {
    slug: 'moonforge',
    title: 'The Moonforge',
    eyebrow: 'Physics adventure',
    disciplines: ['Physics', 'Mathematics'],
    premise: 'A forge on a broken moon can only be restored by making machines physically work again.',
    challenge: 'Model and build functioning systems using force, motion, energy, circuits, waves and light.',
    playerActions: ['Measure motion', 'Construct mechanisms', 'Wire ideal circuits', 'Test energy and force relationships'],
    learningEvidence: ['Working physical systems', 'Prediction and measurement', 'Model revision', 'Constraint satisfaction'],
    concepts: ['force', 'momentum', 'energy', 'circuits', 'waves', 'optics'],
    status: 'Adventure candidate',
  },
  {
    slug: 'forest-thousand-voices',
    title: 'The Forest of a Thousand Voices',
    eyebrow: 'Ecology adventure',
    disciplines: ['Ecology', 'Biology'],
    premise: 'A persistent forest responds to water, plant growth, habitat quality, biodiversity pressure and the player’s choices.',
    challenge: 'Understand the forest as a coupled system and restore it without treating species as isolated decorations.',
    playerActions: ['Observe environmental signals', 'Predict ecosystem response', 'Intervene selectively', 'Monitor recovery over time'],
    learningEvidence: ['System observation', 'Prediction', 'Intervention design', 'Revision from ecological feedback'],
    concepts: ['biodiversity', 'water', 'plant growth', 'habitat quality', 'coupled systems'],
    status: 'Adventure candidate',
  },
  {
    slug: 'ship-never-same',
    title: 'The Ship That Was Never the Same',
    eyebrow: 'Philosophy adventure',
    disciplines: ['Philosophy for children', 'Ethics'],
    premise: 'A magical ship is repaired piece by piece until none of its original material remains, while its removed parts can be rebuilt elsewhere.',
    challenge: 'Decide what makes something the same thing through change, confront a counterexample and revise your position.',
    playerActions: ['Select a claim', 'Give a relevant reason', 'Surface an assumption', 'Consider a counterexample', 'Revise the argument'],
    learningEvidence: ['Reason-to-claim relevance', 'Assumption awareness', 'Counterexample consideration', 'Argument revision'],
    concepts: ['identity', 'change', 'assumption', 'counterexample', 'argument'],
    status: 'Adventure candidate',
  },
];

export const launchMilestones = [
  {
    code: 'M3',
    title: 'Caribbean Rainforest vertical slice',
    state: 'Source complete',
    truth: 'Source implementation is complete; native Unreal certification and representative-device evidence remain separate release gates.',
  },
  {
    code: 'M5.1–M5.4',
    title: 'Fantastic Learning foundations',
    state: 'Source complete',
    truth: 'Curriculum architecture, composable mission evidence, science simulation and language/literature/thought foundations are implemented at source level.',
  },
  {
    code: 'M5.5',
    title: 'First Fantastic Adventure Pack',
    state: 'Next',
    truth: 'The next production objective is converting the multidisciplinary foundations into representative end-to-end adventures.',
  },
  {
    code: 'M6',
    title: 'Private multiplayer prototype',
    state: 'Planned',
    truth: 'The intended direction is parent-approved private sessions without public stranger discovery or open stranger chat.',
  },
] as const;

export const publicTruthLevels = [
  ['Concept', 'A design direction, mockup, narrative candidate or visual reference.'],
  ['Source complete', 'The implementation and source tests exist, but native runtime evidence may still be pending.'],
  ['Native certified', 'The locked Unreal environment has compiled and executed the required automation evidence.'],
  ['Device certified', 'Representative target-device performance and interaction evidence has passed.'],
  ['Publicly playable', 'A release is actually available to intended users under the stated access conditions.'],
] as const;
