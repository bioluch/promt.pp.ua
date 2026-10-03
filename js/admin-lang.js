/**
 * js/admin-lang.js — JS PROMPT Admin Panel
 * Interface language system for admin.html: EN (default) / UK / ES.
 * Mirrors the API shape of js/language.js (window.Lang) but ships its own
 * dictionary scoped to admin-only strings, so it works standalone on
 * admin.html without pulling in the full app's translation set.
 */

(function () {
  'use strict';

  var TRANSLATIONS = {

    /* ── Sidebar ── */
    'nav.dashboard':     { en: 'Dashboard',      uk: 'Дашборд',          es: 'Panel' },
    'nav.users':         { en: 'Users',          uk: 'Користувачі',     es: 'Usuarios' },
    'nav.prompts':       { en: 'All Prompts',    uk: 'Усі промти',      es: 'Todos los prompts' },
    'nav.providers':     { en: 'AI Providers',   uk: 'AI-провайдери',   es: 'Proveedores de IA' },
    'nav.danger':        { en: '⚠️ Danger Zone', uk: '⚠️ Небезпечна зона', es: '⚠️ Zona de peligro' },
    'nav.help':          { en: '❓ Help',         uk: '❓ Довідка',        es: '❓ Ayuda' },
    'help.title':        { en: 'Admin Help',     uk: 'Довідка адміністратора', es: 'Ayuda de administración' },
    'nav.back':          { en: '← Back to app',  uk: '← Назад до застосунку', es: '← Volver a la app' },
    'admin.panel':       { en: 'Admin Panel',    uk: 'Панель адміністратора', es: 'Panel de administración' },

    /* ── Section headers ── */
    'section.dashboard.title': { en: 'Dashboard',         uk: 'Дашборд',          es: 'Panel' },
    'section.dashboard.sub':   { en: 'Overview of platform activity', uk: 'Огляд активності платформи', es: 'Resumen de la actividad de la plataforma' },
    'section.users.title':     { en: 'Users',             uk: 'Користувачі',      es: 'Usuarios' },
    'section.users.sub':       { en: 'Manage user accounts', uk: 'Керування обліковими записами', es: 'Gestionar cuentas de usuario' },
    'section.prompts.title':   { en: 'All Prompts',       uk: 'Усі промти',       es: 'Todos los prompts' },
    'section.prompts.sub':     { en: 'View and manage every user\u2019s prompts', uk: 'Перегляд і керування промтами всіх користувачів', es: 'Ver y gestionar los prompts de todos los usuarios' },
    'section.providers.title': { en: 'AI Providers',      uk: 'AI-провайдери',    es: 'Proveedores de IA' },
    'section.providers.sub':   { en: 'Configure model endpoints for the Scheduler', uk: 'Налаштування endpoint\u2019ів моделей для Планувальника', es: 'Configurar los endpoints de modelos para el Programador' },
    'section.danger.title':    { en: 'Danger Zone',       uk: 'Небезпечна зона',  es: 'Zona de peligro' },
    'section.danger.sub':      { en: 'Irreversible actions \u2014 proceed with care', uk: 'Незворотні дії \u2014 дійте обережно', es: 'Acciones irreversibles \u2014 proceda con cuidado' },

    /* ── Theme toggle ── */
    'theme.day':   { en: '🌙 Night Mode',  uk: '🌙 Нічний режим',  es: '🌙 Modo noche' },
    'theme.night': { en: '💎 Blue Mode',   uk: '💎 Синій режим',   es: '💎 Modo azul' },
    'theme.blue':  { en: '🌿 Green Mode',  uk: '🌿 Зелений режим', es: '🌿 Modo verde' },
    'theme.green': { en: '☀️ Day Mode',    uk: '☀️ Денний режим',  es: '☀️ Modo día' },

    /* ── Generic ── */
    'common.loading':   { en: 'Loading…',           uk: 'Завантаження…',        es: 'Cargando…' },
    'common.cancel':    { en: 'Cancel',              uk: 'Скасувати',            es: 'Cancelar' },
    'common.confirm':   { en: 'Confirm',             uk: 'Підтвердити',          es: 'Confirmar' },
    'common.save':      { en: 'Save',                uk: 'Зберегти',             es: 'Guardar' },
    'common.close':     { en: 'Close',                uk: 'Закрити',              es: 'Cerrar' },
    'common.delete':    { en: 'Delete',               uk: 'Видалити',             es: 'Eliminar' },
    'common.edit':      { en: 'Edit',                 uk: 'Редагувати',           es: 'Editar' },
    'common.view':      { en: 'View',                 uk: 'Переглянути',          es: 'Ver' },
    'common.copy':      { en: 'Copy',                 uk: 'Копіювати',            es: 'Copiar' },
    'common.download':  { en: 'Download',             uk: 'Завантажити',          es: 'Descargar' },
    'common.add':       { en: 'Add',                  uk: 'Додати',               es: 'Añadir' },
    'common.create':    { en: 'Create',                uk: 'Створити',             es: 'Crear' },
    'common.export':    { en: '↑ Export',             uk: '↑ Експорт',            es: '↑ Exportar' },
    'common.import':    { en: '↓ Import',             uk: '↓ Імпорт',             es: '↓ Importar' },
    'common.active':    { en: 'Active',                uk: 'Активний',             es: 'Activo' },
    'common.inactive':  { en: 'Inactive',              uk: 'Неактивний',           es: 'Inactivo' },
    'common.optional':  { en: 'Optional',              uk: 'Необов\u2019язково',  es: 'Opcional' },
    'common.required':  { en: 'required',              uk: 'обов\u2019язково',    es: 'requerido' },
    'common.builtin':   { en: 'built-in',              uk: 'вбудований',           es: 'incorporado' },

    /* ── Sign-in gate ── */
    'gate.signin':       { en: 'Please sign in to continue.', uk: 'Будь ласка, увійдіть, щоб продовжити.', es: 'Por favor, inicie sesión para continuar.' },
    'gate.adminOnly':    { en: 'Admin access required for this account.', uk: 'Для цього облікового запису потрібен доступ адміністратора.', es: 'Se requiere acceso de administrador para esta cuenta.' },

    /* ── Dashboard ── */
    'dash.totalUsers':    { en: 'Total Users',      uk: 'Усього користувачів', es: 'Total de usuarios' },
    'dash.activeUsers':   { en: 'Active Users',     uk: 'Активні користувачі', es: 'Usuarios activos' },
    'dash.totalPrompts':  { en: 'Total Prompts',    uk: 'Усього промтів',      es: 'Total de prompts' },
    'dash.pendingJobs':   { en: 'Pending Jobs',     uk: 'Задачі в очікуванні', es: 'Tareas pendientes' },
    'dash.completedJobs': { en: 'Completed Jobs',   uk: 'Завершені задачі',    es: 'Tareas completadas' },
    'dash.eventsByType':  { en: 'Events by type',   uk: 'Події за типом',      es: 'Eventos por tipo' },
    'dash.col.event':     { en: 'Event',            uk: 'Подія',               es: 'Evento' },
    'dash.col.count':     { en: 'Count',             uk: 'Кількість',           es: 'Cantidad' },
    'dash.noEvents':      { en: 'No events yet',    uk: 'Подій ще немає',      es: 'Aún no hay eventos' },

    /* ── Users ── */
    'users.heading':      { en: 'Users',             uk: 'Користувачі',         es: 'Usuarios' },
    'users.addUser':      { en: '+ Add User',        uk: '+ Додати користувача', es: '+ Añadir usuario' },
    'users.col.email':    { en: 'Email',              uk: 'Email',                es: 'Correo' },
    'users.col.role':     { en: 'Role',               uk: 'Роль',                 es: 'Rol' },
    'users.col.prompts':  { en: 'Prompts',            uk: 'Промти',               es: 'Prompts' },
    'users.col.logins':   { en: 'Logins',             uk: 'Входи',                es: 'Inicios de sesión' },
    'users.col.lastLogin':{ en: 'Last Login',         uk: 'Останній вхід',        es: 'Último inicio de sesión' },
    'users.col.active':   { en: 'Active',             uk: 'Активний',             es: 'Activo' },
    'users.col.actions':  { en: 'Actions',            uk: 'Дії',                  es: 'Acciones' },
    'users.active':       { en: '✓ Active',           uk: '✓ Активний',           es: '✓ Activo' },
    'users.disabled':     { en: '✗ Disabled',         uk: '✗ Вимкнено',           es: '✗ Desactivado' },
    'users.promote':      { en: 'Promote',            uk: 'Підвищити',            es: 'Promover' },
    'users.demote':       { en: 'Demote',             uk: 'Понизити',             es: 'Degradar' },
    'users.updated':      { en: '✓ User updated',     uk: '✓ Користувача оновлено', es: '✓ Usuario actualizado' },
    'users.roleUpdated':  { en: '✓ Role updated',     uk: '✓ Роль оновлено',      es: '✓ Rol actualizado' },
    'users.deleted':      { en: '✓ User deleted',     uk: '✓ Користувача видалено', es: '✓ Usuario eliminado' },
    'users.deleteTitle':  { en: 'Delete user?',       uk: 'Видалити користувача?', es: '¿Eliminar usuario?' },
    'users.deleteBody':   { en: 'This will permanently delete {email} and all of their prompts, jobs, and data.', uk: 'Це назавжди видалить {email} та всі його промти, задачі й дані.', es: 'Esto eliminará permanentemente a {email} y todos sus prompts, tareas y datos.' },

    /* ── User search ── */
    'users.searchPlaceholder': { en: 'Search users…', uk: 'Пошук користувачів…', es: 'Buscar usuarios…' },
    'users.noResults':         { en: 'No users found', uk: 'Користувачів не знайдено', es: 'No se encontraron usuarios' },

    /* ── API Keys management (admin) ── */
    'ukeys.btn':              { en: '🔑 API Keys', uk: '🔑 API Ключі', es: '🔑 Claves API' },
    'ukeys.title':            { en: '🔑 API Keys — {email}', uk: '🔑 API Ключі — {email}', es: '🔑 Claves API — {email}' },
    'ukeys.noKeys':           { en: 'No API keys configured for this user.', uk: 'Для цього користувача API ключів не налаштовано.', es: 'No hay claves API configuradas para este usuario.' },
    'ukeys.provider':         { en: 'Provider', uk: 'Провайдер', es: 'Proveedor' },
    'ukeys.prefix':           { en: 'Key prefix', uk: 'Префікс ключа', es: 'Prefijo de clave' },
    'ukeys.updated':          { en: 'Updated', uk: 'Оновлено', es: 'Actualizado' },
    'ukeys.actions':          { en: 'Actions', uk: 'Дії', es: 'Acciones' },
    'ukeys.addKey':           { en: '+ Add Key', uk: '+ Додати ключ', es: '+ Añadir clave' },
    'ukeys.editTitle':        { en: 'Edit key — {provider}', uk: 'Редагувати ключ — {provider}', es: 'Editar clave — {provider}' },
    'ukeys.addTitle':         { en: 'Add API Key', uk: 'Додати API ключ', es: 'Añadir clave API' },
    'ukeys.providerLabel':    { en: 'Provider name', uk: 'Назва провайдера', es: 'Nombre del proveedor' },
    'ukeys.keyLabel':         { en: 'API Key', uk: 'API ключ', es: 'Clave API' },
    'ukeys.keyPlaceholder':   { en: 'Paste API key here…', uk: 'Вставте API ключ сюди…', es: 'Pegue la clave API aquí…' },
    'ukeys.saved':            { en: '✓ Key saved', uk: '✓ Ключ збережено', es: '✓ Clave guardada' },
    'ukeys.deleted':          { en: '✓ Key deleted', uk: '✓ Ключ видалено', es: '✓ Clave eliminada' },
    'ukeys.deleteTitle':      { en: 'Delete key?', uk: 'Видалити ключ?', es: '¿Eliminar clave?' },
    'ukeys.deleteBody':       { en: 'Delete the {provider} API key for {email}? This cannot be undone.', uk: 'Видалити {provider} API ключ для {email}? Цю дію не можна скасувати.', es: '¿Eliminar la clave API de {provider} para {email}? Esta acción no se puede deshacer.' },
    'ukeys.keyRequired':      { en: 'API key is required.', uk: 'API ключ обов\u2019язковий.', es: 'La clave API es obligatoria.' },
    'ukeys.providerRequired': { en: 'Provider name is required.', uk: 'Назва провайдера обов\u2019язкова.', es: 'El nombre del proveedor es obligatorio.' },

    /* ── New User modal ── */
    'newuser.title':      { en: 'Add New User',       uk: 'Додати нового користувача', es: 'Añadir nuevo usuario' },
    'newuser.email':      { en: 'Email',                uk: 'Email',                     es: 'Correo' },
    'newuser.password':   { en: 'Password',             uk: 'Пароль',                    es: 'Contraseña' },
    'newuser.passwordHint':{ en: 'Min. 8 characters',   uk: 'Мінімум 8 символів',         es: 'Mín. 8 caracteres' },
    'newuser.displayName':{ en: 'Display Name',         uk: 'Відображуване ім\u2019я',    es: 'Nombre visible' },
    'newuser.role':       { en: 'Role',                 uk: 'Роль',                       es: 'Rol' },
    'newuser.roleUser':   { en: 'User',                 uk: 'Користувач',                 es: 'Usuario' },
    'newuser.roleAdmin':  { en: 'Admin',                uk: 'Адміністратор',              es: 'Administrador' },
    'newuser.created':    { en: '✓ User created',       uk: '✓ Користувача створено',     es: '✓ Usuario creado' },
    'newuser.required':   { en: 'Email and password required.', uk: 'Потрібні email і пароль.', es: 'Se requieren correo y contraseña.' },

    /* ── Prompts ── */
    'prompts.searchPlaceholder': { en: 'Search by title or content…', uk: 'Пошук за назвою або вмістом…', es: 'Buscar por título o contenido…' },
    'prompts.col.title':   { en: 'Title',              uk: 'Назва',                es: 'Título' },
    'prompts.col.user':    { en: 'User',               uk: 'Користувач',           es: 'Usuario' },
    'prompts.col.domain':  { en: 'Domain',             uk: 'Домен',                es: 'Dominio' },
    'prompts.col.tokens':  { en: 'Tokens',             uk: 'Токени',               es: 'Tokens' },
    'prompts.col.created': { en: 'Created',            uk: 'Створено',             es: 'Creado' },
    'prompts.col.actions': { en: 'Actions',            uk: 'Дії',                  es: 'Acciones' },
    'prompts.notFound':    { en: 'No prompts found.',  uk: 'Промтів не знайдено.', es: 'No se encontraron prompts.' },
    'prompts.deleted':     { en: '✓ Prompt deleted',   uk: '✓ Промт видалено',     es: '✓ Prompt eliminado' },
    'prompts.deleteTitle': { en: 'Delete prompt?',     uk: 'Видалити промт?',      es: '¿Eliminar prompt?' },
    'prompts.deleteBody':  { en: 'This action cannot be undone.', uk: 'Цю дію не можна скасувати.', es: 'Esta acción no se puede deshacer.' },
    'prompts.copyFailed':  { en: '✗ Copy failed',      uk: '✗ Не вдалося скопіювати', es: '✗ Error al copiar' },
    'prompts.copiedSuffix':{ en: 'copied',              uk: 'скопійовано',          es: 'copiado' },

    /* ── Copy Prompt modal ── */
    'copyPrompt.title':    { en: 'Copy Prompt',         uk: 'Копіювати промт',     es: 'Copiar prompt' },
    'copyPrompt.title.label': { en: 'Title',            uk: 'Назва',               es: 'Título' },
    'copyPrompt.user.label':  { en: 'User (email)',     uk: 'Користувач (email)',  es: 'Usuario (correo)' },
    'copyPrompt.domain.label':{ en: 'Domain',           uk: 'Домен',               es: 'Dominio' },
    'copyPrompt.copied':   { en: '✓ Prompt copied',     uk: '✓ Промт скопійовано', es: '✓ Prompt copiado' },

    /* ── Edit Prompt modal ── */
    'editPrompt.title':    { en: 'Edit Prompt',         uk: 'Редагувати промт',    es: 'Editar prompt' },
    'editPrompt.created':  { en: 'Created',             uk: 'Створено',            es: 'Creado' },
    'editPrompt.sourceText':{ en: 'Source Text',        uk: 'Вихідний текст',      es: 'Texto fuente' },
    'editPrompt.promptContent': { en: 'Prompt Content', uk: 'Вміст промту',        es: 'Contenido del prompt' },
    'editPrompt.saveChanges':{ en: 'Save Changes',      uk: 'Зберегти зміни',      es: 'Guardar cambios' },
    'editPrompt.updated':  { en: '✓ Prompt updated',    uk: '✓ Промт оновлено',    es: '✓ Prompt actualizado' },

    /* ── AI Providers ── */
    'providers.heading':   { en: 'AI Provider Endpoints', uk: 'Endpoint\u2019и AI-провайдерів', es: 'Endpoints de proveedores de IA' },
    'providers.addProvider': { en: '+ Add Provider',   uk: '+ Додати провайдера',  es: '+ Añadir proveedor' },
    'providers.col.provider': { en: 'Provider',        uk: 'Провайдер',            es: 'Proveedor' },
    'providers.col.endpoint': { en: 'Endpoint URL',    uk: 'URL endpoint\u2019у',  es: 'URL del endpoint' },
    'providers.col.model':    { en: 'Model',           uk: 'Модель',               es: 'Modelo' },
    'providers.col.status':   { en: 'Status',          uk: 'Статус',               es: 'Estado' },
    'providers.col.actions':  { en: 'Actions',         uk: 'Дії',                  es: 'Acciones' },
    'providers.exported':     { en: '✓ Exported',      uk: '✓ Експортовано',       es: '✓ Exportado' },
    'providers.imported':     { en: '✓ Imported {n} provider(s)', uk: '✓ Імпортовано провайдерів: {n}', es: '✓ {n} proveedor(es) importados' },
    'providers.saved':        { en: '✓ Provider saved', uk: '✓ Провайдера збережено', es: '✓ Proveedor guardado' },
    'providers.deleted':      { en: '✓ Deleted',         uk: '✓ Видалено',           es: '✓ Eliminado' },
    'providers.deleteTitle':  { en: 'Delete provider?',  uk: 'Видалити провайдера?', es: '¿Eliminar proveedor?' },
    'providers.deleteBodyBuiltin': { en: '⚠️ This is a BUILT-IN provider used by the app\u2019s core features. Removing it may break existing Scheduled Jobs that target it. Scheduled jobs targeting this provider will start failing.', uk: '⚠️ Це ВБУДОВАНИЙ провайдер, який використовується основними функціями застосунку. Його видалення може зламати існуючі заплановані задачі, що його використовують. Такі задачі почнуть завершуватись помилкою.', es: '⚠️ Este es un proveedor INCORPORADO usado por las funciones principales de la app. Eliminarlo puede romper las tareas programadas existentes que lo usan. Esas tareas comenzarán a fallar.' },
    'providers.deleteBodyCustom':  { en: 'Scheduled jobs targeting this provider will start failing.', uk: 'Заплановані задачі, що використовують цього провайдера, почнуть завершуватись помилкою.', es: 'Las tareas programadas que usan este proveedor comenzarán a fallar.' },
    'providers.deleteBuiltinLabel':{ en: 'Delete built-in provider', uk: 'Видалити вбудованого провайдера', es: 'Eliminar proveedor incorporado' },

    /* ── Provider form ── */
    'providerForm.editTitle': { en: 'Edit AI Provider', uk: 'Редагувати AI-провайдера', es: 'Editar proveedor de IA' },
    'providerForm.addTitle':  { en: 'Add AI Provider',  uk: 'Додати AI-провайдера',     es: 'Añadir proveedor de IA' },
    'providerForm.key':       { en: 'Provider Key (lowercase, no spaces)', uk: 'Ключ провайдера (малі літери, без пробілів)', es: 'Clave del proveedor (minúsculas, sin espacios)' },
    'providerForm.label':     { en: 'Display Label',    uk: 'Відображувана назва',      es: 'Etiqueta visible' },
    'providerForm.url':       { en: 'Endpoint URL',     uk: 'URL endpoint\u2019у',       es: 'URL del endpoint' },
    'providerForm.model':     { en: 'Model Name',       uk: 'Назва моделі',              es: 'Nombre del modelo' },
    'providerForm.authHeader':{ en: 'Auth Header',      uk: 'Заголовок авторизації',     es: 'Encabezado de autenticación' },
    'providerForm.authPrefix':{ en: 'Auth Prefix',      uk: 'Префікс авторизації',       es: 'Prefijo de autenticación' },
    'providerForm.activeLabel': { en: 'Active',         uk: 'Активний',                  es: 'Activo' },
    'providerForm.allRequired': { en: 'All fields except auth header/prefix are required.', uk: 'Усі поля, крім заголовка/префіксу авторизації, обов\u2019язкові.', es: 'Todos los campos excepto el encabezado/prefijo de autenticación son obligatorios.' },
    'providerForm.builtinLabel':{ en: 'Built-in provider (protected from deletion)', uk: 'Вбудований провайдер (захищений від видалення)', es: 'Proveedor incorporado (protegido contra eliminación)' },
    'providerForm.providerOptions': { en: 'Provider Options (JSON)', uk: 'Параметри провайдера (JSON)', es: 'Opciones del proveedor (JSON)' },
    'providerForm.providerOptionsHint': { en: 'Optional JSON for provider-specific settings, e.g. tools, grounding. Example: {"tools":[{"google_search":{}}],"use_v1beta":true}', uk: 'Необов\u2019язковий JSON для специфічних налаштувань провайдера. Приклад: {"tools":[{"google_search":{}}],"use_v1beta":true}', es: 'JSON opcional para configuraciones específicas del proveedor. Ejemplo: {"tools":[{"google_search":{}}],"use_v1beta":true}' },
    'providerForm.invalidJson':   { en: '✗ Invalid JSON in Provider Options', uk: '✗ Невалідний JSON у параметрах провайдера', es: '✗ JSON inválido en opciones del proveedor' },
    'providers.col.options':      { en: 'Options', uk: 'Параметри', es: 'Opciones' },
    'providers.col.builtin':      { en: 'Type', uk: 'Тип', es: 'Tipo' },

    /* ── Danger Zone: Backup ── */
    'danger.backup.heading':   { en: '💾 Database Backup', uk: '💾 Резервна копія бази даних', es: '💾 Copia de seguridad de la base de datos' },
    'danger.backup.desc':      { en: 'Create a full PostgreSQL backup (schema + data), store it on the server, and download it whenever needed.', uk: 'Створіть повну резервну копію PostgreSQL (схема + дані), збережіть її на сервері та завантажуйте, коли потрібно.', es: 'Cree una copia de seguridad completa de PostgreSQL (esquema + datos), guárdela en el servidor y descárguela cuando lo necesite.' },
    'danger.backup.createBtn': { en: '📦 Create Backup', uk: '📦 Створити резервну копію', es: '📦 Crear copia de seguridad' },
    'danger.backup.col.filename': { en: 'Filename',      uk: 'Файл',                 es: 'Archivo' },
    'danger.backup.col.size':     { en: 'Size',           uk: 'Розмір',               es: 'Tamaño' },
    'danger.backup.col.created':  { en: 'Created',        uk: 'Створено',             es: 'Creado' },
    'danger.backup.col.actions':  { en: 'Actions',        uk: 'Дії',                  es: 'Acciones' },
    'danger.backup.restoreBtn':   { en: 'Restore',        uk: 'Відновити',            es: 'Restaurar' },
    'danger.backup.none':         { en: 'No backups yet.', uk: 'Резервних копій ще немає.', es: 'Aún no hay copias de seguridad.' },
    'danger.backup.creating':     { en: '⏳ Creating backup…', uk: '⏳ Створення резервної копії…', es: '⏳ Creando copia de seguridad…' },
    'danger.backup.created':      { en: '✓ Backup created ({size})', uk: '✓ Резервну копію створено ({size})', es: '✓ Copia de seguridad creada ({size})' },
    'danger.backup.restoring':    { en: '⏳ Restoring…',  uk: '⏳ Відновлення…',       es: '⏳ Restaurando…' },
    'danger.backup.deleted':      { en: '✓ Backup deleted', uk: '✓ Резервну копію видалено', es: '✓ Copia de seguridad eliminada' },
    'danger.backup.deleteTitle':  { en: 'Delete this backup?', uk: 'Видалити цю резервну копію?', es: '¿Eliminar esta copia de seguridad?' },

    /* ── Danger Zone: Restore upload ── */
    'danger.restore.heading': { en: '♻️ Restore from Uploaded File', uk: '♻️ Відновлення із завантаженого файлу', es: '♻️ Restaurar desde un archivo subido' },
    'danger.restore.desc1':   { en: 'Upload a', uk: 'Завантажте', es: 'Suba un' },
    'danger.restore.desc2':   { en: 'backup file from your computer and restore the database from it directly. This', uk: 'файл резервної копії з вашого комп\u2019ютера, і база даних буде відновлена безпосередньо з нього. Це', es: 'archivo de copia de seguridad desde su computadora y restaure la base de datos directamente desde él. Esto' },
    'danger.restore.overwrites': { en: 'overwrites current data', uk: 'перезаписує поточні дані', es: 'sobrescribe los datos actuales' },
    'danger.restore.desc3':   { en: 'with whatever is in the file. This action cannot be undone.', uk: 'тим, що міститься у файлі. Цю дію не можна скасувати.', es: 'con lo que contenga el archivo. Esta acción no se puede deshacer.' },
    'danger.restore.uploadBtn': { en: '♻️ Upload & Restore', uk: '♻️ Завантажити та відновити', es: '♻️ Subir y restaurar' },
    'danger.restore.chooseFirst': { en: '✗ Choose a .sql.gz file first', uk: '✗ Спочатку оберіть файл .sql.gz', es: '✗ Primero elija un archivo .sql.gz' },
    'danger.restore.mustBeGz': { en: '✗ File must be a .gz archive', uk: '✗ Файл має бути архівом .gz', es: '✗ El archivo debe ser un archivo .gz' },
    'danger.restore.uploading': { en: '⏳ Uploading & restoring…', uk: '⏳ Завантаження та відновлення…', es: '⏳ Subiendo y restaurando…' },

    /* ── Danger Zone: typed confirm ── */
    'danger.typedConfirm.restoreBackupTitle': { en: 'Restore database from this backup?', uk: 'Відновити базу даних із цієї резервної копії?', es: '¿Restaurar la base de datos desde esta copia de seguridad?' },
    'danger.typedConfirm.restoreBackupBody':  { en: 'This will OVERWRITE all current data with the contents of "{filename}". This cannot be undone.', uk: 'Це ПЕРЕЗАПИШЕ всі поточні дані вмістом файлу "{filename}". Цю дію не можна скасувати.', es: 'Esto SOBRESCRIBIRÁ todos los datos actuales con el contenido de "{filename}". Esto no se puede deshacer.' },
    'danger.typedConfirm.restoreUploadTitle': { en: 'Restore database from uploaded file?', uk: 'Відновити базу даних із завантаженого файлу?', es: '¿Restaurar la base de datos desde el archivo subido?' },
    'danger.typedConfirm.restoreUploadBody':  { en: 'This will OVERWRITE all current data with the contents of "{filename}". This cannot be undone.', uk: 'Це ПЕРЕЗАПИШЕ всі поточні дані вмістом файлу "{filename}". Цю дію не можна скасувати.', es: 'Esto SOBRESCRIBIRÁ todos los datos actuales con el contenido de "{filename}". Esto no se puede deshacer.' },
    'danger.typedConfirm.restoreLabel':       { en: 'Restore Database', uk: 'Відновити базу даних', es: 'Restaurar base de datos' },
    'danger.typedConfirm.typeToConfirm':      { en: 'Type', uk: 'Введіть', es: 'Escriba' },
    'danger.typedConfirm.toConfirm':          { en: 'to confirm:', uk: 'для підтвердження:', es: 'para confirmar:' },

    /* ── Danger Zone: Wipe ── */
    'danger.wipe.heading':   { en: '⚠️ Wipe Entire Database', uk: '⚠️ Очистити всю базу даних', es: '⚠️ Borrar toda la base de datos' },
    'danger.wipe.desc1':     { en: 'This permanently deletes', uk: 'Це назавжди видаляє', es: 'Esto elimina permanentemente' },
    'danger.wipe.everyAccount': { en: 'every user account except your own', uk: 'усі облікові записи користувачів, крім вашого власного', es: 'todas las cuentas de usuario excepto la suya' },
    'danger.wipe.desc2':     { en: ', along with all of their prompts, source texts, scheduled jobs, and API keys. Your admin account and the AI provider configuration are preserved. This action cannot be undone.', uk: ', разом з усіма їхніми промтами, вихідними текстами, запланованими задачами та API-ключами. Ваш обліковий запис адміністратора та конфігурація AI-провайдерів зберігаються. Цю дію не можна скасувати.', es: ', junto con todos sus prompts, textos fuente, tareas programadas y claves API. Su cuenta de administrador y la configuración de proveedores de IA se conservan. Esta acción no se puede deshacer.' },
    'danger.wipe.btn':       { en: '🗑️ Wipe Database',  uk: '🗑️ Очистити базу даних', es: '🗑️ Borrar base de datos' },
    'danger.wipe.confirm1Title': { en: 'Wipe the entire database?', uk: 'Очистити всю базу даних?', es: '¿Borrar toda la base de datos?' },
    'danger.wipe.confirm1Body':  { en: 'This deletes ALL other user accounts and their data permanently.', uk: 'Це назавжди видалить УСІ інші облікові записи користувачів та їхні дані.', es: 'Esto elimina permanentemente TODAS las demás cuentas de usuario y sus datos.' },
    'danger.wipe.confirm1Label': { en: 'I understand, continue', uk: 'Я розумію, продовжити', es: 'Entiendo, continuar' },
    'danger.wipe.confirm2Title': { en: 'Are you absolutely sure?', uk: 'Ви абсолютно впевнені?', es: '¿Está completamente seguro?' },
    'danger.wipe.confirm2Body':  { en: 'This is your last chance to cancel. There is no undo.', uk: 'Це ваш останній шанс скасувати. Відновлення неможливе.', es: 'Esta es su última oportunidad de cancelar. No hay forma de deshacer.' },
    'danger.wipe.confirm2Label': { en: 'Yes, wipe everything', uk: 'Так, видалити все', es: 'Sí, borrar todo' },

    /* ── Generic error fallback ── */
    'error.generic':  { en: 'Something went wrong.', uk: 'Щось пішло не так.', es: 'Algo salió mal.' },

    /* ── Footer (admin.html) ── */
    'footer.lang':    { en: 'Language', uk: 'Мова', es: 'Idioma' },

    /* ── Shared keys used by js/auth-ui.js (login modal, dropdown menu, My Account panel) ── */
    'domain.intelligence_analysis': { en: 'Intelligence Analysis', uk: 'Аналітика розвідки', es: 'Análisis de inteligencia' },
    'domain.osint':                 { en: 'OSINT', uk: 'OSINT', es: 'OSINT' },
    'domain.strategic_risk':        { en: 'Strategic Risks', uk: 'Стратегічні ризики', es: 'Riesgos estratégicos' },
    'domain.medical_diagnostics':   { en: 'Medicine', uk: 'Медицина', es: 'Medicina' },
    'domain.cybersecurity':         { en: 'Cybersecurity', uk: 'Кібербезпека', es: 'Ciberseguridad' },
    'domain.financial_analysis':    { en: 'Financial Analysis', uk: 'Фінансовий аналіз', es: 'Análisis financiero' },
    'domain.legal_analysis':        { en: 'Law', uk: 'Право', es: 'Derecho' },
    'domain.programming':           { en: 'Programming', uk: 'Програмування', es: 'Programación' },
    'domain.data_science':          { en: 'Data Science', uk: 'Наука про дані', es: 'Ciencia de datos' },
    'domain.business_strategy':     { en: 'Business Strategy', uk: 'Бізнес-стратегія', es: 'Estrategia empresarial' },
    'domain.product_management':    { en: 'Product Management', uk: 'Управління продуктом', es: 'Gestión de producto' },
    'domain.scientific_research':   { en: 'Scientific Research', uk: 'Наукові дослідження', es: 'Investigación científica' },
    'domain.general':               { en: 'General', uk: 'Загальне', es: 'General' },
    'auth.signIn':         { en: 'Sign In', uk: 'Увійти', es: 'Iniciar sesión' },
    'auth.myPrompts':      { en: 'My Prompts', uk: 'Мої промти', es: 'Mis prompts' },
    'auth.statistics':     { en: 'Statistics', uk: 'Статистика', es: 'Estadísticas' },
    'auth.scheduler':      { en: '⏱ Scheduler', uk: '⏱ Планувальник', es: '⏱ Programador' },
    'auth.adminPanel':     { en: '🛡 Admin Panel', uk: '🛡 Адмін-панель', es: '🛡 Panel de administración' },
    'auth.signOut':        { en: '↩ Sign Out', uk: '↩ Вийти', es: '↩ Cerrar sesión' },
    'auth.user':           { en: 'User', uk: 'Користувач', es: 'Usuario' },
    'auth.modal.title':     { en: '🔑 JS PROMPT', uk: '🔑 JS PROMPT', es: '🔑 JS PROMPT' },
    'auth.tab.login':       { en: 'Sign In', uk: 'Увійти', es: 'Iniciar sesión' },
    'auth.tab.register':    { en: 'Register', uk: 'Реєстрація', es: 'Registrarse' },
    'auth.placeholder.email':    { en: 'Email', uk: 'Email', es: 'Correo' },
    'auth.placeholder.password': { en: 'Password', uk: 'Пароль', es: 'Contraseña' },
    'auth.btn.login':       { en: 'Sign In', uk: 'Увійти', es: 'Iniciar sesión' },
    'auth.btn.loggingIn':   { en: 'Signing in…', uk: 'Вхід…', es: 'Iniciando sesión…' },
    'auth.forgotPassword':  { en: 'Forgot password?', uk: 'Забули пароль?', es: '¿Olvidó su contraseña?' },
    'auth.forgot.hint':     { en: 'Enter your email — we\u2019ll send a password reset link.', uk: 'Введіть email — ми надішлемо посилання для скидання пароля.', es: 'Ingrese su correo — le enviaremos un enlace para restablecer la contraseña.' },
    'auth.forgot.send':     { en: 'Send Link', uk: 'Надіслати посилання', es: 'Enviar enlace' },
    'auth.forgot.sending':  { en: 'Sending…', uk: 'Надсилання…', es: 'Enviando…' },
    'auth.backToLogin':     { en: '← Back to sign in', uk: '← Назад до входу', es: '← Volver a iniciar sesión' },
    'auth.placeholder.name':      { en: 'Name (optional)', uk: 'Ім\u2019я (необов\u2019язково)', es: 'Nombre (opcional)' },
    'auth.placeholder.passwordMin': { en: 'Password (min. 8 characters)', uk: 'Пароль (мін. 8 символів)', es: 'Contraseña (mín. 8 caracteres)' },
    'auth.placeholder.confirmPassword': { en: 'Confirm password', uk: 'Підтвердіть пароль', es: 'Confirmar contraseña' },
    'auth.btn.register':       { en: 'Register', uk: 'Зареєструватись', es: 'Registrarse' },
    'auth.btn.registering':    { en: 'Registering…', uk: 'Реєстрація…', es: 'Registrando…' },
    'auth.err.emailPassRequired':  { en: 'Enter email and password.', uk: 'Введіть email і пароль.', es: 'Ingrese correo y contraseña.' },
    'auth.err.emailRequired':      { en: 'Enter your email.', uk: 'Введіть email.', es: 'Ingrese su correo.' },
    'auth.err.passwordMin':        { en: 'Password must be at least 8 characters.', uk: 'Пароль мінімум 8 символів.', es: 'La contraseña debe tener al menos 8 caracteres.' },
    'auth.err.passwordMismatch':   { en: 'Passwords do not match.', uk: 'Паролі не збігаються.', es: 'Las contraseñas no coinciden.' },
    'auth.ok.loginSuccess':        { en: '✓ Signed in successfully!', uk: '✓ Успішний вхід!', es: '✓ ¡Sesión iniciada con éxito!' },
    'auth.ok.resetLinkSent':       { en: '✓ If an account exists, a password reset link has been sent.', uk: '✓ Якщо акаунт існує, на пошту надіслано посилання для скидання пароля.', es: '✓ Si existe una cuenta, se ha enviado un enlace para restablecer la contraseña.' },
    'auth.ok.registerSuccess':     { en: '✓ Registration complete! Check your email {email} to confirm your account.', uk: '✓ Реєстрацію завершено! Перевірте email {email} і підтвердіть акаунт.', es: '✓ ¡Registro completo! Revise su correo {email} para confirmar su cuenta.' },
    'auth.reset.title':      { en: '🔑 New Password', uk: '🔑 Новий пароль', es: '🔑 Nueva contraseña' },
    'auth.reset.hint':       { en: 'Enter a new password for your account.', uk: 'Введіть новий пароль для вашого акаунту.', es: 'Ingrese una nueva contraseña para su cuenta.' },
    'auth.reset.btn':        { en: 'Set Password', uk: 'Встановити пароль', es: 'Establecer contraseña' },
    'auth.reset.saving':     { en: 'Saving…', uk: 'Збереження…', es: 'Guardando…' },
    'auth.reset.success':    { en: '✓ Password changed! Sign in with your new password.', uk: '✓ Пароль змінено! Тепер увійдіть з новим паролем.', es: '✓ ¡Contraseña cambiada! Inicie sesión con su nueva contraseña.' },
    'save.nothingToSave':   { en: 'Nothing to save', uk: 'Немає що зберігати', es: 'Nada que guardar' },
    'save.title':           { en: 'Save Prompt', uk: 'Збереження промту', es: 'Guardar prompt' },
    'save.promptName':      { en: 'Prompt name', uk: 'Назва промту', es: 'Nombre del prompt' },
    'save.promptNamePlaceholder': { en: 'Enter a descriptive name…', uk: 'Введіть зрозумілу назву…', es: 'Ingrese un nombre descriptivo…' },
    'save.domain':          { en: 'Domain', uk: 'Домен', es: 'Dominio' },
    'save.btn.save':        { en: 'Save', uk: 'Зберегти', es: 'Guardar' },
    'save.btn.cancel':      { en: 'Cancel', uk: 'Скасувати', es: 'Cancelar' },
    'save.btn.saving':      { en: '…Saving', uk: '…Збереження', es: '…Guardando' },
    'save.btn.saveToAccount': { en: '💾 Save to Account', uk: '💾 Зберегти в акаунт', es: '💾 Guardar en la cuenta' },
    'save.ok':               { en: '✓ Saved to your account!', uk: '✓ Збережено в акаунт!', es: '✓ ¡Guardado en su cuenta!' },
    'save.failed':           { en: 'Save failed: {error}', uk: 'Помилка збереження: {error}', es: 'Error al guardar: {error}' },
    'db.title':             { en: 'My Account', uk: 'Мій акаунт', es: 'Mi cuenta' },
    'db.tab.library':       { en: 'Prompt Library', uk: 'Бібліотека промтів', es: 'Biblioteca de prompts' },
    'db.tab.stats':         { en: 'Statistics', uk: 'Статистика', es: 'Estadísticas' },
    'db.tab.schedule':      { en: '⏱ Scheduler', uk: '⏱ Планувальник', es: '⏱ Programador' },
    'lib.search.placeholder': { en: 'Search prompts…', uk: 'Пошук промтів…', es: 'Buscar prompts…' },
    'lib.loading':           { en: 'Loading…', uk: 'Завантаження…', es: 'Cargando…' },
    'lib.refresh.title':    { en: 'Refresh', uk: 'Оновити список', es: 'Actualizar' },
    'lib.refreshed':        { en: '✓ List refreshed', uk: '✓ Список оновлено', es: '✓ Lista actualizada' },
    'lib.allDomains':       { en: 'All Domains', uk: 'Усі домени', es: 'Todos los dominios' },
    'lib.empty':            { en: 'No prompts found{q}.', uk: 'Промтів не знайдено{q}.', es: 'No se encontraron prompts{q}.' },
    'lib.copyPrompt':       { en: '📋 Copy Prompt', uk: '📋 Копіювати промт', es: '📋 Copiar prompt' },
    'lib.copySource':       { en: '📝 Copy Source', uk: '📝 Копіювати джерело', es: '📝 Copiar fuente' },
    'lib.load':             { en: '↗ Load', uk: '↗ Завантажити', es: '↗ Cargar' },
    'lib.delete':           { en: '🗑 Delete', uk: '🗑 Видалити', es: '🗑 Eliminar' },
    'lib.words':            { en: 'words', uk: 'слів', es: 'palabras' },
    'lib.tokens':           { en: 'tokens', uk: 'токенів', es: 'tokens' },
    'lib.copyPromptOk':     { en: '✓ Prompt copied to clipboard', uk: '✓ Промт скопійовано в буфер обміну', es: '✓ Prompt copiado al portapapeles' },
    'lib.copyFailed':       { en: 'Copy failed', uk: 'Не вдалося скопіювати', es: 'Error al copiar' },
    'lib.copySourceOk':     { en: '✓ Source text copied to clipboard', uk: '✓ Вихідний текст скопійовано в буфер обміну', es: '✓ Texto fuente copiado al portapapeles' },
    'lib.noSourceText':     { en: 'This prompt has no saved source text', uk: 'У цього промту немає збереженого вихідного тексту', es: 'Este prompt no tiene texto fuente guardado' },
    'lib.loadOk':           { en: '✓ Source text loaded', uk: '✓ Вихідний текст завантажено', es: '✓ Texto fuente cargado' },
    'lib.loadFailed':       { en: 'Load failed', uk: 'Не вдалося завантажити', es: 'Error al cargar' },
    'lib.deleteTitle':      { en: 'Delete prompt?', uk: 'Видалити промт?', es: '¿Eliminar prompt?' },
    'lib.deleteBody':       { en: 'This action cannot be undone.', uk: 'Цю дію не можна скасувати.', es: 'Esta acción no se puede deshacer.' },
    'lib.deleteBtn':        { en: 'Delete', uk: 'Видалити', es: 'Eliminar' },
    'lib.cancelBtn':        { en: 'Cancel', uk: 'Скасувати', es: 'Cancelar' },
    'lib.deletedOk':        { en: '✓ Prompt deleted', uk: '✓ Промт видалено', es: '✓ Prompt eliminado' },
    'stats.totalPrompts':   { en: 'Total Prompts', uk: 'Усього промтів', es: 'Total de prompts' },
    'stats.totalTokens':    { en: 'Total Tokens', uk: 'Усього токенів', es: 'Total de tokens' },
    'stats.avgTokens':      { en: 'Avg Tokens', uk: 'Сер. токенів', es: 'Tokens promedio' },
    'stats.domainsUsed':    { en: 'Domains Used', uk: 'Використано доменів', es: 'Dominios usados' },
    'stats.byDomain':       { en: 'Prompts by Domain', uk: 'Промти за доменом', es: 'Prompts por dominio' },
    'stats.noPrompts':      { en: 'No prompts saved yet.', uk: 'Ще немає збережених промтів.', es: 'Aún no hay prompts guardados.' },
    'stats.activity30':     { en: 'Activity \u2014 Last 30 Days', uk: 'Активність за останні 30 днів', es: 'Actividad \u2014 últimos 30 días' },
    'sched.untitled':        { en: 'Untitled', uk: 'Без назви', es: 'Sin título' },
    'sched.next':             { en: 'Next', uk: 'Наступний', es: 'Próximo' },
    'sched.status':           { en: 'Status', uk: 'Статус', es: 'Estado' },
    'sched.runs':             { en: 'Runs', uk: 'Виконань', es: 'Ejecuciones' },
    'sched.results':          { en: '📋 Results', uk: '📋 Результати', es: '📋 Resultados' },
    'sched.cancel':           { en: '✕ Cancel', uk: '✕ Скасувати', es: '✕ Cancelar' },
    'sched.delete':           { en: '🗑 Delete', uk: '🗑 Видалити', es: '🗑 Eliminar' },
    'sched.noJobs':           { en: 'No scheduled jobs yet.', uk: 'Ще немає запланованих задач.', es: 'Aún no hay tareas programadas.' },
    'sched.createTitle':      { en: 'Create Scheduled Job', uk: 'Створити заплановану задачу', es: 'Crear tarea programada' },
    'sched.promptToExecute':  { en: 'Prompt to execute', uk: 'Промт для виконання', es: 'Prompt a ejecutar' },
    'sched.selectPrompt':     { en: 'Select a saved prompt…', uk: 'Оберіть збережений промт…', es: 'Seleccione un prompt guardado…' },
    'sched.targetAi':         { en: 'Target AI', uk: 'Цільовий AI', es: 'IA objetivo' },
    'sched.scheduleType':     { en: 'Schedule type', uk: 'Тип розкладу', es: 'Tipo de programación' },
    'sched.type.once':        { en: 'Once', uk: 'Один раз', es: 'Una vez' },
    'sched.type.weekly':      { en: 'Weekly', uk: 'Щотижня', es: 'Semanal' },
    'sched.type.monthly':     { en: 'Monthly', uk: 'Щомісяця', es: 'Mensual' },
    'sched.firstRun':         { en: 'First run date/time', uk: 'Дата/час першого запуску', es: 'Fecha/hora de la primera ejecución' },
    'sched.maxTokens':        { en: 'Max Tokens', uk: 'Макс. токенів', es: 'Tokens máximos' },
    'sched.default':          { en: '(default: {n})', uk: '(за замовчуванням: {n})', es: '(predeterminado: {n})' },
    'sched.scheduleJobBtn':   { en: 'Schedule Job', uk: 'Запланувати задачу', es: 'Programar tarea' },
    'sched.scheduledJobs':    { en: 'Scheduled Jobs', uk: 'Заплановані задачі', es: 'Tareas programadas' },
    'sched.selectPromptFirst': { en: 'Select a prompt first.', uk: 'Спочатку оберіть промт.', es: 'Primero seleccione un prompt.' },
    'sched.setDateTime':      { en: 'Set a date and time.', uk: 'Встановіть дату й час.', es: 'Establezca una fecha y hora.' },
    'sched.scheduledOk':      { en: '✓ Job scheduled', uk: '✓ Задачу заплановано', es: '✓ Tarea programada' },
    'sched.noResultsYet':     { en: 'No results yet', uk: 'Результатів ще немає', es: 'Aún no hay resultados' },
    'sched.jobResults':       { en: '📋 Job Results ({n})', uk: '📋 Результати задачі ({n})', es: '📋 Resultados de la tarea ({n})' },
    'sched.copy':             { en: '📋 Copy', uk: '📋 Копіювати', es: '📋 Copiar' },
    'sched.downloadMd':       { en: 'Download as Markdown', uk: 'Завантажити як Markdown', es: 'Descargar como Markdown' },
    'sched.downloadTxt':      { en: 'Download as plain text', uk: 'Завантажити як звичайний текст', es: 'Descargar como texto plano' },
    'sched.downloadDocx':     { en: 'Download as Word document', uk: 'Завантажити як документ Word', es: 'Descargar como documento Word' },
    'sched.noContent':        { en: '(no content)', uk: '(немає вмісту)', es: '(sin contenido)' },
    'sched.resultCopiedOk':   { en: '✓ Result copied to clipboard', uk: '✓ Результат скопійовано в буфер обміну', es: '✓ Resultado copiado al portapapeles' },
    'sched.fileDownloadedOk': { en: '✓ File downloaded', uk: '✓ Файл завантажено', es: '✓ Archivo descargado' },
    'sched.docxFailed':       { en: '✗ Failed to create .docx: {error}', uk: '✗ Помилка створення .docx: {error}', es: '✗ Error al crear .docx: {error}' },
    'sched.deleteJobTitle':   { en: 'Delete this job completely?', uk: 'Видалити задачу повністю?', es: '¿Eliminar esta tarea por completo?' },
    'sched.deleteJobBody':    { en: 'This also removes all of its run results.', uk: 'Разом з усіма результатами виконання.', es: 'Esto también elimina todos sus resultados de ejecución.' },
    'sched.deleteJobYes':     { en: 'Delete', uk: 'Видалити', es: 'Eliminar' },
    'sched.deleteJobNo':      { en: 'No', uk: 'Ні', es: 'No' },
    'sched.deletedOk':        { en: '✓ Job deleted', uk: '✓ Задачу видалено', es: '✓ Tarea eliminada' },
    'sched.refresh.title':    { en: 'Refresh job list', uk: 'Оновити список задач', es: 'Actualizar lista de tareas' },
    'sched.deleteCompleted.title':       { en: 'Delete all completed jobs', uk: 'Видалити всі завершені задачі', es: 'Eliminar todas las tareas completadas' },
    'sched.deleteCompleted.btn':         { en: 'Delete completed', uk: 'Видалити завершені', es: 'Eliminar completadas' },
    'sched.deleteCompleted.confirmTitle':{ en: 'Delete all completed jobs?', uk: 'Видалити всі завершені задачі?', es: '¿Eliminar todas las tareas completadas?' },
    'sched.deleteCompleted.confirmBody': { en: 'This will permanently delete {n} completed job(s) and all their results. Active and pending jobs are NOT affected.', uk: 'Буде назавжди видалено {n} завершену(-их) задачу(-і) разом з усіма результатами. Активні та задачі в очікуванні НЕ видаляються.', es: 'Se eliminarán permanentemente {n} tarea(s) completada(s) y todos sus resultados. Las tareas activas y pendientes NO se ven afectadas.' },
    'sched.deleteCompleted.confirmYes':  { en: 'Delete all', uk: 'Видалити всі', es: 'Eliminar todas' },
    'sched.deleteCompleted.doneToast':   { en: '✓ {n} job(s) deleted', uk: '✓ Видалено {n} задачу(-і)', es: '✓ {n} tarea(s) eliminada(s)' },
    'sched.cancelTitle':      { en: 'Cancel this job?', uk: 'Скасувати задачу?', es: '¿Cancelar esta tarea?' },
    'sched.cancelYes':        { en: 'Cancel Job', uk: 'Скасувати', es: 'Cancelar tarea' },
    'sched.cancelNo':         { en: 'No', uk: 'Ні', es: 'No' },
    'sched.canceledOk':       { en: '✓ Job canceled', uk: '✓ Задачу скасовано', es: '✓ Tarea cancelada' },
    'miniAdmin.title':       { en: '🛡 Admin Panel', uk: '🛡 Адмін-панель', es: '🛡 Panel de administración' },
    'miniAdmin.totalUsers':  { en: 'Total Users', uk: 'Усього користувачів', es: 'Total de usuarios' },
    'miniAdmin.activeUsers': { en: 'Active Users', uk: 'Активні користувачі', es: 'Usuarios activos' },
    'miniAdmin.totalPrompts':{ en: 'Total Prompts', uk: 'Усього промтів', es: 'Total de prompts' },
    'miniAdmin.pendingJobs': { en: 'Pending Jobs', uk: 'Задачі в очікуванні', es: 'Tareas pendientes' },
    'miniAdmin.users':       { en: 'Users', uk: 'Користувачі', es: 'Usuarios' },
    'miniAdmin.col.email':   { en: 'Email', uk: 'Email', es: 'Correo' },
    'miniAdmin.col.role':    { en: 'Role', uk: 'Роль', es: 'Rol' },
    'miniAdmin.col.prompts': { en: 'Prompts', uk: 'Промти', es: 'Prompts' },
    'miniAdmin.col.logins':  { en: 'Logins', uk: 'Входи', es: 'Inicios de sesión' },
    'miniAdmin.col.lastLogin': { en: 'Last Login', uk: 'Останній вхід', es: 'Último inicio de sesión' },
    'miniAdmin.col.active':  { en: 'Active', uk: 'Активний', es: 'Activo' },

  };

  /* ── Language detection / state ─────────────────────────────── */
  function _detectBrowserLang() {
    var saved = localStorage.getItem('admin_ui_lang') || localStorage.getItem('ui_lang');
    if (saved === 'en' || saved === 'uk' || saved === 'es') return saved;
    var nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    if (nav.startsWith('uk')) return 'uk';
    if (nav.startsWith('es')) return 'es';
    return 'en';
  }

  var _lang = _detectBrowserLang();

  /** t(key, vars) — translate a key to the current language, with optional {placeholder} substitution */
  function t(key, vars) {
    var entry = TRANSLATIONS[key];
    var str = entry ? (entry[_lang] || entry.en || key) : key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        str = str.split('{' + k + '}').join(vars[k]);
      });
    }
    return str;
  }

  function getLang() { return _lang; }

  function setLang(code) {
    if (code !== 'en' && code !== 'uk' && code !== 'es') return;
    _lang = code;
    localStorage.setItem('admin_ui_lang', code);
    document.documentElement.lang = code;
    _applyAll();
    _updateLangButtons();
    if (typeof window.onAdminLangChange === 'function') window.onAdminLangChange(code);
  }

  function _applyAll() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.title = t(el.getAttribute('data-i18n-title'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
  }

  function _updateLangButtons() {
    document.querySelectorAll('.admin-lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.lang === _lang);
    });
  }

  /* ── Admin Help modal (iframe with its own EN/UK/ES content) ──── */
  function _closeHelpModal() {
    var m = document.getElementById('adminHelpModal');
    if (m) m.remove();
  }

  function openHelpModal() {
    _closeHelpModal();
    var overlay = document.createElement('div');
    overlay.id = 'adminHelpModal';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9000',
      'background:rgba(6,17,31,0.82)', 'backdrop-filter:blur(8px)',
      'display:flex', 'align-items:center', 'justify-content:center'
    ].join(';');

    var box = document.createElement('div');
    box.style.cssText = [
      'width:min(92vw,1100px)', 'max-width:1100px', 'max-height:92vh',
      'background:var(--bg-card,#132f4c)', 'border:1px solid rgba(79,195,247,0.3)',
      'border-radius:18px', 'overflow:hidden', 'display:flex', 'flex-direction:column',
      'box-shadow:0 24px 64px rgba(0,0,0,0.5)'
    ].join(';');

    var header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:16px 22px;border-bottom:1px solid rgba(79,195,247,0.15);';
    header.innerHTML =
      '<span style="font-size:16px;font-weight:700;color:var(--accent,#4fc3f7);">' + t('help.title') + '</span>' +
      '<button id="adminHelpClose" style="background:none;border:none;color:var(--text-secondary,#90a4ae);font-size:22px;cursor:pointer;line-height:1;" aria-label="close">&times;</button>';

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow:hidden;display:flex;';

    var iframe = document.createElement('iframe');
    iframe.id = 'adminHelpIframe';
    iframe.src = 'admin_help.html?lang=' + _lang;
    iframe.title = 'JS PROMPT Admin Help';
    iframe.setAttribute('loading', 'lazy');
    iframe.style.cssText = 'width:100%;height:80vh;border:none;display:block;';

    body.appendChild(iframe);
    box.appendChild(header);
    box.appendChild(body);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    iframe.addEventListener('load', function () {
      try { iframe.contentWindow.postMessage({ type: 'setLang', lang: _lang }, '*'); } catch (e) {}
    });

    header.querySelector('#adminHelpClose').addEventListener('click', _closeHelpModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) _closeHelpModal(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { _closeHelpModal(); document.removeEventListener('keydown', esc); }
    });
  }

  function init() {
    document.documentElement.lang = _lang;
    document.querySelectorAll('.admin-lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { setLang(btn.dataset.lang); });
    });
    var helpBtn = document.getElementById('navHelp');
    if (helpBtn) helpBtn.addEventListener('click', openHelpModal);
    _applyAll();
    _updateLangButtons();
  }

  window.AdminLang = { t: t, getLang: getLang, setLang: setLang, init: init, openHelp: openHelpModal };

  document.addEventListener('DOMContentLoaded', init);

})();