/* FIB Winslow 14 — Full App with shared storage */

const STORAGE_KEY = 'fib_winslow14_data_v2';
const SESSION_KEY = 'fib_winslow14_session';

let currentUser = null;
let currentForm = null;
let editIndex = null;
let cache = null;
let githubSha = null; // SHA файла data.json для commit через API

const DEFAULT_DATA = {
    news: [{ title: 'Система FIB Winslow 14 запущена', body: 'Данные в data/data.json — правь руками на GitHub.', author: 'System', date: '30.09.2026' }],
    members: [],
    callsigns: [],
    rankHistory: [],
    academyList: [],
    academyApps: [],
    roleRequests: [],
    interviews: [],
    reports: [],
    recommendations: [
        { nick: 'John_Doe', id: '15234', from: 'Agent_Smith', date: '28.09.2026', comment: 'Хорошие знания', status: 'Одобрено' }
    ],
    recruitments: [],
    registry: [],
    questionnaires: [],
    blRecruitments: [],
    blId: []
};

/* ========== STORAGE: local | github ========== */
function githubApiUrl() {
    return `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/contents/${GITHUB.path}?ref=${GITHUB.branch}`;
}
function githubRawUrl() {
    return `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${GITHUB.path}?t=${Date.now()}`;
}

async function loadData() {
    // 1) GitHub mode
    if (typeof STORAGE_MODE !== 'undefined' && STORAGE_MODE === 'github') {
        try {
            // API даёт SHA (нужен для записи) + content
            const headers = { 'Accept': 'application/vnd.github.v3+json' };
            if (GITHUB.token) headers['Authorization'] = 'Bearer ' + GITHUB.token;
            const res = await fetch(githubApiUrl(), { headers });
            if (res.ok) {
                const json = await res.json();
                githubSha = json.sha;
                const decoded = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ''))));
                cache = { ...DEFAULT_DATA, ...JSON.parse(decoded) };
                setSyncStatus('github');
                return cache;
            }
            // fallback: raw URL (только чтение)
            const raw = await fetch(githubRawUrl());
            if (raw.ok) {
                cache = { ...DEFAULT_DATA, ...await raw.json() };
                setSyncStatus('github');
                return cache;
            }
            console.warn('GitHub load failed', res.status);
            setSyncStatus('error');
        } catch (e) {
            console.warn('GitHub load error', e);
            setSyncStatus('error');
        }
    }

    // 2) Локальный data/data.json (если открыто с хостинга / рядом с index.html)
    try {
        const localFile = await fetch('data/data.json?t=' + Date.now());
        if (localFile.ok) {
            cache = { ...DEFAULT_DATA, ...await localFile.json() };
            // в local mode всё равно дублируем в localStorage для правок с сайта
            if (STORAGE_MODE !== 'github') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
            }
            setSyncStatus(STORAGE_MODE === 'github' ? 'github' : 'local');
            return cache;
        }
    } catch (e) {}

    // 3) localStorage
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            cache = JSON.parse(raw);
            setSyncStatus('local');
            return cache;
        }
    } catch (e) {}

    cache = JSON.parse(JSON.stringify(DEFAULT_DATA));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    setSyncStatus('local');
    return cache;
}

async function saveData(data) {
    cache = data;

    // GitHub: commit через API (если есть токен)
    if (typeof STORAGE_MODE !== 'undefined' && STORAGE_MODE === 'github' && GITHUB.token) {
        try {
            const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
            const body = {
                message: `FIB update by ${currentUser ? currentUser.name : 'system'}`,
                content: content,
                branch: GITHUB.branch
            };
            if (githubSha) body.sha = githubSha;
            const res = await fetch(
                `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/contents/${GITHUB.path}`,
                {
                    method: 'PUT',
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Authorization': 'Bearer ' + GITHUB.token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            );
            if (res.ok) {
                const json = await res.json();
                githubSha = json.content && json.content.sha ? json.content.sha : githubSha;
                setSyncStatus('github');
                return;
            }
            console.warn('GitHub save failed', await res.text());
            setSyncStatus('error');
        } catch (e) {
            console.warn('GitHub save error', e);
            setSyncStatus('error');
        }
    }

    // Всегда пишем localStorage как запасной вариант
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (STORAGE_MODE === 'github' && !GITHUB.token) {
        // Режим github без токена: с сайта не пишем в репо — только local + подсказка
        setSyncStatus('github-readonly');
    } else if (STORAGE_MODE !== 'github') {
        setSyncStatus('local');
    }
}

function getData() {
    return cache || JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function setSyncStatus(mode) {
    const el = document.getElementById('sync-status');
    if (!el) return;
    if (mode === 'github') {
        el.textContent = 'GitHub';
        el.className = 'sync-badge sync-cloud';
        el.title = 'Данные из data/data.json на GitHub';
    } else if (mode === 'github-readonly') {
        el.textContent = 'GitHub (чтение)';
        el.className = 'sync-badge sync-cloud';
        el.title = 'Читаем GitHub. Запись — руками в data/data.json или добавь token в config.js';
    } else if (mode === 'error') {
        el.textContent = '⚠ Ошибка';
        el.className = 'sync-badge sync-error';
    } else {
        el.textContent = 'Local';
        el.className = 'sync-badge';
        el.title = 'Данные только в этом браузере';
    }
}

/* ========== AUTH ========== */
function tryLogin(login, password) {
    const u = ACCESS_USERS.find(x => x.login === login && x.password === password);
    return u ? { login: u.login, name: u.name, role: u.role, department: u.department } : null;
}
function saveSession(u) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(u)); }
function loadSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; } }
function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

function hasPerm(action, section) {
    if (!currentUser) return false;
    const p = PERMISSIONS[currentUser.role];
    if (!p) return false;
    if (action === 'manageNews') return p.manageNews;
    if (action === 'manageRanks') return p.manageRanks;
    if (action === 'manageMembers') return p.manageMembers;
    if (action === 'manageAcademy') return p.manageAcademy;
    return p[action] && p[action].includes(section);
}

function applyPermissions() {
    document.querySelectorAll('.perm-add').forEach(btn => {
        const s = btn.dataset.section;
        const ok = hasPerm('add', s) || (s === 'news' && hasPerm('manageNews')) ||
            (s === 'ranks' && hasPerm('manageRanks')) ||
            (s === 'members' && hasPerm('manageMembers')) ||
            (s === 'academy' && hasPerm('manageAcademy'));
        btn.classList.toggle('hidden', !ok);
    });
}

/* ========== HELPERS ========== */
const BADGE = {
    'Одобрено': 'success', 'Одобрена': 'success', 'Завершена': 'success', 'Закрыта': 'success', 'Активен': 'success', 'Принят': 'success',
    'На рассмотрении': 'info', 'В процессе': 'info', 'Назначена': 'info', 'Ожидает': 'info',
    'На проверке': 'warning', 'В работе': 'warning', 'Стажировка': 'warning',
    'Отклонено': 'danger', 'Отклонена': 'danger', 'Бессрочно': 'danger', 'Уволен': 'danger'
};
function badge(s) { return `<span class="badge badge-${BADGE[s] || 'info'}">${esc(s)}</span>`; }
function termCell(t) { return (t || '').toLowerCase().includes('бессроч') ? `<span class="badge badge-danger">${esc(t)}</span>` : esc(t); }
function typeTag(t) {
    const m = { 'Гражданский': 'type-civ', 'Полиция': 'type-pol', 'CIU': 'type-ciu' };
    return `<span class="type-tag ${m[t] || 'type-civ'}">${esc(t)}</span>`;
}
function typeData(t) { return ({ 'Гражданский': 'civilian', 'Полиция': 'police', 'CIU': 'ciu' })[t] || 'civilian'; }
function deptName(id) { return DEPARTMENTS[id] ? DEPARTMENTS[id].short : (id || '—'); }
function rankName(id) { const r = RANKS.find(x => x.id === id); return r ? r.name : (id || '—'); }
function esc(s) { if (s == null || s === '') return ''; const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }

function actionBtns(section, index) {
    let h = '';
    const canEdit = hasPerm('edit', section) || (section === 'news' && hasPerm('manageNews')) ||
        (section === 'ranks' && hasPerm('manageRanks')) || (section === 'members' && hasPerm('manageMembers')) ||
        (section === 'academy' && hasPerm('manageAcademy'));
    const canDel = hasPerm('delete', section) || (section === 'news' && hasPerm('manageNews')) ||
        (section === 'ranks' && hasPerm('manageRanks')) || (section === 'members' && hasPerm('manageMembers')) ||
        (section === 'academy' && hasPerm('manageAcademy'));
    if (canEdit) h += `<button class="btn-ghost btn-ghost-edit" onclick="editItem('${section}',${index})" title="Изменить">✏️</button>`;
    if (canDel) h += `<button class="btn-ghost" onclick="deleteItem('${section}',${index})" title="Удалить">🗑️</button>`;
    return h ? `<div class="td-actions">${h}</div>` : '—';
}

function renderTable(id, arr, rowFn, dataTypeFn) {
    const tb = document.getElementById(id);
    if (!tb) return;
    tb.innerHTML = '';
    (arr || []).forEach((item, i) => {
        const tr = document.createElement('tr');
        if (dataTypeFn) tr.dataset.type = dataTypeFn(item);
        tr.innerHTML = rowFn(item, i);
        tb.appendChild(tr);
    });
}

/* ========== RENDER ALL ========== */
function renderAll() {
    const d = getData();

    // News
    const nl = document.getElementById('news-list');
    if (nl) {
        nl.innerHTML = !(d.news || []).length ? '<div class="news-empty">Новостей нет</div>' :
            d.news.map((n, i) => `<div class="news-card"><div class="news-card-header"><div class="news-card-title">${esc(n.title)}</div>
            <div class="news-card-meta">${esc(n.author)} • ${esc(n.date)}</div></div>
            <div class="news-card-body">${esc(n.body)}</div>
            ${hasPerm('manageNews') ? `<div class="news-card-actions"><button class="btn btn-outline btn-sm" onclick="editItem('news',${i})">Изменить</button>
            <button class="btn btn-outline btn-sm" onclick="deleteItem('news',${i})">Удалить</button></div>` : ''}</div>`).join('');
    }

    // Members
    renderTable('members-tbody', d.members, (r, i) => `
        <td>${i + 1}</td><td>${esc(r.nick)}</td><td>${esc(r.callsign) || '—'}</td>
        <td>${esc(rankName(r.rank))}</td><td>${esc(deptName(r.department))}</td>
        <td>${esc(r.discord) || '—'}</td><td>${esc(r.deptQual) || '—'}</td>
        <td>${esc(r.rankQual) || '—'}</td><td>${badge(r.status || 'Активен')}</td>
        <td>${actionBtns('members', i)}</td>`);

    // Callsigns
    renderTable('callsigns-tbody', d.callsigns, (r, i) => `
        <td>${i + 1}</td><td><strong>${esc(r.callsign)}</strong></td><td>${esc(r.nick)}</td>
        <td>${esc(deptName(r.department))}</td><td>${esc(r.from)}</td><td>${esc(r.date)}</td>
        <td>${actionBtns('callsigns', i)}</td>`);

    // Ranks ref
    const rg = document.getElementById('ranks-ref');
    if (rg) rg.innerHTML = RANKS.map(r => `<div class="rank-chip"><span class="rank-lvl">${r.level}</span> ${r.name}</div>`).join('');

    // Rank history
    renderTable('ranks-tbody', d.rankHistory, (r, i) => `
        <td>${i + 1}</td><td>${esc(r.nick)}</td><td>${esc(rankName(r.rank))}</td>
        <td>${esc(r.from)}</td><td>${esc(r.date)}</td><td>${esc(r.reason) || '—'}</td>
        <td>${actionBtns('ranks', i)}</td>`);

    // Academy list
    renderTable('academy-list-tbody', d.academyList, (r, i) => `
        <td>${i + 1}</td><td>${esc(r.nick)}</td><td>${esc(r.discord) || '—'}</td>
        <td>${esc(r.stage)}</td><td>${esc(r.curator) || '—'}</td><td>${esc(r.date)}</td>
        <td>${actionBtns('academy', i)}</td>`);

    // Academy apps
    renderTable('academy-apps-tbody', d.academyApps, (r, i) => `
        <td>${i + 1}</td><td>${esc(r.nick)}</td><td>${esc(r.discord) || '—'}</td>
        <td>${esc(r.experience) || '—'}</td><td>${esc(r.date)}</td><td>${badge(r.status)}</td>
        <td>${actionBtns('academy', i)}</td>`);

    // Role requests
    renderTable('role-req-tbody', d.roleRequests, (r, i) => `
        <td>${i + 1}</td><td>${esc(r.nick)}</td><td>${esc(r.discordId)}</td>
        <td>${esc(r.role)}</td><td>${esc(r.date)}</td><td>${badge(r.status)}</td>
        <td>${actionBtns('academy', i)}</td>`);

    // Interviews
    renderTable('interviews-tbody', d.interviews, (r, i) => `
        <td>${i + 1}</td><td>${esc(r.candidate)}</td><td>${esc(r.type)}</td><td>${esc(r.date)}</td>
        <td>${esc(r.interviewer)}</td>
        <td>${r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener" class="link-cell">Открыть</a>` : '—'}</td>
        <td>${badge(r.status)}</td><td>${actionBtns('interviews', i)}</td>`);

    // Reports
    const rl = document.getElementById('reports-list');
    if (rl) {
        rl.innerHTML = !(d.reports || []).length ? '<div class="news-empty">Отчётов нет</div>' :
            d.reports.map((n, i) => `<div class="news-card"><div class="news-card-header"><div class="news-card-title">${esc(n.title)}</div>
            <div class="news-card-meta">${esc(n.author)} • ${esc(n.date)} • ${esc(n.type)}</div></div>
            <div class="news-card-body">${esc(n.body)}</div>
            ${(hasPerm('edit', 'reports') || hasPerm('delete', 'reports')) ? `<div class="news-card-actions">
            ${hasPerm('edit', 'reports') ? `<button class="btn btn-outline btn-sm" onclick="editItem('reports',${i})">Изменить</button>` : ''}
            ${hasPerm('delete', 'reports') ? `<button class="btn btn-outline btn-sm" onclick="deleteItem('reports',${i})">Удалить</button>` : ''}
            </div>` : ''}</div>`).join('');
    }

    // Old tables
    renderTable('rec-tbody', d.recommendations, (r, i) => `
        <td>${i + 1}</td><td>${esc(r.nick)}</td><td>${esc(r.id)}</td><td>${esc(r.from)}</td>
        <td>${esc(r.date)}</td><td>${esc(r.comment)}</td><td>${badge(r.status)}</td><td>${actionBtns('recommendations', i)}</td>`);
    renderTable('recruit-tbody', d.recruitments, (r, i) => `
        <td>${i + 1}</td><td>${esc(r.nick)}</td><td>${esc(r.id)}</td><td>${esc(r.from)}</td>
        <td>${esc(r.date)}</td><td>${esc(r.stage)}</td><td>${badge(r.status)}</td><td>${actionBtns('recruitments', i)}</td>`);
    renderTable('registry-tbody', d.registry, (r, i) => `
        <td>${i + 1}</td><td>${esc(r.org)}</td><td>${esc(r.type)}</td><td>${esc(r.from)}</td>
        <td>${esc(r.date)}</td><td>${esc(r.result) || '—'}</td><td>${badge(r.status)}</td><td>${actionBtns('registry', i)}</td>`);
    renderTable('quest-tbody', d.questionnaires, (r, i) => `
        <td>${i + 1}</td><td>${esc(r.nick)}</td><td>${esc(r.id)}</td><td>${typeTag(r.type)}</td>
        <td>${esc(r.date)}</td><td>${esc(r.from)}</td><td>${badge(r.status)}</td><td>${actionBtns('questionnaires', i)}</td>`, r => typeData(r.type));
    renderTable('blrec-tbody', d.blRecruitments, (r, i) => `
        <td>${i + 1}</td><td>${esc(r.nick)}</td><td>${esc(r.id)}</td><td>${esc(r.reason)}</td>
        <td>${esc(r.from)}</td><td>${esc(r.date)}</td><td>${termCell(r.term)}</td><td>${actionBtns('bl-recruitments', i)}</td>`);
    renderTable('blid-tbody', d.blId, (r, i) => `
        <td>${i + 1}</td><td>${esc(r.id)}</td><td>${esc(r.nick) || '—'}</td><td>${esc(r.reason)}</td>
        <td>${esc(r.from)}</td><td>${esc(r.date)}</td><td>${termCell(r.term)}</td><td>${actionBtns('bl-id', i)}</td>`);
}

/* ========== FORMS ========== */
const deptOptions = Object.values(DEPARTMENTS).map(d => d.id);
const rankOptions = RANKS.map(r => r.id);

const FORMS = {
    news: { title: 'Новость', section: 'news', dataKey: 'news', fields: [
        { name: 'title', label: 'Заголовок', type: 'text' },
        { name: 'body', label: 'Текст', type: 'textarea' }
    ]},
    member: { title: 'Сотрудник', section: 'members', dataKey: 'members', fields: [
        { name: 'nick', label: 'Игровой ник', type: 'text' },
        { name: 'callsign', label: 'Позывной', type: 'text' },
        { name: 'rank', label: 'Ранг', type: 'select', options: rankOptions, optionLabels: RANKS.map(r => r.name) },
        { name: 'department', label: 'Отдел', type: 'select', options: ['', ...deptOptions], optionLabels: ['—', ...Object.values(DEPARTMENTS).map(d => d.name)] },
        { name: 'discord', label: 'Discord (tag или ID)', type: 'text' },
        { name: 'deptQual', label: 'Квалификация отдела', type: 'text', placeholder: 'напр. ID Level 2' },
        { name: 'rankQual', label: 'Квалификация ранга', type: 'text', placeholder: 'напр. Сдал на Агента' },
        { name: 'status', label: 'Статус', type: 'select', options: ['Активен', 'Стажировка', 'Уволен'] }
    ]},
    callsign: { title: 'Выдать позывной', section: 'callsigns', dataKey: 'callsigns', fields: [
        { name: 'callsign', label: 'Позывной', type: 'text', placeholder: 'FIB-01' },
        { name: 'nick', label: 'Ник', type: 'text' },
        { name: 'department', label: 'Отдел', type: 'select', options: ['', ...deptOptions], optionLabels: ['—', ...Object.values(DEPARTMENTS).map(d => d.name)] },
        { name: 'from', label: 'Выдал', type: 'text' },
        { name: 'date', label: 'Дата', type: 'date' }
    ]},
    rank: { title: 'Выдать ранг', section: 'ranks', dataKey: 'rankHistory', fields: [
        { name: 'nick', label: 'Ник', type: 'text' },
        { name: 'rank', label: 'Ранг', type: 'select', options: rankOptions, optionLabels: RANKS.map(r => r.name) },
        { name: 'from', label: 'Выдал', type: 'text' },
        { name: 'date', label: 'Дата', type: 'date' },
        { name: 'reason', label: 'Причина', type: 'textarea' }
    ]},
    academyMember: { title: 'В список академии', section: 'academy', dataKey: 'academyList', fields: [
        { name: 'nick', label: 'Ник', type: 'text' },
        { name: 'discord', label: 'Discord', type: 'text' },
        { name: 'stage', label: 'Этап', type: 'select', options: ['Набор', 'Обучение', 'Практика', 'Экзамен', 'Выпуск'] },
        { name: 'curator', label: 'Куратор', type: 'text' },
        { name: 'date', label: 'Дата', type: 'date' }
    ]},
    academyApp: { title: 'Заявка в академию', section: 'academy', dataKey: 'academyApps', fields: [
        { name: 'nick', label: 'Ник', type: 'text' },
        { name: 'discord', label: 'Discord', type: 'text' },
        { name: 'experience', label: 'Опыт / комментарий', type: 'textarea' },
        { name: 'date', label: 'Дата', type: 'date' },
        { name: 'status', label: 'Статус', type: 'select', options: ['Ожидает', 'Принят', 'Отклонена'] }
    ]},
    roleRequest: { title: 'Запрос роли', section: 'academy', dataKey: 'roleRequests', fields: [
        { name: 'nick', label: 'Ник', type: 'text' },
        { name: 'discordId', label: 'Discord ID', type: 'text' },
        { name: 'role', label: 'Запрошенная роль', type: 'text', placeholder: 'FIB / Cadet / ...' },
        { name: 'date', label: 'Дата', type: 'date' },
        { name: 'status', label: 'Статус', type: 'select', options: ['Ожидает', 'Одобрено', 'Отклонено'] }
    ]},
    interview: { title: 'Обзвон / вербовка', section: 'interviews', dataKey: 'interviews', fields: [
        { name: 'candidate', label: 'Кандидат', type: 'text' },
        { name: 'type', label: 'Тип', type: 'select', options: ['Обзвон', 'Вербовка', 'Собеседование'] },
        { name: 'date', label: 'Дата', type: 'date' },
        { name: 'interviewer', label: 'Проводил', type: 'text' },
        { name: 'link', label: 'Ссылка (YouTube / Google Drive / Discord)', type: 'text', placeholder: 'https://...' },
        { name: 'status', label: 'Статус', type: 'select', options: ['Проведён', 'Запланирован', 'Отменён'] }
    ]},
    report: { title: 'Отчёт о проведении', section: 'reports', dataKey: 'reports', fields: [
        { name: 'title', label: 'Заголовок', type: 'text' },
        { name: 'type', label: 'Тип', type: 'select', options: ['Обзвон', 'Вербовка', 'Мероприятие', 'Проверка', 'Другое'] },
        { name: 'body', label: 'Текст отчёта', type: 'textarea' },
        { name: 'date', label: 'Дата', type: 'date' }
    ]},
    rec: { title: 'Рекомендация', section: 'recommendations', dataKey: 'recommendations', fields: [
        { name: 'nick', label: 'ФИО / Ник', type: 'text' }, { name: 'id', label: 'ID', type: 'text' },
        { name: 'from', label: 'Кто рекомендовал', type: 'text' }, { name: 'date', label: 'Дата', type: 'date' },
        { name: 'comment', label: 'Комментарий', type: 'textarea' },
        { name: 'status', label: 'Статус', type: 'select', options: ['Одобрено', 'На рассмотрении', 'Отклонено'] }
    ]},
    recruit: { title: 'Вербовка', section: 'recruitments', dataKey: 'recruitments', fields: [
        { name: 'nick', label: 'Кандидат', type: 'text' }, { name: 'id', label: 'ID', type: 'text' },
        { name: 'from', label: 'Вербовщик', type: 'text' }, { name: 'date', label: 'Дата', type: 'date' },
        { name: 'stage', label: 'Этап', type: 'text' },
        { name: 'status', label: 'Статус', type: 'select', options: ['В процессе', 'Завершена', 'Отклонена'] }
    ]},
    registry: { title: 'Проверка', section: 'registry', dataKey: 'registry', fields: [
        { name: 'org', label: 'Организация', type: 'text' },
        { name: 'type', label: 'Тип', type: 'select', options: ['Плановая', 'Внеплановая', 'Специальная'] },
        { name: 'from', label: 'Ответственный', type: 'text' }, { name: 'date', label: 'Дата', type: 'date' },
        { name: 'result', label: 'Результат', type: 'text' },
        { name: 'status', label: 'Статус', type: 'select', options: ['Назначена', 'В работе', 'Закрыта'] }
    ]},
    quest: { title: 'Анкета', section: 'questionnaires', dataKey: 'questionnaires', fields: [
        { name: 'nick', label: 'ФИО / Ник', type: 'text' }, { name: 'id', label: 'ID', type: 'text' },
        { name: 'type', label: 'Тип', type: 'select', options: ['Гражданский', 'Полиция', 'CIU'] },
        { name: 'date', label: 'Дата', type: 'date' }, { name: 'from', label: 'Проверяющий', type: 'text' },
        { name: 'status', label: 'Статус', type: 'select', options: ['На проверке', 'Одобрена', 'На рассмотрении', 'Отклонена'] }
    ]},
    blrec: { title: 'ЧС вербовок', section: 'bl-recruitments', dataKey: 'blRecruitments', fields: [
        { name: 'nick', label: 'ФИО / Ник', type: 'text' }, { name: 'id', label: 'ID', type: 'text' },
        { name: 'reason', label: 'Причина', type: 'textarea' }, { name: 'from', label: 'Кто добавил', type: 'text' },
        { name: 'date', label: 'Дата', type: 'date' }, { name: 'term', label: 'Срок', type: 'text', placeholder: '30 дней / Бессрочно' }
    ]},
    blid: { title: 'ЧС ID', section: 'bl-id', dataKey: 'blId', fields: [
        { name: 'id', label: 'ID', type: 'text' }, { name: 'nick', label: 'Ник', type: 'text' },
        { name: 'reason', label: 'Причина', type: 'textarea' }, { name: 'from', label: 'Кто добавил', type: 'text' },
        { name: 'date', label: 'Дата', type: 'date' }, { name: 'term', label: 'Срок', type: 'text', placeholder: '14 дней / Бессрочно' }
    ]}
};

const SECTION_TO_FORM = {
    news: 'news', members: 'member', callsigns: 'callsign', ranks: 'rank',
    academy: 'academyMember', interviews: 'interview', reports: 'report',
    recommendations: 'rec', recruitments: 'recruit', registry: 'registry',
    questionnaires: 'quest', 'bl-recruitments': 'blrec', 'bl-id': 'blid'
};

// Special: academy sub-forms share section 'academy' but different dataKeys — edit needs care
const DATAKEY_BY_SECTION = {
    news: 'news', members: 'members', callsigns: 'callsigns', ranks: 'rankHistory',
    interviews: 'interviews', reports: 'reports', recommendations: 'recommendations',
    recruitments: 'recruitments', registry: 'registry', questionnaires: 'questionnaires',
    'bl-recruitments': 'blRecruitments', 'bl-id': 'blId'
};

function openModal(type, existing) {
    currentForm = FORMS[type];
    if (!currentForm) return;
    editIndex = existing != null ? existing.index : null;

    document.getElementById('modal-title').textContent = editIndex != null ? 'Редактировать' : currentForm.title;
    const body = document.getElementById('modal-body');
    body.innerHTML = '';

    currentForm.fields.forEach(f => {
        const group = document.createElement('div');
        group.className = 'form-group';
        const label = document.createElement('label');
        label.textContent = f.label;
        group.appendChild(label);

        let input;
        if (f.type === 'textarea') input = document.createElement('textarea');
        else if (f.type === 'select') {
            input = document.createElement('select');
            f.options.forEach((opt, oi) => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = f.optionLabels ? f.optionLabels[oi] : opt;
                input.appendChild(o);
            });
        } else {
            input = document.createElement('input');
            input.type = f.type;
        }
        input.name = f.name;
        input.id = 'field-' + f.name;
        if (f.placeholder) input.placeholder = f.placeholder;

        if (existing && existing.data) {
            let val = existing.data[f.name];
            if (f.type === 'date' && val && val.includes('.')) {
                const p = val.split('.');
                if (p.length === 3) val = `${p[2]}-${p[1]}-${p[0]}`;
            }
            input.value = val != null ? val : '';
        } else {
            if ((f.name === 'from' || f.name === 'interviewer' || f.name === 'curator' || f.name === 'author') && currentUser)
                input.value = currentUser.name;
            if (f.name === 'date' && f.type === 'date')
                input.value = new Date().toISOString().slice(0, 10);
        }
        group.appendChild(input);
        body.appendChild(group);
    });
    document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    currentForm = null;
    editIndex = null;
}

async function submitModal() {
    if (!currentForm) return;
    const values = {};
    currentForm.fields.forEach(f => {
        const el = document.getElementById('field-' + f.name);
        values[f.name] = el ? el.value.trim() : '';
    });
    if (values.date && values.date.includes('-')) {
        const d = new Date(values.date);
        if (!isNaN(d)) values.date = d.toLocaleDateString('ru-RU');
    }
    if (currentForm.dataKey === 'news' || currentForm.dataKey === 'reports') {
        values.author = currentUser.name;
        if (!values.date) values.date = new Date().toLocaleDateString('ru-RU');
    }

    const data = getData();
    const key = currentForm.dataKey;
    if (!data[key]) data[key] = [];

    if (editIndex != null) {
        data[key][editIndex] = { ...data[key][editIndex], ...values };
    } else {
        data[key].push(values);
    }

    // Sync rank/callsign into members if possible
    if (key === 'rankHistory' && values.nick) {
        const m = data.members.find(x => x.nick === values.nick);
        if (m) m.rank = values.rank;
    }
    if (key === 'callsigns' && values.nick) {
        const m = data.members.find(x => x.nick === values.nick);
        if (m) m.callsign = values.callsign;
    }

    await saveData(data);
    renderAll();
    closeModal();
}

function editItem(section, index) {
    // Academy has multiple tables — detect which by checking visible sub-panel
    let formKey = SECTION_TO_FORM[section];
    let dataKey = DATAKEY_BY_SECTION[section];

    if (section === 'academy') {
        if (!document.getElementById('academy-list').classList.contains('hidden')) {
            formKey = 'academyMember'; dataKey = 'academyList';
        } else if (!document.getElementById('academy-apps').classList.contains('hidden')) {
            formKey = 'academyApp'; dataKey = 'academyApps';
        } else {
            formKey = 'roleRequest'; dataKey = 'roleRequests';
        }
    }

    if (!formKey) return;
    const data = getData();
    const item = (data[dataKey] || [])[index];
    if (!item) return;
    // Temporarily set dataKey on form for submit
    const form = FORMS[formKey];
    form.dataKey = dataKey;
    openModal(formKey, { index, section, data: item });
}

async function deleteItem(section, index) {
    if (!confirm('Удалить запись?')) return;
    let dataKey = DATAKEY_BY_SECTION[section];
    if (section === 'academy') {
        if (!document.getElementById('academy-list').classList.contains('hidden')) dataKey = 'academyList';
        else if (!document.getElementById('academy-apps').classList.contains('hidden')) dataKey = 'academyApps';
        else dataKey = 'roleRequests';
    }
    if (!dataKey) return;
    const data = getData();
    (data[dataKey] || []).splice(index, 1);
    await saveData(data);
    renderAll();
}

/* ========== UI ========== */
function initTabs() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const tab = document.getElementById(btn.dataset.tab);
            if (tab) tab.classList.add('active');
        });
    });
}

function initFilters() {
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const f = btn.dataset.filter;
            document.querySelectorAll('#quest-tbody tr').forEach(row => {
                row.style.display = (f === 'all' || row.dataset.type === f) ? '' : 'none';
            });
        });
    });
    // Academy sub-tabs
    document.querySelectorAll('.filter-btn[data-sub]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn[data-sub]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.sub-panel').forEach(p => p.classList.add('hidden'));
            const panel = document.getElementById(btn.dataset.sub);
            if (panel) panel.classList.remove('hidden');
        });
    });
}

function showApp(user) {
    currentUser = user;
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('header-name').textContent = user.name;
    document.getElementById('header-role').textContent = ROLE_LABELS[user.role] || user.role;
    applyPermissions();
    renderAll();
}

function showLogin() {
    currentUser = null;
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
    document.getElementById('login-error').classList.add('hidden');
}

function initAuth() {
    document.getElementById('login-form').addEventListener('submit', e => {
        e.preventDefault();
        const login = document.getElementById('login-user').value.trim();
        const pass = document.getElementById('login-pass').value;
        const err = document.getElementById('login-error');
        const user = tryLogin(login, pass);
        if (!user) {
            err.textContent = 'Неверный логин или пароль';
            err.classList.remove('hidden');
            return;
        }
        err.classList.add('hidden');
        saveSession(user);
        showApp(user);
    });
    document.getElementById('btn-logout').addEventListener('click', () => {
        clearSession();
        showLogin();
    });
    const session = loadSession();
    if (session) showApp(session);
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    initTabs();
    initFilters();
    initAuth();
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
});
