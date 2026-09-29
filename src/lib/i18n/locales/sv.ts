import type { Messages, Segment } from './en';

// Swedish UI text; see en.ts for the conventions.
// Addresses the visitor as «du», as Swedish sites do.

const num = (n: number) => n.toLocaleString('sv');
/** Pick the word form for n: 1 röst, 2 röster. */
const plural = (n: number, one: string, other: string) => (n === 1 ? one : other);
const by = (segment: Segment) =>
  segment === 'designers' ? ' från designers' : segment === 'others' ? ' från icke-designers' : '';

export const sv: Messages = {
  brand: 'Poster Vote',
  loading: 'Laddar',
  yes: 'Ja',
  no: 'Nej',
  designerQuestion: 'Är du designer?',

  header: {
    mute: 'Stäng av ljud',
    unmute: 'Slå på ljud',
    muteLabel: 'Stäng av ljudet',
    unmuteLabel: 'Slå på ljudet',
    keepVoting: '← Fortsätt rösta',
    rankings: 'Topplista →',
    setupTitle: 'Nästan klart',
    setupBody: ['Lägg till din Convex-URL i ', ' (eller kör ', ' för att ställa in den).']
  },

  menu: {
    label: 'Meny',
    vote: 'Rösta',
    rankings: 'Topplista',
    about: 'Om',
    settings: 'Inställningar',
    past: 'Tidigare tävlingar'
  },

  vote: {
    vaultError: 'Kunde inte nå postervalvet.',
    noPosters: 'Inga affischer än',
    noPostersBody: ['Lägg bilder i ', ' och kör ', '.'],
    start: 'Börja rösta',
    doneTitle: 'Det var alla par!',
    doneBody: (pairs: number) =>
      `Du har röstat på alla ${num(pairs)} par av de nuvarande affischerna. Kom tillbaka när nya dyker upp.`,
    seeRankings: 'Se topplistan →',
    votesOnPair: (n: number) => `${num(n)} ${plural(n, 'röst', 'röster')} på det här paret`,
    voteFor: (title: string) => `Rösta på ${title}`,
    yourPick: 'ditt val',
    ofVoters: 'av rösterna',
    skip: 'Kan inte välja? Hoppa över →',
    next: 'Nästa par →',
    error: 'Rösten försvann bland prickarna. Prova nästa par!',
    verdict: {
      tie: 'Helt oavgjort. Prickarna darrar.',
      unanimous: 'Enhälligt. Alla håller med.',
      obvious: 'Självklart. Nästan alla håller med.',
      streak: (n: number) => `I takt med massan — ${num(n)} i rad!`,
      crowd: 'Du håller med de flesta.',
      contrarian: 'En äkta rebell. Ikoniskt.',
      minority: 'Modig smak — du är i minoritet.'
    }
  },

  settings: {
    title: 'Inställningar',
    designerHint: 'Används för att dela upp topplistan. En ändring gäller dina röster från och med nu.',
    language: 'Språk',
    yourVotes: 'Dina röster',
    counting: 'Räknar…',
    votedBefore: 'Du har röstat',
    votedAfter: (n: number) => `${plural(n, 'gång', 'gånger')}.`,
    clearHint: 'Att rensa glömmer ditt designersvar, affischerna du har sett och dina ljud- och språkinställningar.',
    clear: 'Rensa data',
    clearConfirm:
      'Rensa allt Poster Vote minns på den här enheten? Du börjar om som en ny röstare. Röster du redan har lagt finns kvar i topplistan.'
  },

  about: {
    title: 'Om',
    madeBy: 'Gjord av',
    names: 'Alisa Vasileva och Josh Thompson'
  },

  results: {
    title: 'Topplista',
    heading: ['Hela', 'topplistan'],
    views: {
      all: 'Alla',
      designers: 'Designers',
      others: 'Icke-designers',
      disagree: 'Största oenigheterna'
    },
    viewsLabel: 'Vems röster som visas',
    archived: 'Arkiverad',
    noCompetitionHere: 'Det finns ingen tävling här.',
    noCompetition: 'Ingen tävling pågår än.',
    disagreeSub: 'Där designers och alla andra går isär.',
    final: (votes: number, segment: Segment) =>
      `Slutresultat från ${num(votes)} ${plural(votes, 'duell', 'dueller')}${by(segment)}.`,
    live: (votes: number, segment: Segment) =>
      `Live från ${num(votes)} ${plural(votes, 'duell', 'dueller')}${by(segment)}. Uppdateras medan folk röstar.`,
    tallying: 'Räknar prickarna…',
    seeCurrent: 'Se den aktuella topplistan',
    loadError: (message: string) => `Kunde inte ladda resultaten: ${message}`,
    notEnough: (min: number, designerVotes: number, otherVotes: number) =>
      `För lite för att jämföra än: varje affisch behöver ${num(min)} ${plural(min, 'duell', 'dueller')} ` +
      `från både designers och icke-designers. ` +
      `Hittills: ${num(designerVotes)} röster från designers, ${num(otherVotes)} från icke-designers.`,
    versusTitle: 'Designers mot alla andra',
    versusNote: 'Hur ofta varje affisch vinner hos varje grupp, största skillnaden först.',
    designers: 'Designers',
    others: 'Andra',
    gap: (points: number) => `${num(points)} p`,
    designersLove: 'designers älskar den',
    designersNotSold: 'designers är inte övertygade',
    stats: {
      votes: 'Lagda röster',
      voters: 'Röstare',
      posters: 'Affischer',
      today: 'Röster i dag',
      explored: 'Utforskade par'
    },
    noVotesArchived: (segment: Segment) => `Inga röster lades${by(segment)}.`,
    noVotesYet: ['Inga röster än — ', 'lägg den första', '.'],
    noVotesSegment: (segment: Segment) => `Inga röster${by(segment)} än.`,
    topThree: 'Topp tre',
    podium: (rating: number, winRate: string) => `${num(rating)} p · ${winRate} vinster`,
    closest: 'Jämnaste rivaliteten',
    closestBlurb: 'Dött lopp',
    lopsided: 'Mest ensidigt',
    lopsidedBlurb: 'Inte ens nära',
    vs: 'vs',
    everyPoster: 'Alla affischer'
  }
};
