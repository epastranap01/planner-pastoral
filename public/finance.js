// finance.js - Módulo Financiero v19 (Material Design + Lógica Completa Restaurada)
console.log("Cargando Módulo Financiero v19 (Material + Logic)...");

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
        :root { --md-primary: #6200ee; --md-secondary: #03dac6; --md-bg: #f5f5f5; --md-surface: #ffffff; }
        
        /* Cards */
        .md-card { background: var(--md-surface); border-radius: 16px; border: none; box-shadow: 0 2px 4px -1px rgba(0,0,0,0.2), 0 4px 5px 0 rgba(0,0,0,0.14); transition: all 0.3s; overflow: hidden; height: 100%; }
        .md-card:hover { transform: translateY(-3px); box-shadow: 0 8px 10px 1px rgba(0,0,0,0.14); }
        
        /* FAB */
        .fab-container { position: fixed; bottom: 24px; right: 24px; z-index: 1000; display: flex; flex-direction: column-reverse; align-items: center; gap: 16px; }
        .fab-main { width: 56px; height: 56px; background-color: var(--md-primary); color: white; border-radius: 50%; border: none; box-shadow: 0 4px 5px rgba(0,0,0,0.2); font-size: 24px; display: flex; align-items: center; justify-content: center; transition: transform 0.3s; cursor: pointer; }
        .fab-main.active { transform: rotate(45deg); background-color: #3700b3; }
        .fab-action { width: 48px; height: 48px; border-radius: 50%; border: none; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 20px; opacity: 0; transform: translateY(20px) scale(0.8); transition: all 0.3s; pointer-events: none; position: relative; }
        .fab-action.show { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
        .fab-label { position: absolute; right: 60px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; white-space: nowrap; pointer-events: none; }

        /* Table & Badges */
        .md-table thead th { text-transform: uppercase; font-size: 0.75rem; color: rgba(0,0,0,0.6); padding: 16px; border-bottom: 1px solid rgba(0,0,0,0.1); }
        .md-table tbody td { padding: 16px; vertical-align: middle; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .md-icon-btn { border: none; background: transparent; color: #555; border-radius: 50%; width: 36px; height: 36px; transition: 0.2s; }
        .md-icon-btn:hover { background: rgba(0,0,0,0.05); color: #000; }
        .md-chip { background: #e0e0e0; border-radius: 16px; padding: 4px 12px; font-size: 0.8rem; display: inline-flex; align-items: center; }
        
        /* Validations */
        .validation-msg { font-size: 0.75rem; font-weight: 700; margin-top: 4px; display: block; }
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
// 5. VISTA PRINCIPAL (UI)
// ==========================================
function renderizarVistaPrincipal() {
    const container = document.getElementById('vistaFinanzas');
    
    container.innerHTML = `
    <div class="container-fluid p-0 pb-5">
        <div class="row g-3 mb-4">
            <div class="col-12 col-md-4">
                <div class="md-card p-4 d-flex align-items-center">
                    <div class="rounded-circle bg-primary bg-opacity-10 p-3 me-3 text-primary"><i class="bi bi-wallet2 fs-3"></i></div>
                    <div><div class="text-muted small fw-bold text-uppercase">Disponible</div><h2 class="mb-0 fw-bold text-dark">${formatoMoneda(saldoActual)}</h2></div>
                </div>
            </div>
            <div class="col-6 col-md-4">
                <div class="md-card p-3 p-md-4 border-start border-4 border-success">
                    <div class="text-success small fw-bold text-uppercase mb-1">Ingresos (Mes)</div><h4 class="mb-0 text-dark fw-bold">+${formatoMoneda(ingresosMes)}</h4>
                </div>
            </div>
            <div class="col-6 col-md-4">
                <div class="md-card p-3 p-md-4 border-start border-4 border-danger">
                    <div class="text-danger small fw-bold text-uppercase mb-1">Gastos (Mes)</div><h4 class="mb-0 text-dark fw-bold">-${formatoMoneda(egresosMes)}</h4>
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
                    <thead><tr><th>Fecha</th><th>Recibo</th><th>Descripción</th><th class="text-end">Monto</th><th class="text-center">Acciones</th></tr></thead>
                    <tbody>${generarFilasTabla()}</tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="fab-container" id="fabMenu">
        <button class="fab-main" onclick="toggleFab()"><i class="bi bi-plus-lg"></i></button>
        <button class="fab-action bg-dark" onclick="renderConfigFinanzas(); toggleFab();"><i class="bi bi-gear-fill"></i><span class="fab-label">Configuración</span></button>
        <button class="fab-action bg-warning text-dark" onclick="renderAperturaCuenta(); toggleFab();"><i class="bi bi-sliders"></i><span class="fab-label">Ajuste / Apertura</span></button>
        <button class="fab-action bg-danger" onclick="renderRegistrarEgreso(); toggleFab();"><i class="bi bi-dash-lg"></i><span class="fab-label">Gasto</span></button>
        <button class="fab-action bg-success" onclick="renderRegistrarIngreso(); toggleFab();"><i class="bi bi-arrow-down"></i><span class="fab-label">Ingreso</span></button>
    </div>`;
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
        
        const comulgantes = (t.comulgantes > 0) ? `<span class="badge bg-info text-dark ms-1"><i class="bi bi-people-fill"></i> ${t.comulgantes}</span>` : '';

        return `
        <tr>
            <td><div class="fw-bold text-dark">${formatoFecha(t.fecha)}</div></td>
            <td>${recibo}</td>
            <td>
                <div class="text-dark fw-medium">${t.categoria}</div>
                <div class="text-muted small text-truncate" style="max-width: 200px;">${t.descripcion} ${comulgantes}</div>
            </td>
            <td class="text-end"><span class="fw-bold ${color}">${signo} ${formatoMoneda(t.monto)}</span></td>
            <td class="text-center">
                <button class="md-icon-btn" onclick="editarTransaccion(${idx})" title="Editar"><i class="bi bi-pencil"></i></button>
                <button class="md-icon-btn text-danger" onclick="eliminarTransaccion(${t.id})" title="Eliminar"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

window.toggleFab = function() {
    const main = document.querySelector('.fab-main');
    const actions = document.querySelectorAll('.fab-action');
    main.classList.toggle('active');
    actions.forEach(btn => btn.classList.toggle('show'));
}

// ==========================================
// 6. FORMULARIOS COMPLETOS (LÓGICA RESTAURADA)
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
                                <div id="reciboFeedback" class="validation-msg text-end w-100"></div>
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

                        <div class="d-grid"><button type="submit" id="btnGuardar" class="btn btn-success btn-lg fw-bold" style="border-radius: 50px;">GUARDAR</button></div>
                    </form>
                </div>
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
                                <div id="docFeedback" class="validation-msg text-end w-100"></div>
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

                        <div class="d-grid"><button type="submit" id="btnGuardarEg" class="btn btn-danger btn-lg fw-bold" style="border-radius: 50px;">REGISTRAR</button></div>
                    </form>
                </div>
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
    <div class="row justify-content-center pt-4">
        <div class="col-md-6">
            <div class="md-card p-0">
                <div class="p-3 bg-warning text-dark d-flex justify-content-between align-items-center">
                    <h5 class="m-0 fw-bold">Apertura / Ajuste de Caja</h5>
                    <button class="btn-close" onclick="cargarDashboardFinanzas()"></button>
                </div>
                <div class="p-4">
                    <form id="formApertura">
                        <div class="form-floating mb-3">
                            <input type="number" step="0.01" id="montoApertura" class="form-control fw-bold" value="${valorActual}" required placeholder="0">
                            <label>Monto Inicial</label>
                        </div>
                        <div class="form-floating mb-4">
                            <input type="date" id="fechaApertura" class="form-control" value="${fechaActual}">
                            <label>Fecha de Corte</label>
                        </div>
                        <div class="d-grid">
                            <button type="submit" class="btn btn-warning btn-lg fw-bold" style="border-radius: 50px;">GUARDAR AJUSTE</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>`;

    document.getElementById('formApertura').onsubmit = async (e) => {
        e.preventDefault();
        try {
            await authFetch('/api/finanzas/transacciones', { method: 'POST', body: JSON.stringify({ fecha: document.getElementById('fechaApertura').value, tipo: 'ingreso', categoria: 'SALDO INICIAL', descripcion: 'Apertura / Ajuste', monto: parseFloat(document.getElementById('montoApertura').value), recibo_no: 'APERTURA' }) });
            Swal.fire({ title: 'Ajuste Guardado', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            cargarDashboardFinanzas();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    };
}

// ==========================================
// 7. FUNCIONES CRUD & HELPERS (LÓGICA RESTAURADA)
// ==========================================

function toggleCampos(v) {
    const c=document.getElementById('boxCul'), d=document.getElementById('boxDon');
    if(v==='Ofrenda'||v==='Actividad'){c.style.display='flex';d.style.display='none'}
    else{c.style.display='none';d.style.display='block'}
}

function setupValidacionRecibo(tal, iId, fId, bId) {
    const inp = document.getElementById(iId); 
    const f = document.getElementById(fId); 
    const b = document.getElementById(bId);
    inp.addEventListener('input', () => {
        if (!tal) return;
        const v = parseInt(inp.value);
        inp.classList.remove('is-invalid', 'is-valid');
        b.disabled = false;
        if (isNaN(v)) { f.innerHTML = ''; return; }
        if (v < tal.inicio || v > tal.fin) { inp.classList.add('is-invalid'); f.innerHTML = 'Fuera de rango'; f.className = 'validation-msg text-danger text-end'; b.disabled = true; } 
        else if (tal.usados.includes(v)) { inp.classList.add('is-invalid'); f.innerHTML = 'Ya utilizado'; f.className = 'validation-msg text-danger text-end'; b.disabled = true; } 
        else { inp.classList.add('is-valid'); f.innerHTML = '<span class="text-success">Disponible</span>'; f.className = 'validation-msg text-end'; }
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
    if((await Swal.fire({title:'¿Eliminar?',text:"Afectará el saldo actual.",icon:'warning',showCancelButton:true,confirmButtonColor:'#d33',confirmButtonText:'Sí, eliminar'})).isConfirmed){
        await authFetch(`/api/finanzas/transacciones/${id}`,{method:'DELETE'});
        cargarDashboardFinanzas();
    }
}

async function editarTransaccion(idx) {
    const t = transacciones[idx];
    const fechaISO = new Date(t.fecha).toISOString().split('T')[0];
    
    // Recuperamos el modal detallado de la versión anterior
    const { value: formValues } = await Swal.fire({
        title: 'Editar Transacción',
        html: `
            <div class="text-start fs-6">
                <div class="row g-2 mb-3">
                    <div class="col-6"><label class="small fw-bold">Fecha</label><input id="sw-f" type="date" class="form-control" value="${fechaISO}"></div>
                    <div class="col-6"><label class="small fw-bold">Doc/Recibo</label><input id="sw-r" type="text" class="form-control" value="${t.recibo_no}"></div>
                </div>
                <div class="mb-3"><label class="small fw-bold">Categoría</label><input id="sw-c" type="text" class="form-control" value="${t.categoria}"></div>
                <div class="mb-3"><label class="small fw-bold">Descripción</label><textarea id="sw-d" class="form-control" rows="2">${t.descripcion}</textarea></div>
                <div class="row g-2">
                    <div class="col-6"><label class="small fw-bold">Monto</label><input id="sw-m" type="number" step="0.01" class="form-control fw-bold" value="${t.monto}"></div>
                    <div class="col-6"><label class="small fw-bold">Comulgantes</label><input id="sw-co" type="number" class="form-control" value="${t.comulgantes||0}"></div>
                </div>
            </div>`,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        focusConfirm: false,
        preConfirm: () => ({
            fecha: document.getElementById('sw-f').value, recibo_no: document.getElementById('sw-r').value,
            categoria: document.getElementById('sw-c').value, descripcion: document.getElementById('sw-d').value,
            monto: document.getElementById('sw-m').value, comulgantes: document.getElementById('sw-co').value
        })
    });
    
    if(formValues) {
        await authFetch(`/api/finanzas/transacciones/${t.id}`,{method:'PUT',body:JSON.stringify(formValues)});
        Swal.fire({icon:'success',title:'Actualizado',toast:true,position:'top-end',showConfirmButton:false,timer:1500});
        cargarDashboardFinanzas();
    }
}

// ==========================================
// 8. CONFIGURACIÓN TALONARIOS Y CATEGORÍAS (LÓGICA ROBUSTA RESTAURADA)
// ==========================================

function renderConfigFinanzas() {
    const card = (t, i, tp) => `
    <div class="col-md-6">
        <div class="md-card p-3 border-start border-4 ${tp==='ingreso'?'border-success':'border-danger'}">
            <div class="d-flex justify-content-between mb-2"><span class="fw-bold text-dark">${t.nombre}</span>${t.activo?'<span class="badge bg-success">Activo</span>':'<span class="badge bg-secondary">Inactivo</span>'}</div>
            <div class="d-flex justify-content-between align-items-end">
                <small class="text-muted">Rango: ${t.inicio} - ${t.fin}<br><strong class="fs-5 text-dark">#${t.actual}</strong></small>
                <div>
                    ${!t.activo?`<button onclick="actTal(${t.id},'${tp}')" class="btn btn-sm btn-outline-dark" title="Activar"><i class="bi bi-power"></i></button>`:''}
                    <button onclick="editarTalonario('${tp}',${i})" class="btn btn-sm btn-outline-primary" title="Editar"><i class="bi bi-pencil"></i></button>
                    <button onclick="delTal(${t.id})" class="btn btn-sm btn-outline-danger" title="Borrar"><i class="bi bi-trash"></i></button>
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
                        <div class="tab-pane active" id="tIng"><button onclick="nuevoTalonario('ingreso')" class="btn btn-success w-100 mb-3">Nuevo Talonario</button><div class="row g-3">${talonariosIngreso.map((t,i)=>card(t,i,'ingreso')).join('')}</div></div>
                        <div class="tab-pane" id="tEgr"><button onclick="nuevoTalonario('egreso')" class="btn btn-danger w-100 mb-3">Nueva Chequera</button><div class="row g-3">${talonariosEgreso.map((t,i)=>card(t,i,'egreso')).join('')}</div></div>
                    </div>
                </div>
            </div>
            <div class="col-lg-5">
                <div class="md-card p-4">
                    <h6 class="fw-bold mb-3">Categorías</h6>
                    <div class="input-group mb-3"><input id="nCat" class="form-control" placeholder="Nueva..."><button onclick="addCat()" class="btn btn-dark"><i class="bi bi-plus"></i></button></div>
                    <div>${categoriasEgresos.map(c=>`<span class="md-chip me-1 mb-1 bg-light border">${c.nombre} <i class="bi bi-x text-danger ms-1 cursor-pointer" onclick="delCat(${c.id})"></i></span>`).join('')}</div>
                </div>
            </div>
        </div>
    </div>`;
}

// Helpers Restaurados con Formularios Bootstrap dentro de SweetAlert
async function nuevoTalonario(tipo) {
    const { value: f } = await Swal.fire({
        title: `Nuevo (${tipo})`,
        html: `
            <div class="text-start">
                <div class="mb-2"><label class="small fw-bold">Nombre</label><input id="sw-nom" class="form-control" placeholder="Ej: Serie A"></div>
                <div class="row g-2">
                    <div class="col-6"><label class="small fw-bold">Inicio</label><input id="sw-ini" type="number" class="form-control" placeholder="1"></div>
                    <div class="col-6"><label class="small fw-bold">Fin</label><input id="sw-fin" type="number" class="form-control" placeholder="100"></div>
                </div>
            </div>`,
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => [document.getElementById('sw-nom').value, document.getElementById('sw-ini').value, document.getElementById('sw-fin').value]
    });

    if (f && f[0]) {
        try { 
            await authFetch('/api/finanzas/talonarios', { method: 'POST', body: JSON.stringify({ nombre: f[0], inicio: parseInt(f[1]), fin: parseInt(f[2]), actual: parseInt(f[1])-1, tipo: tipo }) }); 
            // Recargar silenciosamente
            const d = await authFetch('/api/finanzas/datos');
            const mapped = d.talonarios.map(t => ({...t, inicio: t.rango_inicio, fin: t.rango_fin, usados: []}));
            talonariosIngreso = mapped.filter(t => t.tipo === 'ingreso');
            talonariosEgreso = mapped.filter(t => t.tipo === 'egreso');
            renderConfigFinanzas();
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    }
}

async function editarTalonario(tipo, idx) {
    const lista = tipo === 'ingreso' ? talonariosIngreso : talonariosEgreso;
    const t = lista[idx];
    const { value: f } = await Swal.fire({
        title: 'Editar Rango',
        html: `
            <div class="text-start">
                <div class="mb-2"><label class="small fw-bold">Nombre</label><input id="sw-nom" class="form-control" value="${t.nombre}"></div>
                <div class="row g-2">
                    <div class="col-6"><label class="small fw-bold">Inicio</label><input id="sw-ini" type="number" class="form-control" value="${t.inicio}"></div>
                    <div class="col-6"><label class="small fw-bold">Fin</label><input id="sw-fin" type="number" class="form-control" value="${t.fin}"></div>
                </div>
            </div>`,
        showCancelButton: true,
        preConfirm: () => [document.getElementById('sw-nom').value, document.getElementById('sw-ini').value, document.getElementById('sw-fin').value]
    });

    if (f) {
        await authFetch(`/api/finanzas/talonarios/${t.id}`, { method: 'PUT', body: JSON.stringify({ nombre: f[0], inicio: parseInt(f[1]), fin: parseInt(f[2]) }) });
        t.nombre = f[0]; t.inicio = parseInt(f[1]); t.fin = parseInt(f[2]);
        renderConfigFinanzas();
    }
}

async function actTal(id,tp){await authFetch(`/api/finanzas/talonarios/${id}`,{method:'PUT',body:JSON.stringify({activo:true,tipo:tp})});cargarDashboardFinanzas();setTimeout(renderConfigFinanzas,300);}
async function delTal(id){if((await Swal.fire({title:'¿Borrar?',icon:'warning',showCancelButton:true})).isConfirmed){await authFetch(`/api/finanzas/talonarios/${id}`,{method:'DELETE'});cargarDashboardFinanzas();setTimeout(renderConfigFinanzas,300);}}
async function addCat(){const v=document.getElementById('nCat').value;if(v){await authFetch('/api/finanzas/categorias',{method:'POST',body:JSON.stringify({nombre:v})});const d=await authFetch('/api/finanzas/datos');categoriasEgresos=d.categorias;renderConfigFinanzas();}}
async function delCat(id){await authFetch(`/api/finanzas/categorias/${id}`,{method:'DELETE'});const d=await authFetch('/api/finanzas/datos');categoriasEgresos=d.categorias;renderConfigFinanzas();}