---
name: china-statistics-data
description: "Find, download, and prepare official thematic statistics from the National Bureau of Statistics of China. Use this skill when the user needs Chinese statistical indicators such as GDP, population, employment, industry, agriculture, energy, environment, transport, education, census/yearbook tables, or other socio-economic data for mapping, analysis, charts, or reports."
---

# China Statistics Data

Use this skill to obtain **official thematic statistics for China** from the National Bureau of Statistics of China (NBS). Read it whenever the task requires Chinese socio-economic indicator data, especially data that will later be joined to administrative boundaries, mapped, charted, or used in a report.

## Browser Access

The National Bureau of Statistics data portal is not a simple static download page. It is a browser-based JavaScript application. To search indicators, expand tables, switch dimensions, and trigger exports reliably, you need to operate the official website through **Playwright MCP**.

Before entering the data-download workflow, look at the tools currently available to you. If Playwright MCP browser-control tools are present, use them to open the official NBS website and work through the visible interface just as a user would.

When you find that Playwright MCP is not available, do not continue with the NBS data-download workflow yet. In your own words, remind the user to open GeoCode's top-right status button and enable Playwright MCP, explaining that you need browser-control capability before you can operate the NBS website and download thematic data.

After the user enables Playwright MCP, continue from the official NBS website instead of relying on unofficial mirrors, guessed portal URLs, or hidden request parameters.

**important:** You cannot perform any other tasks while waiting for the user to enable MCP.

## NBS Data Platform Structure

The main working site for this skill is the National Bureau of Statistics data platform: `https://data.stats.gov.cn/dg/website/page.html`. The site is organized as a navigation-based data platform. When you operate it through Playwright MCP, first identify which navigation entry matches the user's requested geography and time frequency, then open the corresponding page and work from the visible table interface.

The top-level navigation contains these major sections:

```
国家数据平台
├── 首页
├── 月度数据
├── 季度数据
├── 年度数据
├── 普查数据
├── 地区数据
├── 部门数据
├── 国际数据
├── 出版物
├── 我的收藏
└── 帮助
```

For geospatial and thematic mapping tasks, the most common entry point is **地区数据**. This menu contains province-level, major-city, Hong Kong, Macao, and Taiwan datasets. The URL hash suffix tells you which page you are on:

| URL suffix         | Navigation item        | What the page contains                                                                                                                                                                  |
| :----------------- | :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fsMonthData`      | 分省月度数据           | Monthly statistics for provinces, autonomous regions, and municipalities, such as monthly CPI and high-frequency industrial indicators.                                                 |
| `fsQuarterData`    | 分省季度数据           | Quarterly statistics for provinces, autonomous regions, and municipalities, such as quarterly GDP.                                                                                      |
| `fsYearData`       | 分省年度数据           | Annual statistics for provinces, autonomous regions, and municipalities. This is often the best starting point for province-level thematic maps and contains many indicator categories. |
| `mainMonthData`    | 主要城市月度价格       | Monthly price statistics for major cities, such as consumer prices and commodity prices.                                                                                                |
| `hongKongYearData` | 香港特别行政区年度数据 | Annual statistics for the Hong Kong Special Administrative Region.                                                                                                                      |
| `macaoYearData`    | 澳门特别行政区年度数据 | Annual statistics for the Macao Special Administrative Region.                                                                                                                          |
| `taiwanYearData`   | 台湾省年度数据         | Annual statistics for Taiwan Province.                                                                                                                                                  |

Use these direct page URLs when you already know the correct regional data entry:

| Page                   | URL                                                                            |
| :--------------------- | :----------------------------------------------------------------------------- |
| 分省月度数据           | `https://data.stats.gov.cn/dg/website/page.html#/pc/national/fsMonthData`      |
| 分省季度数据           | `https://data.stats.gov.cn/dg/website/page.html#/pc/national/fsQuarterData`    |
| 分省年度数据           | `https://data.stats.gov.cn/dg/website/page.html#/pc/national/fsYearData`       |
| 主要城市月度价格       | `https://data.stats.gov.cn/dg/website/page.html#/pc/national/mainMonthData`    |
| 香港特别行政区年度数据 | `https://data.stats.gov.cn/dg/website/page.html#/pc/national/hongKongYearData` |
| 澳门特别行政区年度数据 | `https://data.stats.gov.cn/dg/website/page.html#/pc/national/macaoYearData`    |
| 台湾省年度数据         | `https://data.stats.gov.cn/dg/website/page.html#/pc/national/taiwanYearData`   |

Use this quick selection rule:

| Geography                                     |     Monthly     |    Quarterly    |                                              Annual                                               |
| :-------------------------------------------- | :-------------: | :-------------: | :-----------------------------------------------------------------------------------------------: |
| Provinces, autonomous regions, municipalities |  `fsMonthData`  | `fsQuarterData` |                                           `fsYearData`                                            |
| Major cities                                  | `mainMonthData` |        -        | Use the corresponding major-city annual entry if the site exposes it for the requested indicator. |
| Hong Kong                                     |        -        |        -        |                                        `hongKongYearData`                                         |
| Macao                                         |        -        |        -        |                                          `macaoYearData`                                          |
| Taiwan Province                               |        -        |        -        |                                         `taiwanYearData`                                          |

When the user asks for province-level annual thematic data, prefer `fsYearData` first. When the user asks for monthly or quarterly province-level indicators, use `fsMonthData` or `fsQuarterData` instead. When the user asks for Hong Kong, Macao, or Taiwan annual statistics, use their dedicated annual pages instead of forcing them into the mainland province table.

## Region Selector

Pay close attention to the region selector on province-level pages such as `fsMonthData`, `fsQuarterData`, and `fsYearData`. This selector contains the names of individual provinces, autonomous regions, and municipalities, but it also contains a special option named **序列**.

When the user needs data for all provinces nationwide, choose **序列** in the region selector. This shows all provincial units at once and is usually the correct way to build a province-level table for mapping or cross-region comparison.

Do not select provinces one by one unless the user explicitly asks for only a small set of specific regions. Selecting **序列** is faster, less error-prone, and avoids accidentally omitting a province.

## Confirm the Exact Dataset Before Export

After you find the likely data location on the NBS website, do not immediately turn the first visible table into a deliverable. The NBS pages often contain multiple indicators, time ranges, regional dimensions, units, and table layouts that look similar. Use what you can see on the official website to help the user make a precise choice.

Before preparing the final file, confirm the key details with the user:

- the exact indicator or indicator category shown on the NBS page;
- the years, months, quarters, or other time periods to include;
- the region scope, such as all provinces via **序列**, selected provinces, major cities, Hong Kong, Macao, or Taiwan Province;
- whether the user wants one indicator across many regions, many indicators for one region, or a time-series table.

Once the user confirms the dataset, organize the data visible on the website into an `.xlsx` workbook and provide that workbook as the deliverable. The workbook should be clean enough for downstream mapping or analysis: use clear column names, keep the original region names and time labels, record the unit shown on the page when available, and include a small source note with the NBS page URL and access date.

## Missing Regions or Values

When the NBS table is missing data for a region the user needs, such as Taiwan Province, Hong Kong, or Macao, first make sure the missing value is not available elsewhere on the NBS data platform. Check the dedicated regional pages when appropriate, especially `hongKongYearData`, `macaoYearData`, and `taiwanYearData`.

If the NBS platform still does not provide the needed value, you may search the internet for a reliable supplementary source. Prefer official statistical agencies, government publications, statistical yearbooks, or other clearly attributable sources. Do not silently merge supplementary values into the NBS table as if they came from the same source.

In the final `.xlsx` workbook, clearly mark any value that does not come from the National Bureau of Statistics. Add source columns or a source note sheet that records the supplementary source name, URL, access date, and any unit or definition differences. If the supplementary source uses a different statistical definition or time period, explain that limitation to the user instead of forcing the value into the table without qualification.
