// ==========================================
// MÓDULO CALENDARIO & TARJETAS
// ==========================================

let fechaCalendario = new Date(); // Fecha actual para navegación
let miembroSeleccionadoTarjeta = null; // Variable global para saber a quién descargar

// 1. CARGAR CALENDARIO
async function cargarCalendario() {
    const grid = document.getElementById('gridCalendario');
    const titulo = document.getElementById('mesCalendarioTitulo');
    
    if(!grid || !titulo) return;

    // Si la caché de miembros está vacía (usuario entró directo aquí), la cargamos
    // Nota: 'listaMiembrosCache' viene de script.js, asegúrate que sea global
    if (typeof listaMiembrosCache === 'undefined' || listaMiembrosCache.length === 0) {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/miembros', { headers: { 'Authorization': token } });
            // Asignamos a la variable global del window para compartirla
            window.listaMiembrosCache = await res.json();
        } catch (e) { console.error("Error cargando miembros para calendario:", e); return; }
    }

    const miembros = window.listaMiembrosCache || [];
    
    // Configuración de Fechas
    const anio = fechaCalendario.getFullYear();
    const mes = fechaCalendario.getMonth();
    
    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    titulo.innerText = `${nombresMeses[mes]} ${anio}`;

    // Lógica del Grid
    const primerDiaMes = new Date(anio, mes, 1).getDay(); // 0 = Domingo
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();
    
    grid.innerHTML = '';

    // Rellenar espacios vacíos antes del día 1
    for (let i = 0; i < primerDiaMes; i++) {
        grid.innerHTML += `<div class="calendar-day bg-light opacity-25 border-0"></div>`;
    }

    // Rellenar días del mes
    for (let dia = 1; dia <= diasEnMes; dia++) {
        // Filtrar cumpleañeros
        const cumpleanerosDia = miembros.filter(m => {
            if (!m.fecha_nacimiento) return false;
            // Ajuste seguro de zona horaria leyendo el string YYYY-MM-DD
            const partes = new Date(m.fecha_nacimiento).toISOString().split('T')[0].split('-');
            const mesNac = parseInt(partes[1]) - 1;
            const diaNac = parseInt(partes[2]);
            return mesNac === mes && diaNac === dia;
        });

        // Crear etiquetas (Pills)
        let pillsHTML = '';
        cumpleanerosDia.forEach(m => {
            // Escapar comillas para el HTML onclick
            const mStr = JSON.stringify(m).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            pillsHTML += `
                <div class="birthday-pill shadow-sm" onclick="generarTarjetaPreview('${mStr}')">
                    <i class="bi bi-gift-fill me-1"></i> ${m.nombre.split(' ')[0]}
                </div>
            `;
        });

        // Marcar "Hoy"
        const esHoy = (
            dia === new Date().getDate() && 
            mes === new Date().getMonth() && 
            anio === new Date().getFullYear()
        ) ? 'today' : '';

        grid.innerHTML += `
            <div class="calendar-day ${esHoy}">
                <span class="day-number">${dia}</span>
                <div class="d-flex flex-column gap-1 w-100">
                    ${pillsHTML}
                </div>
            </div>
        `;
    }
}

// 2. NAVEGACIÓN DE MESES
window.cambiarMes = (delta) => {
    fechaCalendario.setMonth(fechaCalendario.getMonth() + delta);
    cargarCalendario();
};

// 3. GENERAR PREVIEW TARJETA
window.generarTarjetaPreview = (miembroInput) => {
    // Si viene texto (desde el HTML onclick), lo parseamos a Objeto
    const m = typeof miembroInput === 'string' ? JSON.parse(miembroInput) : miembroInput;
    
    const area = document.getElementById('areaTarjeta');
    const btn = document.getElementById('btnDescargarTarjeta');
    
    if(!area) return;

    // Iniciales
    const iniciales = m.nombre.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
    
    // Edad
    const anioNac = parseInt(new Date(m.fecha_nacimiento).toISOString().split('-')[0]);
    const edad = new Date().getFullYear() - anioNac;

    // Inyectar HTML de la tarjeta
    area.innerHTML = `
        <div id="tarjetaParaDescargar" class="birthday-card-design">
            <div class="card-decor-circle" style="width: 200px; height: 200px; top: -60px; left: -60px;"></div>
            <div class="card-decor-circle" style="width: 120px; height: 120px; bottom: -20px; right: -40px; background: rgba(255,255,255,0.05);"></div>
            
            <div style="position:absolute; top: 25px; right:25px; opacity:0.4;">
                <i class="bi bi-stars fs-1"></i>
            </div>

            <div style="z-index: 10; width: 100%;">
                <div class="text-uppercase small mb-3 fw-bold" style="letter-spacing: 3px; opacity: 0.9;">¡Feliz Día!</div>
                
                <div class="d-flex justify-content-center">
                    <div class="card-avatar">
                        ${iniciales}
                    </div>
                </div>

                <h2 class="fw-bold mb-2 text-white" style="text-shadow: 0 2px 10px rgba(0,0,0,0.2);">${m.nombre}</h2>
                
                <div class="d-inline-block bg-white text-primary rounded-pill px-4 py-2 mb-4 fw-bold shadow-sm">
                    🎂 Cumple ${edad} Años
                </div>

                <hr style="border-color: rgba(255,255,255,0.3); width: 50%; margin: 0 auto 1.5rem auto;">

                <p class="fst-italic opacity-90 small px-2" style="font-family: 'Georgia', serif; line-height: 1.6;">
                    "El Señor te bendiga, y te guarde; El Señor haga resplandecer su rostro sobre ti."
                    <br><strong class="mt-2 d-block text-uppercase" style="font-family: sans-serif; font-size: 0.7rem; letter-spacing: 1px;">Números 6:24</strong>
                </p>
            </div>

            <div style="position: absolute; bottom: 20px; display: flex; align-items: center; gap: 6px; opacity: 0.8;">
                <i class="bi bi-check-circle-fill small"></i>
                <span style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Iglesia Cristiana Luterana El Buen Pastor</span>
            </div>
        </div>
    `;

    // Activar botón descarga
    if(btn) btn.disabled = false;
    miembroSeleccionadoTarjeta = m;
};

// 4. DESCARGAR IMAGEN
window.descargarTarjeta = () => {
    const elemento = document.getElementById('tarjetaParaDescargar');
    const btn = document.getElementById('btnDescargarTarjeta');
    
    if(!elemento || !miembroSeleccionadoTarjeta) return;

    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Generando HD...';
    btn.disabled = true;
    
    // Usamos html2canvas (debe estar importado en index.html)
    html2canvas(elemento, { 
        scale: 3, // Alta resolución
        backgroundColor: null,
        logging: false,
        useCORS: true
    }).then(canvas => {
        const link = document.createElement('a');
        // Nombre limpio del archivo
        const nombreArchivo = `FelizCumple_${miembroSeleccionadoTarjeta.nombre.replace(/\s+/g,'_')}.png`;
        
        link.download = nombreArchivo;
        link.href = canvas.toDataURL("image/png");
        link.click();
        
        // Restaurar botón
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }).catch(err => {
        console.error("Error generando imagen:", err);
        btn.innerHTML = 'Error al generar';
        setTimeout(() => { btn.innerHTML = textoOriginal; btn.disabled = false; }, 2000);
    });
};