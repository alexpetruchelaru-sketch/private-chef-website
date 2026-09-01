#!/usr/bin/env node
/* ============================================================
   Recipe site generator.

   Reads content/recipes/*.json and writes real static HTML into
   recipes/, plus a listing page and a sitemap. Zero dependencies:
   Cloudflare Pages runs `node build.js` with nothing installed.

   Deliberately non-destructive. It only ever writes inside
   recipes/ and sitemap.xml. If it throws, Cloudflare fails the
   deploy and the previous build stays live, so a bad recipe can
   never take the site down.
   ============================================================ */

const fs = require("fs");
const path = require("path");

const SITE = "https://alexchelaru.com";
const SRC = path.join(__dirname, "content", "recipes");
const OUT = path.join(__dirname, "recipes");

/* ---------- helpers ---------- */
const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const slugify = (s) =>
  String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const isoDuration = (min) => {
  const m = parseInt(min, 10);
  return Number.isFinite(m) && m > 0 ? "PT" + m + "M" : null;
};

const prettyDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

/* ---------- shared chrome ---------- */
function head(opts) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">\n<script>document.documentElement.classList.add("js");</script>
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.description)}">
<link rel="canonical" href="${esc(opts.url)}">
<meta name="theme-color" content="#14181A">
<meta property="og:type" content="${opts.ogType || "website"}">
<meta property="og:url" content="${esc(opts.url)}">
<meta property="og:title" content="${esc(opts.title)}">
<meta property="og:description" content="${esc(opts.description)}">
${opts.image ? `<meta property="og:image" content="${esc(SITE + opts.image)}">` : ""}
<link rel="icon" href="/favicon-32.png?v=5" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=5">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..500&family=Karla:wght@300;400;500;600;700&display=swap">
<link rel="stylesheet" href="/styles.css?v=7">
<script type="application/ld+json">
${JSON.stringify(opts.schema, null, 2)}
</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<nav class="nav" id="nav" data-solid="true" aria-label="Primary">
  <a class="mark" href="/"><span class="mark-logo" aria-hidden="true"></span><span class="mark-name">Alex Chelaru <small>Gran Canaria</small></span></a>
  <div class="navright">
    <div class="navlinks">
      <a class="navlink" href="/#menus">The menus</a>
      <a class="navlink" href="/#chef">The chef</a>
      <a class="navlink" href="/recipes/">Recipes</a>
      <a class="navlink" href="/#faq">FAQ</a>
    </div>
    <a class="lang-switch" href="/es/" hreflang="es" lang="es" aria-label="Ver el sitio en español"><span class="lbl-full">Español</span><span class="lbl-short" aria-hidden="true">ES</span></a>
    <a class="cta-date cta-nav" href="/#enquire" aria-label="Check a date"><span class="lbl-full">Check a date</span><span class="lbl-short" aria-hidden="true">Dates</span>
      <svg width="15" height="10" viewBox="0 0 15 10" fill="none" aria-hidden="true"><path d="M0 5h13M9 1l4 4-4 4" stroke="currentColor" stroke-width="1.5"/></svg>
    </a>
  </div>
</nav>
<main id="main" class="recipe-page">`;
}

const foot = `</main>
<footer class="foot">
  <div class="wrap foot-in">
    <p><span class="foot-logo" role="img" aria-label="Alex Chelaru, private chef, Gran Canaria"></span></p>
    <p>Alex Chelaru, private chef. Gran Canaria, Canary Islands.</p>
    <p>
      <a href="mailto:alexpetruchelaru@gmail.com">alexpetruchelaru@gmail.com</a> &middot;
      <a href="tel:+34641275731">+34 641 275 731</a>
    </p>
  </div>
</footer>
<script src="/app.js?v=7" defer></script>
</body>
</html>
`;

/* ---------- read + validate ---------- */
function load() {
  if (!fs.existsSync(SRC)) return [];
  return fs.readdirSync(SRC)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      let r;
      try {
        r = JSON.parse(fs.readFileSync(path.join(SRC, f), "utf8"));
      } catch (e) {
        throw new Error("Recipe " + f + " is not valid JSON: " + e.message);
      }
      if (!r.title) throw new Error("Recipe " + f + " has no title.");
      if (!Array.isArray(r.ingredients) || !r.ingredients.length)
        throw new Error("Recipe " + f + " has no ingredients.");
      if (!Array.isArray(r.steps) || !r.steps.length)
        throw new Error("Recipe " + f + " has no steps.");
      r.slug = r.slug || slugify(r.title);
      r.date = r.date || new Date().toISOString().slice(0, 10);
      return r;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ---------- one recipe page ---------- */
function recipePage(r) {
  const url = SITE + "/recipes/" + r.slug + "/";
  const total = (parseInt(r.prepMinutes, 10) || 0) + (parseInt(r.cookMinutes, 10) || 0);

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Recipe",
        "@id": url + "#recipe",
        name: r.title,
        description: r.summary,
        author: { "@type": "Person", name: "Alex Chelaru", "@id": SITE + "/#alex" },
        publisher: { "@id": SITE + "/#business" },
        datePublished: r.date,
        recipeCategory: r.category || undefined,
        recipeCuisine: r.cuisine || "Canarian",
        keywords: r.keywords || undefined,
        recipeYield: r.yield || undefined,
        prepTime: isoDuration(r.prepMinutes) || undefined,
        cookTime: isoDuration(r.cookMinutes) || undefined,
        totalTime: isoDuration(total) || undefined,
        image: r.image ? [SITE + r.image] : undefined,
        recipeIngredient: r.ingredients,
        recipeInstructions: r.steps.map((s, i) => ({
          "@type": "HowToStep", position: i + 1, text: s
        }))
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
          { "@type": "ListItem", position: 2, name: "Recipes", item: SITE + "/recipes/" },
          { "@type": "ListItem", position: 3, name: r.title, item: url }
        ]
      }
    ]
  };

  const meta = [
    r.yield && `<div><dt>Serves</dt><dd>${esc(r.yield)}</dd></div>`,
    r.prepMinutes && `<div><dt>Prep</dt><dd>${esc(r.prepMinutes)} min</dd></div>`,
    r.cookMinutes && `<div><dt>Cook</dt><dd>${esc(r.cookMinutes)} min</dd></div>`,
    r.cuisine && `<div><dt>Cuisine</dt><dd>${esc(r.cuisine)}</dd></div>`
  ].filter(Boolean).join("\n        ");

  return head({
    title: r.title + " | Recipe by Alex Chelaru, Private Chef Gran Canaria",
    description: r.summary,
    url, image: r.image, ogType: "article", schema
  }) + `
  <article class="wrap recipe">
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/recipes/">Recipes</a>
    </nav>
    <header class="recipe-head">
      <p class="eyebrow">${esc(r.cuisine || "Canarian")} &middot; ${esc(r.category || "Recipe")}</p>
      <h1>${esc(r.title)}</h1>
      ${r.subtitle ? `<p class="recipe-sub">${esc(r.subtitle)}</p>` : ""}
      <p class="recipe-summary">${esc(r.summary)}</p>
    </header>
    ${r.image ? `<figure class="recipe-fig"><img src="${esc(r.image)}" alt="${esc(r.imageAlt || r.title)}" width="1200" height="900" fetchpriority="high" decoding="async"></figure>` : ""}
    <dl class="recipe-meta">
        ${meta}
    </dl>
    ${r.intro ? `<div class="recipe-intro"><p>${esc(r.intro)}</p></div>` : ""}
    <div class="recipe-body">
      <section aria-labelledby="ing-h">
        <h2 id="ing-h">Ingredients</h2>
        <ul class="ing">
          ${r.ingredients.map((i) => `<li>${esc(i)}</li>`).join("\n          ")}
        </ul>
      </section>
      <section aria-labelledby="met-h">
        <h2 id="met-h">Method</h2>
        <ol class="method">
          ${r.steps.map((s) => `<li>${esc(s)}</li>`).join("\n          ")}
        </ol>
      </section>
    </div>
    ${r.chefNote ? `<aside class="chef-note"><p class="eyebrow">Chef&rsquo;s note</p><p>${esc(r.chefNote)}</p></aside>` : ""}
    ${r.servesWith ? `<p class="serves-with"><strong>Serve it with.</strong> ${esc(r.servesWith)}</p>` : ""}
    <aside class="recipe-cta">
      <h2>I cook this on the island</h2>
      <p>This is one of the things I make for guests in villas and homes across Gran Canaria. If you would rather eat it than cook it, I bring everything, cook it in your kitchen and clear it away after.</p>
      <a class="cta-date" href="/#enquire">Check a date
        <svg width="15" height="10" viewBox="0 0 15 10" fill="none" aria-hidden="true"><path d="M0 5h13M9 1l4 4-4 4" stroke="currentColor" stroke-width="1.5"/></svg>
      </a>
    </aside>
  </article>
` + foot;
}

/* ---------- listing ---------- */
function indexPage(recipes) {
  const url = SITE + "/recipes/";
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": url,
    name: "Canarian recipes",
    description: "Canarian recipes written by Alex Chelaru, private chef in Gran Canaria.",
    isPartOf: { "@id": SITE + "/#website" },
    about: { "@id": SITE + "/#business" },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: recipes.map((r, i) => ({
        "@type": "ListItem", position: i + 1,
        name: r.title, url: SITE + "/recipes/" + r.slug + "/"
      }))
    }
  };
  return head({
    title: "Canarian Recipes | Alex Chelaru, Private Chef Gran Canaria",
    description: "Mojo verde, papas arrugadas and other Canarian recipes, written out properly by a private chef working on the island.",
    url, schema
  }) + `
  <section class="sec wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> Recipes</nav>
    <div class="sec-head">
      <p class="eyebrow">Recipes</p>
      <h1>Canarian recipes, written out properly</h1>
      <p>The things I actually make on this island, with the details most recipes leave out. Cook them yourself, or have me cook them for you.</p>
    </div>
    <div class="recipe-grid">
      ${recipes.map((r) => `<a class="recipe-card" href="/recipes/${esc(r.slug)}/">
        ${r.image ? `<img src="${esc(r.image)}" alt="${esc(r.imageAlt || r.title)}" width="800" height="600" loading="lazy" decoding="async">` : `<span class="recipe-card-noimg" aria-hidden="true"></span>`}
        <span class="recipe-card-body">
          <b>${esc(r.title)}</b>
          ${r.subtitle ? `<i>${esc(r.subtitle)}</i>` : ""}
          <em>${esc(r.summary)}</em>
        </span>
      </a>`).join("\n      ")}
    </div>
  </section>
` + foot;
}

/* ---------- sitemap ---------- */
function sitemap(recipes) {
  const pages = [
    { loc: SITE + "/", pri: "1.0", alt: true },
    { loc: SITE + "/es/", pri: "0.9", alt: true },
    { loc: SITE + "/recipes/", pri: "0.8" },
    ...recipes.map((r) => ({ loc: SITE + "/recipes/" + r.slug + "/", pri: "0.7", lastmod: r.date }))
  ];
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.map((p) => `  <url>
    <loc>${p.loc}</loc>${p.alt ? `
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/"/>
    <xhtml:link rel="alternate" hreflang="es" href="${SITE}/es/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>` : ""}
    <lastmod>${p.lastmod || today}</lastmod>
    <priority>${p.pri}</priority>
  </url>`).join("\n")}
</urlset>
`;
}

/* ---------- run ---------- */
const recipes = load();
fs.mkdirSync(OUT, { recursive: true });
for (const r of recipes) {
  const dir = path.join(OUT, r.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), recipePage(r));
}
fs.writeFileSync(path.join(OUT, "index.html"), indexPage(recipes));
fs.writeFileSync(path.join(__dirname, "sitemap.xml"), sitemap(recipes));
console.log("Built " + recipes.length + " recipe" + (recipes.length === 1 ? "" : "s") + ":");
recipes.forEach((r) => console.log("  /recipes/" + r.slug + "/  " + (r.image ? "(with photo)" : "(no photo yet)")));
console.log("Wrote recipes/index.html and sitemap.xml");
