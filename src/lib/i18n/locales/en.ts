// English UI text. ru.ts and sv.ts must match this shape (it's typed against it).
// Functions take raw numbers and format them for the language themselves.
// Arrays are text split around an element (a link or <code>) that the page puts between them.

/** Whose votes a results line is about. */
export type Segment = 'all' | 'designers' | 'others';

const num = (n: number) => n.toLocaleString('en');
const s = (n: number) => (n === 1 ? '' : 's');
const by = (segment: Segment) =>
  segment === 'designers' ? ' by designers' : segment === 'others' ? ' by non-designers' : '';

export const en = {
  brand: 'Poster Vote',
  loading: 'Loading',
  yes: 'Yes',
  no: 'No',
  designerQuestion: 'Are you a designer?',

  header: {
    mute: 'Mute',
    unmute: 'Unmute',
    muteLabel: 'Mute sound',
    unmuteLabel: 'Unmute sound',
    keepVoting: '← Keep voting',
    rankings: 'Rankings →',
    setupTitle: 'Almost there',
    setupBody: ['Add your Convex URL to ', ' (or run ', ' to set it up).']
  },

  menu: {
    label: 'Menu',
    vote: 'Voting',
    rankings: 'Rankings',
    about: 'About',
    settings: 'Settings',
    past: 'Past competitions'
  },

  vote: {
    vaultError: 'Couldn’t reach the poster vault.',
    noPosters: 'No posters yet',
    noPostersBody: ['Drop images into ', ' and run ', '.'],
    start: 'Start voting',
    doneTitle: 'That’s every pair!',
    doneBody: (pairs: number) =>
      `You’ve been through all ${num(pairs)} pairs of the current posters. Come back when new ones go up.`,
    seeRankings: 'See the rankings →',
    votesOnPair: (n: number) => `${num(n)} vote${s(n)} on this pair`,
    voteFor: (title: string) => `Vote for ${title}`,
    yourPick: 'your pick',
    ofVoters: 'of voters',
    skip: 'Can’t decide? Skip →',
    next: 'Next pair →',
    error: 'That vote got lost in the dots. Try the next pair!',
    verdict: {
      tie: 'A perfect tie. The dots are trembling.',
      unanimous: 'Unanimous. Everyone agrees.',
      obvious: 'Obviously. Almost everyone agrees.',
      streak: (n: number) => `In tune with the crowd — ${num(n)} in a row!`,
      crowd: 'You’re with the crowd.',
      contrarian: 'A true contrarian. Iconic.',
      minority: 'Bold taste — you’re in the minority.'
    }
  },

  settings: {
    title: 'Settings',
    designerHint: 'Used to split the rankings. A change applies to your votes from now on.',
    language: 'Language',
    yourVotes: 'Your votes',
    counting: 'Counting…',
    // "You have voted <strong>n</strong> times."
    votedBefore: 'You have voted',
    votedAfter: (n: number): string => (n === 1 ? 'time.' : 'times.'),
    clearHint: 'Clearing storage forgets your designer answer, how far you’ve got through the pairs, and your sound and language settings.',
    clear: 'Clear storage',
    clearConfirm:
      'Clear everything Poster Vote remembers on this device? You’ll start again as a new voter. Votes you’ve already cast stay in the rankings.'
  },

  about: {
    title: 'About',
    madeBy: 'Made by',
    // Non-breaking spaces keep each name on one line.
    people: ['Alisa Vasileva', 'Josh Thompson'],
    elo: {
      title: 'How the rankings work',
      body: [
        'Posters are ranked with the Elo rating system, the one used in chess. Every poster starts on 1000 points, and each vote moves points from the loser to the winner.',
        'How many depends on who you beat: beating an equal poster wins 16 points, toppling a favourite wins up to 32, and beating an underdog wins only a few.',
        'So a poster that keeps winning over many matches can outrank one with a perfect record from just a few. A gap of a few points is basically a tie.'
      ],
      // [before, link text, after]
      more: ['Read more about the ', 'Elo rating system', ' on Wikipedia.'],
      url: 'https://en.wikipedia.org/wiki/Elo_rating_system'
    }
  },

  results: {
    title: 'Rankings',
    // The big two-word heading.
    heading: ['The', 'Rankings'],
    views: {
      all: 'Everyone',
      designers: 'Designers',
      others: 'Non-designers',
      disagree: 'Biggest disagreements'
    },
    viewsLabel: 'Whose votes to show',
    archived: 'Archived',
    noCompetitionHere: 'There’s no competition here.',
    noCompetition: 'No competition is running yet.',
    disagreeSub: 'Where designers and everyone else part ways.',
    final: (votes: number, segment: Segment) => `Final results from ${num(votes)} head-to-heads${by(segment)}.`,
    live: (votes: number, segment: Segment) =>
      `Live from ${num(votes)} head-to-heads${by(segment)}. Rankings are at most 15 minutes behind.`,
    tallying: 'Tallying the dots…',
    seeCurrent: 'See the current rankings',
    loadError: (message: string) => `Couldn’t load results: ${message}`,
    notEnough: (min: number, designerVotes: number, otherVotes: number) =>
      `Not enough to compare yet: each poster needs ${num(min)} match-ups from designers and from non-designers. ` +
      `So far: ${num(designerVotes)} designer votes, ${num(otherVotes)} non-designer votes.`,
    versusTitle: 'Designers vs everyone else',
    versusNote: 'How often each poster wins with each group, biggest gap first.',
    designers: 'Designers',
    others: 'Others',
    gap: (points: number) => `${num(points)} pts`,
    designersLove: 'designers love it',
    designersNotSold: 'designers aren’t sold',
    stats: {
      votes: 'Votes cast',
      voters: 'Voters',
      posters: 'Posters',
      today: 'Votes today',
      explored: 'Match-ups explored'
    },
    noVotesArchived: (segment: Segment) => `No votes were cast${by(segment)}.`,
    noVotesYet: ['No votes yet — ', 'go cast the first one', '.'],
    noVotesSegment: (segment: Segment) => `No votes${by(segment)} yet.`,
    topThree: 'Top three',
    podium: (rating: number, winRate: string) => `${num(rating)} pts · ${winRate} wins`,
    closest: 'Closest rivalry',
    closestBlurb: 'Neck and neck',
    lopsided: 'Most lopsided',
    lopsidedBlurb: 'Not even close',
    vs: 'vs',
    everyPoster: 'Every poster',
    places: {
      title: 'Where the votes come from',
      note: (votes: number, countries: number) =>
        `${num(votes)} vote${s(votes)} from ${num(countries)} countr${countries === 1 ? 'y' : 'ies'} so far.`,
      localTitle: 'Local favourites',
      localNote: (min: number) => `The poster each city picks most. A city needs ${num(min)} votes to count.`,
      localPick: 'Local pick',
      previous: 'Previous cities',
      next: 'More cities',
      wonThere: (wins: number, matches: number) => `Won ${num(wins)} of ${num(matches)} there`
    },
    detail: {
      close: 'Close',
      rank: (rank: number) => `No. ${num(rank)}`,
      points: 'Points',
      record: 'Won–lost',
      winRate: 'Win rate',
      matches: 'Match-ups',
      byGroup: 'Who it wins with',
      noVotes: 'no votes yet',
      headToHead: 'Head-to-head',
      noMatches: 'It hasn’t met another poster yet.',
      fans: 'Biggest fans',
      fanWins: (n: number) => `${num(n)} win${s(n)}`,
      more: (n: number) => `and ${num(n)} more`
    }
  }
};

export type Messages = typeof en;
