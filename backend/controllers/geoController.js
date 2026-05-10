const { prisma } = require("../prisma/prismaClient");

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ruRegionNames =
  typeof Intl !== "undefined" && typeof Intl.DisplayNames !== "undefined"
    ? new Intl.DisplayNames(["ru"], { type: "region" })
    : null;

/** Русское название страны по ISO 3166-1 alpha-2 (Intl); при сбое — null */
function countryLabelRu(code) {
  if (!ruRegionNames || !code || code.length !== 2) {
    return null;
  }

  try {
    const upper = code.toUpperCase();
    const label = ruRegionNames.of(upper);

    if (!label || label === upper) {
      return null;
    }

    return label;
  } catch {
    return null;
  }
}

const GeoController = {
  /** GET /api/geo/countries — name на русском; nameEn — англ. из GeoNames (совместимость со старыми профилями) */
  listCountries: async (_req, res) => {
    try {
      const rows = await prisma.geoCountry.findMany({
        select: { code: true, name: true, nameRu: true },
      });

      const mapped = rows.map((r) => {
        const labelRu = countryLabelRu(r.code);

        return {
          code: r.code,
          name: r.nameRu ?? labelRu ?? r.name,
          nameEn: r.name,
        };
      });

      mapped.sort((a, b) =>
        a.name.localeCompare(b.name, "ru", { sensitivity: "base" }),
      );

      res.json(mapped);
    } catch (error) {
      console.error("Error in GeoController.listCountries", error);
      res.status(500).json({ error: "Не удалось загрузить список стран" });
    }
  },

  /** GET /api/geo/cities?countryCode=RU&q=моск&limit=25 */
  searchCities: async (req, res) => {
    const rawCode = req.query.countryCode;
    const countryCode =
      typeof rawCode === "string" ? rawCode.trim().toUpperCase() : "";

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limitRaw = Number.parseInt(String(req.query.limit ?? "20"), 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 50)
      : 20;

    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return res.status(400).json({ error: "Укажите корректный код страны" });
    }

    if (q.length < 2) {
      return res
        .status(400)
        .json({ error: "Введите минимум 2 символа для поиска города" });
    }

    try {
      const safe = escapeRegex(q);

      const rawItems = await prisma.geoCity.findMany({
        where: {
          countryCode,
          OR: [
            { name: { contains: safe, mode: "insensitive" } },
            {
              asciiName: {
                contains: safe,
                mode: "insensitive",
              },
            },
            {
              nameRu: {
                contains: safe,
                mode: "insensitive",
              },
            },
          ],
        },
        orderBy: [{ name: "asc" }],
        take: limit,
        select: {
          name: true,
          nameRu: true,
          geonameId: true,
        },
      });

      const items = rawItems.map((row) => ({
        name: row.nameRu ?? row.name,
        geonameId: row.geonameId,
      }));

      res.json({ items });
    } catch (error) {
      console.error("Error in GeoController.searchCities", error);
      res.status(500).json({ error: "Не удалось выполнить поиск городов" });
    }
  },
};

module.exports = GeoController;
