/** AMC monthly portfolio index pages — extensible registry. */
export const AMC_SOURCES = [
  {
    id: "hdfc",
    fundHouseHints: ["HDFC", "HDFC Asset Management"],
    indexUrl:
      "https://www.hdfcfund.com/statutory-disclosure/portfolio/monthly-portfolio",
    fetchHeaders: {
      Referer: "https://www.hdfcfund.com/",
    },
    extractFiles(html) {
      const files = [];
      const next = html.match(
        /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
      );
      if (next) {
        try {
          const data = JSON.parse(next[1]);
          const list =
            data?.props?.pageProps?.portfolioDataResponse?.data?.files ?? [];
          for (const item of list) {
            const url = item?.file?.url;
            if (url) {
              files.push({
                title: item.title ?? item?.file?.filename ?? "",
                url,
              });
            }
          }
        } catch {
          /* fall through */
        }
      }
      for (const m of html.matchAll(/https?:\/\/[^"'\s]+\.xlsx/gi)) {
        const url = m[0];
        if (!files.some((f) => f.url === url)) {
          files.push({
            title: decodeURIComponent(url.split("/").pop() ?? ""),
            url,
          });
        }
      }
      return files;
    },
  },
  {
    id: "ppfas",
    fundHouseHints: ["PPFAS", "Parag Parikh"],
    indexUrl: "https://amc.ppfas.com/downloads/portfolio-disclosure/",
    extractFiles(html) {
      const files = [];
      for (const m of html.matchAll(/href="([^"]+\.xlsx)"/gi)) {
        let url = m[1];
        if (url.startsWith("/")) url = `https://amc.ppfas.com${url}`;
        files.push({
          title: decodeURIComponent(url.split("/").pop() ?? ""),
          url,
        });
      }
      return files;
    },
  },
  {
    id: "axis",
    fundHouseHints: ["Axis", "Axis Asset Management"],
    indexUrl:
      "https://www.axismf.com/statutory-disclosures/monthly-scheme-portfolio",
    extractFiles(html) {
      const files = [];
      for (const m of html.matchAll(/href="([^"]+\.xlsx)"/gi)) {
        let url = m[1];
        if (url.startsWith("/")) url = `https://www.axismf.com${url}`;
        if (/portfolio|monthly/i.test(url) || /portfolio|monthly/i.test(m[0])) {
          files.push({
            title: decodeURIComponent(url.split("/").pop() ?? ""),
            url,
          });
        }
      }
      for (const m of html.matchAll(/https?:\/\/[^"'\s]+\.xlsx/gi)) {
        const url = m[0];
        if (/portfolio|monthly/i.test(url) && !files.some((f) => f.url === url)) {
          files.push({
            title: decodeURIComponent(url.split("/").pop() ?? ""),
            url,
          });
        }
      }
      return files;
    },
  },
];

export const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};
