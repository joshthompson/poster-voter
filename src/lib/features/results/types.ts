import type { detail, disagreements, overview } from './hydrate';

/** Which slice of the results is showing. */
export type View = 'all' | 'designers' | 'others' | 'disagree';

export type Overview = ReturnType<typeof overview>;
export type RankedPoster = Overview['posters'][number];
/** Two posters and how their head-to-heads went. */
export type Duel = NonNullable<Overview['closest']>;
/** Where the votes came from, and each busy city's favourite. */
export type Places = Overview['places'];

export type Disagreements = ReturnType<typeof disagreements>;
export type SplitPoster = Disagreements['posters'][number];

export type PosterDetailData = ReturnType<typeof detail>;

/** A link to a poster's own page, and what a click on it does instead (open it in the modal). */
export type PosterLink = { href: string; onclick: (e: MouseEvent) => void };
/** Which part of the rankings a poster link is in. */
export type LinkPlacement = 'podium' | 'leaderboard' | 'local_picks' | 'disagreements';
/** The link for any poster in the list, from the part of the rankings it's in. */
export type LinkTo = (poster: { _id: RankedPoster['_id'] }, placement: LinkPlacement) => PosterLink;
