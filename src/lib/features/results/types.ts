import type { FunctionReturnType } from 'convex/server';
import type { api } from '$convex/api';

/** Which slice of the results is showing. */
export type View = 'all' | 'designers' | 'others' | 'disagree';

export type Overview = NonNullable<FunctionReturnType<typeof api.results.overview>>;
export type RankedPoster = Overview['posters'][number];
/** Two posters and how their head-to-heads went. */
export type Duel = NonNullable<Overview['closest']>;

export type Disagreements = NonNullable<FunctionReturnType<typeof api.results.disagreements>>;
export type SplitPoster = Disagreements['posters'][number];
