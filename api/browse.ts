export const config = {
  runtime: "edge",
};

const VQD_REGEX = /vqd='(\d+-\d+(?:-\d+)?)'/;

function queryString(query) {
  return new URLSearchParams(query).toString();
}

async function getVQD(query) {
  const response = await fetch(
    `https://duckduckgo.com?${queryString({ q: query, ia: "web" })}`
  ).then((res) => res.text());
  // console.log(VQD_REGEX.exec(response)[1], VQD_REGEX.exec(response.body)[1]);
  let vqd = VQD_REGEX.exec(response || "")?.[1];
  return vqd;
}

const SEARCH_REGEX =
  /DDG\.pageLayout\.load\('d',(\[.+\])\);DDG\.duckbar\.load\('images'/;

async function getSearches(query, vqd) {
  const queryObject = {
    q: query,
    kl: "wt-wt",
    dl: "en",
    ct: "US",
    vqd,
    sp: "1",
    bpa: "1",
    biaexp: "b",
    msvrtexp: "b",
    nadse: "b",
    eclsexp: "b",
    tjsexp: "b",
  };

  const response = await fetch(
    `https://links.duckduckgo.com/d.js?${queryString(queryObject)}`
  ).then((res) => res.text());

  if (response.includes("DDG.deep.is506"))
    throw new Error("A server error occurred!");

  const searchResults = JSON.parse(
    SEARCH_REGEX.exec(response)[1].replace(/\t/g, "    ")
  );

  // check for no results
  if (searchResults.length === 1 && !("n" in searchResults[0])) {
    const onlyResult = searchResults[0];
    /* istanbul ignore next */
    if (
      (!onlyResult.da && onlyResult.t === "EOF") ||
      !onlyResult.a ||
      onlyResult.d === "google.com search"
    )
      return [];
  }

  let results = [];

  // Populate search results
  for (const search of searchResults) {
    if ("n" in search) continue;
    let bang;
    if (search.b) {
      const [prefix, title, domain] = search.b.split("\t");
      bang = { prefix, title, domain };
    }
    results.push({
      title: search.t,
      description: search.a,
      rawDescription: search.a,
      hostname: search.i,
      icon: `https://external-content.duckduckgo.com/ip3/${search.i}.ico`,
      url: search.u,
      bang,
    });
  }

  return results;
}

export default async function MyEdgeFunction(request, context) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q");
  const count = parseInt(params.get("c")) || 3;
  if (!query)
    return new Response(JSON.stringify({ message: "query not found" }));
  const vqd = await getVQD(query);
  const sr = await getSearches(query, vqd);
  return new Response(JSON.stringify(sr.slice(0, count)));
}
