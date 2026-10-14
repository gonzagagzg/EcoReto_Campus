const DASHBOARD_URL = '/gg/admin/dashboard';
const STATS_URL = '/gg/admin/estadisticas';
const SESSION_URL = '/gg/admin/session';
const LOGS_USUARIOS_URL = '/gg/admin/logs-usuarios';
const VACIAR_LOGS_URL = '/gg/admin/logs/vaciar';
const STREAM_URL = '/gg/admin/stream';
const KEY_TOKEN = 'ecoreto_admin_token';

let eventSource = null;
let lastLogs = [];
let charts = {};

// Filtros de la consola: tipo (nivel) y tema específico (contexto).
const NIVELES = ['log', 'warn', 'error', 'debug', 'verbose', 'fatal'];
let filtroNivel = 'todos';
let filtroTema = 'todos';
const conteoNivel = { todos: 0, log: 0, warn: 0, error: 0, debug: 0, verbose: 0, fatal: 0 };
const conteoTema = {}; // contexto -> cantidad

function redirigirLogin() {
  localStorage.removeItem(KEY_TOKEN);
  location.href = 'login.html';
}

/**
 * Valida el token contra el backend ANTES de renderizar el panel.
 * - 200 -> sesion activa de Administrador: devuelve true y se entra.
 * - 401/403 -> token vencido, revocado o no-admin: limpia y manda al login.
 * - Error de red -> no deja pasar (evita mostrar el panel con sesion dudosa).
 */
async function validarSesion() {
  const token = localStorage.getItem(KEY_TOKEN);
  if (!token) return false;

  try {
    const res = await fetch(SESSION_URL, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401 || res.status === 403) {
      redirigirLogin();
      return false;
    }
    return res.ok;
  } catch {
    // Sin conexion no se puede confirmar la sesion: no se abre el panel.
    return false;
  }
}

function pintarKpis(snapshot) {
  const { conexiones, logs, tablas } = snapshot || {};
  const totalReg = (tablas || []).reduce((a, b) => a + (b.total || 0), 0);
  const kpis = document.getElementById('kpis');
  kpis.innerHTML = '';
  const items = [
    { v: (tablas || []).length, e: 'Tablas detectadas' },
    { v: totalReg, e: 'Total de registros' },
    { v: logs?.total || 0, e: 'Logs en BD' },
    { v: logs?.ultimas24h || 0, e: 'Logs últimas 24h' }
  ];
  for (const i of items) {
    const d = document.createElement('div');
    d.className = 'kpi';
    d.innerHTML = `<div class="kpi__valor">${i.v}</div><div class="kpi__etiqueta">${i.e}</div>`;
    kpis.appendChild(d);
  }
  ponerBadge('badge-api', conexiones?.api);
  ponerBadge('badge-bd', conexiones?.baseDatos);
  ponerBadge('badge-ollama', conexiones?.ollama);
}

function ponerBadge(id, ok) {
  const el = document.getElementById(id);
  if (!el) return;
  if (ok) { el.classList.add('badge--ok'); el.classList.remove('badge--bad'); }
  else { el.classList.add('badge--bad'); el.classList.remove('badge--ok'); }
}

// Plugin que dibuja el valor de cada dato dentro de su sector (pastel/dona).
// Solo actua en graficos circulares; en barras o lineas no hace nada.
const pluginValoresEnSector = {
  id: 'valoresEnSector',
  afterDatasetsDraw(chart) {
    const tipo = chart.config.type;
    if (tipo !== 'pie' && tipo !== 'doughnut') return;
    const ds = chart.data.datasets[0];
    if (!ds || !ds.data.length) return;
    const meta = chart.getDatasetMeta(0);
    if (meta.hidden) return;

    const ctx = chart.ctx;
    const total = ds.data.reduce((a, b) => a + (Number(b) || 0), 0);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';

    for (let i = 0; i < meta.data.length; i++) {
      const arco = meta.data[i];
      const valor = Number(ds.data[i]) || 0;
      if (valor <= 0) continue;
      // En donas muy finas o sectores tiny, no satura.
      const angulo = (arco.startAngle + arco.endAngle) / 2;
      const radio = (arco.innerRadius + arco.outerRadius) / 2;
      const x = arco.x + Math.cos(angulo) * radio;
      const y = arco.y + Math.sin(angulo) * radio;
      const pct = total ? Math.round((valor / total) * 100) : 0;
      // Fondo sutil detras del texto para que se lea sobre cualquier color.
      ctx.fillStyle = 'rgba(10, 15, 23, 0.72)';
      ctx.strokeStyle = 'rgba(10, 15, 23, 0.72)';
      ctx.lineWidth = 3;
      ctx.strokeText(String(valor), x, y);
      ctx.fillStyle = '#fff';
      ctx.fillText(String(valor), x, y);
      if (pct > 0) {
        ctx.font = '500 9px "Segoe UI", system-ui, sans-serif';
        ctx.strokeText(`${pct}%`, x, y + 12);
        ctx.fillText(`${pct}%`, x, y + 12);
        ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
      }
    }
    ctx.restore();
  }
};

Chart.register(pluginValoresEnSector);

function crearGraficas() {
  const c = getComputedStyle(document.body);
  const txt = c.getPropertyValue('--muted').trim();
  const rej = c.getPropertyValue('--grid').trim();
  // Paleta neón del panel: cian, verde, magenta, ámbar, carmesí, índigo.
  const pastel = ['#00f0ff', '#00ff66', '#d900ff', '#ffb800', '#ff0033', '#7c8cff'];
  // Ejes y rejilla con el mismo tono terminal.
  const ejesComunes = {
    y: { ticks: { color: txt, precision: 0 }, grid: { color: rej }, beginAtZero: true },
    x: { ticks: { color: txt }, grid: { color: rej } }
  };

  charts.tablas = new Chart(document.getElementById('chart-tablas'), {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Registros', data: [], backgroundColor: pastel[0], borderColor: pastel[0], borderWidth: 1 }] },
    options: { responsive: true, maintainAspectRatio: false, scales: ejesComunes, plugins: { legend: { labels: { color: txt } } } }
  });
  charts.logsTiempo = new Chart(document.getElementById('chart-logs-tiempo'), {
    type: 'line',
    data: { labels: [], datasets: [
      { label: 'log', data: [], borderColor: '#00f0ff', tension: 0.25, fill: false },
      { label: 'warn', data: [], borderColor: '#ffb800', tension: 0.25, fill: false },
      { label: 'error', data: [], borderColor: '#ff0033', tension: 0.25, fill: false },
      { label: 'debug', data: [], borderColor: '#d900ff', tension: 0.25, fill: false },
      { label: 'verbose', data: [], borderColor: '#00ff66', tension: 0.25, fill: false },
      { label: 'fatal', data: [], borderColor: '#ffffff', tension: 0.25, fill: false }
    ] },
    options: { responsive: true, maintainAspectRatio: false, scales: ejesComunes, plugins: { legend: { labels: { color: txt } } } }
  });

  // ---- Estadísticas de negocio (datos reales de la BD) ----
  const opcDona = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: txt }, position: 'bottom' } } };
  const ejesTxt = ejesComunes;

  charts.participacionesDia = new Chart(document.getElementById('chart-participaciones-dia'), {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Participaciones', data: [], borderColor: '#00f0ff', backgroundColor: 'rgba(0,240,255,0.12)', fill: true, tension: 0.3 }] },
    options: { responsive: true, maintainAspectRatio: false, scales: ejesTxt, plugins: { legend: { labels: { color: txt } } } }
  });

  charts.participacionesEstado = new Chart(document.getElementById('chart-participaciones-estado'), {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: pastel, borderColor: '#04060a', borderWidth: 2 }] },
    options: opcDona
  });

  charts.retosCategoria = new Chart(document.getElementById('chart-retos-categoria'), {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Retos', data: [], backgroundColor: '#d900ff', borderColor: '#d900ff', borderWidth: 1 }] },
    options: { ...ejesTxt, indexAxis: 'y', plugins: { legend: { display: false } } }
  });

  charts.retosDificultad = new Chart(document.getElementById('chart-retos-dificultad'), {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: ['#00ff66', '#ffb800', '#ff0033'], borderColor: '#04060a', borderWidth: 2 }] },
    options: opcDona
  });

  charts.soporteEstado = new Chart(document.getElementById('chart-soporte-estado'), {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: pastel, borderColor: '#04060a', borderWidth: 2 }] },
    options: opcDona
  });

  charts.topUsuarios = new Chart(document.getElementById('chart-top-usuarios'), {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Puntos', data: [], backgroundColor: '#ffb800', borderColor: '#ffb800', borderWidth: 1 }] },
    options: { ...ejesTxt, indexAxis: 'y', plugins: { legend: { display: false } } }
  });
}

function pintarTablas(snapshot) {
  let tablas = snapshot?.tablas || [];
  tablas = tablas.filter(t => t.tabla !== 'logs');
  charts.tablas.data.labels = tablas.map(t => t.tabla);
  charts.tablas.data.datasets[0].data = tablas.map(t => t.total);
  charts.tablas.update();
  const tbody = document.querySelector('#tabla-totales tbody');
  tbody.innerHTML = '';
  for (const t of tablas) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${t.tabla}</td><td class="right">${t.total.toLocaleString('es-ES')}</td>`;
    tbody.appendChild(tr);
  }
}

function escapeHtml(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pintarLogs(nuevos) {
  if (!nuevos || !nuevos.length) return;
  const logConsole = document.getElementById('log-console');
  const logCount = document.getElementById('log-count');
  for (const l of nuevos) {
    if (lastLogs.find(x => x.idLog === l.idLog)) continue;
    lastLogs.push(l);
    registrarConteo(l);
    if (pasaFiltros(l)) {
      logConsole.prepend(construirLinea(l));
      while (logConsole.children.length > 500) logConsole.removeChild(logConsole.lastChild);
    }
  }
  repintarConteos();
  logCount.textContent = `${lastLogs.length} líneas`;
}

// Cuenta cada log por tipo (nivel) y por tema (contexto) para las pestañas.
function registrarConteo(l) {
  const nivel = (l.nivel || 'log').toLowerCase();
  if (conteoNivel[nivel] !== undefined) conteoNivel[nivel]++;
  conteoNivel.todos++;
  const tema = l.contexto || 'general';
  conteoTema[tema] = (conteoTema[tema] || 0) + 1;
}

// true si el log pasa los filtros activos de tipo y tema.
function pasaFiltros(l) {
  const nivel = (l.nivel || 'log').toLowerCase();
  if (filtroNivel !== 'todos' && nivel !== filtroNivel) return false;
  if (filtroTema !== 'todos') {
    const tema = l.contexto || 'general';
    if (tema !== filtroTema) return false;
  }
  return true;
}

// Construye el elemento visual de una linea de log con toda su info.
function construirLinea(l) {
  const nivel = (l.nivel || 'log').toLowerCase();
  const hora = l.fecha ? new Date(l.fecha).toLocaleTimeString('es-ES') : '';
  const badgeNivel = `<span class="nivel nivel--${nivel}">${escapeHtml(nivel)}</span>`;
  const contexto = l.contexto ? `<span class="tema">${escapeHtml(l.contexto)}</span>` : '';
  const ip = l.ip ? `<span class="line__ip">${escapeHtml(l.ip)}</span>` : '';
  const metodoRuta = l.metodo && l.ruta ? `<span class="line__ruta">${escapeHtml(l.metodo)} ${escapeHtml(l.ruta)}</span>` : '';
  const usuario = l.idUsuario !== null && l.idUsuario !== undefined ? `<span class="line__usuario">usr#${escapeHtml(l.idUsuario)}</span>` : '';
  const d = document.createElement('div');
  d.className = `line line--${nivel}`;
  d.innerHTML =
    `<span class="line__hora">${hora}</span>` +
    badgeNivel +
    contexto +
    ip +
    metodoRuta +
    usuario +
    ` <span class="line__msg">${escapeHtml(l.mensaje)}</span>`;
  return d;
}

// Actualiza los contadores de las pestañas y el desplegable de temas.
function repintarConteos() {
  document.querySelectorAll('.log-tab').forEach(tab => {
    const n = tab.dataset.nivel;
    const c = tab.querySelector('.log-tab__count');
    if (c) c.textContent = conteoNivel[n] || 0;
  });
  const sel = document.getElementById('log-tema');
  if (!sel) return;
  const actual = filtroTema;
  sel.innerHTML = '<option value="todos">Todos los temas</option>';
  const temas = Object.keys(conteoTema).sort((a, b) => conteoTema[b] - conteoTema[a]);
  for (const t of temas) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = `${t} (${conteoTema[t]})`;
    sel.appendChild(opt);
  }
  sel.value = actual;
}

// Crea las pestañas de filtro por tipo (nivel).
function crearTabs() {
  const cont = document.getElementById('log-tabs');
  if (!cont) return;
  cont.innerHTML = '';
  for (const n of ['todos', ...NIVELES]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'log-tab' + (n === filtroNivel ? ' log-tab--activo' : '');
    btn.dataset.nivel = n;
    btn.innerHTML = `${n === 'todos' ? 'Todos' : escapeHtml(n)} <span class="log-tab__count">${conteoNivel[n] || 0}</span>`;
    btn.addEventListener('click', () => {
      filtroNivel = n;
      cont.querySelectorAll('.log-tab').forEach(t => t.classList.remove('log-tab--activo'));
      btn.classList.add('log-tab--activo');
      aplicarFiltros();
    });
    cont.appendChild(btn);
  }
}

// Repinta la consola completa segun los filtros activos (los mas recientes arriba).
function aplicarFiltros() {
  const logConsole = document.getElementById('log-console');
  if (!logConsole) return;
  logConsole.innerHTML = '';
  const visibles = lastLogs.filter(pasaFiltros).slice(-500);
  for (let i = visibles.length - 1; i >= 0; i--) {
    logConsole.appendChild(construirLinea(visibles[i]));
  }
}

function agruparLogsPorHora(logs) {
  const horas = Array(24).fill().map(() => ({ log: 0, warn: 0, error: 0, debug: 0, verbose: 0, fatal: 0 }));
  for (const l of logs || []) {
    const fecha = new Date(l.fecha);
    if (isNaN(fecha.getTime())) continue;
    const h = fecha.getHours();
    const n = (l.nivel || 'log').toLowerCase();
    if (h >= 0 && h < 24 && n in horas[h]) horas[h][n]++;
  }
  const labels = horas.map((_, i) => String(i).padStart(2, '0') + ':00');
  return {
    labels,
    log: horas.map(x => x.log),
    warn: horas.map(x => x.warn),
    error: horas.map(x => x.error),
    debug: horas.map(x => x.debug),
    verbose: horas.map(x => x.verbose),
    fatal: horas.map(x => x.fatal)
  };
}

async function cargarSnapshot(token) {
  try {
    const res = await fetch(DASHBOARD_URL, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401 || res.status === 403) return redirigirLogin();
    const json = await res.json().catch(() => ({}));
    const payload = json?.data ?? json;
    pintarKpis(payload);
    pintarTablas(payload);
    // logs por tiempo: usar los nuevos logs + últimos? pero solo tenemos snapshot
    if (charts.logsTiempo) {
      const ag = agruparLogsPorHora(lastLogs);
      charts.logsTiempo.data.labels = ag.labels;
      charts.logsTiempo.data.datasets[0].data = ag.log;
      charts.logsTiempo.data.datasets[1].data = ag.warn;
      charts.logsTiempo.data.datasets[2].data = ag.error;
      charts.logsTiempo.data.datasets[3].data = ag.debug;
      charts.logsTiempo.data.datasets[4].data = ag.verbose;
      charts.logsTiempo.data.datasets[5].data = ag.fatal;
      charts.logsTiempo.update();
    }
  } catch { }
}

// Asigna etiquetas y datos a una grafica de una sola serie y la refresca.
function ponerSerie(chart, datos, campoEtiqueta, campoTotal) {
  if (!chart) return;
  chart.data.labels = (datos || []).map(x => x[campoEtiqueta]);
  chart.data.datasets[0].data = (datos || []).map(x => x[campoTotal]);
  chart.update();
}

// Descarga las estadisticas de negocio y pinta las graficas correspondientes.
async function cargarEstadisticas(token) {
  try {
    const res = await fetch(STATS_URL, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401 || res.status === 403) return redirigirLogin();
    const json = await res.json().catch(() => ({}));
    const s = json?.data ?? json;
    ponerSerie(charts.participacionesDia, s.participacionesPorDia, 'etiqueta', 'total');
    ponerSerie(charts.participacionesEstado, s.participacionesPorEstado, 'etiqueta', 'total');
    ponerSerie(charts.retosCategoria, s.retosPorCategoria, 'etiqueta', 'total');
    ponerSerie(charts.retosDificultad, s.retosPorDificultad, 'etiqueta', 'total');
    ponerSerie(charts.soporteEstado, s.soportePorEstado, 'etiqueta', 'total');
    ponerSerie(charts.topUsuarios, s.topUsuarios, 'etiqueta', 'total');
  } catch { }
}

function iniciarSse(token) {
  if (eventSource) eventSource.close();
  eventSource = new EventSource(`${STREAM_URL}?token=${encodeURIComponent(token)}`);
  eventSource.addEventListener('message', e => {
    try {
      const data = JSON.parse(e.data);
      if (data.logs) {
        pintarLogs(data.logs);
        if (charts.logsTiempo) {
          const ag = agruparLogsPorHora(lastLogs);
          charts.logsTiempo.data.labels = ag.labels;
          charts.logsTiempo.data.datasets[0].data = ag.log;
          charts.logsTiempo.data.datasets[1].data = ag.warn;
          charts.logsTiempo.data.datasets[2].data = ag.error;
          charts.logsTiempo.data.datasets[3].data = ag.debug;
          charts.logsTiempo.data.datasets[4].data = ag.verbose;
          charts.logsTiempo.data.datasets[5].data = ag.fatal;
          charts.logsTiempo.update();
        }
      }
      if (data.conexiones) { ponerBadge('badge-api', data.conexiones.api); ponerBadge('badge-bd', data.conexiones.baseDatos); ponerBadge('badge-ollama', data.conexiones.ollama); }
      // "Logs por usuario" en vivo: llega sin filtro y el panel lo filtra aqui.
      if (Array.isArray(data.logsUsuarios)) {
        logsEnVivo = data.logsUsuarios;
        pintarLogsUsuarioVivo();
      }
      if (data.tablas && data.resumenLogs) {
        const payload = { conexiones: data.conexiones, tablas: data.tablas, logs: data.resumenLogs };
        pintarKpis(payload); pintarTablas(payload);
      }
    } catch (err) {
      console.error('Error procesando mensaje SSE:', err);
    }
  });
}

// ---- Consola "Logs por usuario": traduce cada petición a una acción de la app ----

// Reglas metodo + ruta (ya sin /gg y con :id en los números) -> acción legible.
const REGLAS_ACCION = {
  'POST /auth/login': { verbo: 'Inició sesión', resto: 'en la app' },
  'POST /auth/admin/login': { verbo: 'Inició sesión', resto: 'en el panel admin' },
  'POST /auth/registro': { verbo: 'Se registró', resto: 'en la plataforma' },
  'POST /auth/refresh': { verbo: 'Renovó', resto: 'su sesión' },

  'GET /retos': { verbo: 'Consultó', resto: 'el listado de retos' },
  'POST /retos': { verbo: 'Creó', resto: 'un reto' },
  'GET /retos/mis-participaciones': { verbo: 'Vio', resto: 'sus participaciones en retos' },
  'GET /retos/:id': { verbo: 'Abrió', resto: 'el detalle de un reto' },
  'PUT /retos/:id': { verbo: 'Editó', resto: 'un reto' },
  'DELETE /retos/:id': { verbo: 'Eliminó', resto: 'un reto' },
  'POST /retos/:id/participar': { verbo: 'Se unió', resto: 'a un reto' },
  'GET /retos/:id/participantes': { verbo: 'Vio', resto: 'los participantes de un reto' },
  'POST /retos/:id/imagen': { verbo: 'Subió', resto: 'imagen de un reto' },
  'DELETE /retos/:id/imagen': { verbo: 'Quitó', resto: 'la imagen de un reto' },

  'POST /participaciones': { verbo: 'Envió', resto: 'una evidencia para validar' },
  'GET /participaciones/mis-participaciones': { verbo: 'Consultó', resto: 'sus participaciones' },
  'GET /participaciones/mis-participaciones-detalle': { verbo: 'Vio', resto: 'el detalle de sus participaciones' },
  'GET /participaciones/:id': { verbo: 'Abrió', resto: 'una participación' },
  'GET /participaciones/usuario/:id/publicos': { verbo: 'Vio', resto: 'participaciones públicas de un usuario' },
  'GET /participaciones/reto/:id/usuario/:id/aprobadas': { verbo: 'Vio', resto: 'participaciones aprobadas de un reto' },

  'GET /premios': { verbo: 'Consultó', resto: 'el catálogo de premios' },
  'POST /premios/canjear': { verbo: 'Canjeó', resto: 'un premio' },
  'GET /premios/mi-historial': { verbo: 'Vio', resto: 'su historial de canjes' },
  'GET /premios/admin': { verbo: 'Gestionó', resto: 'los premios (admin)' },
  'POST /premios': { verbo: 'Creó', resto: 'un premio' },
  'PUT /premios/:id': { verbo: 'Editó', resto: 'un premio' },
  'DELETE /premios/:id': { verbo: 'Eliminó', resto: 'un premio' },
  'POST /premios/:id/imagen': { verbo: 'Subió', resto: 'imagen de un premio' },
  'DELETE /premios/:id/imagen': { verbo: 'Quitó', resto: 'la imagen de un premio' },

  'GET /soporte/mis-tickets': { verbo: 'Consultó', resto: 'sus tickets de soporte' },
  'POST /soporte': { verbo: 'Abrió', resto: 'un ticket de soporte' },
  'GET /soporte/:id': { verbo: 'Abrió', resto: 'un ticket de soporte' },
  'POST /soporte/:id/responder': { verbo: 'Respondió', resto: 'un ticket de soporte' },

  'GET /usuarios/perfil': { verbo: 'Vio', resto: 'su perfil' },
  'PUT /usuarios/perfil': { verbo: 'Actualizó', resto: 'su perfil' },
  'PUT /usuarios/perfil/foto': { verbo: 'Cambió', resto: 'su foto de perfil' },
  'GET /usuarios/gustos': { verbo: 'Consultó', resto: 'sus gustos' },
  'GET /usuarios/top': { verbo: 'Vio', resto: 'el ranking de usuarios' },
  'GET /usuarios/:id/gustos': { verbo: 'Vio', resto: 'los gustos de un usuario' },
  'PUT /usuarios/:id/gustos': { verbo: 'Actualizó', resto: 'los gustos de un usuario' },
  'GET /usuarios/:id': { verbo: 'Abrió', resto: 'el perfil de un usuario' },
  'PUT /usuarios/:id': { verbo: 'Editó', resto: 'un usuario' },
  'PATCH /usuarios/:id/estado': { verbo: 'Cambió', resto: 'el estado de un usuario' },
  'DELETE /usuarios/:id': { verbo: 'Eliminó', resto: 'un usuario' },

  'GET /ia/estado': { verbo: 'Consultó', resto: 'el estado del asistente IA' },
  'POST /ia/preguntar': { verbo: 'Preguntó', resto: 'al asistente IA' },

  'GET /supervisor/panel': { verbo: 'Abrió', resto: 'el panel de supervisor' },
  'GET /supervisor/retos-pendientes': { verbo: 'Vio', resto: 'retos pendientes de aprobación' },
  'POST /supervisor/retos/:id/decision': { verbo: 'Decidió', resto: 'sobre un reto (aprobar/rechazar)' },
  'GET /supervisor/evidencias': { verbo: 'Vio', resto: 'evidencias por revisar' },
  'POST /supervisor/evidencias/:id/revision': { verbo: 'Revisó', resto: 'una evidencia' },
  'GET /supervisor/usuarios-pendientes': { verbo: 'Vio', resto: 'usuarios pendientes' },

  'GET /admin/resumen': { verbo: 'Vio', resto: 'el resumen de administración' },
  'GET /admin/usuarios': { verbo: 'Consultó', resto: 'la lista de usuarios' },
  'PATCH /admin/usuarios/:id/estado': { verbo: 'Cambió', resto: 'el estado de un usuario' },
  'PATCH /admin/usuarios/:id/rol': { verbo: 'Cambió', resto: 'el rol de un usuario' },
  'POST /admin/usuarios/:id/activar': { verbo: 'Activó', resto: 'una cuenta' },
  'PATCH /admin/usuarios/:id': { verbo: 'Editó', resto: 'un usuario (admin)' },
  'DELETE /admin/usuarios/:id': { verbo: 'Eliminó', resto: 'un usuario (admin)' },
  'GET /admin/canjes': { verbo: 'Gestionó', resto: 'los canjes de premios' },
  'PATCH /admin/canjes/:id/estado': { verbo: 'Cambió', resto: 'el estado de un canje' },
  'GET /admin/dashboard': { verbo: 'Abrió', resto: 'el panel de administración' },
  'GET /admin/estadisticas': { verbo: 'Vio', resto: 'las estadísticas del panel' },
  'GET /admin/logs-usuarios': { verbo: 'Consultó', resto: 'los logs por usuario' }
};

// Convierte metodo+ruta de una petición HTTP en una acción legible de la app.
function traducirAccion(metodo, ruta) {
  const m = (metodo || '').toUpperCase();
  let p = (ruta || '').split('?')[0].replace(/\/+$/, '').replace(/^\/gg/, '');
  if (p === '' || p === '/') p = '/';
  const ids = p.match(/\d+/g) || [];
  const canon = p
    .split('/')
    .map(seg => (/^\d+$/.test(seg) || /^[0-9a-f]{24}$/i.test(seg) ? ':id' : seg))
    .join('/');
  const regla = REGLAS_ACCION[`${m} ${canon}`];
  if (regla) return { verbo: regla.verbo, resto: regla.resto, ids };
  const verbos = { GET: 'Consultó', POST: 'Envió', PUT: 'Actualizó', PATCH: 'Actualizó', DELETE: 'Eliminó' };
  return { verbo: verbos[m] || m || 'Hizo', resto: p, ids };
}

// Pinta la lista de acciones por usuario en la consola dedicada.
function pintarLogsUsuarios(items) {
  const cont = document.getElementById('lu-console');
  const cnt = document.getElementById('lu-count');
  if (!cont) return;
  cont.innerHTML = '';
  if (!items || !items.length) {
    cont.innerHTML = terminoBusqueda
      ? '<div class="lu-vacio">Sin acciones registradas para esa búsqueda.</div>'
      : '<div class="lu-vacio">Sin acciones registradas todavía.</div>';
    if (cnt) cnt.textContent = '0 acciones';
    return;
  }
  for (const it of items) {
    const d = document.createElement('div');
    d.className = 'lu-linea';
    const hora = it.fecha
      ? new Date(it.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '';
    const nombre = it.usuario ? `${it.usuario.nombre} ${it.usuario.apellido}`.trim() : 'Desconocido';
    const idUs = it.usuario ? it.usuario.id : '?';
    const correo = it.usuario?.correo || '';
    const usuario = `<span class="lu-usuario" title="${escapeHtml(correo)}">${escapeHtml(nombre)} · #${escapeHtml(String(idUs))}</span>`;

    let accionHtml = '';
    let tecnicoHtml = '';
    let ipHtml = it.ip ? `<span class="lu-ip">${escapeHtml(it.ip)}</span>` : '';
    let statusHtml = '';

    if (it.esAccion) {
      const acc = traducirAccion(it.metodo, it.ruta);
      const idsTxt = acc.ids.length ? ` <span class="lu-ip">#${acc.ids.join(' #')}</span>` : '';
      accionHtml = `<span class="lu-accion"><strong>${escapeHtml(acc.verbo)}</strong> ${escapeHtml(acc.resto)}${idsTxt}</span>`;
      tecnicoHtml = `<span class="lu-ip">${escapeHtml((it.metodo || '') + ' ' + (it.ruta || ''))}</span>`;
      const status = (it.mensaje.match(/->\s*(\d{3})/) || [])[1];
      if (status) {
        const n = Number(status);
        const cls = n >= 500 ? 'lu-status--error' : n >= 400 ? 'lu-status--warn' : 'lu-status--ok';
        statusHtml = `<span class="lu-status ${cls}">${escapeHtml(status)}</span>`;
      }
    } else {
      accionHtml = `<span class="lu-accion">${escapeHtml(it.mensaje || '')}</span>`;
    }

    d.innerHTML = `<span class="lu-hora">${hora}</span>${usuario}${accionHtml}${tecnicoHtml}${ipHtml}${statusHtml}`;
    cont.appendChild(d);
    while (cont.children.length > 300) cont.removeChild(cont.lastChild);
  }
  if (cnt) cnt.textContent = `${items.length} acciones`;
}

// ---- Consola "Logs por usuario": flujo en vivo (SSE) + busqueda en la BD ----

// Maximo de acciones que se pintan en la consola (coincide con el tope que
// manda el backend).
const LIMITE_VISIBLE_LOGS_USUARIO = 300;

// Ultimas acciones con su usuario que manda el backend por SSE (sin filtro).
let logsEnVivo = [];
// Resultado de la ultima busqueda hecha en la base de datos (historial).
let logsBusqueda = [];
// Termino del buscador vigente.
let terminoBusqueda = '';

// Coincide una accion con el buscador: nombre, apellido, alias, correo o id.
function coincideBusqueda(item, termino) {
  if (!termino) return true;
  const u = item.usuario || {};
  const t = termino.toLowerCase();
  return [u.nombre, u.apellido, u.alias, u.correo, u.id].some(
    (campo) =>
      campo !== null && campo !== undefined && String(campo).toLowerCase().includes(t),
  );
}

// Lista a pintar. Sin busqueda solo corre el flujo en vivo; con busqueda se
// unen el historial de la BD y las acciones en vivo que coinciden (sin duplicar).
function listarLogsUsuario() {
  if (!terminoBusqueda) return logsEnVivo;

  const porId = new Map();
  for (const item of logsBusqueda) porId.set(item.idLog, item);
  for (const item of logsEnVivo) {
    if (coincideBusqueda(item, terminoBusqueda)) porId.set(item.idLog, item);
  }

  return [...porId.values()]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, LIMITE_VISIBLE_LOGS_USUARIO);
}

// Vuelve a pintar la consola con lo que hay en memoria (sin pegarle a la BD).
function pintarLogsUsuarioVivo() {
  pintarLogsUsuarios(listarLogsUsuario());
}

// Pide a la BD el historial con el filtro del buscador. El flujo en vivo lo
// sirve el SSE; esto existe para no perder acciones antiguas al buscar.
async function buscarLogsUsuarios(token, buscar) {
  try {
    const cont = document.getElementById('lu-console');
    if (cont && !logsEnVivo.length && !logsBusqueda.length) {
      cont.innerHTML = '<div class="lu-vacio">Cargando…</div>';
    }
    const params = new URLSearchParams({ limite: '500' });
    if (buscar) params.set('buscar', buscar);
    const res = await fetch(`${LOGS_USUARIOS_URL}?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401 || res.status === 403) return redirigirLogin();
    const json = await res.json().catch(() => []);
    logsBusqueda = Array.isArray(json) ? json : (json?.data ?? []);
    pintarLogsUsuarioVivo();
  } catch { }
}

// ---- Vaciar la tabla logs (pide la contraseña del admin para confirmar) ----

function _refrescarTrasVaciar(inpBuscar) {
  const t = localStorage.getItem(KEY_TOKEN);
  if (!t) return;
  terminoBusqueda = (inpBuscar?.value || '').trim();
  logsEnVivo = [];
  logsBusqueda = [];
  buscarLogsUsuarios(t, terminoBusqueda);
  cargarEstadisticas(t);
  cargarSnapshot(t);
}

function configurarVaciarLogs(inpBuscar) {
  const btnVaciar = document.getElementById('lu-vaciar');
  const modal = document.getElementById('lu-modal');
  if (!btnVaciar || !modal) return;

  const pass = document.getElementById('lu-modal-pass');
  const errorEl = document.getElementById('lu-modal-error');
  const btnCancelar = document.getElementById('lu-modal-cancelar');
  const btnConfirmar = document.getElementById('lu-modal-confirmar');
  const estado = document.getElementById('lu-estado');

  const abrir = () => {
    modal.hidden = false;
    if (pass) { pass.value = ''; pass.focus(); }
    if (errorEl) { errorEl.hidden = true; errorEl.textContent = ''; }
  };
  const cerrar = () => { modal.hidden = true; };

  btnVaciar.addEventListener('click', abrir);
  btnCancelar?.addEventListener('click', cerrar);
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) cerrar(); });

  const confirmar = async () => {
    const token = localStorage.getItem(KEY_TOKEN);
    if (!token) return redirigirLogin();
    const contrasena = (pass?.value || '').trim();
    if (contrasena.length < 8) {
      if (errorEl) { errorEl.hidden = false; errorEl.textContent = 'La contraseña debe tener al menos 8 caracteres.'; }
      return;
    }
    if (btnConfirmar) btnConfirmar.disabled = true;
    try {
      const res = await fetch(VACIAR_LOGS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contrasena }),
      });
      if (res.status === 401) {
        // Puede ser token expirado o contraseña incorrecta: distinguimos por el mensaje.
        const json = await res.json().catch(() => ({}));
        const msg = typeof json?.message === 'string' ? json.message : '';
        if (/contrasena/i.test(msg)) {
          if (errorEl) { errorEl.hidden = false; errorEl.textContent = 'Contraseña incorrecta.'; }
          return;
        }
        return redirigirLogin();
      }
      if (res.status === 403) return redirigirLogin();
      const json = await res.json().catch(() => ({}));
      const n = Number(json?.eliminados ?? 0);
      cerrar();
      if (estado) {
        estado.textContent = `Se eliminaron ${n} registro(s).`;
        setTimeout(() => { if (estado) estado.textContent = ''; }, 6000);
      }
      _refrescarTrasVaciar(inpBuscar);
    } catch {
      if (errorEl) { errorEl.hidden = false; errorEl.textContent = 'No se pudo conectar con el servidor.'; }
    } finally {
      if (btnConfirmar) btnConfirmar.disabled = false;
    }
  };

  btnConfirmar?.addEventListener('click', confirmar);
  pass?.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmar(); });
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem(KEY_TOKEN);
  if (!token) return redirigirLogin();

  // Guardia de sesion: no se renderiza el panel salvo que el backend confirme
  // que el token sigue activo y es de un Administrador.
  const sesionValida = await validarSesion();
  if (!sesionValida) return;

  crearGraficas();
  crearTabs();
  cargarSnapshot(token);
  cargarEstadisticas(token);
  // Pinta algo de inmediato mientras no llega el primer ciclo del SSE.
  buscarLogsUsuarios(token, '');
  iniciarSse(token);

  // Buscador: filtra al instante contra lo que hay en memoria y, ademas, pide
  // el historial completo a la BD (con debounce) para no perder acciones viejas.
  const inpBuscar = document.getElementById('lu-buscar');
  let debounceBuscar;
  if (inpBuscar) {
    inpBuscar.addEventListener('input', () => {
      terminoBusqueda = inpBuscar.value.trim();
      pintarLogsUsuarioVivo(); // respuesta inmediata, sin red

      clearTimeout(debounceBuscar);
      debounceBuscar = setTimeout(() => {
        const t = localStorage.getItem(KEY_TOKEN);
        if (t) buscarLogsUsuarios(t, terminoBusqueda);
      }, 250);
    });
  }

  const btnLuRefresh = document.getElementById('lu-actualizar');
  if (btnLuRefresh) {
    btnLuRefresh.addEventListener('click', () => {
      const t = localStorage.getItem(KEY_TOKEN);
      if (t) buscarLogsUsuarios(t, terminoBusqueda);
    });
  }

  configurarVaciarLogs(inpBuscar);

  // Las estadísticas de negocio cambian poco: 30 s. "Logs por usuario" ya
  // viaja en vivo por el SSE; el historial filtrado solo se refresca si hay
  // una busqueda activa.
  const refrescoStats = setInterval(() => {
    const t = localStorage.getItem(KEY_TOKEN);
    if (!t) { clearInterval(refrescoStats); return; }
    cargarEstadisticas(t);
    if (terminoBusqueda) buscarLogsUsuarios(t, terminoBusqueda);
  }, 30000);

  document.getElementById('btn-logout').addEventListener('click', redirigirLogin);

  const selTema = document.getElementById('log-tema');
  if (selTema) {
    selTema.addEventListener('change', () => {
      filtroTema = selTema.value;
      aplicarFiltros();
    });
  }

  document.getElementById('btn-clear-logs').addEventListener('click', () => {
    document.getElementById('log-console').innerHTML = '';
    lastLogs = [];
    filtroNivel = 'todos';
    filtroTema = 'todos';
    for (const n of ['todos', ...NIVELES]) conteoNivel[n] = 0;
    for (const k of Object.keys(conteoTema)) delete conteoTema[k];
    if (selTema) selTema.innerHTML = '<option value="todos">Todos los temas</option>';
    crearTabs();
    document.getElementById('log-count').textContent = '0 líneas';
  });
});
