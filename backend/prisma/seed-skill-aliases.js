/**
 * Заполняет канонические навыки и таблицу SkillAlias (точные синонимы).
 * После изменения схемы: ./node_modules/.bin/prisma generate && npm run seed:skills
 */
const { prisma } = require("./prismaClient");
const { cleanSkillKey } = require("../lib/skill-normalize");

/**
 * Каноническое имя + алиасы (после clean() — уникальные ключи глобально).
 * Порядок важен только при коллизии ключей: последний upsert побеждает — дубликатов нет.
 *
 * Секции: базовые → фронтенд → мобильные → бэкенд → БД → DevOps/облако → mesh/observability/DWH
 * → CI/CD → инструменты → тестирование → Telegram-боты → аналитика → маркетинг → дизайн.
 * Game dev — после мобильной; низкоуровневые языки — в блоке с языками.
 */
const CANONICAL_SKILLS = [
  // --- Базовые (уже были в проекте) ---
  {
    name: "JavaScript",
    aliases: ["js", "javascript", "java script", "ecmascript"],
  },
  { name: "Java", aliases: ["java"] },
  {
    name: "Spring Boot",
    aliases: ["spring boot", "java spring", "springboot", "spring"],
  },
  {
    name: "Node.js",
    aliases: ["node", "nodejs", "node js"],
  },
  {
    name: "React",
    aliases: ["reactjs", "react js"],
  },
  {
    name: "TypeScript",
    aliases: ["typescript", "ts"],
  },

  // --- Фронтенд ---
  { name: "Vue.js", aliases: ["vue", "vuejs", "vue js", "vue 3"] },
  { name: "Angular", aliases: ["angular", "angular 2"] },
  { name: "Svelte", aliases: ["svelte"] },
  { name: "SvelteKit", aliases: ["sveltekit", "svelte kit"] },
  { name: "Next.js", aliases: ["next", "nextjs", "next js"] },
  { name: "Nuxt", aliases: ["nuxt", "nuxtjs", "nuxt js", "nuxt 3"] },
  { name: "HTML", aliases: ["html", "html5"] },
  { name: "CSS", aliases: ["css", "css3"] },
  { name: "Sass", aliases: ["sass", "scss"] },
  {
    name: "Tailwind CSS",
    aliases: ["tailwind", "tailwindcss", "tailwind css"],
  },
  { name: "Redux", aliases: ["redux", "redux toolkit"] },
  { name: "Zustand", aliases: ["zustand"] },
  { name: "webpack", aliases: ["webpack", "web pack"] },
  { name: "Vite", aliases: ["vite", "vitejs"] },
  { name: "GraphQL", aliases: ["graphql", "gql"] },
  { name: "WebSockets", aliases: ["websocket", "websockets", "ws"] },

  // --- Мобильная разработка ---
  { name: "Swift", aliases: ["swift", "swiftui", "swift ui"] },
  { name: "Kotlin", aliases: ["kotlin", "kotlin multiplatform"] },
  { name: "Android", aliases: ["android", "android sdk"] },
  { name: "iOS", aliases: ["ios", "iphone", "ipad"] },
  { name: "Dart", aliases: ["dart"] },
  { name: "Flutter", aliases: ["flutter", "flutter sdk"] },
  { name: "React Native", aliases: ["react native", "rn", "reactnative"] },
  { name: "Xamarin", aliases: ["xamarin", "xamarin forms"] },

  // --- Game development ---
  { name: "Unity", aliases: ["unity", "unity3d", "unity 3d"] },
  {
    name: "Unreal Engine",
    aliases: ["unreal engine", "unreal", "ue5", "ue4", "ue 5", "ue 4"],
  },
  { name: "Godot", aliases: ["godot", "godot engine"] },
  { name: "Phaser", aliases: ["phaser", "phaser.io"] },
  { name: "CryEngine", aliases: ["cryengine", "cry engine"] },
  {
    name: "GameMaker",
    aliases: ["gamemaker", "game maker", "gamemaker studio"],
  },
  {
    name: "Cocos",
    aliases: ["cocos", "cocos2d", "cocos2d-x", "cocos creator", "cocos2d x"],
  },
  { name: "Roblox Studio", aliases: ["roblox", "roblox studio"] },
  { name: "Ren'Py", aliases: ["renpy", "ren py"] },
  { name: "Bevy", aliases: ["bevy", "bevy engine"] },
  { name: "Raylib", aliases: ["raylib"] },

  // --- Языки и серверная часть ---
  { name: "Python", aliases: ["python", "python3", "py"] },
  { name: "Django", aliases: ["django"] },
  { name: "FastAPI", aliases: ["fastapi", "fast api"] },
  { name: "Flask", aliases: ["flask"] },
  { name: "Ruby", aliases: ["ruby"] },
  { name: "Ruby on Rails", aliases: ["rails", "ror", "ruby on rails"] },
  { name: "PHP", aliases: ["php"] },
  { name: "Laravel", aliases: ["laravel"] },
  { name: "Go", aliases: ["go", "golang", "go lang"] },
  { name: "Rust", aliases: ["rust", "rustlang"] },
  { name: "C#", aliases: ["csharp", "c sharp", "cs"] },
  { name: ".NET", aliases: ["dotnet", "net core", "dotnet core"] },
  { name: "ASP.NET Core", aliases: ["aspnet core", "asp net core"] },
  { name: "Express", aliases: ["express", "expressjs", "express js"] },
  { name: "NestJS", aliases: ["nestjs", "nest js"] },
  { name: "C++", aliases: ["c++", "cpp", "cplusplus"] },
  { name: "C", aliases: ["c lang", "ansi c"] },
  { name: "Scala", aliases: ["scala"] },
  { name: "Elixir", aliases: ["elixir"] },
  {
    name: "Phoenix",
    aliases: ["phoenix", "phoenix framework", "elixir phoenix"],
  },

  // --- Низкоуровневые и классические языки ---
  {
    name: "Assembly",
    aliases: [
      "assembly",
      "assembler",
      "asm",
      "ассемблер",
      "nasm",
      "gas",
      "gnu assembler",
    ],
  },
  { name: "Pascal", aliases: ["pascal", "free pascal", "fpc", "freepascal"] },
  {
    name: "Delphi",
    aliases: [
      "delphi",
      "borland delphi",
      "embarcadero delphi",
      "object pascal",
    ],
  },

  // --- Базы данных ---
  { name: "PostgreSQL", aliases: ["postgres", "postgresql", "psql"] },
  { name: "MySQL", aliases: ["mysql"] },
  { name: "MongoDB", aliases: ["mongo", "mongodb"] },
  { name: "Redis", aliases: ["redis"] },
  { name: "SQLite", aliases: ["sqlite"] },
  { name: "Elasticsearch", aliases: ["elasticsearch", "elastic search"] },
  { name: "ClickHouse", aliases: ["clickhouse", "click house"] },
  { name: "Apache Kafka", aliases: ["kafka", "apache kafka"] },
  { name: "RabbitMQ", aliases: ["rabbitmq", "rabbit mq"] },
  { name: "Microsoft SQL Server", aliases: ["mssql", "sql server", "t-sql"] },
  { name: "Oracle Database", aliases: ["oracle", "oracle db", "plsql"] },
  { name: "SQL", aliases: ["sql", "structured query language"] },

  // --- DevOps и облако ---
  { name: "Docker", aliases: ["docker", "docker compose", "docker-compose"] },
  { name: "Kubernetes", aliases: ["kubernetes", "k8s", "kube"] },
  { name: "Terraform", aliases: ["terraform", "tf", "hashicorp terraform"] },
  { name: "Ansible", aliases: ["ansible", "red hat ansible"] },
  { name: "Helm", aliases: ["helm", "helm charts"] },
  { name: "Linux", aliases: ["linux", "gnu linux"] },
  { name: "NGINX", aliases: ["nginx", "nginx proxy"] },
  { name: "Apache HTTP Server", aliases: ["apache", "apache httpd", "httpd"] },
  { name: "Prometheus", aliases: ["prometheus", "prometheus monitoring"] },
  { name: "Grafana", aliases: ["grafana"] },
  { name: "AWS", aliases: ["aws", "amazon web services", "amazon aws"] },
  {
    name: "Google Cloud",
    aliases: ["gcp", "google cloud platform", "google cloud"],
  },
  { name: "Microsoft Azure", aliases: ["azure", "microsoft azure"] },
  { name: "Vault", aliases: ["hashicorp vault", "vault"] },

  // --- Service mesh, observability, DWH ---
  { name: "Istio", aliases: ["istio", "istio service mesh"] },
  { name: "Linkerd", aliases: ["linkerd", "linkerd2"] },
  { name: "Consul", aliases: ["consul", "hashicorp consul"] },
  {
    name: "OpenTelemetry",
    aliases: ["opentelemetry", "otel", "open telemetry"],
  },
  { name: "Jaeger", aliases: ["jaeger", "jaeger tracing"] },
  { name: "Grafana Loki", aliases: ["loki", "grafana loki"] },
  { name: "Zipkin", aliases: ["zipkin"] },
  {
    name: "Snowflake",
    aliases: ["snowflake", "snowflake data cloud", "snowflake dw"],
  },
  {
    name: "1С:Предприятие",
    aliases: [
      "1с:предприятие",
      "1c",
      "1с",
      "v8",
      "onec",
      "1c предприятие",
      "1с предприятие",
    ],
  },

  // --- CI/CD ---
  { name: "GitHub Actions", aliases: ["github actions", "gha"] },
  { name: "GitLab CI", aliases: ["gitlab ci", "gitlab ci/cd", "gitlab cicd"] },
  { name: "Jenkins", aliases: ["jenkins", "jenkinsfile"] },
  { name: "CircleCI", aliases: ["circleci", "circle ci"] },
  { name: "TeamCity", aliases: ["teamcity", "jetbrains teamcity"] },
  { name: "Argo CD", aliases: ["argo cd", "argocd"] },

  // --- Инструменты и процессы разработки ---
  { name: "Git", aliases: ["git", "git vcs"] },
  { name: "GitHub", aliases: ["github"] },
  { name: "GitLab", aliases: ["gitlab"] },
  { name: "Bitbucket", aliases: ["bitbucket", "atlassian bitbucket"] },
  { name: "Jira", aliases: ["jira", "atlassian jira"] },
  { name: "Confluence", aliases: ["confluence", "atlassian confluence"] },
  { name: "Slack", aliases: ["slack"] },
  { name: "VS Code", aliases: ["vscode", "vs code", "visual studio code"] },
  { name: "Postman", aliases: ["postman"] },
  { name: "Swagger", aliases: ["swagger", "openapi", "open api"] },
  { name: "REST API", aliases: ["rest", "rest api", "restful"] },
  { name: "Prisma", aliases: ["prisma", "prisma orm"] },
  { name: "TypeORM", aliases: ["typeorm", "type orm"] },
  { name: "Sequelize", aliases: ["sequelize"] },
  { name: "Mongoose", aliases: ["mongoose"] },

  // --- QA и тест-дизайн ---
  {
    name: "Ручное тестирование",
    aliases: [
      "manual testing",
      "manual qa",
      "ручное тестирование",
      "мануальное тестирование",
    ],
  },
  {
    name: "Тест-дизайн",
    aliases: [
      "test design",
      "тест дизайн",
      "тест-дизайн",
      "тест кейсы",
      "тест-кейсы",
    ],
  },
  {
    name: "Автоматизация тестирования",
    aliases: [
      "test automation",
      "qa automation",
      "автотесты",
      "автотестирование",
    ],
  },

  // --- Тестирование фронтенда (JS/TS) ---
  { name: "Jest", aliases: ["jest", "jestjs"] },
  { name: "Vitest", aliases: ["vitest"] },
  {
    name: "Playwright",
    aliases: ["playwright", "@playwright/test", "playwright test"],
  },
  { name: "Cypress", aliases: ["cypress", "cypress.io"] },
  {
    name: "Testing Library",
    aliases: [
      "testing library",
      "react testing library",
      "@testing-library/react",
      "@testing-library/vue",
      "@testing-library/dom",
    ],
  },
  { name: "Storybook", aliases: ["storybook"] },
  {
    name: "Mock Service Worker",
    aliases: ["msw", "mock service worker"],
  },
  { name: "Karma", aliases: ["karma", "karma runner"] },

  // --- Тестирование Node / общий JS стек ---
  { name: "Mocha", aliases: ["mocha", "mochajs"] },
  { name: "Chai", aliases: ["chai", "chaijs"] },
  { name: "Supertest", aliases: ["supertest"] },

  // --- Языковые и платформенные тест-фреймворки ---
  { name: "pytest", aliases: ["pytest", "py.test"] },
  { name: "JUnit", aliases: ["junit", "junit 5", "junit5"] },
  { name: "TestNG", aliases: ["testng"] },
  { name: "RSpec", aliases: ["rspec"] },
  { name: "PHPUnit", aliases: ["phpunit", "php unit"] },
  { name: "Testify", aliases: ["testify", "stretchr testify"] },
  { name: "xUnit.net", aliases: ["xunit", "xunit.net", "xunit net"] },
  { name: "NUnit", aliases: ["nunit"] },
  { name: "MSTest", aliases: ["mstest", "ms test", "visual studio test"] },

  // --- E2E и кросс-браузер ---
  { name: "Selenium", aliases: ["selenium", "selenium webdriver"] },
  { name: "WebdriverIO", aliases: ["webdriverio", "webdriver io", "wdio"] },
  { name: "TestCafe", aliases: ["testcafe", "test cafe"] },
  {
    name: "Nightwatch.js",
    aliases: ["nightwatch", "nightwatch.js", "nightwatchjs"],
  },

  // --- Мобильное тестирование ---
  { name: "Appium", aliases: ["appium"] },
  { name: "Espresso", aliases: ["espresso", "android espresso"] },
  {
    name: "XCUITest",
    aliases: ["xcuitest", "xcode ui tests", "xcode ui test"],
  },
  { name: "Detox", aliases: ["detox"] },

  // --- Нагрузочное и performance-тестирование ---
  { name: "Apache JMeter", aliases: ["jmeter", "apache jmeter"] },
  { name: "k6", aliases: ["k6", "grafana k6"] },
  { name: "Locust", aliases: ["locust"] },
  { name: "Gatling", aliases: ["gatling"] },

  // --- BDD и контрактное тестирование ---
  { name: "Cucumber", aliases: ["cucumber", "gherkin"] },
  { name: "SpecFlow", aliases: ["specflow"] },
  { name: "Pact", aliases: ["pact", "pact contract testing"] },

  // --- API-тестирование ---
  { name: "REST Assured", aliases: ["rest assured", "restassured"] },
  { name: "Insomnia", aliases: ["insomnia", "kong insomnia"] },

  // --- Telegram-боты ---
  {
    name: "Telegram Bot API",
    aliases: [
      "telegram bot api",
      "telegram api",
      "tg bot api",
      "telegram bots api",
    ],
  },
  { name: "aiogram", aliases: ["aiogram"] },
  {
    name: "python-telegram-bot",
    aliases: ["python-telegram-bot", "python telegram bot", "ptb"],
  },
  { name: "Telegraf", aliases: ["telegraf", "telegraf.js", "telegrafjs"] },
  { name: "Grammy", aliases: ["grammy", "grammY"] },
  { name: "Pyrogram", aliases: ["pyrogram"] },
  { name: "TDLib", aliases: ["tdlib", "telegram tdlib"] },
  {
    name: "node-telegram-bot-api",
    aliases: ["node-telegram-bot-api", "node telegram bot api"],
  },

  // --- Аналитика и данные (продукт/бизнес) ---
  { name: "Excel", aliases: ["excel", "microsoft excel"] },
  { name: "Google Таблицы", aliases: ["google sheets", "google таблицы"] },
  { name: "Tableau", aliases: ["tableau", "tableau desktop"] },
  { name: "Power BI", aliases: ["power bi", "powerbi", "microsoft power bi"] },
  { name: "Looker Studio", aliases: ["looker studio", "google data studio"] },
  {
    name: "Google Analytics",
    aliases: ["google analytics", "ga4", "universal analytics"],
  },
  {
    name: "Яндекс Метрика",
    aliases: ["яндекс метрика", "yandex metrica", "metrica"],
  },
  {
    name: "A/B тестирование",
    aliases: ["ab testing", "a/b test", "сплит тест"],
  },
  { name: "Pandas", aliases: ["pandas"] },
  { name: "NumPy", aliases: ["numpy"] },
  { name: "Apache Airflow", aliases: ["airflow", "apache airflow"] },
  { name: "dbt", aliases: ["dbt", "data build tool"] },

  // --- Маркетинг ---
  { name: "SEO", aliases: ["seo", "search engine optimization"] },
  { name: "SMM", aliases: ["smm", "social media marketing"] },
  { name: "Контекстная реклама", aliases: ["ppc", "context ads", "контекст"] },
  {
    name: "Google Реклама",
    aliases: ["google ads", "google adwords", "adwords"],
  },
  {
    name: "Яндекс Директ",
    aliases: ["яндекс директ", "yandex direct", "директ"],
  },
  {
    name: "Email-маркетинг",
    aliases: ["email marketing", "email маркетинг", "рассылки"],
  },
  { name: "Копирайтинг", aliases: ["copywriting", "копирайтинг"] },
  {
    name: "Performance-маркетинг",
    aliases: ["performance marketing", "performance маркетинг"],
  },
  { name: "CRM-маркетинг", aliases: ["crm marketing", "crm маркетинг"] },
  { name: "Битрикс24", aliases: ["битрикс24", "bitrix24", "bitrix 24"] },

  // --- Дизайн ---
  { name: "Figma", aliases: ["figma"] },
  { name: "Sketch", aliases: ["sketch", "sketch app"] },
  { name: "Adobe Photoshop", aliases: ["photoshop", "adobe photoshop", "ps"] },
  { name: "Adobe Illustrator", aliases: ["illustrator", "adobe illustrator"] },
  { name: "Adobe XD", aliases: ["adobe xd", "xd"] },
  {
    name: "Adobe After Effects",
    aliases: ["after effects", "adobe after effects"],
  },
  { name: "Blender", aliases: ["blender 3d", "blender"] },
  {
    name: "UI/UX дизайн",
    aliases: ["ui ux", "ui/ux", "ux design", "ui design"],
  },
  {
    name: "Прототипирование",
    aliases: ["prototyping", "прототипы", "wireframes"],
  },
  {
    name: "Дизайн-системы",
    aliases: ["design system", "design systems", "дизайн система"],
  },
];

async function upsertCanonical() {
  for (const row of CANONICAL_SKILLS) {
    let skill = await prisma.skill.findFirst({
      where: { name: { equals: row.name, mode: "insensitive" } },
    });

    if (!skill) {
      skill = await prisma.skill.create({ data: { name: row.name } });
    }

    const keys = new Set([
      cleanSkillKey(row.name),
      ...row.aliases.map((a) => cleanSkillKey(a)),
    ]);

    for (const key of keys) {
      if (!key) continue;

      await prisma.skillAlias.upsert({
        where: { key },
        create: { key, skillId: skill.id },
        update: { skillId: skill.id },
      });
    }
  }
}

/** Для уже существующих в БД навыков без primary-ключа. */
async function backfillPrimaryAliases() {
  const skills = await prisma.skill.findMany({
    include: { aliases: true },
  });

  for (const s of skills) {
    const key = cleanSkillKey(s.name);
    const hasPrimary = s.aliases.some((a) => a.key === key);

    if (hasPrimary) continue;

    const clash = await prisma.skillAlias.findUnique({ where: { key } });

    if (!clash) {
      await prisma.skillAlias.create({
        data: { key, skillId: s.id },
      });
    }
  }
}

async function main() {
  await upsertCanonical();
  await backfillPrimaryAliases();
  console.log("Skill aliases seed OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
