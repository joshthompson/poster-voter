# Agent notes

See [README.md](README.md) for setup, scripts and code layout.

## Analytics — Mixpanel

Mixpanel is the only analytics tool. Don't add another without being asked.

| Detail | Value |
|---|---|
| Platform | SvelteKit, fully client-rendered static site |
| SDK | `mixpanel-browser` (core loader, no session recording), ^2.83.0 |
| Tracking | client-side only; no CDP |
| Consent | not asked for, because nothing is stored on the device (see below) |
| Token | `TOKEN` in `src/lib/services/analytics.ts`. Project tokens are public, since every page that sends events includes one. |
| Where it sends | only from the live site. `pnpm dev` and `pnpm preview` log each event to the console as `[analytics] <event> {…}` instead. |

### How it works

Everything goes through `src/lib/services/analytics.ts`: `track(event, props)` for events and `trackPageview()` for page views. Nothing imports `mixpanel-browser` directly. The SDK starts on the first event.

Nothing is stored on the device: `disable_persistence` keeps the visitor's id out of cookies, and `batch_requests: false` keeps the unsent-events queue out of localStorage. That's why there's no consent banner, and it has consequences:

- Every page load is a new anonymous visitor with a random `distinct_id`. "Unique users" in Mixpanel means page loads (visits), and there's no retention or cross-visit analysis.
- There's no `identify()`, `reset()` or `people.set()`, so no Mixpanel user profiles are made.
- Keep it that way. Adding persistence, `identify(voterId)`, profiles, autocapture or session recording needs a consent banner first.

### Conventions

- Event names are `object_verb` in snake_case and past tense: `poster_voted`. Never build a name at runtime.
- Property names are snake_case, enum values are lowercase snake_case strings, and booleans start with `is_`.
- Numbers are sent as numbers. Leave a property out when it doesn't apply; `track` drops `undefined` and `null`.
- A property name means the same thing on every event:
  - `competition`: the competition's slug
  - `poster_id` and `poster_title`: the poster the action is about (on votes, the pick)
  - `placement`: where on the site the control is
  - `method`: `click` or `keyboard`
  - `trigger`: what started something
  - `outcome`: how a share ended (`shared`, `copied`, `canceled` or `failed`)
- **Common properties** are sent with every event, including page views: `language`, `is_designer` (left out until they've answered) and `is_sound_muted`. They describe the visitor *after* the action, so `language_changed` carries the new `language` and only adds `previous_language`. Don't repeat them in an event's own properties.

### Events

`Events` in `analytics.ts` is the source of truth; TypeScript rejects an event or property that isn't there. `$mp_web_page_view` is Mixpanel's own page-view event.

| Event | Fires when | Properties | Where |
|---|---|---|---|
| `$mp_web_page_view` | The first page, and every SvelteKit navigation (opening a poster from the rankings isn't one) | `route` (the route id, e.g. `/poster/[competition]/[name]`), `competition`, plus Mixpanel's URL and UTM properties | `routes/+layout.svelte` |
| `voting_started` | The start button, or answering the designer question on a first visit | `trigger`: `start_button` / `designer_answer` | `features/vote/VoteStage.svelte` |
| `designer_question_answered` | Yes/No on "Are you a designer?" (the answer is `is_designer`) | `placement`: `vote_intro` / `settings` | `VoteStage.svelte`, `routes/settings/+page.svelte` |
| `poster_voted` | A vote is saved in Convex | `competition`, `poster_id`, `poster_title`, `opponent_poster_id`, `opponent_poster_title`, `chosen_side` (`left` / `right`; top/bottom when stacked), `method`, `crowd_share` (0–100: how much of the pair's vote agrees), `pair_votes`, `crowd_streak`, `votes_this_visit`, `posters_seen` and `posters_total` (until they've seen every poster) | `VoteStage.svelte` |
| `poster_vote_failed` | Saving a vote fails | as `poster_voted`, up to `method` | `VoteStage.svelte` |
| `pair_skipped` | The skip button | `competition`, `poster_ids`, `poster_titles` (lists, in screen order), `votes_this_visit` | `VoteStage.svelte` |
| `reveal_dismissed` | The next button, or Enter or Space, during the vote reveal (not the automatic advance) | `method` | `VoteStage.svelte` |
| `all_posters_seen` | The "you've seen every poster" message appears | `competition`, `posters_total`, `votes_this_visit` | `VoteStage.svelte` |
| `poster_shared` | A poster share finishes | `competition`, `poster_id`, `poster_title`, `placement`: `vote_reveal` / `rankings_modal` / `poster_page`, `outcome` | `VoteStage.svelte`, `features/results/ResultsView.svelte`, `features/results/PosterView.svelte` |
| `site_shared` | The corner share button finishes | `outcome` | `features/share/SiteShareButton.svelte` |
| `coffee_link_clicked` | Buy Me a Coffee | `placement`: `corner_button` / `about_page` | `components/layout/CoffeeButton.svelte` |
| `social_link_clicked` | A profile link under a maker's name | `person`: `alisa` / `josh`, `network`: `instagram` / `substack` / `telegram` / `youtube` / `website`, `url` | `routes/about/+page.svelte` |
| `language_changed` | A different language picked (the new one is `language`) | `previous_language` | `features/settings/LanguagePicker.svelte` |
| `sound_toggled` | The mute button (the new setting is `is_sound_muted`) | none | `components/layout/MuteButton.svelte` |
| `vote_history_cleared` | "Clear" in Settings, once confirmed (sent by beacon, since the page reloads) | `vote_count` | `features/settings/VoteHistory.svelte` |
| `rankings_view_changed` | A rankings filter pill | `competition`, `view`, `previous_view` (`all` / `designers` / `others` / `disagree`) | `ResultsView.svelte` |
| `poster_details_opened` | A poster clicked in the rankings, opening the modal (a modifier-click opens its page in a new tab instead) | `competition`, `poster_id`, `poster_title`, `poster_rank`, `view`, `placement`: `podium` / `leaderboard` / `local_picks` / `disagreements` | `ResultsView.svelte` |
| `nav_link_clicked` | The logo, the header shortcut, a menu link, or "See rankings" on the vote screen's messages | `destination`: `vote` / `rankings` / `about` / `settings` / `past_results`, `placement`: `logo` / `header_pill` / `menu` / `vote_message`, `competition` (for past results) | `SiteHeader.svelte`, `NavPill.svelte`, `SiteMenu.svelte`, `VoteStage.svelte` |

### Adding an event

1. Check the table first. If a similar event exists, add a property to it rather than making a near-duplicate.
2. Add the event to `Events` in `analytics.ts`, following the conventions above and reusing property names where they mean the same thing.
3. Call `track()` next to the action: in the component or page glue, after it succeeds (e.g. after the Convex mutation resolves). Don't call it from the state classes (`i18n`, `designer`, `sound`), which `analytics.ts` imports.
4. Add a row to the table above.
5. Check the `[analytics]` line in the console under `pnpm dev`, then in Mixpanel's Live View after deploying.
