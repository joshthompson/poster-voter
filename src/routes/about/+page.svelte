<script lang="ts">
  import Page from '$lib/components/layout/Page.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import PageTitle from '$lib/components/ui/PageTitle.svelte';
  import PixelText from '$lib/components/pixel/PixelText.svelte';
  import instagram from '$lib/assets/instagram.png';
  import substack from '$lib/assets/substack.png';
  import telegram from '$lib/assets/telegram.png';
  import www from '$lib/assets/www.png';
  import { i18n } from '$lib/i18n/index.svelte';

  const t = $derived(i18n.t.about);

  // The makers, each with their own profile links (in the same order as `t.people`).
  const SOCIALS = [
    [
      { name: 'Instagram', icon: instagram, url: 'https://www.instagram.com/totally_sspiess/' },
      { name: 'Substack', icon: substack, url: 'https://substack.com/@alisavasileva' },
      { name: 'Telegram', icon: telegram, url: 'https://t.me/alisalisaw' }
    ],
    [
      { name: 'Telegram', icon: telegram, url: 'https://t.me/joshshive' },
      { name: 'Website', icon: www, url: 'https://joshthompson.github.io/toys/' }
    ]
  ];
  const people = $derived(t.people.map((name, i) => ({ name, socials: SOCIALS[i] ?? [] })));
</script>

<svelte:head>
  <title>{t.title} · {i18n.t.brand}</title>
</svelte:head>

<Page>
  <PageTitle text={t.title} color="var(--red)" />
  <div class="sections">
    <Card delay={0.15}>
      <p class="label">{t.madeBy}</p>
      <div class="people">
        {#each people as person (person.name)}
          <div class="person">
            <p class="name"><PixelText text={person.name} color="var(--ink)" /></p>
            {#if person.socials.length}
              <ul class="socials">
                {#each person.socials as s (s.url)}
                  <li>
                    <a class="social" href={s.url} target="_blank" rel="noopener">
                      <img src={s.icon} alt="" />
                      {s.name}
                    </a>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/each}
      </div>
    </Card>
    <Card delay={0.3}>
      <h2>{t.elo.title}</h2>
      <div class="body">
        {#each t.elo.body as paragraph (paragraph)}<p>{paragraph}</p>{/each}
        <p>{t.elo.more[0]}<a href={t.elo.url} target="_blank" rel="noopener">{t.elo.more[1]}</a>{t.elo.more[2]}</p>
      </div>
    </Card>
  </div>
</Page>

<style>
  .sections {
    display: grid;
    gap: 18px;
  }
  h2 {
    margin: 0;
    font-size: clamp(22px, 3vw, 28px);
    letter-spacing: -0.03em;
  }
  .body {
    max-width: 52ch;
    display: grid;
    gap: 10px;
    line-height: 1.5;
  }
  .body p {
    margin: 0;
  }
  .label {
    margin: 0 0 6px;
    color: var(--muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 13px;
  }
  .socials {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .social {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 16px 6px 8px;
    border-radius: 99px;
    background: var(--ink);
    color: var(--paper);
    font-weight: 700;
    font-size: 14px;
    text-decoration: none;
    transition:
      transform 0.25s var(--spring),
      box-shadow 0.25s;
  }
  /* Lift by whole pixels only: rotating or scaling text resamples it and it blurs. */
  .social:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px -10px rgba(31, 26, 36, 0.6);
  }
  .social:focus-visible {
    outline: 3px solid var(--red);
    outline-offset: 3px;
  }
  .social img {
    display: block;
    image-rendering: pixelated;
  }
  .people {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-start;
    gap: 20px 48px;
  }
  .person {
    display: grid;
    justify-items: center;
    gap: 12px;
  }
  .name {
    /* Half the usual pixel-text size. On phones that's half a CSS px per art px, which is
       still one whole device pixel on the 2x+ screens they have. */
    --text-px: 1;
    --text-px-sm: 0.5;
    margin: 0;
  }
</style>
