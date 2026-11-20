import { parseDateKeyUTC } from '@/lib/daily-challenge';

export interface MathQuote {
  id: string;
  text: string;
  author: string;
  era: string;
  specialty: string;
  studioNote: string;
}

export const DAILY_MATH_QUOTES: readonly MathQuote[] = [
  {
    id: 'mirzakhani-beauty',
    text: 'The beauty of mathematics only shows itself to more patient followers.',
    author: 'Maryam Mirzakhani',
    era: '1977–2017',
    specialty: 'Geometry & Dynamics',
    studioNote:
      'Take an extra breath before claiming a number—patience reveals hidden divisors.',
  },
  {
    id: 'gauss-queen',
    text: 'Mathematics is the queen of the sciences, and number theory is the queen of mathematics.',
    author: 'Carl Friedrich Gauss',
    era: '1777–1855',
    specialty: 'Number Theory',
    studioNote:
      'Every Factor Grid move builds intuition for primes, divisors, and number structure.',
  },
  {
    id: 'johnson-count',
    text: 'I counted everything. I counted the steps to the road, the steps up to church, the number of dishes and silverware I washed.',
    author: 'Katherine Johnson',
    era: '1918–2020',
    specialty: 'Orbital Mechanics',
    studioNote:
      'Daily arithmetic fluency turns everyday noticing into razor-sharp calculation.',
  },
  {
    id: 'lovelace-imagination',
    text: 'Imagination is the Discovering Faculty, pre-eminently. It is that which penetrates into the unseen worlds around us.',
    author: 'Ada Lovelace',
    era: '1815–1852',
    specialty: 'Computing & Analysis',
    studioNote:
      'Mental math shortcuts are creative inventions—picture the numbers before you compute.',
  },
  {
    id: 'ramanujan-equation',
    text: 'An equation means nothing to me unless it expresses a thought of God.',
    author: 'Srinivasa Ramanujan',
    era: '1887–1920',
    specialty: 'Infinite Series & Partitions',
    studioNote:
      'Look past the answer to notice why a pattern works and when it repeats.',
  },
  {
    id: 'hypatia-think',
    text: 'Reserve your right to think, for even to think wrongly is better than not to think at all.',
    author: 'Hypatia of Alexandria',
    era: 'c. 355–415',
    specialty: 'Algebra & Astronomy',
    studioNote:
      'A missed problem is a clue, not a setback—use every hint to sharpen the next try.',
  },
  {
    id: 'devi-everything',
    text: 'Without mathematics, there is nothing you can do. Everything around you is mathematics. Everything around you is numbers.',
    author: 'Shakuntala Devi',
    era: '1929–2013',
    specialty: 'Mental Calculation',
    studioNote:
      'Consistent 60-second sprints train your brain to spot sums and products effortlessly.',
  },
  {
    id: 'noether-structure',
    text: 'If one proves the equality of two numbers by first showing one is less than or equal to the other and then the reverse, it is unfair; one should instead show that they are really the same.',
    author: 'Emmy Noether',
    era: '1882–1935',
    specialty: 'Abstract Algebra',
    studioNote:
      'Great problem solvers look for clean underlying structure rather than brute force.',
  },
  {
    id: 'tao-questions',
    text: 'The best way to learn mathematics is to do mathematics—and to ask why each step works.',
    author: 'Terence Tao',
    era: 'b. 1975',
    specialty: 'Harmonic Analysis & Primes',
    studioNote:
      'Check your Performance Dashboard after each session to see how steady practice compounds.',
  },
  {
    id: 'euler-logic',
    text: 'Logic is the foundation of the certainty of all the knowledge we acquire.',
    author: 'Leonhard Euler',
    era: '1707–1783',
    specialty: 'Graph Theory & Analysis',
    studioNote:
      'In the Daily Math Challenge, each solved clue locks in the logic for the vault ahead.',
  },
  {
    id: 'germain-algebra',
    text: 'Algebra is but written geometry, and geometry is but figured algebra.',
    author: 'Sophie Germain',
    era: '1776–1831',
    specialty: 'Number Theory & Elasticity',
    studioNote:
      'Visualizing numbers on a grid makes abstract relationships concrete and memorable.',
  },
  {
    id: 'gardner-play',
    text: 'There is no better way to relieve the tedium of learning than to turn a mathematical puzzle into play.',
    author: 'Martin Gardner',
    era: '1914–2010',
    specialty: 'Recreational Mathematics',
    studioNote:
      'Playful curiosity keeps streaks alive long after memorization fades.',
  },
  {
    id: 'poincare-art',
    text: 'Mathematics is the art of giving the same name to different things.',
    author: 'Henri Poincaré',
    era: '1854–1912',
    specialty: 'Topology & Celestial Mechanics',
    studioNote:
      'Bridging tens in addition and borrowing in subtraction are mirror images of one idea.',
  },
  {
    id: 'kovalevskaya-poet',
    text: 'It is impossible to be a mathematician without being a poet in soul.',
    author: 'Sofia Kovalevskaya',
    era: '1850–1891',
    specialty: 'Differential Equations',
    studioNote:
      'Appreciate an elegant shortcut—finding a cleaner path is part of the craft.',
  },
  {
    id: 'turing-ahead',
    text: 'We can only see a short distance ahead, but we can see plenty there that needs to be done.',
    author: 'Alan Turing',
    era: '1912–1954',
    specialty: 'Logic & Computer Science',
    studioNote:
      'Even looking two moves ahead on Factor Grid is enough to outplay a greedy opponent.',
  },
  {
    id: 'euclid-royal',
    text: 'There is no royal road to geometry.',
    author: 'Euclid of Alexandria',
    era: 'fl. 300 BCE',
    specialty: 'Foundations of Geometry',
    studioNote:
      'Every mastery level—from Explorers to Strategists—is earned one clear step at a time.',
  },
  {
    id: 'erdos-numbers',
    text: 'Why are numbers beautiful? It is like asking why Beethoven’s Ninth Symphony is beautiful.',
    author: 'Paul Erdős',
    era: '1913–1996',
    specialty: 'Combinatorics & Primes',
    studioNote:
      'Prime traps and perfect numbers turn a simple grid into a symphony of trade-offs.',
  },
  {
    id: 'pascal-chance',
    text: 'Chance favors the prepared mind when you know how to weigh the odds.',
    author: 'Blaise Pascal',
    era: '1623–1662',
    specialty: 'Probability Theory',
    studioNote:
      'Estimating probabilities turns guesswork into calm, confident decision-making.',
  },
  {
    id: 'galileo-language',
    text: 'Mathematics is the language with which the universe is written.',
    author: 'Galileo Galilei',
    era: '1564–1642',
    specialty: 'Physics & Geometry',
    studioNote:
      'Fluency with numbers gives you a clear lens for science, music, and design.',
  },
  {
    id: 'banneker-perseverance',
    text: 'The color of the skin is in no way connected with strength of the mind or intellectual powers.',
    author: 'Benjamin Banneker',
    era: '1731–1806',
    specialty: 'Astronomy & Almanacs',
    studioNote:
      'Every student who opens the notebook has what it takes to become a confident problem solver.',
  },
  {
    id: 'einstein-pure',
    text: 'Pure mathematics is, in its way, the poetry of logical ideas.',
    author: 'Albert Einstein',
    era: '1879–1955',
    specialty: 'Theoretical Physics',
    studioNote:
      'Keep your notebook tidy—clear reasoning makes even tough equations feel calm.',
  },
];

const QUOTE_EPOCH_MS = Date.UTC(2025, 0, 1);
const MS_PER_DAY = 86_400_000;

export interface DailyQuoteSelection {
  quote: MathQuote;
  index: number;
  total: number;
}

/**
 * Deterministically selects a unique quote for each calendar date (`YYYY-MM-DD`).
 * Consecutive days rotate smoothly through the full library without repeating back-to-back.
 */
export function getDailyMathQuote(
  dateKey: string,
  dayOffset = 0
): DailyQuoteSelection {
  const total = DAILY_MATH_QUOTES.length;
  const dateUtcMs = parseDateKeyUTC(dateKey);
  const daysSinceEpoch = Math.floor(
    (dateUtcMs - QUOTE_EPOCH_MS) / MS_PER_DAY
  );
  const rawIdx = daysSinceEpoch + dayOffset;
  const index = ((rawIdx % total) + total) % total;

  return {
    quote: DAILY_MATH_QUOTES[index],
    index,
    total,
  };
}
