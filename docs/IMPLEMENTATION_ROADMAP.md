# Infinity Canvas — roadmap реализации MVP

Основа: [`PRODUCT_BRIEF_MVP.md`](./PRODUCT_BRIEF_MVP.md). Визуальный референс: [`proto1.png`](./proto1.png).

## Правило движения

Следующая фаза не начинается, пока предыдущая не показана на контрольном fixture, не проверена ревьюером и не имеет доказательства результата. Одна задача агента = один этап.

## Фаза 0 — контрольный результат

1. Выбрать fixture: `fixtures/mini-project`.
2. Создать вручную golden `.canvas`: 1 header, 4–6 areas, anchors, реальные связи.
3. Сделать expected screenshot и checklist сравнения с `proto1`.

**Приёмка:** есть единый ответ на вопрос «как должен выглядеть и работать MVP».

## Фаза 1 — shell и визуальная система

1. Привести toolbar, split, left/right pane к композиции `proto1`.
2. Ввести CSS-токены для палитры, spacing, typography, borders, cards.
3. Убрать debug/phase labels, случайные emoji и несогласованные inline styles.
4. Сверить empty/map/selected состояния со screenshot.

**Приёмка:** golden canvas читается как референс; interaction не сломан.

## Фаза 2 — canvas readability

1. Развести visual roles: project header, area, file/location, selected/highlight.
2. Настроить рёбра: единый стиль, стрелка, label только при необходимости.
3. Проверить pan, zoom, minimap, fit view, splitter.
4. Добавить проверку overlap и dangling edge для golden/генерируемого canvas.

**Приёмка:** карта читается без zoom и без «лапши» из рёбер.

## Фаза 3 — надёжная initial semantic map

1. Собрать вход из workspace index, entry/package files и file-level import graph.
2. Получить 4–8 areas и summaries (LLM опциональна).
3. Валидировать anchors, IDs, edge endpoints; построить layout локально.
4. Сделать fallback карту из folder/import structure без LLM.

**Приёмка:** Open Folder и Regenerate дают полезную карту на fixture и текущем repo.

## Фаза 4 — detail и codemap

1. Click area → Content: summary и существующие files.
2. Codemap: Uses, Used by, locations и честные empty states.
3. Click location → Source с переходом к строке.
4. Back/Esc и breadcrumb: Source → Codemap → Content → empty.

**Приёмка:** главный сценарий проходит без ручного поиска файлов.

## Фаза 5 — доказательство и polish

1. Сделать screenshots: empty, map, selected, codemap, source.
2. Прогнать typecheck, tests, build и ручной smoke на двух сценариях.
3. Исправить loading, cache status, overflow, error states.
4. Обновить README/VERIFY только фактами, которые показаны smoke.

**Приёмка:** продукт можно показать человеку без объяснения устройства прототипа.
