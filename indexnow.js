#!/usr/bin/env node
/* Tells the IndexNow search engines (Bing, Yandex, Seznam, Naver, Yep) about every page
   in the sitemap, so new and changed pages are crawled without waiting. Google does not
   use IndexNow; it reads the sitemap through Search Console.
   The key is public by design: /b433a580cf3eeace37963d6c1840a1fc.txt on the site proves we own it.
   Usage, after a deploy has gone live:  node indexnow.js */
const HOST = "alexchelaru.com";
const KEY = "b433a580cf3eeace37963d6c1840a1fc";

(async () => {
  const sitemap = await (await fetch("https://" + HOST + "/sitemap.xml")).text();
  const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: "https://" + HOST + "/" + KEY + ".txt", urlList })
  });
  console.log("IndexNow: " + urlList.length + " URLs, HTTP " + res.status + " " + (await res.text())); // 200 or 202 = accepted
})();
