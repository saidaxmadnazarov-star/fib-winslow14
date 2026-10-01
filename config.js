/**
 * ============================================
 *  ХРАНИЛИЩЕ — GitHub (без Firebase и чужих сайтов)
 * ============================================
 *
 * РЕЖИМЫ:
 *   "local"  — только твой браузер (localStorage)
 *   "github" — общий файл data/data.json в репозитории GitHub
 *
 * НАСТРОЙКА:
 * 1. Создай репозиторий на github.com
 * 2. Залей папку fib-winslow14
 * 3. Заполни GITHUB ниже
 * 4. STORAGE_MODE = "github"
 *
 * ПРАВКА РУКАМИ (главный способ):
 * GitHub → data/data.json → карандаш Edit → правки → Commit
 * После этого все обновляют страницу и видят изменения.
 *
 * СОХРАНЕНИЕ С САЙТА (опционально):
 * Создай Personal Access Token (repo) и вставь в GITHUB.token
 * Без токена сайт только читает data.json, пишет — руками.
 */

const STORAGE_MODE = "local"; // "local" | "github"

const GITHUB = {
    owner: "YOUR_GITHUB_USERNAME",
    repo: "fib-winslow14",
    branch: "main",
    path: "data/data.json",
    token: ""
};
