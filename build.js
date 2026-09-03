#!/usr/bin/env node
/* ============================================================
   Recipe site generator, English and Spanish.

   Reads content/recipes/*.json and writes real static HTML:

     /recipes/<slug>/          English
     /es/recetas/<slug>/       Spanish
     /recipes/  and  /es/recetas/     the two listings
     sitemap.xml                       both languages, paired

   Each JSON holds shared facts once (slug, date, times, photo)
   and one block per language. A file with no "es" block simply
   does not produce a Spanish page, and nothing breaks.

   Zero dependencies: Cloudflare Pages runs `node build.js` with
   nothing installed. Deliberately non-destructive; it only ever
   writes inside recipes/, es/recetas/ and sitemap.xml. If it
   throws, Cloudflare fails the deploy and the previous build
   stays live, so a bad recipe can never take the site down.
   ============================================================ */

const fs = require("fs");
const path = require("path");

const SITE = "https://alexchelaru.com";
const SRC = path.join(__dirname, "content", "recipes");

/* ---------- helpers ---------- */
const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const slugify = (s) =>
  String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* Cross-references between recipes are written in the JSON as [[slug|text]].
   They become real links on the page and plain words in the structured data,
   so Google never sees markup inside a recipeIngredient string. */
const RE_LINK = /\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g;
const linkify = (s, base) =>
  esc(s).replace(RE_LINK, (_, slug, text) => `<a href="${base}/${slug}/">${text}</a>`);
const plain = (s) => String(s == null ? "" : s).replace(RE_LINK, (_, slug, text) => text);

const prettyDate = (iso, code) => {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? "" : d.toLocaleDateString(code === "es" ? "es-ES" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" });
};

const isoDuration = (min) => {
  const m = parseInt(min, 10);
  return Number.isFinite(m) && m > 0 ? "PT" + m + "M" : null;
};

/* ---------- the two languages ---------- */
const L = {
  en: {
    code: "en",
    dir: path.join(__dirname, "recipes"),
    base: "/recipes",
    other: "es",
    skip: "Skip to content",
    nav: [["/#menus", "The menus"], ["/#chef", "The chef"], ["/recipes/", "Recipes"], ["/#faq", "FAQ"]],
    switchLabel: "Ver esta receta en espa&ntilde;ol",
    switchFull: "Espa&ntilde;ol", switchShort: "ES",
    ctaFull: "Check a date", ctaShort: "Dates", ctaAria: "Check a date",
    home: "Home", recipes: "Recipes",
    ingredients: "Ingredients", method: "Method",
    serves: "Serves", prep: "Prep", cook: "Cook", cuisineLabel: "Cuisine", minutes: "min",
    note: "Chef&rsquo;s note", servesWith: "Serve it with.",
    defaultCategory: "Recipe", defaultCuisine: "Canarian",
    ctaHead: "I cook this on the island",
    ctaBody: "This is one of the things I make for guests in villas and homes across Gran Canaria. If you would rather eat it than cook it, I bring everything, cook it in your kitchen and clear it away after.",
    indexTitle: "Canarian Recipes | Alex Chelaru, Private Chef Gran Canaria",
    indexDesc: "Every dish on my menus, written out properly: ingredients, quantities and method, by a private chef working in Gran Canaria.",
    indexH1: "Every dish on the menus, written out properly",
    indexLede: "These are the things I actually cook on this island, with the details most recipes leave out. Cook them yourself, or have me cook them for you.",
    indexEyebrow: "Recipes",
    collectionName: "Canarian recipes",
    collectionDesc: "Canarian recipes written by Alex Chelaru, private chef in Gran Canaria.",
    pageTitle: (t) => t + " | Alex Chelaru, Gran Canaria",
    footLine: "Alex Chelaru, private chef. Gran Canaria, Canary Islands.",
    footLogoAlt: "Alex Chelaru, private chef, Gran Canaria",
    menuLabel: "From the menu",
    byLabel: "Written by",
    bio: "Private chef in Gran Canaria. A farm childhood first, then a decade in Cambridge kitchens including the University Arms. Trained under Lee Clarke, whose restaurants Clarkes and Pr&eacute;vost earned Michelin Guide recognition and three AA rosettes.",
    published: "Published", updated: "Updated",
    relatedHead: "Cook it with",
    menuHead: "The rest of this menu",
    seeMenu: "See the full menu"
  },
  es: {
    code: "es",
    dir: path.join(__dirname, "es", "recetas"),
    base: "/es/recetas",
    other: "en",
    skip: "Saltar al contenido",
    nav: [["/es/#menus", "Los men&uacute;s"], ["/es/#chef", "El chef"], ["/es/recetas/", "Recetas"], ["/es/#faq", "FAQ"]],
    switchLabel: "View this recipe in English",
    switchFull: "English", switchShort: "EN",
    ctaFull: "Consultar una fecha", ctaShort: "Fechas", ctaAria: "Consultar una fecha",
    home: "Inicio", recipes: "Recetas",
    ingredients: "Ingredientes", method: "Elaboraci&oacute;n",
    serves: "Para", prep: "Preparaci&oacute;n", cook: "Cocci&oacute;n", cuisineLabel: "Cocina", minutes: "min",
    note: "Nota del chef", servesWith: "Acomp&aacute;&ntilde;alo con.",
    defaultCategory: "Receta", defaultCuisine: "Canaria",
    ctaHead: "Esto lo cocino en la isla",
    ctaBody: "Es uno de los platos que preparo para mis clientes en villas y casas de toda Gran Canaria. Si prefieres comerlo a cocinarlo, llevo todo, lo cocino en tu cocina y lo recojo al terminar.",
    indexTitle: "Recetas canarias | Alex Chelaru, chef privado en Gran Canaria",
    indexDesc: "Todos los platos de mis men&uacute;s, escritos como es debido: ingredientes, cantidades y elaboraci&oacute;n, por un chef privado que trabaja en Gran Canaria.",
    indexH1: "Todos los platos de los men&uacute;s, escritos como es debido",
    indexLede: "Esto es lo que cocino de verdad en esta isla, con los detalles que la mayor&iacute;a de las recetas se saltan. Cocínalos t&uacute;, o deja que los cocine yo.",
    indexEyebrow: "Recetas",
    collectionName: "Recetas canarias",
    collectionDesc: "Recetas canarias escritas por Alex Chelaru, chef privado en Gran Canaria.",
    pageTitle: (t) => t + " | Alex Chelaru, Gran Canaria",
    footLine: "Alex Chelaru, chef privado. Gran Canaria, Islas Canarias.",
    footLogoAlt: "Alex Chelaru, chef privado, Gran Canaria",
    menuLabel: "Del men&uacute;",
    byLabel: "Escrito por",
    bio: "Chef privado en Gran Canaria. Primero una infancia en el campo y despu&eacute;s una d&eacute;cada en las mejores cocinas de Cambridge, entre ellas el University Arms. Formado con Lee Clarke, cuyos restaurantes Clarkes y Pr&eacute;vost obtuvieron reconocimiento de la Gu&iacute;a Michelin y tres rosetas AA.",
    published: "Publicado", updated: "Actualizado",
    relatedHead: "Cocínalo con",
    menuHead: "El resto de este men&uacute;",
    seeMenu: "Ver el men&uacute; completo"
  }
};

/* ---------- shared chrome ---------- */
function head(l, opts) {
  const alt = opts.alternates || [];
  return `<!doctype html>
<html lang="${l.code}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>document.documentElement.classList.add("js");</script>
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.description)}">
<link rel="canonical" href="${esc(opts.url)}">
${alt.map((a) => `<link rel="alternate" hreflang="${a[0]}" href="${esc(a[1])}">`).join("\n")}
<meta name="theme-color" content="#14181A">
<meta property="og:type" content="${opts.ogType || "website"}">
<meta property="og:url" content="${esc(opts.url)}">
<meta property="og:title" content="${esc(opts.title)}">
<meta property="og:description" content="${esc(opts.description)}">
<meta property="og:locale" content="${l.code === "es" ? "es_ES" : "en_GB"}">
${opts.image ? `<meta property="og:image" content="${esc(SITE + opts.image)}">` : ""}
<link rel="icon" href="/favicon-32.png?v=5" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=5">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..500&family=Karla:wght@300;400;500;600;700&display=swap">
<link rel="stylesheet" href="/styles.css?v=15">
<script type="application/ld+json">
${JSON.stringify(opts.schema, null, 2)}
</script>
</head>
<body>
<a class="skip" href="#main">${l.skip}</a>
<nav class="nav" id="nav" data-solid="true" aria-label="Primary">
  <a class="mark" href="${l.code === "es" ? "/es/" : "/"}"><span class="mark-logo" aria-hidden="true"></span><span class="mark-name">Alex Chelaru <small>Gran Canaria</small></span></a>
  <div class="navright">
    <div class="navlinks">
      ${l.nav.map(([href, label]) => `<a class="navlink" href="${href}">${label}</a>`).join("\n      ")}
    </div>
    <a class="lang-switch" href="${esc(opts.switchHref)}" hreflang="${l.other}" lang="${l.other}" aria-label="${l.switchLabel}"><span class="lbl-full">${l.switchFull}</span><span class="lbl-short" aria-hidden="true">${l.switchShort}</span></a>
    <a class="cta-date cta-nav" href="${l.code === "es" ? "/es/#enquire" : "/#enquire"}" aria-label="${l.ctaAria}"><span class="lbl-full">${l.ctaFull}</span><span class="lbl-short" aria-hidden="true">${l.ctaShort}</span>
      <svg width="15" height="10" viewBox="0 0 15 10" fill="none" aria-hidden="true"><path d="M0 5h13M9 1l4 4-4 4" stroke="currentColor" stroke-width="1.5"/></svg>
    </a>
  </div>
</nav>
<main id="main" class="recipe-page">`;
}

function foot(l) {
  return `</main>
<footer class="foot">
  <div class="wrap foot-in">
    <p><span class="foot-logo" role="img" aria-label="${l.footLogoAlt}"></span></p>
    <p>${l.footLine}</p>
    <p>
      <a href="mailto:alexpetruchelaru@gmail.com">alexpetruchelaru@gmail.com</a> &middot;
      <a href="tel:+34641275731">+34 641 275 731</a>
    </p>
  </div>
</footer>
<script src="/app.js?v=15" defer></script>
</body>
</html>
`;
}

/* ---------- read + validate ---------- */
const LEGACY_KEYS = ["title", "subtitle", "summary", "intro", "yield", "category",
  "cuisine", "keywords", "ingredients", "steps", "chefNote", "servesWith", "menu"];

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

      /* a file written in the old flat shape is read as English */
      if (!r.en) {
        r.en = {};
        for (const k of LEGACY_KEYS) if (k in r) { r.en[k] = r[k]; delete r[k]; }
      }

      for (const code of ["en", "es"]) {
        const v = r[code];
        if (!v) continue;
        if (!v.title) throw new Error("Recipe " + f + " (" + code + ") has no title.");
        if (!Array.isArray(v.ingredients) || !v.ingredients.length)
          throw new Error("Recipe " + f + " (" + code + ") has no ingredients.");
        if (!Array.isArray(v.steps) || !v.steps.length)
          throw new Error("Recipe " + f + " (" + code + ") has no steps.");
      }
      if (!r.en) throw new Error("Recipe " + f + " has no English version.");

      r.slug = r.slug || slugify(r.en.title);
      if (r.updated && r.updated < r.date) r.updated = r.date;
      r.date = r.date || new Date().toISOString().slice(0, 10);
      r.file = f;
      return r;
    })
    /* An explicit "order" wins, so the listing can follow the menus rather
       than the alphabet. Anything without one falls to the back, newest first. */
    .sort((a, b) => {
      const ao = Number.isFinite(a.order) ? a.order : Infinity;
      const bo = Number.isFinite(b.order) ? b.order : Infinity;
      if (ao !== bo) return ao - bo;
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.slug.localeCompare(b.slug);
    });
}

const urlFor = (code, slug) => SITE + L[code].base + "/" + slug + "/";
const indexUrl = (code) => SITE + L[code].base + "/";

function alternatesFor(r) {
  const a = [["en", urlFor("en", r.slug)]];
  if (r.es) a.push(["es", urlFor("es", r.slug)]);
  a.push(["x-default", urlFor("en", r.slug)]);
  return a;
}

/* ---------- one recipe page ---------- */
function recipePage(r, code, all) {
  const l = L[code];
  const v = r[code];
  const url = urlFor(code, r.slug);
  const total = (parseInt(r.prepMinutes, 10) || 0) + (parseInt(r.cookMinutes, 10) || 0);
  const cuisine = v.cuisine || l.defaultCuisine;
  const category = v.category || l.defaultCategory;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Recipe",
        "@id": url + "#recipe",
        inLanguage: code,
        name: v.title,
        description: v.summary,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        isPartOf: { "@type": "CollectionPage", "@id": indexUrl(code), name: l.collectionName },
        /* Both of these used to be bare @id pointers at nodes defined on the
           home page. Google resolves @id only inside a single page's markup,
           so on a recipe page they pointed at nothing. Spelled out in full. */
        author: {
          "@type": "Person",
          "@id": SITE + "/#alex",
          name: "Alex Chelaru",
          jobTitle: code === "es" ? "Chef privado" : "Private chef",
          url: code === "es" ? SITE + "/es/#chef" : SITE + "/#chef",
          worksFor: { "@type": "Organization", "@id": SITE + "/#business", name: "Alex Chelaru, Private Chef" }
        },
        publisher: {
          "@type": "Organization",
          "@id": SITE + "/#business",
          name: "Alex Chelaru, Private Chef",
          url: SITE + "/",
          logo: { "@type": "ImageObject", url: SITE + "/icon-512.png" }
        },
        datePublished: r.date,
        dateModified: r.updated || r.date,
        recipeCategory: category,
        recipeCuisine: cuisine,
        keywords: v.keywords || undefined,
        recipeYield: v.yield || undefined,
        prepTime: isoDuration(r.prepMinutes) || undefined,
        cookTime: isoDuration(r.cookMinutes) || undefined,
        totalTime: isoDuration(total) || undefined,
        image: r.image ? [SITE + r.image] : undefined,
        recipeIngredient: v.ingredients.map(plain),
        recipeInstructions: v.steps.map((s, i) => ({
          "@type": "HowToStep", position: i + 1, text: plain(s)
        }))
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: code === "es" ? "Inicio" : "Home", item: code === "es" ? SITE + "/es/" : SITE + "/" },
          { "@type": "ListItem", position: 2, name: l.recipes, item: indexUrl(code) },
          { "@type": "ListItem", position: 3, name: v.title, item: url }
        ]
      }
    ]
  };

  const meta = [
    v.yield && `<div><dt>${l.serves}</dt><dd>${esc(v.yield)}</dd></div>`,
    r.prepMinutes && `<div><dt>${l.prep}</dt><dd>${esc(r.prepMinutes)} ${l.minutes}</dd></div>`,
    r.cookMinutes && `<div><dt>${l.cook}</dt><dd>${esc(r.cookMinutes)} ${l.minutes}</dd></div>`,
    `<div><dt>${l.cuisineLabel}</dt><dd>${esc(cuisine)}</dd></div>`
  ].filter(Boolean).join("\n        ");

  const homeHref = code === "es" ? "/es/" : "/";
  const others = (all || []).filter((x) => x.slug !== r.slug && x[code]);
  const card = (x) => `<a class="rel-card" href="${l.base}/${esc(x.slug)}/">
          <b>${esc(x[code].title)}</b>
          ${x[code].subtitle ? `<i>${esc(x[code].subtitle)}</i>` : ""}
        </a>`;

  /* Explicit cross-references first: the sauces and sides a dish is actually
     built on. Then the rest of the menu it belongs to. Twenty-five pages with
     no links between them is a pile of orphans, not a body of work. */
  const picked = (r.related || [])
    .map((slug) => others.find((x) => x.slug === slug))
    .filter(Boolean);

  const menuName = v.menu;
  const siblings = menuName
    ? others.filter((x) => x[code].menu === menuName && picked.indexOf(x) === -1).slice(0, 4)
    : [];

  const menuAnchor = menuName ? slugify(menuName) : "";
  const menuHref = code === "es" ? "/es/#" + menuAnchor : "/#" + menuAnchor;

  const related =
    (picked.length ? `    <section class="rel" aria-labelledby="rel-h">
      <h2 class="rel-h" id="rel-h">${l.relatedHead}</h2>
      <div class="rel-grid">
        ${picked.map(card).join("\n        ")}
      </div>
    </section>` : "") +
    (siblings.length ? `
    <section class="rel" aria-labelledby="relm-h">
      <h2 class="rel-h" id="relm-h">${l.menuHead}: ${esc(menuName)}</h2>
      <div class="rel-grid">
        ${siblings.map(card).join("\n        ")}
      </div>
      <p class="rel-more"><a href="${menuHref}">${l.seeMenu}</a></p>
    </section>` : "");

  /* A visible name, a real credential and a date. The structured data said who
     wrote this from the start; the page itself said nothing. */
  const byline = `    <aside class="byline">
      <p class="eyebrow">${l.byLabel}</p>
      <p class="byline-name"><a href="${homeHref}#chef">Alex Chelaru</a></p>
      <p class="byline-bio">${l.bio}</p>
      <p class="byline-dates">
        <time datetime="${esc(r.date)}">${l.published} ${esc(prettyDate(r.date, code))}</time>${
        r.updated && r.updated !== r.date
          ? ` &middot; <time datetime="${esc(r.updated)}">${l.updated} ${esc(prettyDate(r.updated, code))}</time>`
          : ""}
      </p>
    </aside>`;

  return head(l, {
    /* The h1 stays fully descriptive; the browser title uses the shorter
       seoTitle where one is set, so Google does not cut it off mid-dish. */
    title: l.pageTitle(v.seoTitle || v.title),
    description: v.summary,
    url,
    image: r.image,
    ogType: "article",
    schema,
    alternates: alternatesFor(r),
    switchHref: code === "en" ? (r.es ? L.es.base + "/" + r.slug + "/" : "/es/") : L.en.base + "/" + r.slug + "/"
  }) + `
  <article class="wrap recipe">
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="${homeHref}">${l.home}</a> <span aria-hidden="true">/</span> <a href="${l.base}/">${l.recipes}</a>
    </nav>
    <header class="recipe-head">
      <p class="eyebrow">${esc(cuisine)} &middot; ${esc(category)}${v.menu ? ` &middot; ${l.menuLabel} <a href="${menuHref}">${esc(v.menu)}</a>` : ""}</p>
      <h1>${esc(v.title)}</h1>
      ${v.subtitle ? `<p class="recipe-sub">${esc(v.subtitle)}</p>` : ""}
      <p class="recipe-summary">${esc(v.summary)}</p>
    </header>
    ${r.image ? `<figure class="recipe-fig"><img src="${esc(r.image)}" alt="${esc(r.imageAlt || v.title)}" width="1200" height="900" fetchpriority="high" decoding="async"></figure>` : ""}
    <dl class="recipe-meta">
        ${meta}
    </dl>
    ${v.intro ? `<div class="recipe-intro"><p>${linkify(v.intro, l.base)}</p></div>` : ""}
    <div class="recipe-body">
      <section aria-labelledby="ing-h">
        <h2 id="ing-h">${l.ingredients}</h2>
        <ul class="ing">
          ${v.ingredients.map((i) => `<li>${linkify(i, l.base)}</li>`).join("\n          ")}
        </ul>
      </section>
      <section aria-labelledby="met-h">
        <h2 id="met-h">${l.method}</h2>
        <ol class="method">
          ${v.steps.map((s) => `<li>${linkify(s, l.base)}</li>`).join("\n          ")}
        </ol>
      </section>
    </div>
    ${v.chefNote ? `<aside class="chef-note"><p class="eyebrow">${l.note}</p><p>${linkify(v.chefNote, l.base)}</p></aside>` : ""}
    ${v.servesWith ? `<p class="serves-with"><strong>${l.servesWith}</strong> ${linkify(v.servesWith, l.base)}</p>` : ""}
${related}
${byline}
    <aside class="recipe-cta">
      <h2>${l.ctaHead}</h2>
      <p>${l.ctaBody}</p>
      <a class="cta-date" href="${code === "es" ? "/es/#enquire" : "/#enquire"}">${l.ctaFull}
        <svg width="15" height="10" viewBox="0 0 15 10" fill="none" aria-hidden="true"><path d="M0 5h13M9 1l4 4-4 4" stroke="currentColor" stroke-width="1.5"/></svg>
      </a>
    </aside>
  </article>
` + foot(l);
}

/* ---------- listing ---------- */
function indexPage(recipes, code) {
  const l = L[code];
  const list = recipes.filter((r) => r[code]);
  const url = indexUrl(code);
  const alternates = [["en", indexUrl("en")], ["es", indexUrl("es")], ["x-default", indexUrl("en")]];

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": url,
    inLanguage: code,
    name: l.collectionName,
    description: l.collectionDesc,
    isPartOf: { "@id": SITE + "/#website" },
    about: { "@id": SITE + "/#business" },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: list.map((r, i) => ({
        "@type": "ListItem", position: i + 1,
        name: r[code].title, url: urlFor(code, r.slug)
      }))
    }
  };

  const homeHref = code === "es" ? "/es/" : "/";

  /* Twenty-five cards in one undifferentiated grid is a wall. Group them by
     the menu they come from, keeping the order set on each recipe, so the
     page reads the same way the menus do. */
  const groups = [];
  for (const r of list) {
    const name = r[code].menu || (code === "es" ? "Otras recetas" : "Other recipes");
    let g = groups.find((x) => x.name === name);
    if (!g) { g = { name, items: [] }; groups.push(g); }
    g.items.push(r);
  }

  return head(l, {
    title: l.indexTitle,
    description: l.indexDesc,
    url, schema, alternates,
    switchHref: L[l.other].base + "/"
  }) + `
  <section class="sec wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="${homeHref}">${l.home}</a> <span aria-hidden="true">/</span> ${l.recipes}</nav>
    <div class="sec-head">
      <p class="eyebrow">${l.indexEyebrow}</p>
      <h1>${l.indexH1}</h1>
      <p>${l.indexLede}</p>
    </div>
    ${groups.map((g) => `<section class="recipe-group" aria-labelledby="g-${esc(slugify(g.name))}">
      <h2 class="recipe-group-h" id="g-${esc(slugify(g.name))}">${esc(g.name)}</h2>
      <div class="recipe-grid">
        ${g.items.map((r) => `<a class="recipe-card" href="${l.base}/${esc(r.slug)}/">
          ${r.image ? `<img src="${esc(r.image)}" alt="${esc(r.imageAlt || r[code].title)}" width="800" height="600" loading="lazy" decoding="async">` : `<span class="recipe-card-noimg" aria-hidden="true"></span>`}
          <span class="recipe-card-body">
            <b>${esc(r[code].title)}</b>
            ${r[code].subtitle ? `<i>${esc(r[code].subtitle)}</i>` : ""}
            <em>${esc(r[code].summary)}</em>
          </span>
        </a>`).join("\n        ")}
      </div>
    </section>`).join("\n    ")}
  </section>
` + foot(l);
}

/* ---------- sitemap ---------- */
function sitemap(recipes) {
  const today = new Date().toISOString().slice(0, 10);
  const pairs = [
    { en: SITE + "/", es: SITE + "/es/", pri: "1.0" },
    { en: indexUrl("en"), es: indexUrl("es"), pri: "0.8" },
    ...recipes.map((r) => ({
      en: urlFor("en", r.slug),
      es: r.es ? urlFor("es", r.slug) : null,
      pri: "0.7",
      lastmod: r.date
    }))
  ];

  const rows = [];
  for (const p of pairs) {
    const links = [`    <xhtml:link rel="alternate" hreflang="en" href="${p.en}"/>`];
    if (p.es) links.push(`    <xhtml:link rel="alternate" hreflang="es" href="${p.es}"/>`);
    links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${p.en}"/>`);
    for (const loc of [p.en, p.es].filter(Boolean)) {
      rows.push(`  <url>
    <loc>${loc}</loc>
${links.join("\n")}
    <lastmod>${p.lastmod || today}</lastmod>
    <priority>${p.pri}</priority>
  </url>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${rows.join("\n")}
</urlset>
`;
}

/* ---------- run ---------- */
const recipes = load();

for (const code of ["en", "es"]) {
  const l = L[code];
  fs.mkdirSync(l.dir, { recursive: true });
  for (const r of recipes) {
    if (!r[code]) continue;
    const dir = path.join(l.dir, r.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), recipePage(r, code, recipes));
  }
  fs.writeFileSync(path.join(l.dir, "index.html"), indexPage(recipes, code));
}
fs.writeFileSync(path.join(__dirname, "sitemap.xml"), sitemap(recipes));

const withEs = recipes.filter((r) => r.es).length;
console.log("Built " + recipes.length + " recipe" + (recipes.length === 1 ? "" : "s") +
  ", " + withEs + " of them in Spanish too:");
recipes.forEach((r) => console.log(
  "  /recipes/" + r.slug + "/" + (r.es ? "   +  /es/recetas/" + r.slug + "/" : "   (English only)") +
  (r.image ? "  [photo]" : "")));
console.log("Wrote both listing pages and sitemap.xml");
