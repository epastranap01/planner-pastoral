// finance.js - Módulo Financiero v21 (Corrección Categorías + Columna Comulgantes)
console.log("Cargando Módulo Financiero v21...");

// ==========================================
// 1. VARIABLES GLOBALES
// ==========================================
let talonariosIngreso = [], talonariosEgreso = [], categoriasEgresos = [], transacciones = [], miembrosFinanzas = [];
let saldoActual = 0, ingresosMes = 0, egresosMes = 0;
const tiposCultos = ['Culto Dominical', 'Escuela Dominical', 'Culto de Oración', 'Culto de Enseñanza', 'Reunión de Jóvenes', 'Reunión de Damas', 'Vigilia'];

// ==========================================
// 2. ESTILOS SAAS PRO (Inyectados)
// ==========================================
try {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        /* === FINANZAS REDESIGN - Consistent with main panel === */
        :root {
            --fin-primary: #2563eb;
            --fin-primary-dark: #1d4ed8;
            --fin-success: #16a34a;
            --fin-danger: #dc2626;
            --fin-warning: #d97706;
            --fin-surface: #ffffff;
            --fin-bg: #f8fafc;
            --fin-border: #e2e8f0;
            --fin-text: #0f172a;
            --fin-muted: #64748b;
            --fin-radius: 14px;
            --fin-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
        }

        /* Container */
        .fin-container { font-family: 'Inter', 'Poppins', system-ui, sans-serif; color: var(--fin-text); }

        /* Metric Cards - Match saas-card style */
        .fin-card {
            background: var(--fin-surface);
            border-radius: var(--fin-radius);
            box-shadow: var(--fin-shadow);
            border: 1px solid var(--fin-border);
            padding: 1.5rem;
            transition: box-shadow 0.2s ease, transform 0.2s ease;
        }
        .fin-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); transform: translateY(-1px); }

        .fin-metric-icon {
            width: 44px; height: 44px; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.1rem; flex-shrink: 0;
        }
        .fin-metric-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--fin-muted); margin-bottom: 0.35rem; }
        .fin-metric-value { font-size: 1.6rem; font-weight: 800; color: var(--fin-text); letter-spacing: -0.5px; line-height: 1; }
        .fin-metric-sub { font-size: 0.72rem; color: var(--fin-muted); margin-top: 0.4rem; }

        /* Buttons */
        .fin-btn {
            border: none; border-radius: 10px;
            padding: 0.55rem 1.1rem; font-weight: 600;
            font-size: 0.875rem; cursor: pointer;
            display: inline-flex; align-items: center; gap: 6px;
            transition: all 0.18s ease; text-decoration: none;
        }
        .fin-btn-primary { background: var(--fin-primary); color: #fff; box-shadow: 0 2px 8px rgba(37,99,235,0.25); }
        .fin-btn-primary:hover { background: var(--fin-primary-dark); box-shadow: 0 4px 12px rgba(37,99,235,0.35); transform: translateY(-1px); }
        .fin-btn-danger  { background: #fef2f2; color: var(--fin-danger); border: 1.5px solid #fecaca; }
        .fin-btn-danger:hover  { background: #fee2e2; }
        .fin-btn-outline { background: #fff; color: var(--fin-text); border: 1.5px solid var(--fin-border); }
        .fin-btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }
        .fin-btn-warning { background: #fffbeb; color: var(--fin-warning); border: 1.5px solid #fde68a; }
        .fin-btn-warning:hover { background: #fef3c7; }
        .fin-btn-icon {
            width: 34px; height: 34px; border-radius: 8px;
            padding: 0; display: inline-flex; align-items: center;
            justify-content: center; font-size: 0.85rem; flex-shrink: 0;
        }

        /* Table - consistent with usuarios table */
        .fin-table { width: 100%; border-collapse: collapse; }
        .fin-table thead tr { background: #f8fafc; }
        .fin-table th {
            padding: 0.875rem 1rem; font-size: 0.7rem;
            text-transform: uppercase; letter-spacing: 0.06em;
            color: var(--fin-muted); font-weight: 700;
            border-bottom: 1px solid var(--fin-border); border-top: none;
        }
        .fin-table th:first-child { padding-left: 1.5rem; }
        .fin-table th:last-child  { padding-right: 1.5rem; }
        .fin-table td {
            padding: 0.85rem 1rem; font-size: 0.875rem;
            border-bottom: 1px solid var(--fin-border);
            vertical-align: middle; color: var(--fin-text);
        }
        .fin-table td:first-child { padding-left: 1.5rem; }
        .fin-table td:last-child  { padding-right: 1.5rem; }
        .fin-table tbody tr:last-child td { border-bottom: none; }
        .fin-table tbody tr:hover td { background: #f8fafc; }

        /* Badges */
        .fin-badge {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 3px 10px; border-radius: 50px;
            font-size: 0.72rem; font-weight: 700;
        }
        .fin-badge-blue   { background: #eff6ff; color: #1d4ed8; }
        .fin-badge-green  { background: #f0fdf4; color: #15803d; }
        .fin-badge-red    { background: #fef2f2; color: #b91c1c; }
        .fin-badge-gray   { background: #f1f5f9; color: #475569; }
        .fin-badge-yellow { background: #fffbeb; color: #92400e; }
        .fin-badge-purple { background: #f5f3ff; color: #6d28d9; }

        /* Forms */
        .fin-form-group { margin-bottom: 1rem; }
        .fin-label { display: block; font-size: 0.78rem; font-weight: 600; color: var(--fin-muted); margin-bottom: 5px; letter-spacing: 0.02em; text-transform: uppercase; }
        .fin-input {
            width: 100%; background: #f8fafc; border: 1.5px solid var(--fin-border);
            border-radius: 10px; padding: 0.65rem 0.9rem;
            font-size: 0.9rem; color: var(--fin-text);
            transition: all 0.18s ease; font-family: inherit;
        }
        .fin-input:focus { background: #fff; border-color: var(--fin-primary); outline: none; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
        textarea.fin-input { resize: vertical; min-height: 70px; }

        /* Section card for table */
        .fin-section-card {
            background: var(--fin-surface);
            border-radius: var(--fin-radius);
            border: 1px solid var(--fin-border);
            box-shadow: var(--fin-shadow);
            overflow: hidden;
        }
        .fin-section-header {
            padding: 1.1rem 1.5rem;
            border-bottom: 1px solid var(--fin-border);
            display: flex; align-items: center; justify-content: space-between;
        }
        .fin-section-title { font-size: 0.95rem; font-weight: 700; color: var(--fin-text); margin: 0; }

        /* Accent strip on cards */
        .fin-accent-strip { width: 4px; min-width: 4px; border-radius: 99px; flex-shrink: 0; }

        /* Amount colors */
        .fin-amount-pos { color: #16a34a; font-weight: 700; }
        .fin-amount-neg { color: #dc2626; font-weight: 700; }

        /* Talonario cards */
        .fin-tal-card {
            border: 1.5px solid var(--fin-border);
            border-radius: 12px; padding: 1rem 1.1rem;
            background: #fff; display: flex;
            align-items: center; justify-content: space-between;
            gap: 0.75rem; transition: border-color 0.15s;
            margin-bottom: 0.75rem;
        }
        .fin-tal-card.active-tal { border-color: #bfdbfe; background: #eff6ff; }

        /* Responsive */
        @media (max-width: 768px) {
            .fin-metric-value { font-size: 1.3rem; }
            .fin-hide-sm { display: none !important; }
        }

        /* Amount pill */
        .fin-amount-pill {
            display: inline-flex; align-items: center;
            gap: 3px; font-weight: 700; font-size: 0.875rem;
        }

        /* Disabled state */
        .fin-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        /* Backwards compat */
        .btn-saas { border: none; border-radius: 12px; padding: 0.6rem 1.2rem; font-weight: 600; font-size: 0.9rem; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
        .btn-saas-primary { background: #2563eb; color: white; }
        .btn-saas-primary:hover { background: #1d4ed8; }
        .btn-saas-secondary { background: white; border: 1px solid #e2e8f0; color: #0f172a; }
        .btn-saas-secondary:hover { background: #f9fafb; }
        .btn-saas-danger { background: #fee2e2; color: #991b1b; }
        .btn-saas-danger:hover { background: #fecaca; }
        .btn-saas-success { background: #dcfce7; color: #166534; }
        .saas-card { background: #fff; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04); border: 1px solid #e2e8f0; padding: 1.5rem; }
        .form-saas { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 0.65rem 0.9rem; width: 100%; font-size: 0.9rem; transition: all 0.18s; }
        .form-saas:focus { background: white; border-color: #2563eb; outline: none; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
        .input-label { display: block; font-size: 0.78rem; font-weight: 600; color: #64748b; margin-bottom: 5px; }
        .badge-saas { padding: 3px 10px; border-radius: 50px; font-size: 0.72rem; font-weight: 700; display: inline-block; }
        .bg-blue-light { background: #eff6ff; color: #1d4ed8; }
        .bg-green-light { background: #f0fdf4; color: #15803d; }
        .bg-red-light { background: #fef2f2; color: #b91c1c; }
        .bg-gray-light { background: #f1f5f9; color: #475569; }
        .bg-yellow-light { background: #fffbeb; color: #92400e; }
        .metric-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
        .metric-value { font-size: 1.6rem; font-weight: 800; color: #0f172a; }
        .metric-icon-box { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
        .icon-btn { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; color: #64748b; cursor: pointer; transition: all 0.2s; }
        .icon-btn:hover { background: #f1f5f9; color: #0f172a; }
        .text-truncate-200 { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; display: inline-block; vertical-align: bottom; }
        .saas-container { font-family: 'Inter', system-ui, sans-serif; }
        .saas-table { width: 100%; border-collapse: collapse; }
        .saas-table th { text-align: left; padding: 0.875rem 1rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; border-bottom: 1px solid #e2e8f0; font-weight: 700; }
        .saas-table td { padding: 0.85rem 1rem; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; vertical-align: middle; }
        .saas-table tr:hover td { background-color: #f8fafc; }
    `;
    document.head.appendChild(styleSheet);
} catch (e) { console.error(e); }

// ==========================================
// 3. UTILIDADES
// ==========================================
const formatoMoneda = (m) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(m);
const formatoFecha = (f) => { if(!f)return'-'; const d=new Date(f); return new Date(d.getTime()+d.getTimezoneOffset()*60000).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase().replace('.',''); };

async function authFetch(url, opts={}) {
    const t = localStorage.getItem('token');
    if(!t) { window.location.reload(); throw new Error('No token'); }
    const h = {'Content-Type':'application/json','Authorization':t,...opts.headers};
    const r = await fetch(url,{...opts,headers:h});
    if(!r.ok) throw new Error((await r.json()).error || 'Error');
    return r.json();
}

// ==========================================
// 4. CARGA DE DATOS
// ==========================================
async function cargarDashboardFinanzas() {
    const el = document.getElementById('vistaFinanzas');
    if(!el) return;
    el.innerHTML = '<div class="d-flex justify-content-center align-items-center py-5"><div class="spinner-border text-primary"></div></div>';

    try {
        const [dFin, dMiem] = await Promise.all([authFetch('/api/finanzas/datos'), authFetch('/api/miembros')]);
        
        transacciones = dFin.transacciones;
        categoriasEgresos = dFin.categorias;
        miembrosFinanzas = dMiem;

        const todosTal = dFin.talonarios.map(t => ({...t, inicio:t.rango_inicio, fin:t.rango_fin, usados:[]}));
        todosTal.forEach(tal => {
            const tipo = tal.tipo === 'egreso' ? 'egreso' : 'ingreso';
            tal.usados = transacciones.filter(x => x.tipo===tipo && parseInt(x.recibo_no)).map(x=>parseInt(x.recibo_no));
        });
        talonariosIngreso = todosTal.filter(t => t.tipo==='ingreso');
        talonariosEgreso = todosTal.filter(t => t.tipo==='egreso');

        calcularMetricas();
        renderizarVistaPrincipal();
    } catch (e) { el.innerHTML = `<div class="alert alert-danger m-3">Error: ${e.message}</div>`; }
}

function calcularMetricas() {
    saldoActual=0; ingresosMes=0; egresosMes=0;
    const now = new Date();
    transacciones.forEach(t => {
        const m = parseFloat(t.monto);
        const f = new Date(t.fecha);
        if(t.tipo==='ingreso') {
            saldoActual+=m;
            if(f.getMonth()===now.getMonth() && f.getFullYear()===now.getFullYear()) ingresosMes+=m;
        } else {
            saldoActual-=m;
            if(f.getMonth()===now.getMonth() && f.getFullYear()===now.getFullYear()) egresosMes+=m;
        }
    });
}

// ==========================================
// 5. VISTA PRINCIPAL (SAAS DASHBOARD UI)
// ==========================================
function renderizarVistaPrincipal() {
    const container = document.getElementById('vistaFinanzas');

    // Balance ratio for progress bar
    const totalMovimiento = ingresosMes + egresosMes;
    const pctGasto = totalMovimiento > 0 ? Math.round((egresosMes / totalMovimiento) * 100) : 0;
    const pctIngreso = 100 - pctGasto;

    container.innerHTML = `
    <div class="fin-container px-2 px-md-0">

        <!-- HEADER -->
        <div class="d-flex justify-content-between align-items-end mb-4">
            <div>
                <h3 class="fw-bold m-0" style="font-family:'Poppins',sans-serif;color:#0f172a;">Finanzas</h3>
                <p class="text-muted small m-0 mt-1">Control de tesorería y movimientos</p>
            </div>
            <div class="d-flex gap-2 flex-wrap justify-content-end">
                <button onclick="renderConfigFinanzas()" class="fin-btn fin-btn-outline fin-btn-icon" title="Configuración"><i class="bi bi-gear"></i></button>
                <button onclick="renderAperturaCuenta()" class="fin-btn fin-btn-warning" title="Ajuste de saldo"><i class="bi bi-sliders"></i><span class="fin-hide-sm"> Ajuste</span></button>
                <button onclick="renderRegistrarEgreso()" class="fin-btn fin-btn-danger"><i class="bi bi-dash-lg"></i> Gasto</button>
                <button onclick="renderRegistrarIngreso()" class="fin-btn fin-btn-primary"><i class="bi bi-plus-lg"></i> Ingreso</button>
            </div>
        </div>

        <!-- KPI CARDS -->
        <div class="row g-3 mb-4">
            <!-- Saldo -->
            <div class="col-12 col-md-4">
                <div class="fin-card h-100">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="fin-metric-label">Saldo disponible</div>
                            <div class="fin-metric-value" style="color:${saldoActual >= 0 ? '#0f172a' : '#dc2626'}">${formatoMoneda(saldoActual)}</div>
                            <div class="fin-metric-sub"><i class="bi bi-shield-check me-1"></i>Balance acumulado</div>
                        </div>
                        <div class="fin-metric-icon" style="background:#eff6ff;color:#2563eb;">
                            <i class="bi bi-wallet2"></i>
                        </div>
                    </div>
                    <div class="mt-3 pt-3" style="border-top:1px solid #f1f5f9;">
                        <div class="d-flex justify-content-between small mb-1">
                            <span class="text-success fw-bold"><i class="bi bi-arrow-up-right me-1"></i>${pctIngreso}% entradas</span>
                            <span class="text-danger fw-bold">${pctGasto}% salidas <i class="bi bi-arrow-down-left ms-1"></i></span>
                        </div>
                        <div class="progress" style="height:5px;border-radius:99px;">
                            <div class="progress-bar bg-success" style="width:${pctIngreso}%;border-radius:99px 0 0 99px;"></div>
                            <div class="progress-bar bg-danger" style="width:${pctGasto}%;border-radius:0 99px 99px 0;"></div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Ingresos Mes -->
            <div class="col-6 col-md-4">
                <div class="fin-card h-100">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="fin-metric-label">Ingresos del mes</div>
                            <div class="fin-metric-value" style="color:#16a34a;">${formatoMoneda(ingresosMes)}</div>
                            <div class="fin-metric-sub">${new Date().toLocaleDateString('es-ES',{month:'long',year:'numeric'})}</div>
                        </div>
                        <div class="fin-metric-icon" style="background:#f0fdf4;color:#16a34a;">
                            <i class="bi bi-arrow-up-right"></i>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Gastos Mes -->
            <div class="col-6 col-md-4">
                <div class="fin-card h-100">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="fin-metric-label">Gastos del mes</div>
                            <div class="fin-metric-value" style="color:#dc2626;">${formatoMoneda(egresosMes)}</div>
                            <div class="fin-metric-sub">${new Date().toLocaleDateString('es-ES',{month:'long',year:'numeric'})}</div>
                        </div>
                        <div class="fin-metric-icon" style="background:#fef2f2;color:#dc2626;">
                            <i class="bi bi-arrow-down-left"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- TRANSACTIONS TABLE -->
        <div class="fin-section-card">
            <div class="fin-section-header">
                <h6 class="fin-section-title"><i class="bi bi-list-ul me-2 text-primary"></i>Movimientos</h6>
                <span class="fin-badge fin-badge-gray">${transacciones.length} registros</span>
            </div>
            <div class="table-responsive">
                <table class="fin-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Recibo</th>
                            <th>Categoría</th>
                            <th>Descripción</th>
                            <th class="text-center fin-hide-sm">Comulg.</th>
                            <th class="text-end">Monto</th>
                            <th class="text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>${generarFilasTabla()}</tbody>
                </table>
            </div>
        </div>

    </div>`;
}

function generarFilasTabla() {
    if(!transacciones.length) return `<tr><td colspan="7" class="text-center py-5" style="color:#94a3b8;"><i class="bi bi-receipt fs-1 d-block mb-2 opacity-25"></i>No hay movimientos registrados</td></tr>`;
    
    return transacciones.map((t, idx) => {
        const esIng = t.tipo === 'ingreso';
        const signo = esIng ? '+' : '-';
        const amountClass = esIng ? 'fin-amount-pos' : 'fin-amount-neg';
        const catBadge = esIng ? 'fin-badge-green' : 'fin-badge-red';
        
        let reciboBadge = `<span style="color:#94a3b8;font-size:0.8rem;">—</span>`;
        if(t.recibo_no === 'APERTURA') reciboBadge = `<span class="fin-badge fin-badge-yellow"><i class="bi bi-flag me-1"></i>INICIO</span>`;
        else if(t.recibo_no && t.recibo_no !== 'S/N' && t.recibo_no !== '-') reciboBadge = `<span style="font-weight:700;font-size:0.8rem;color:#334155;font-family:'Poppins',sans-serif;">#${t.recibo_no}</span>`;
        
        const comulgantesCol = (t.comulgantes && t.comulgantes > 0) 
            ? `<span class="fin-badge fin-badge-blue"><i class="bi bi-people-fill"></i> ${t.comulgantes}</span>` 
            : `<span style="color:#cbd5e1;font-size:0.8rem;">—</span>`;

        return `
        <tr>
            <td><span style="font-weight:600;font-size:0.82rem;color:#0f172a;letter-spacing:0.01em;">${formatoFecha(t.fecha)}</span></td>
            <td>${reciboBadge}</td>
            <td><span class="fin-badge ${catBadge}">${t.categoria}</span></td>
            <td><span class="text-truncate-200" style="color:#64748b;font-size:0.85rem;" title="${t.descripcion}">${t.descripcion}</span></td>
            <td class="text-center fin-hide-sm">${comulgantesCol}</td>
            <td class="text-end"><span class="${amountClass}">${signo} ${formatoMoneda(t.monto)}</span></td>
            <td class="text-center">
                <div class="d-flex gap-1 justify-content-center">
                    <button class="fin-btn fin-btn-outline fin-btn-icon" onclick="editarTransaccion(${idx})" title="Editar"><i class="bi bi-pencil" style="font-size:0.8rem;"></i></button>
                    <button class="fin-btn fin-btn-danger fin-btn-icon" onclick="eliminarTransaccion(${t.id})" title="Eliminar"><i class="bi bi-trash3" style="font-size:0.8rem;"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ==========================================
// 6. FORMULARIOS (ESTILO SAAS MODAL)
// ==========================================

function renderRegistrarIngreso() {
    const tal = talonariosIngreso.find(t => t.activo);
    const next = tal ? tal.actual + 1 : '';
    const optsMem = miembrosFinanzas.map(m => `<option value="${m.nombre}">${m.nombre}</option>`).join('');

    document.getElementById('vistaFinanzas').innerHTML = `
    <div class="container d-flex justify-content-center pt-5">
        <div class="saas-card p-0 col-md-6 shadow-lg border-0">
            <div class="p-4 border-bottom d-flex justify-content-between align-items-center bg-white rounded-top">
                <h5 class="fw-bold m-0 text-primary">Registrar Ingreso</h5>
                <button class="btn-close" onclick="cargarDashboardFinanzas()"></button>
            </div>
            <div class="p-4 bg-light">
                <form id="fIng">
                    <div class="d-flex justify-content-between align-items-center mb-4 p-3 bg-white rounded border">
                        <div><label class="input-label mb-1">Talonario Activo</label><span class="badge-saas bg-green-light fs-6">${tal ? tal.nombre : 'Ninguno'}</span></div>
                        <div style="width: 140px;"><label class="input-label">No. Recibo</label><input type="number" id="nRec" class="form-saas text-end fw-bold" value="${next}" ${!tal?'disabled':''}><div id="reciboFeedback" class="text-end small mt-1 fw-bold"></div></div>
                    </div>
                    <div class="row g-3 mb-3">
                        <div class="col-6">
                            <label class="input-label">Tipo</label>
                            <select class="form-saas" id="tIng" onchange="toggleCampos(this.value)">
                                <option value="Ofrenda">Ofrenda</option><option value="Diezmo">Diezmo</option><option value="Actividad">Actividad</option><option value="Donacion">Donación</option>
                            </select>
                        </div>
                        <div class="col-6"><label class="input-label">Monto (L.)</label><input type="number" step="0.01" class="form-saas fw-bold text-success" id="mIng" required placeholder="0.00"></div>
                    </div>
                    <div id="boxCul" class="row g-3 mb-3">
                        <div class="col-8"><label class="input-label">Culto</label><select id="sCul" class="form-saas">${tiposCultos.map(c=>`<option value="${c}">${c}</option>`).join('')}</select></div>
                        <div class="col-4"><label class="input-label">Comulgantes</label><input type="number" id="nCom" class="form-saas text-center" placeholder="0"></div>
                    </div>
                    <div id="boxDon" class="mb-3" style="display:none">
                        <label class="input-label">Donante</label>
                        <div class="d-flex gap-2"><select id="sMem" class="form-saas"><option value="">-- Seleccionar --</option>${optsMem}</select><button type="button" class="btn-saas btn-saas-secondary" onclick="addMem()"><i class="bi bi-person-plus"></i></button></div>
                    </div>
                    <div class="mb-4"><label class="input-label">Nota</label><input type="text" id="detIng" class="form-saas" placeholder="Opcional..."></div>
                    <div class="d-grid"><button type="submit" id="btnGuardar" class="btn-saas btn-saas-primary justify-content-center py-3">Guardar</button></div>
                </form>
            </div>
        </div>
    </div>`;
    toggleCampos('Ofrenda');
    setupValidacionRecibo(tal, 'nRec', 'reciboFeedback', 'btnGuardar');
    document.getElementById('fIng').onsubmit = async(e) => {
        e.preventDefault();
        const nr = parseInt(document.getElementById('nRec').value);
        if(tal && (isNaN(nr) || nr < tal.inicio || nr > tal.fin || tal.usados.includes(nr))) return Swal.fire('Error','Recibo inválido','error');
        const tipo = document.getElementById('tIng').value;
        const culto = document.getElementById('sCul').value;
        const mem = document.getElementById('sMem').value;
        let desc = (tipo==='Ofrenda'||tipo==='Actividad') ? ((tipo==='Actividad'?'Actividad: ':'')+culto) : (tipo+(mem?` - ${mem}`:''));
        if(document.getElementById('detIng').value) desc += ` (${document.getElementById('detIng').value})`;
        try {
            await authFetch('/api/finanzas/transacciones',{method:'POST',body:JSON.stringify({fecha:new Date().toISOString(),tipo:'ingreso',categoria:tipo,descripcion:desc,monto:parseFloat(document.getElementById('mIng').value),recibo_no:nr?String(nr).padStart(6,'0'):'S/N',comulgantes:parseInt(document.getElementById('nCom').value)||0})});
            if(tal && nr > tal.actual) await authFetch(`/api/finanzas/talonarios/${tal.id}`,{method:'PUT',body:JSON.stringify({actual:nr,tipo:'ingreso'})});
            Swal.fire({icon:'success',title:'Guardado',toast:true,position:'top-end',showConfirmButton:false,timer:1500});
            cargarDashboardFinanzas();
        } catch(err){Swal.fire('Error',err.message,'error')}
    };
}

function renderRegistrarEgreso() {
    const tal = talonariosEgreso.find(t => t.activo);
    const next = tal ? tal.actual + 1 : '';
    
    // --- CORRECCIÓN AQUÍ: Usamos c.nombre en lugar del objeto completo ---
    const opts = categoriasEgresos.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');

    document.getElementById('vistaFinanzas').innerHTML = `
    <div class="container d-flex justify-content-center pt-5">
        <div class="saas-card p-0 col-md-6 shadow-lg border-0">
            <div class="p-4 border-bottom d-flex justify-content-between align-items-center bg-white rounded-top">
                <h5 class="fw-bold m-0 text-danger">Registrar Gasto</h5>
                <button class="btn-close" onclick="cargarDashboardFinanzas()"></button>
            </div>
            <div class="p-4 bg-light">
                <form id="fEgr">
                     <div class="d-flex justify-content-between align-items-center mb-4 p-3 bg-white rounded border">
                        <div><label class="input-label mb-1">Chequera Activa</label><span class="badge-saas bg-red-light fs-6">${tal ? tal.nombre : 'Ninguna'}</span></div>
                        <div style="width: 140px;"><label class="input-label">No. Doc</label><input type="number" id="nDoc" class="form-saas text-end fw-bold" value="${next}" ${!tal?'disabled':''}><div id="docFeedback" class="text-end small mt-1 fw-bold"></div></div>
                    </div>
                    <div class="row g-3 mb-3">
                        <div class="col-6">
                            <label class="input-label">Categoría</label>
                            <select class="form-saas" id="cEgr">${opts}<option value="OTRO">OTRO</option></select>
                        </div>
                        <div class="col-6"><label class="input-label">Monto (L.)</label><input type="number" step="0.01" class="form-saas fw-bold text-danger" id="mEgr" required placeholder="0.00"></div>
                    </div>
                    <div class="mb-4"><label class="input-label">Descripción</label><textarea id="dEgr" class="form-saas" rows="2" placeholder="Detalle..."></textarea></div>
                    <div class="d-grid"><button type="submit" id="btnGuardarEg" class="btn-saas btn-saas-danger justify-content-center py-3">Registrar</button></div>
                </form>
            </div>
        </div>
    </div>`;
    setupValidacionRecibo(tal, 'nDoc', 'docFeedback', 'btnGuardarEg');
    document.getElementById('fEgr').onsubmit = async(e) => {
        e.preventDefault();
        const nd = parseInt(document.getElementById('nDoc').value);
        if(tal && (isNaN(nd) || nd < tal.inicio || nd > tal.fin || tal.usados.includes(nd))) return Swal.fire('Error','Doc inválido','error');
        try {
            await authFetch('/api/finanzas/transacciones',{method:'POST',body:JSON.stringify({fecha:new Date().toISOString(),tipo:'egreso',categoria:document.getElementById('cEgr').value,descripcion:document.getElementById('dEgr').value,monto:parseFloat(document.getElementById('mEgr').value),recibo_no:nd?String(nd).padStart(6,'0'):'-'})});
            if(tal && nd > tal.actual) await authFetch(`/api/finanzas/talonarios/${tal.id}`,{method:'PUT',body:JSON.stringify({actual:nd,tipo:'egreso'})});
            Swal.fire({icon:'success',title:'Guardado',toast:true,position:'top-end',showConfirmButton:false,timer:1500});
            cargarDashboardFinanzas();
        } catch(err){Swal.fire('Error',err.message,'error')}
    };
}

function renderAperturaCuenta() {
    const saldoExistente = transacciones.find(t => t.categoria === 'SALDO INICIAL');
    const valorActual = saldoExistente ? saldoExistente.monto : '';
    const fechaActual = saldoExistente ? new Date(saldoExistente.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    document.getElementById('vistaFinanzas').innerHTML = `
    <div class="container d-flex justify-content-center pt-5">
        <div class="saas-card p-0 col-md-5 shadow-lg border-0">
            <div class="p-4 border-bottom d-flex justify-content-between align-items-center bg-white rounded-top">
                <h5 class="fw-bold m-0 text-warning">Apertura / Ajuste</h5>
                <button class="btn-close" onclick="cargarDashboardFinanzas()"></button>
            </div>
            <div class="p-4 bg-light">
                <form id="formApertura">
                    <div class="mb-3"><label class="input-label">Monto Inicial</label><input type="number" step="0.01" id="montoApertura" class="form-saas fw-bold" value="${valorActual}" required placeholder="0.00"></div>
                    <div class="mb-4"><label class="input-label">Fecha de Corte</label><input type="date" id="fechaApertura" class="form-saas" value="${fechaActual}"></div>
                    <div class="d-grid"><button type="submit" class="btn-saas btn-saas-secondary justify-content-center text-warning fw-bold py-3">Guardar</button></div>
                </form>
            </div>
        </div>
    </div>`;
    document.getElementById('formApertura').onsubmit = async (e) => {
        e.preventDefault();
        try {
            await authFetch('/api/finanzas/transacciones', { method: 'POST', body: JSON.stringify({ fecha: document.getElementById('fechaApertura').value, tipo: 'ingreso', categoria: 'SALDO INICIAL', descripcion: 'Apertura / Ajuste', monto: parseFloat(document.getElementById('montoApertura').value), recibo_no: 'APERTURA' }) });
            Swal.fire({ title: 'Guardado', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            cargarDashboardFinanzas();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    };
}

// ==========================================
// 7. FUNCIONES CRUD & HELPERS
// ==========================================
function toggleCampos(v) {
    const c=document.getElementById('boxCul'), d=document.getElementById('boxDon');
    if(v==='Ofrenda'||v==='Actividad'){c.style.display='flex';d.style.display='none'}
    else{c.style.display='none';d.style.display='block'}
}
function setupValidacionRecibo(tal, iId, fId, bId) {
    const inp = document.getElementById(iId); const f = document.getElementById(fId); const b = document.getElementById(bId);
    inp.addEventListener('input', () => {
        if (!tal) return;
        const v = parseInt(inp.value);
        inp.classList.remove('is-invalid', 'is-valid'); b.disabled = false;
        if (isNaN(v)) { f.innerHTML = ''; return; }
        if (v < tal.inicio || v > tal.fin) { inp.classList.add('is-invalid'); f.innerHTML = '<span class="text-danger">Fuera de rango</span>'; b.disabled = true; } 
        else if (tal.usados.includes(v)) { inp.classList.add('is-invalid'); f.innerHTML = '<span class="text-danger">Ya utilizado</span>'; b.disabled = true; } 
        else { inp.classList.add('is-valid'); f.innerHTML = '<span class="text-success">Disponible</span>'; }
    });
}
async function addMem() {
    const {value:n} = await Swal.fire({title:'Nuevo Donante',input:'text',showCancelButton:true});
    if(n){
        await authFetch('/api/miembros',{method:'POST',body:JSON.stringify({nombre:n,fecha_nacimiento:'2000-01-01',congregacion:'General',bautizado:false,confirmado:false})});
        miembrosFinanzas.push({nombre:n});
        const o=document.createElement("option"); o.text=n; o.value=n; o.selected=true; document.getElementById('sMem').add(o);
    }
}
async function eliminarTransaccion(id) {
    if((await Swal.fire({title:'¿Eliminar?',text:"Irreversible.",icon:'warning',showCancelButton:true,confirmButtonColor:'#d33',confirmButtonText:'Sí'})).isConfirmed){
        await authFetch(`/api/finanzas/transacciones/${id}`,{method:'DELETE'});
        cargarDashboardFinanzas();
    }
}
async function editarTransaccion(idx) {
    const t = transacciones[idx];
    const fechaISO = new Date(t.fecha).toISOString().split('T')[0];
    const { value: formValues } = await Swal.fire({
        title: 'Editar Transacción',
        html: `<div class="text-start">
            <div class="mb-2"><label class="small fw-bold">Fecha</label><input id="sw-f" type="date" class="form-control" value="${fechaISO}"></div>
            <div class="mb-2"><label class="small fw-bold">Recibo</label><input id="sw-r" class="form-control" value="${t.recibo_no}"></div>
            <div class="mb-2"><label class="small fw-bold">Descripción</label><input id="sw-d" class="form-control" value="${t.descripcion}"></div>
            <div class="row g-2"><div class="col"><label class="small fw-bold">Monto</label><input id="sw-m" type="number" class="form-control" value="${t.monto}"></div>
            <div class="col"><label class="small fw-bold">Comulg.</label><input id="sw-co" type="number" class="form-control" value="${t.comulgantes||0}"></div></div>
        </div>`,
        showCancelButton: true,
        preConfirm: () => ({fecha:document.getElementById('sw-f').value, recibo_no:document.getElementById('sw-r').value, descripcion:document.getElementById('sw-d').value, monto:document.getElementById('sw-m').value, comulgantes:document.getElementById('sw-co').value, categoria:t.categoria})
    });
    if(formValues) {
        await authFetch(`/api/finanzas/transacciones/${t.id}`,{method:'PUT',body:JSON.stringify(formValues)});
        Swal.fire({icon:'success',title:'Actualizado',toast:true,position:'top-end',showConfirmButton:false,timer:1500});
        cargarDashboardFinanzas();
    }
}

// ==========================================
// 8. CONFIGURACIÓN (SAAS UI)
// ==========================================
function renderConfigFinanzas() {
    const card = (t, i, tp) => `
    <div class="col-md-6 mb-3">
        <div class="saas-card p-3 d-flex justify-content-between align-items-center">
            <div>
                <div class="d-flex align-items-center gap-2 mb-1"><span class="fw-bold">${t.nombre}</span>${t.activo?'<span class="badge-saas bg-green-light">Activo</span>':'<span class="badge-saas bg-gray-light">Inactivo</span>'}</div>
                <div class="small text-muted">Rango: ${t.inicio} - ${t.fin} &bull; Último: <strong>#${t.actual}</strong></div>
            </div>
            <div class="d-flex gap-1">
                ${!t.activo?`<button onclick="actTal(${t.id},'${tp}')" class="icon-btn text-success"><i class="bi bi-power"></i></button>`:''}
                <button onclick="editarTalonario('${tp}',${i})" class="icon-btn text-primary"><i class="bi bi-pencil"></i></button>
                <button onclick="delTal(${t.id})" class="icon-btn text-danger"><i class="bi bi-trash"></i></button>
            </div>
        </div>
    </div>`;
    
    document.getElementById('vistaFinanzas').innerHTML = `
    <div class="container pt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="fw-bold m-0">Configuración</h4>
            <button onclick="cargarDashboardFinanzas()" class="btn-saas btn-saas-secondary">Volver al Panel</button>
        </div>
        <div class="row g-4">
            <div class="col-lg-7">
                <div class="saas-card p-4">
                    <ul class="nav nav-tabs mb-4 border-bottom-0" role="tablist"><li class="nav-item"><a class="nav-link active fw-bold border-0 bg-transparent" data-bs-toggle="tab" href="#tIng" style="color:var(--saas-primary)">Ingresos</a></li><li class="nav-item"><a class="nav-link fw-bold border-0 bg-transparent text-muted" data-bs-toggle="tab" href="#tEgr">Egresos</a></li></ul>
                    <div class="tab-content">
                        <div class="tab-pane active" id="tIng"><button onclick="nuevoTalonario('ingreso')" class="btn-saas btn-saas-primary w-100 mb-4 justify-content-center">Crear Nuevo Talonario</button><div class="row g-0">${talonariosIngreso.map((t,i)=>card(t,i,'ingreso')).join('')}</div></div>
                        <div class="tab-pane" id="tEgr"><button onclick="nuevoTalonario('egreso')" class="btn-saas btn-saas-danger w-100 mb-4 justify-content-center">Crear Nueva Chequera</button><div class="row g-0">${talonariosEgreso.map((t,i)=>card(t,i,'egreso')).join('')}</div></div>
                    </div>
                </div>
            </div>
            <div class="col-lg-5">
                <div class="saas-card p-4">
                    <h6 class="fw-bold mb-3">Categorías de Gastos</h6>
                    <div class="d-flex gap-2 mb-3"><input id="nCat" class="form-saas" placeholder="Nueva categoría..."><button onclick="addCat()" class="btn-saas btn-saas-secondary"><i class="bi bi-plus-lg"></i></button></div>
                    <div>${categoriasEgresos.map(c=>`<span class="badge-saas bg-gray-light me-1 mb-2 border">${c.nombre} <i class="bi bi-x text-danger ms-1 cursor-pointer" onclick="delCat(${c.id})"></i></span>`).join('')}</div>
                </div>
            </div>
        </div>
    </div>`;
}

// Helpers Config
async function nuevoTalonario(tp){const{value:f}=await Swal.fire({title:`Nuevo (${tp})`,html:`<div class="text-start"><label class="small fw-bold">Nombre</label><input id="n" class="form-control mb-2"><div class="row"><div class="col"><label class="small fw-bold">Inicio</label><input id="i" type="number" class="form-control"></div><div class="col"><label class="small fw-bold">Fin</label><input id="f" type="number" class="form-control"></div></div></div>`,showCancelButton:true,preConfirm:()=>[document.getElementById('n').value,document.getElementById('i').value,document.getElementById('f').value]});if(f)await authFetch('/api/finanzas/talonarios',{method:'POST',body:JSON.stringify({nombre:f[0],inicio:f[1],fin:f[2],actual:f[1]-1,tipo:tp})});renderConfigFinanzas(); const d=await authFetch('/api/finanzas/datos'); /*Recarga*/ const mapped=d.talonarios.map(t=>({...t,inicio:t.rango_inicio,fin:t.rango_fin})); talonariosIngreso=mapped.filter(t=>t.tipo==='ingreso'); talonariosEgreso=mapped.filter(t=>t.tipo==='egreso'); renderConfigFinanzas();}
async function editarTalonario(tp,i){const t=(tp==='ingreso'?talonariosIngreso:talonariosEgreso)[i];const{value:f}=await Swal.fire({title:'Editar',html:`<div class="text-start"><label class="small fw-bold">Nombre</label><input id="n" class="form-control mb-2" value="${t.nombre}"><div class="row"><div class="col"><label class="small fw-bold">Inicio</label><input id="i" type="number" class="form-control" value="${t.inicio}"></div><div class="col"><label class="small fw-bold">Fin</label><input id="f" type="number" class="form-control" value="${t.fin}"></div></div></div>`,showCancelButton:true,preConfirm:()=>[document.getElementById('n').value,document.getElementById('i').value,document.getElementById('f').value]});if(f){await authFetch(`/api/finanzas/talonarios/${t.id}`,{method:'PUT',body:JSON.stringify({nombre:f[0],inicio:f[1],fin:f[2]})}); t.nombre=f[0];t.inicio=f[1];t.fin=f[2]; renderConfigFinanzas();}}
async function actTal(id,tp){await authFetch(`/api/finanzas/talonarios/${id}`,{method:'PUT',body:JSON.stringify({activo:true,tipo:tp})});cargarDashboardFinanzas();setTimeout(renderConfigFinanzas,300);}
async function delTal(id){if((await Swal.fire({title:'¿Borrar?',icon:'warning',showCancelButton:true})).isConfirmed){await authFetch(`/api/finanzas/talonarios/${id}`,{method:'DELETE'});renderConfigFinanzas(); const d=await authFetch('/api/finanzas/datos'); /*Recarga*/ const mapped=d.talonarios.map(t=>({...t,inicio:t.rango_inicio,fin:t.rango_fin})); talonariosIngreso=mapped.filter(t=>t.tipo==='ingreso'); talonariosEgreso=mapped.filter(t=>t.tipo==='egreso'); renderConfigFinanzas();}}

// CORRECCIÓN MANEJO DE ERROR CATEGORÍAS
async function addCat(){
    const v = document.getElementById('nCat').value;
    if(v){
        try {
            await authFetch('/api/finanzas/categorias',{method:'POST',body:JSON.stringify({nombre:v})});
            const d = await authFetch('/api/finanzas/datos');
            categoriasEgresos = d.categorias;
            renderConfigFinanzas();
        } catch(e) {
            Swal.fire('Error', 'Esa categoría ya existe o hubo un problema.', 'warning');
        }
    }
}
async function delCat(id){await authFetch(`/api/finanzas/categorias/${id}`,{method:'DELETE'});const d=await authFetch('/api/finanzas/datos');categoriasEgresos=d.categorias;renderConfigFinanzas();}