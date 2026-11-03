# breachato.github.io

The personal portfolio of **Enea Cortese** ([breachato](https://github.com/breachato)), live at
**[breachato.github.io](https://breachato.github.io)**.

A single dark, minimal page: who I am, my work, my open-source contributions, my repositories, the stack I use
and how to reach me.

## Sections

| Anchor | Section |
| --- | --- |
| `#chi-sono` | About me |
| `#lavori` | Selected work, as a horizontal carousel on wide screens |
| `#opensource` | Open-source contributions, with the merged pull requests counted live |
| `#repository` | Repositories |
| `#stack` | Languages and tools |
| `#contatti` | Contacts |

## How it is built

No framework and no build step: three files served as they are.

| File | What it does |
| --- | --- |
| `index.html` | Structure and copy, with fallback numbers for the live stats |
| `style.css` | Layout and design: Geist and Geist Mono, near-black background, lilac accent |
| `script.js` | Smooth scrolling, scroll-driven animations, the cursor, the live stats |
| `stats.json` | Contribution count and merged pull requests, refreshed by the workflow |
| `assets/` | Avatar and project marks |

Libraries are loaded from public CDNs: [GSAP](https://gsap.com/) with ScrollTrigger for the animations and
[Lenis](https://lenis.darkroom.engineering/) for smooth scrolling. Fonts come from Google Fonts.

## Automation

[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) keeps the site up by itself, on every push and
every 6 hours:

1. reads the contribution count and the merged pull requests from the GitHub API and writes them to `stats.json`
   (and to the fallback numbers in `index.html`), committing only when they change;
2. makes an empty commit after 50 quiet days, so GitHub never suspends the scheduled workflow;
3. publishes the repository to GitHub Pages;
4. checks that the live page and `stats.json` respond, and fails (with an email) if they don't.

The workflow commits to `main` as `github-actions[bot]`: pull before editing.

## Running it locally

Any static file server works, for example:

```bash
python -m http.server 8080
```

## License

The source is public because the site is, but it is **not** open source: proprietary, all rights reserved.
See [`LICENSE.md`](./LICENSE.md); third-party components are listed in [`NOTICE.md`](./NOTICE.md).
