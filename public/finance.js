// finance.js - Módulo Financiero v18 (Material Design + FAB)
console.log("Cargando Módulo Financiero v18 (Material UI)...");

// ==========================================
// 1. VARIABLES GLOBALES
// ==========================================
let talonariosIngreso = [], talonariosEgreso = [], categoriasEgresos = [], transacciones = [], miembrosFinanzas = [];
let saldoActual = 0, ingresosMes = 0, egresosMes = 0;
const tiposCultos = ['Culto Dominical', 'Escuela Dominical', 'Culto de Oración', 'Culto de Enseñanza', 'Reunión de Jóvenes', 'Reunión de Damas', 'Vigilia'];

// ==========================================
// 2. ESTILOS MATERIAL DESIGN (Inyectados)
// ==========================================
try {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        /* --- VARIABLES & BASE --- */
        :root {
            --md-primary: #6200ee; /* Violeta Material */
            --md-secondary: #03dac6; /* Teal Material */
            --md-bg: #f5f5f5;
            --md-surface: #ffffff;
            --md-error: #b00020;
        }

        /* --- CARDS (TARJETAS) --- */
        .md-card {
            background: var(--md-surface);
            border-radius: 12px;
            border: none;
            box-shadow: 0 2px 4px -1px rgba(0,0,0,0.2), 0 4px 5px 0 rgba(0,0,0,0.14), 0 1px 10px 0 rgba(0,0,0,0.12);
            transition: box-shadow 0.3s cubic-bezier(.25,.8,.25,1);
            overflow: hidden;
            height: 100%;
        }
        .md-card:hover {
            box-shadow: 0 5px 5px -3px rgba(0,0,0,0.2), 0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12);
        }

        /* --- FLOATING ACTION BUTTON (FAB) --- */
        .fab-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 1000;
            display: flex;
            flex-direction: column-reverse;
            align-items: center;
            gap: 16px;
        }
        .fab-main {
            width: 56px; height: 56px;
            background-color: var(--md-primary);
            color: white;
            border-radius: 50%;
            border: none;
            box-shadow: 0 3px 5px -1px rgba(0,0,0,0.2), 0 6px 10px 0 rgba(0,0,0,0.14), 0 1px 18px 0 rgba(0,0,0,0.12);
            font-size: 24px;
            display: flex; align-items: center; justify-content: center;
            transition: transform 0.3s, background 0.3s;
            cursor: pointer;
        }
        .fab-main:hover { background-color: #3700b3; }
        .fab-main.active { transform: rotate(45deg); }
        
        .fab-action {
            width: 48px; height: 48px;
            border-radius: 50%;
            border: none;
            color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            display: flex; align-items: center; justify-content: center;
            font-size: 20px;
            opacity: 0; transform: translateY(20px) scale(0.8);
            transition: all 0.3s;
            pointer-events: none;
            position: relative;
        }
        .fab-action.show { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
        
        /* Tooltip del FAB */
        .fab-label {
            position: absolute; right: 60px;
            background: rgba(0,0,0,0.7); color: white;
            padding: 4px 8px; border-radius: 4px;
            font-size: 12px; white-space: nowrap;
            pointer-events: none;
        }

        /* --- TABLA MATERIAL --- */
        .md-table thead th {
            text-transform: uppercase;
            font-size: 0.75rem;
            font-weight: 500;
            color: rgba(0,0,0,0.6);
            border-bottom: 1px solid rgba(0,0,0,0.12);
            padding: 16px;
        }
        .md-table tbody td {
            padding: 16px;
            border-bottom: 1px solid rgba(0,0,0,0.06);
            vertical-align: middle;
        }
        .md-icon-btn {
            border: none; background: transparent; color: rgba(0,0,0,0.54);
            border-radius: 50%; width: 36px; height: 36px;
            transition: background 0.2s;
        }
        .md-icon-btn:hover { background: rgba(0,0,0,0.04); color: black; }

        /* --- BADGES & CHIPS --- */
        .md-chip {
            background: #e0e0e0; border-radius: 16px; padding: 4px 12px;
            font-size: 0.8125rem; color: rgba(0,0,0,0.87); display: inline-flex; align-items: center;
        }
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
// 4. CORE - CARGA DE DATOS
// ==========================================
async function cargarDashboardFinanzas() {
    const el = document.getElementById('vistaFinanzas');
    if(!el) return;
    el.innerHTML = '<div class="d-flex justify-content-center align-items-center py-5"><div class="spinner-border text-primary" role="status"></div></div>';

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
// 5. VISTA PRINCIPAL (MATERIAL DASHBOARD)
// ==========================================
function renderizarVistaPrincipal() {
    const container = document.getElementById('vistaFinanzas');
    
    container.innerHTML = `
    <div class="container-fluid p-0 pb-5">
        <div class="row g-3 mb-4">
            <div class="col-12 col-md-4">
                <div class="md-card p-4 d-flex align-items-center">
                    <div class="rounded-circle bg-primary bg-opacity-10 p-3 me-3 text-primary"><i class="bi bi-wallet2 fs-3"></i></div>
                    <div>
                        <div class="text-muted small fw-bold text-uppercase">Disponible</div>
                        <h2 class="mb-0 fw-bold text-dark">${formatoMoneda(saldoActual)}</h2>
                    </div>
                </div>
            </div>
            <div class="col-6 col-md-4">
                <div class="md-card p-3 p-md-4 border-start border-4 border-success">
                    <div class="text-success small fw-bold text-uppercase mb-1">Ingresos (Mes)</div>
                    <h4 class="mb-0 text-dark fw-bold">+${formatoMoneda(ingresosMes)}</h4>
                </div>
            </div>
            <div class="col-6 col-md-4">
                <div class="md-card p-3 p-md-4 border-start border-4 border-danger">
                    <div class="text-danger small fw-bold text-uppercase mb-1">Gastos (Mes)</div>
                    <h4 class="mb-0 text-dark fw-bold">-${formatoMoneda(egresosMes)}</h4>
                </div>
            </div>
        </div>

        <div class="md-card">
            <div class="p-3 border-bottom d-flex justify-content-between align-items-center">
                <h5 class="m-0 fw-bold text-secondary">Movimientos Recientes</h5>
                <small class="text-muted">${transacciones.length} registros</small>
            </div>
            <div class="table-responsive">
                <table class="table md-table w-100 mb-0">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Recibo</th>
                            <th>Descripción</th>
                            <th class="text-end">Monto</th>
                            <th class="text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>${generarFilasTabla()}</tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="fab-container" id="fabMenu">
        <button class="fab-main" onclick="toggleFab()">
            <i class="bi bi-plus-lg"></i>
        </button>
        
        <button class="fab-action bg-dark" onclick="renderConfigFinanzas(); toggleFab();">
            <i class="bi bi-gear-fill"></i>
            <span class="fab-label">Configuración</span>
        </button>
        <button class="fab-action bg-warning text-dark" onclick="renderAperturaCuenta(); toggleFab();">
            <i class="bi bi-sliders"></i>
            <span class="fab-label">Ajuste / Apertura</span>
        </button>
        <button class="fab-action bg-danger" onclick="renderRegistrarEgreso(); toggleFab();">
            <i class="bi bi-dash-lg"></i>
            <span class="fab-label">Registrar Gasto</span>
        </button>
        <button class="fab-action bg-success" onclick="renderRegistrarIngreso(); toggleFab();">
            <i class="bi bi-arrow-down"></i>
            <span class="fab-label">Registrar Ingreso</span>
        </button>
    </div>
    `;
}

function generarFilasTabla() {
    if(!transacciones.length) return '<tr><td colspan="5" class="text-center py-5 text-muted">Sin movimientos recientes</td></tr>';
    
    return transacciones.map((t, idx) => {
        const esIng = t.tipo === 'ingreso';
        const signo = esIng ? '+' : '-';
        const color = esIng ? 'text-success' : 'text-danger';
        
        let recibo = '<span class="text-muted small">-</span>';
        if(t.recibo_no === 'APERTURA') recibo = '<span class="badge bg-warning text-dark">INICIO</span>';
        else if(t.recibo_no && t.recibo_no !== 'S/N' && t.recibo_no !== '-') recibo = `<span class="fw-bold text-dark">#${t.recibo_no}</span>`;
        
        const comulgantes = (t.comulgantes > 0) ? `<span class="badge bg-info text-dark ms-1" title="Comulgantes"><i class="bi bi-people-fill"></i> ${t.comulgantes}</span>` : '';

        return `
        <tr>
            <td><div class="fw-bold text-dark">${formatoFecha(t.fecha)}</div></td>
            <td>${recibo}</td>
            <td>
                <div class="text-dark fw-medium">${t.categoria}</div>
                <div class="text-muted small text-truncate" style="max-width: 200px;">${t.descripcion} ${comulgantes}</div>
            </td>
            <td class="text-end">
                <span class="fw-bold ${color}">${signo} ${formatoMoneda(t.monto)}</span>
            </td>
            <td class="text-center">
                <button class="md-icon-btn" onclick="editarTransaccion(${idx})"><i class="bi bi-pencil"></i></button>
                <button class="md-icon-btn text-danger" onclick="eliminarTransaccion(${t.id})"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

// Lógica del FAB
window.toggleFab = function() {
    const main = document.querySelector('.fab-main');
    const actions = document.querySelectorAll('.fab-action');
    main.classList.toggle('active');
    actions.forEach(btn => btn.classList.toggle('show'));
}

// ==========================================
// 6. FORMULARIOS (MODALES BOOTSTRAP ESTILIZADOS)
// ==========================================

function renderRegistrarIngreso() {
    const tal = talonariosIngreso.find(t => t.activo);
    const next = tal ? tal.actual + 1 : '';
    const optsMem = miembrosFinanzas.map(m => `<option value="${m.nombre}">${m.nombre}</option>`).join('');

    document.getElementById('vistaFinanzas').innerHTML = `
    <div class="row justify-content-center pt-4">
        <div class="col-md-6">
            <div class="md-card p-0">
                <div class="p-3 bg-success text-white d-flex justify-content-between align-items-center">
                    <h5 class="m-0 fw-bold">Nuevo Ingreso</h5>
                    <button class="btn-close btn-close-white" onclick="cargarDashboardFinanzas()"></button>
                </div>
                <div class="p-4">
                    <form id="fIng">
                        <div class="d-flex justify-content-between align-items-center mb-4 p-2 bg-light rounded">
                            <span class="badge bg-success">${tal ? tal.nombre : 'Sin Talonario'}</span>
                            <div class="input-group input-group-sm w-50">
                                <span class="input-group-text fw-bold"># RECIBO</span>
                                <input type="number" id="nRec" class="form-control fw-bold text-end" value="${next}" ${!tal?'disabled':''}>
                            </div>
                        </div>

                        <div class="row g-3 mb-3">
                            <div class="col-6">
                                <div class="form-floating">
                                    <select class="form-select" id="tIng" onchange="toggleCampos(this.value)">
                                        <option value="Ofrenda">Ofrenda</option>
                                        <option value="Diezmo">Diezmo</option>
                                        <option value="Actividad">Actividad</option>
                                        <option value="Donacion">Donación</option>
                                    </select>
                                    <label>Tipo</label>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="form-floating">
                                    <input type="number" step="0.01" class="form-control fw-bold text-success" id="mIng" required placeholder="0.00">
                                    <label>Monto (L.)</label>
                                </div>
                            </div>
                        </div>

                        <div id="boxCul" class="row g-2 mb-3">
                            <div class="col-8">
                                <div class="form-floating">
                                    <select id="sCul" class="form-select">${tiposCultos.map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
                                    <label>Culto</label>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="form-floating">
                                    <input type="number" id="nCom" class="form-control" placeholder="0">
                                    <label>Comulg.</label>
                                </div>
                            </div>
                        </div>

                        <div id="boxDon" class="mb-3" style="display:none">
                            <label class="small text-muted ms-1">Donante</label>
                            <div class="input-group">
                                <select id="sMem" class="form-select"><option value="">-- Seleccionar --</option>${optsMem}</select>
                                <button type="button" class="btn btn-outline-secondary" onclick="addMem()"><i class="bi bi-person-plus"></i></button>
                            </div>
                        </div>

                        <div class="form-floating mb-4">
                            <input type="text" id="detIng" class="form-control" placeholder="Nota">
                            <label>Nota Adicional</label>
                        </div>

                        <div class="d-grid">
                            <button type="submit" class="btn btn-success btn-lg fw-bold" style="border-radius: 50px;">GUARDAR</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>`;

    toggleCampos('Ofrenda');
    
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
    const opts = categoriasEgresos.map(c => `<option value="${c}">${c}</option>`).join('');

    document.getElementById('vistaFinanzas').innerHTML = `
    <div class="row justify-content-center pt-4">
        <div class="col-md-6">
            <div class="md-card p-0">
                <div class="p-3 bg-danger text-white d-flex justify-content-between align-items-center">
                    <h5 class="m-0 fw-bold">Nuevo Gasto</h5>
                    <button class="btn-close btn-close-white" onclick="cargarDashboardFinanzas()"></button>
                </div>
                <div class="p-4">
                    <form id="fEgr">
                         <div class="d-flex justify-content-between align-items-center mb-4 p-2 bg-light rounded">
                            <span class="badge bg-danger">${tal ? tal.nombre : 'Sin Chequera'}</span>
                            <div class="input-group input-group-sm w-50">
                                <span class="input-group-text fw-bold">DOC #</span>
                                <input type="number" id="nDoc" class="form-control fw-bold text-end" value="${next}" ${!tal?'disabled':''}>
                            </div>
                        </div>

                        <div class="row g-3 mb-3">
                            <div class="col-6">
                                <div class="form-floating">
                                    <select class="form-select" id="cEgr">${opts}<option value="OTRO">OTRO</option></select>
                                    <label>Categoría</label>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="form-floating">
                                    <input type="number" step="0.01" class="form-control fw-bold text-danger" id="mEgr" required placeholder="0.00">
                                    <label>Monto (L.)</label>
                                </div>
                            </div>
                        </div>

                        <div class="form-floating mb-4">
                            <textarea id="dEgr" class="form-control" style="height: 100px" placeholder="Detalles"></textarea>
                            <label>Descripción del Gasto</label>
                        </div>

                        <div class="d-grid">
                            <button type="submit" class="btn btn-danger btn-lg fw-bold" style="border-radius: 50px;">REGISTRAR</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>`;

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

// ==========================================
// 7. FUNCIONES CRUD & HELPERS
// ==========================================
function toggleCampos(v) {
    const c=document.getElementById('boxCul'), d=document.getElementById('boxDon');
    if(v==='Ofrenda'||v==='Actividad'){c.style.display='flex';d.style.display='none'}
    else{c.style.display='none';d.style.display='block'}
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
    if((await Swal.fire({title:'¿Eliminar?',text:"Afectará el saldo actual.",icon:'warning',showCancelButton:true,confirmButtonColor:'#d33'})).isConfirmed){
        await authFetch(`/api/finanzas/transacciones/${id}`,{method:'DELETE'});
        cargarDashboardFinanzas();
    }
}

async function editarTransaccion(idx) {
    const t = transacciones[idx];
    const {value:v} = await Swal.fire({
        title: 'Editar Transacción',
        html: `<input id="sw-f" type="date" class="swal2-input" value="${t.fecha.split('T')[0]}"><input id="sw-d" class="swal2-input" value="${t.descripcion}"><input id="sw-m" type="number" class="swal2-input" value="${t.monto}">`,
        preConfirm: () => ({fecha:document.getElementById('sw-f').value, descripcion:document.getElementById('sw-d').value, monto:document.getElementById('sw-m').value})
    });
    if(v) {
        await authFetch(`/api/finanzas/transacciones/${t.id}`,{method:'PUT',body:JSON.stringify({...t,...v})});
        cargarDashboardFinanzas();
    }
}

function renderConfigFinanzas() {
    // Reutilizando el diseño de cards material
    const card = (t, i, tp) => `
    <div class="col-md-6">
        <div class="md-card p-3 border-start border-4 ${tp==='ingreso'?'border-success':'border-danger'}">
            <div class="d-flex justify-content-between mb-2"><span class="fw-bold">${t.nombre}</span>${t.activo?'<span class="badge bg-success">Activo</span>':'<span class="badge bg-secondary">Inactivo</span>'}</div>
            <div class="d-flex justify-content-between align-items-end">
                <small class="text-muted">${t.inicio} - ${t.fin}<br><strong class="fs-5 text-dark">#${t.actual}</strong></small>
                <div>
                    ${!t.activo?`<button onclick="actTal(${t.id},'${tp}')" class="btn btn-sm btn-outline-dark"><i class="bi bi-power"></i></button>`:''}
                    <button onclick="editTal('${tp}',${i})" class="btn btn-sm btn-outline-primary"><i class="bi bi-pencil"></i></button>
                    <button onclick="delTal(${t.id})" class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        </div>
    </div>`;
    
    document.getElementById('vistaFinanzas').innerHTML = `
    <div class="container pb-5">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="fw-bold">Configuración</h4>
            <button onclick="cargarDashboardFinanzas()" class="btn btn-outline-secondary">Volver</button>
        </div>
        <div class="row g-4">
            <div class="col-lg-7">
                <div class="md-card p-4">
                    <ul class="nav nav-tabs mb-3"><li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#tIng">Ingresos</a></li><li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tEgr">Egresos</a></li></ul>
                    <div class="tab-content">
                        <div class="tab-pane active" id="tIng"><button onclick="newTal('ingreso')" class="btn btn-success w-100 mb-3">Nuevo Talonario</button><div class="row g-3">${talonariosIngreso.map((t,i)=>card(t,i,'ingreso')).join('')}</div></div>
                        <div class="tab-pane" id="tEgr"><button onclick="newTal('egreso')" class="btn btn-danger w-100 mb-3">Nueva Chequera</button><div class="row g-3">${talonariosEgreso.map((t,i)=>card(t,i,'egreso')).join('')}</div></div>
                    </div>
                </div>
            </div>
            <div class="col-lg-5">
                <div class="md-card p-4">
                    <h6 class="fw-bold mb-3">Categorías</h6>
                    <div class="input-group mb-3"><input id="nCat" class="form-control" placeholder="Nueva..."><button onclick="addCat()" class="btn btn-dark"><i class="bi bi-plus"></i></button></div>
                    <div>${categoriasEgresos.map(c=>`<span class="md-chip me-1 mb-1">${c.nombre} <i class="bi bi-x text-danger ms-1 cursor-pointer" onclick="delCat(${c.id})"></i></span>`).join('')}</div>
                </div>
            </div>
        </div>
    </div>`;
}

// Helpers Config (Short versions)
async function newTal(tp){const{value:f}=await Swal.fire({title:`Nuevo (${tp})`,html:`<input id="n" class="swal2-input" placeholder="Nombre"><input id="i" type="number" class="swal2-input" placeholder="Inicio"><input id="f" type="number" class="swal2-input" placeholder="Fin">`,preConfirm:()=>[document.getElementById('n').value,document.getElementById('i').value,document.getElementById('f').value]});if(f)await authFetch('/api/finanzas/talonarios',{method:'POST',body:JSON.stringify({nombre:f[0],inicio:f[1],fin:f[2],actual:f[1]-1,tipo:tp})});renderConfigFinanzas();}
async function editTal(tp,i){const t=(tp==='ingreso'?talonariosIngreso:talonariosEgreso)[i];const{value:f}=await Swal.fire({title:'Editar',html:`<input id="n" class="swal2-input" value="${t.nombre}"><input id="i" type="number" class="swal2-input" value="${t.inicio}"><input id="f" type="number" class="swal2-input" value="${t.fin}">`,preConfirm:()=>[document.getElementById('n').value,document.getElementById('i').value,document.getElementById('f').value]});if(f){await authFetch(`/api/finanzas/talonarios/${t.id}`,{method:'PUT',body:JSON.stringify({nombre:f[0],inicio:f[1],fin:f[2]})});renderConfigFinanzas();}}
async function actTal(id,tp){await authFetch(`/api/finanzas/talonarios/${id}`,{method:'PUT',body:JSON.stringify({activo:true,tipo:tp})});cargarDashboardFinanzas();}
async function delTal(id){if((await Swal.fire({title:'¿Borrar?',icon:'warning',showCancelButton:true})).isConfirmed){await authFetch(`/api/finanzas/talonarios/${id}`,{method:'DELETE'});renderConfigFinanzas();}}
async function addCat(){const v=document.getElementById('nCat').value;if(v){await authFetch('/api/finanzas/categorias',{method:'POST',body:JSON.stringify({nombre:v})});renderConfigFinanzas();}}
async function delCat(id){await authFetch(`/api/finanzas/categorias/${id}`,{method:'DELETE'});renderConfigFinanzas();}
function renderAperturaCuenta(){renderRegistrarIngreso();} // Placeholder para mantener el FAB funcionando