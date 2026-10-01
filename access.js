/**
 * FIB Winslow 14 — Access, Ranks, Departments
 */

const ACCESS_USERS = [
    { login: "leader", password: "fib2026leader", name: "Director_Winslow", role: "leader", department: null },
    { login: "deputy", password: "fib2026deputy", name: "Deputy_Chief", role: "deputy", department: null },
    { login: "curator_id", password: "fib_id_2026", name: "Curator_ID", role: "curator", department: "id" },
    { login: "curator_inv", password: "fib_inv_2026", name: "Curator_INV", role: "curator", department: "inv" },
    { login: "curator_ciu", password: "fib_ciu_2026", name: "Curator_CIU", role: "curator", department: "ciu" },
    { login: "curator_train", password: "fib_train_2026", name: "Curator_Training", role: "curator", department: "training" },
    { login: "agent1", password: "agent123", name: "Agent_Smith", role: "agent", department: null },
    { login: "agent2", password: "agent456", name: "Agent_Miller", role: "agent", department: null }
];

const ROLE_LABELS = {
    agent: "Сотрудник ФБР",
    curator: "Куратор отдела",
    deputy: "Зам. директора",
    leader: "Лидер"
};

const RANKS = [
    { id: "cadet", name: "Кадет", level: 1 },
    { id: "junior", name: "Младший агент", level: 2 },
    { id: "agent", name: "Агент", level: 3 },
    { id: "senior", name: "Старший агент", level: 4 },
    { id: "special", name: "Специальный агент", level: 5 },
    { id: "supervisor", name: "Супервайзер", level: 6 },
    { id: "asstdirector", name: "Пом. директора", level: 7 },
    { id: "deputy", name: "Зам. директора", level: 8 },
    { id: "director", name: "Директор", level: 9 }
];

const DEPARTMENTS = {
    id: { id: "id", name: "Internal Division (ID)", icon: "🔍", short: "ID" },
    inv: { id: "inv", name: "Следственный отдел", icon: "📂", short: "INV" },
    ciu: { id: "ciu", name: "CIU", icon: "🕵️", short: "CIU" },
    training: { id: "training", name: "Отдел обучения", icon: "🎓", short: "TRN" },
    academy: { id: "academy", name: "Академия", icon: "🏫", short: "ACD" }
};

const PERMISSIONS = {
    agent: {
        view: ["news","recommendations","recruitments","registry","questionnaires","bl-recruitments","bl-id",
               "dept-id","dept-inv","dept-ciu","dept-training","callsigns","ranks","members","academy","interviews","reports"],
        add: ["recommendations","recruitments","questionnaires","interviews","reports"],
        edit: [],
        delete: [],
        manageUsers: false, manageNews: false, manageRanks: false, manageMembers: false, manageAcademy: false
    },
    curator: {
        view: ["news","recommendations","recruitments","registry","questionnaires","bl-recruitments","bl-id",
               "dept-id","dept-inv","dept-ciu","dept-training","callsigns","ranks","members","academy","interviews","reports"],
        add: ["recommendations","recruitments","registry","questionnaires","bl-recruitments","bl-id","callsigns","interviews","reports","academy"],
        edit: ["recommendations","recruitments","registry","questionnaires","callsigns","interviews","reports"],
        delete: [],
        manageUsers: false, manageNews: false, manageRanks: false, manageMembers: true, manageAcademy: true
    },
    deputy: {
        view: ["news","recommendations","recruitments","registry","questionnaires","bl-recruitments","bl-id",
               "dept-id","dept-inv","dept-ciu","dept-training","callsigns","ranks","members","academy","interviews","reports"],
        add: ["recommendations","recruitments","registry","questionnaires","bl-recruitments","bl-id","news","callsigns","ranks","members","academy","interviews","reports"],
        edit: ["recommendations","recruitments","registry","questionnaires","bl-recruitments","bl-id","news","callsigns","ranks","members","interviews","reports","academy"],
        delete: ["recommendations","recruitments","registry","questionnaires","callsigns","interviews","reports"],
        manageUsers: false, manageNews: true, manageRanks: true, manageMembers: true, manageAcademy: true
    },
    leader: {
        view: ["news","recommendations","recruitments","registry","questionnaires","bl-recruitments","bl-id",
               "dept-id","dept-inv","dept-ciu","dept-training","callsigns","ranks","members","academy","interviews","reports"],
        add: ["recommendations","recruitments","registry","questionnaires","bl-recruitments","bl-id","news","callsigns","ranks","members","academy","interviews","reports"],
        edit: ["recommendations","recruitments","registry","questionnaires","bl-recruitments","bl-id","news","callsigns","ranks","members","interviews","reports","academy"],
        delete: ["recommendations","recruitments","registry","questionnaires","bl-recruitments","bl-id","news","callsigns","ranks","members","interviews","reports","academy"],
        manageUsers: true, manageNews: true, manageRanks: true, manageMembers: true, manageAcademy: true
    }
};
