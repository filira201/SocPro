# SocPro Backend

REST API на Express 4 + Prisma 6 + PostgreSQL. JWT-авторизация (`jsonwebtoken`),
загрузки файлов через `multer`, реалтайм через `socket.io`.

В этом README — как поднять локальное окружение «с нуля»: PostgreSQL в Docker,
миграции, наполнение демо-данными, запуск сервера. Если в `docker ps` ещё ничего нет
и в БД ничего не лежит — выполни шаги по порядку.

## Требования

- Docker (Desktop или Engine + Compose).
- Node.js 18+ и npm.

## 1. Поднять PostgreSQL в Docker

```bash
docker run --name socpro-postgres \
  -p 5432:5432 \
  -e POSTGRES_USER=socpro \
  -e POSTGRES_PASSWORD=pass \
  -e POSTGRES_DB=socpro \
  -v socpro-pg-data:/var/lib/postgresql/data \
  -d postgres:16-alpine
```

Что здесь:

- `--name socpro-postgres` — имя контейнера (используем дальше для `docker exec` / `docker stop`).
- `-p 5432:5432` — пробросить порт PostgreSQL на хост.
- `-e POSTGRES_USER/PASSWORD/DB` — создать пользователя `socpro` с паролем `pass` и БД `socpro` при первом запуске.
- `-v socpro-pg-data:/var/lib/postgresql/data` — именованный volume для данных (переживает `docker rm`).
- `-d postgres:16-alpine` — отвязать процесс, образ PostgreSQL 16 на Alpine.

Проверка готовности (опционально):

```bash
docker exec socpro-postgres pg_isready -U socpro -d socpro
# /var/run/postgresql:5432 - accepting connections
```

## 2. Настроить `.env`

В этой папке (`backend/`) должен лежать файл `.env` со строкой подключения и секретом для JWT:

```
PORT=3000
DATABASE_URL="postgresql://socpro:pass@localhost:5432/socpro?schema=public"
SECRET_KEY="<любая длинная случайная строка>"
```

Если порт 5432 занят и в шаге 1 ты пробросил другой (например, `-p 5433:5432`),
здесь тоже укажи `localhost:5433`.

## 3. Установить npm-зависимости

```bash
npm install
```

## 4. Применить миграции к пустой БД

```bash
./node_modules/.bin/prisma migrate deploy
./node_modules/.bin/prisma generate
```

Что делают эти команды:

- `prisma migrate deploy` — читает папку [prisma/migrations/](prisma/migrations/),
  подключается к БД из `DATABASE_URL`, проверяет служебную таблицу
  `_prisma_migrations` и применяет все миграции, которые ещё не применены.
  Команда **не сочиняет новые** SQL-файлы, только накатывает существующие — это
  безопасный способ развернуть проект «как у автора».
- `prisma generate` — генерирует TypeScript/JS клиент Prisma в
  [generated/prisma/](generated/prisma/). После `migrate deploy` обычно
  перегенерация уже не нужна, но команда быстрая и не вредит.

После шага в БД появятся все таблицы, enum'ы, индексы и FK, описанные в
[prisma/schema.prisma](prisma/schema.prisma). Данных пока нет.

> Когда нужен `prisma migrate dev` вместо `deploy`?
> Только если ты сам **меняешь схему** (`schema.prisma`) и хочешь сгенерировать
> новую миграцию. `migrate dev` создаёт shadow database, сравнивает с текущей,
> сочиняет свежий `migration.sql`, применяет его и зовёт `prisma generate`.
> Для чистого деплоя или поднятия dev-окружения — всегда `deploy`.
>
> После `git pull`, если в репозитории появилась новая папка в `prisma/migrations/`,
> выполни `./node_modules/.bin/prisma migrate deploy` (и при необходимости `prisma generate`).

## 5. Заполнить базу демо-данными

Порядок важен: сначала справочник навыков, потом демо-пользователи и проекты
(второй сид читает Skill через `findMany`).

```bash
npm run seed:skills
npm run seed:demo
```

После этого в БД будет:

- ~200 канонических навыков с алиасами (см. [prisma/seed-skill-aliases.js](prisma/seed-skill-aliases.js)).
- 50 демо-пользователей (пароль у всех — `123123`), их подписки, посты,
  комментарии и лайки.
- 5 проектов с разными ролями участников и требуемыми навыками.

## 6. Запустить backend

```bash
npm run dev   # с автоперезапуском (nodemon)
# или
npm start     # обычный node ./bin/www
```

Сервер слушает `http://localhost:3000`. Базовый smoke-test:

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"anna01@mail.ru","password":"123123"}'
# → {"token":"eyJ..."}
```

---

## Полезные команды

### Полностью обнулить БД и поднять заново

Если нужно начать с чистого листа (например, после правок схемы или испорченных
демо-данных):

```bash
docker stop socpro-postgres && docker rm socpro-postgres
docker volume rm socpro-pg-data

# дальше — повтори шаги 1, 4, 5 из этого README
```

### Сбросить только данные, без пересоздания контейнера

```bash
./node_modules/.bin/prisma migrate reset
# Команда дропнет схему, накатит миграции заново и спросит про seed.
# Поскольку у нас seed не зарегистрирован в prisma.config, запусти его руками:
npm run seed:skills && npm run seed:demo
```

### Заглянуть внутрь БД

```bash
# psql внутри контейнера
docker exec -it socpro-postgres psql -U socpro -d socpro

# Prisma Studio (GUI на http://localhost:5555)
./node_modules/.bin/prisma studio
```

### Управление контейнером

```bash
docker stop socpro-postgres        # остановить
docker start socpro-postgres       # запустить остановленный
docker logs -f socpro-postgres     # посмотреть логи
docker rm -f socpro-postgres       # удалить (volume останется)
```

## Если что-то не работает

- **`Conflict. The container name "/socpro-postgres" is already in use`** —
  `docker start socpro-postgres` (если просто остановлен) или
  `docker rm socpro-postgres` (если нужен пересоздать).
- **Порт 5432 занят на хосте** — поменяй маппинг на `-p 5433:5432` в шаге 1
  и `DATABASE_URL` в `.env` на `localhost:5433`.
- **`Error: P1001: Can't reach database server`** — проверь, что контейнер
  поднят (`docker ps`), порт совпадает с `.env`, пароль не сменили.
- **`PrismaClientInitializationError: Database "socpro" does not exist`** —
  значит у контейнера остался старый volume от прошлого проекта. Удали:
  `docker rm -f socpro-postgres && docker volume rm socpro-pg-data` и подними заново.

## Переменные окружения

| Имя            | Что это                                  | Пример                                                         |
| -------------- | ---------------------------------------- | -------------------------------------------------------------- |
| `PORT`         | Порт HTTP-сервера Express                | `3000`                                                         |
| `DATABASE_URL` | Строка подключения PostgreSQL для Prisma | `postgresql://socpro:pass@localhost:5432/socpro?schema=public` |
| `SECRET_KEY`   | Секрет для подписи JWT                   | `dfskfjdsj...` (длинная случайная строка)                      |

Все три обязательны для `npm run dev` / `npm start`. Для seed-скриптов нужен
только `DATABASE_URL`.
