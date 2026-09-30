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
