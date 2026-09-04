// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = 'https://vmminpanvxxdczzmopua.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWlucGFudnh4ZGN6em1vcHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzU1MDQsImV4cCI6MjEwMzg1MTUwNH0.K3eWFErUjf3_VhZ8Jr7ZID3NnHp7vM8kwZZFwNoRaiU';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables de Estado Global
let usuarioActual = null; // Ejemplo: { nombre: 'Mikaela', apellido: 'Alvarez', legajo: '51000364', rol: 'admin' }
let filtroIdeasActual = 'mias'; // 'mias' o 'todas'
let filtroEstadoActual = 'TODOS'; // 'TODOS', 'ABIERTO', 'CERRADO'
let kaizenEditandoId = null;

// Inicialización al cargar la ventana
window.addEventListener('DOMContentLoaded', () => {
    // Revisar si ya hay sesión guardada en localStorage
    const sesionGuardada = localStorage.getItem('kaizen_user');
    if (sesionGuardada) {
        usuarioActual = JSON.parse(sesionGuardada);
        // Forzar rol Admin si la legajo es 51000364
        if (usuarioActual.legajo === '51000364') {
            usuarioActual.rol = 'admin';
        }
        mostrarAppPrincipal();
    }
});

// --- AUTENTICACIÓN Y PESTAÑAS DE LOGIN ---
function cambiarModoAuth(modo) {
    const slider = document.getElementById('authSliderBg');
    const btnLogin = document.getElementById('tabLoginBtn');
    const btnRegister = document.getElementById('tabRegisterBtn');
    const formLogin = document.getElementById('formLogin');
    const formRegister = document.getElementById('formRegister');

    if (modo === 'login') {
        slider.className = 'auth-slider-bg left';
        btnLogin.classList.add('active');
        btnRegister.classList.remove('active');
        formLogin.classList.add('active');
        formRegister.classList.remove('active');
    } else {
        slider.className = 'auth-slider-bg right';
        btnRegister.classList.add('active');
        btnLogin.classList.remove('active');
        formRegister.classList.add('active');
        formLogin.classList.remove('active');
    }
}

// Botón de Iniciar Sesión
document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const legajo = document.getElementById('legajoInput').value.trim();
    if (!legajo) {
        alert('Por favor ingresa tu legajo');
        return;
    }

    try {
        // Consultar en la tabla de usuarios de Supabase
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('Legajo', Legajo)
            .single();

        if (error || !data) {
            alert('Legajo no encontrado. Por favor regístrate primero.');
            return;
        }

        usuarioActual = data;

        // Regla específica solicitada: legajo 51000364 es Administrador
        if (usuarioActual.legajo === '51000364') {
            usuarioActual.rol = 'admin';
        }

        localStorage.setItem('kaizen_user', JSON.stringify(usuarioActual));
        mostrarAppPrincipal();
    } catch (err) {
        console.error(err);
        alert('Error al conectar con la base de datos');
    }
});

// Botón de Registro de Nuevo Piloto
document.getElementById('registerBtn')?.addEventListener('click', async () => {
    const nombre = document.getElementById('nombreInput').value.trim();
    const apellido = document.getElementById('apellidoInput').value.trim();
    const legajo = document.getElementById('legajoRegistroInput').value.trim();

    if (!nombre || !apellido || !legajo) {
        alert('Completa todos los campos para registrarte.');
        return;
    }

    try {
        // Definir rol inicial (Admin automático si es 51000364)
        const rol = (legajo === '51000364') ? 'admin' : 'usuario';

        const { data, error } = await supabaseClient
            .from('usuarios')
            .insert([{ nombre, apellido, legajo, rol }])
            .select()
            .single();

        if (error) {
            alert('Error al registrar: ' + error.message);
            return;
        }

        usuarioActual = data;
        localStorage.setItem('kaizen_user', JSON.stringify(usuarioActual));
        alert('¡Registro exitoso!');
        mostrarAppPrincipal();
    } catch (err) {
        console.error(err);
        alert('Ocurrió un error en el registro.');
    }
});

function cerrarSesion() {
    localStorage.removeItem('kaizen_user');
    usuarioActual = null;
    document.getElementById('appArea').classList.add('hidden');
    document.getElementById('loginArea').classList.remove('hidden');
}

// --- TRANSICIÓN A LA APP PRINCIPAL ---
function mostrarAppPrincipal() {
    document.getElementById('loginArea').classList.add('hidden');
    document.getElementById('appArea').classList.remove('hidden');

    // Actualizar datos en la cinta superior (Header)
    const tituloRol = document.getElementById('tituloPrincipalRol');
    const spanUsuario = document.getElementById('usuarioActual');
    const roleBadge = document.getElementById('roleBadge');

    // Título grande superior
    tituloRol.textContent = "PILOTO DE MEJORA";

    // Nombre y cédula pequeño abajo (ej: mikaelaalvarez51000364 o con espacios legibles)
    const nombreCompleto = `${usuarioActual.nombre || ''} ${usuarioActual.apellido || ''}`.trim();
    spanUsuario.textContent = `${nombreCompleto} (${usuarioActual.legajo})`;

    // Ajustar Indicador de Rol (Admin o Usuario)
    if (usuarioActual.legajo === '51000364' || usuarioActual.rol === 'admin') {
        roleBadge.textContent = "Admin";
        roleBadge.style.background = "#eff6ff";
        roleBadge.style.color = "#1d4ed8";
        roleBadge.style.borderColor = "#bfdbfe";
    } else {
        roleBadge.textContent = "Usuario";
        roleBadge.style.background = "#f1f5f9";
        roleBadge.style.color = "var(--text-muted)";
        roleBadge.style.borderColor = "var(--border-card)";
    }

    // Cargar datos iniciales de la app
    cargarDatosTablero();
}

// --- NAVEGACIÓN ENTRE PESTAÑAS ---
function cambiarPestana(idTab, elementoBtn) {
    // Ocultar todas las pestañas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    // Mostrar la seleccionada
    document.getElementById(idTab).classList.add('active');

    // Actualizar botones de la barra inferior
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    if (elementoBtn) {
        elementoBtn.classList.add('active');
    }

    if (idTab === 'tabIdeas') {
        cargarDatosTablero();
    } else if (idTab === 'tabPista') {
        cargarPistaCarreras();
    }
}

// --- MODAL DE NUEVO KAIZEN ---
function abrirModalRegistro() {
    document.getElementById('modalRegistro').classList.remove('hidden');
}

function cerrarModalRegistro() {
    document.getElementById('modalRegistro').classList.add('hidden');
    document.getElementById('titulo').value = '';
    document.getElementById('area').value = '';
    document.getElementById('descripcion').value = '';
}

function seleccionarTipoKaizen(tipo) {
    document.getElementById('tipo').value = tipo;
    if (tipo === 'Quick') {
        document.getElementById('cardQuick').classList.add('selected');
        document.getElementById('cardStandard').classList.remove('selected');
    } else {
        document.getElementById('cardStandard').classList.add('selected');
        document.getElementById('cardQuick').classList.remove('selected');
    }
}

document.getElementById('guardarIdea')?.addEventListener('click', async () => {
    const titulo = document.getElementById('titulo').value.trim();
    const area = document.getElementById('area').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();
    const tipo = document.getElementById('tipo').value;

if (
    !titulo ||
    !area ||
    !descripcion
) {

    alert(
        'Debes completar Área, Título y Descripción.'
    );

    return;
}

    try {
        const { error } = await supabaseClient.from('ideas').insert([{
            titulo,
            area: area,
            descripcion,
            tipo,
            estado: 'ABIERTO',
            usuario_legajo: usuarioActual.legajo,
            usuario_nombre: `${usuarioActual.nombre} ${usuarioActual.apellido || ''}`.trim()
        }]);

        if (error) throw error;

        alert('¡Propuesta registrada con éxito!');
        cerrarModalRegistro();
        cambiarPestana('tabIdeas', document.querySelectorAll('.bottom-nav .nav-item')[1]);
    } catch (err) {
        console.error(err);
        alert('Error al registrar la propuesta.');
    }
});

// --- GESTIÓN DE TAREAS / IDEAS ---
function cambiarFiltroIdeas(filtro) {
    filtroIdeasActual = filtro;
    const slider = document.getElementById('filterSliderBg');
    const btnMias = document.getElementById('tabMiasBtn');
    const btnTodas = document.getElementById('tabTodasBtn');

    if (filtro === 'mias') {
        slider.className = 'auth-slider-bg filter-slider left';
        btnMias.classList.add('active');
        btnTodas.classList.remove('active');
    } else {
        slider.className = 'auth-slider-bg filter-slider right';
        btnTodas.classList.add('active');
        btnMias.classList.remove('active');
    }
    cargarDatosTablero();
}

function filtrarPorEstado(estado) {
    filtroEstadoActual = estado;
    cargarDatosTablero();
}

async function cargarDatosTablero() {
    try {
        const { data, error } = await supabaseClient
            .from('ideas')
            .select('*')
            .order('fecha_creacion', { ascending: false });

        if (error) throw error;

        const misKaizens =
    data.filter(
        k =>
            String(k.usuario_legajo) ===
            String(usuarioActual.legajo)
    );

const dataset =
    filtroIdeasActual === 'mias'
        ? misKaizens
        : data;

// Contadores dinámicos según el filtro seleccionado
const totalMias =
    dataset.length;

const abiertasMias =
    dataset.filter(
        k => k.estado === 'ABIERTO'
    ).length;

const cerradasMias =
    dataset.filter(
        k => k.estado === 'CERRADO'
    ).length;

document.getElementById('countTotal').textContent =
    totalMias;

document.getElementById('countAbiertas').textContent =
    abiertasMias;

document.getElementById('countCerradas').textContent =
    cerradasMias;

// Lista a mostrar según filtro
let listaFiltrada = dataset;

if (filtroEstadoActual !== 'TODOS') {

    listaFiltrada =
        listaFiltrada.filter(
            k => k.estado === filtroEstadoActual
        );
}

document.getElementById(
    'tituloIndicador'
).textContent =
    filtroIdeasActual === 'mias'
        ? 'MI PROGRESO'
        : 'PROGRESO DE PLANTA';

document.getElementById(
    'iconoIndicador'
).textContent =
    filtroIdeasActual === 'mias'
        ? '👋'
        : '🏭';
        
renderizarListaIdeas(listaFiltrada);
    } catch (err) {
        console.error(err);
    }
}

function renderizarListaIdeas(kaizens) {
    
    console.log("Kaizens recibidos:", kaizens);
    
    const contenedor = document.getElementById('listaIdeas');
    contenedor.innerHTML = '';

    if (kaizens.length === 0) {
        contenedor.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px;">No hay propuestas registradas con este filtro.</p>`;
        return;
    }

    kaizens.forEach(k => {
        const esAdmin = (usuarioActual.legajo === '51000364' || usuarioActual.rol === 'admin');
        const esPropio =
    String(k.usuario_legajo) ===
    String(usuarioActual.legajo);
        const estadoClase = k.estado === 'CERRADO' ? 'status-cerrado' : 'status-abierto';

       let htmlBotonesAccion = '';

if (esAdmin) {

    htmlBotonesAccion = `
        <div style="display:flex; gap:8px; margin-top:12px; padding-top:10px; border-top:1px solid var(--border);">

            <button
                onclick="abrirEdicion('${k.id}')"
                style="background: var(--warning); color:white; padding:6px 12px; font-size:11px; border-radius:8px; width:auto;">
                Editar
            </button>

            <button
                onclick="cambiarEstadoKaizen('${k.id}', '${k.estado === 'ABIERTO' ? 'CERRADO' : 'ABIERTO'}')"
                style="background: var(--primary-light); color:white; padding:6px 12px; font-size:11px; border-radius:8px; width:auto;">
                ${k.estado === 'ABIERTO' ? 'Marcar Cerrado' : 'Marcar Abierto'}
            </button>

            <button
                onclick="eliminarKaizen('${k.id}')"
                style="background: var(--danger); color:white; padding:6px 12px; font-size:11px; border-radius:8px; width:auto;">
                Eliminar
            </button>

        </div>
    `;

}
else if (esPropio) {

    htmlBotonesAccion = `
        <div style="display:flex; gap:8px; margin-top:12px; padding-top:10px; border-top:1px solid var(--border);">

            <button
                onclick="abrirEdicion('${k.id}')"
                style="background: var(--warning); color:white; padding:6px 12px; font-size:11px; border-radius:8px; width:auto;">
                Editar
            </button>

        </div>
    `;

}

        const card = document.createElement('div');
        card.className = 'idea-card';
        card.innerHTML = `
            <div class="idea-header-row">
                <div class="badges-group">
                    <span class="status-badge ${estadoClase}">${k.estado}</span>
                    <span class="status-badge badge-tipo">${k.tipo}</span>
                    <span class="status-badge badge-tipo">${k.area}</span>
                </div>
            </div>
            <h4 class="idea-title">${k.titulo}</h4>
            <p class="idea-desc">${k.descripcion}</p>
            <div class="idea-footer-row">
                <span>Por: ${k.usuario_nombre || 'Piloto'}</span>
                <span>${new Date(k.fecha_creacion).toLocaleDateString()}</span>
            </div>
            ${htmlBotonesAccion}
        `;
        contenedor.appendChild(card);
    });
}

async function abrirEdicion(id) {

    try {

        const { data, error } =
            await supabaseClient
                .from('ideas')
                .select('*')
                .eq('id', id)
                .single();

        if (error) throw error;

        kaizenEditandoId = id;

        document.getElementById(
            'editTitulo'
        ).value = data.titulo || '';

        document.getElementById(
            'editArea'
        ).value = data.area || '';

        document.getElementById(
            'editTipo'
        ).value = data.tipo || 'Quick';

        document.getElementById(
            'editDescripcion'
        ).value = data.descripcion || '';

        document.getElementById(
            'editModal'
        ).classList.remove('hidden');

    } catch (err) {

        console.error(err);

        alert('No se pudo abrir la edición.');

    }
}

async function guardarEdicion() {

    try {

        const { error } =
            await supabaseClient
                .from('ideas')
                .update({
                    titulo:
                        document.getElementById('editTitulo').value,

                    area:
                        document.getElementById('editArea').value,

                    tipo:
                        document.getElementById('editTipo').value,

                    descripcion:
                        document.getElementById('editDescripcion').value
                })
                .eq('id', kaizenEditandoId);

        if (error) throw error;

        document.getElementById(
            'editModal'
        ).classList.add('hidden');

        cargarDatosTablero();

    } catch (err) {

        console.error(err);

        alert('No se pudo guardar.');

    }
}

function cancelarEdicion() {

    document.getElementById(
        'editModal'
    ).classList.add('hidden');
}

// --- ACCIONES DE MODIFICACIÓN DE TAREAS ---
async function cambiarEstadoKaizen(id, nuevoEstado) {
    try {
        const { error } = await supabaseClient
            .from('ideas')
            .update({ estado: nuevoEstado })
            .eq('id', id);

        if (error) throw error;
        cargarDatosTablero();
    } catch (err) {
        console.error(err);
        alert('No se pudo cambiar el estado.');
    }
}

async function eliminarKaizen(id) {
    if (!confirm('¿Estás seguro de eliminar esta propuesta?')) return;
    try {
        const { error } = await supabaseClient
            .from('ideas')
            .delete()
            .eq('id', id);

        if (error) throw error;
        cargarDatosTablero();
    } catch (err) {
        console.error(err);
        alert('No se pudo eliminar la propuesta.');
    }
}

// --- PESTAÑA PISTA / RANKING ---
async function cargarPistaCarreras() {

    try {

        const { data, error } =
            await supabaseClient
                .from('ideas')
                .select('*');

        if (error) throw error;

        const rankingMap = {};

        data.forEach(k => {

            if (!k.usuario_legajo) return;

            if (!rankingMap[k.usuario_legajo]) {

                rankingMap[k.usuario_legajo] = {
                    nombre: k.usuario_nombre || 'Piloto',
                    legajo: k.usuario_legajo,
                    puntos: 0,
                    total: 0
                };
            }

            rankingMap[k.usuario_legajo].total++;

            if (k.estado === 'CERRADO') {

                const puntos =
                    k.tipo === 'Standard'
                        ? 3
                        : 1;

                rankingMap[k.usuario_legajo].puntos += puntos;
            }
        });

        const rankingArray =
            Object.values(rankingMap)
                .sort((a, b) => b.puntos - a.puntos);

        const misDatos =
            rankingArray.find(
                r => r.legajo === usuarioActual.legajo
            );

        const misPuntos =
            misDatos
                ? misDatos.puntos
                : 0;

        document.getElementById(
            'misKaizensCerradosNum'
        ).textContent = misPuntos;

        const miPosicionIndex =
            rankingArray.findIndex(
                r => r.legajo === usuarioActual.legajo
            );

        document.getElementById(
            'posicionTexto'
        ).textContent =
            miPosicionIndex !== -1
                ? `#${miPosicionIndex + 1}`
                : '-';

cargarDashboard(data);
        
        renderizarPistaPilotos(
            rankingArray
        );

    } catch (err) {

        console.error(err);

    }
}

function cargarDashboard(ideas) {

    document.getElementById(
        'dashTotal'
    ).textContent =
        ideas.length;

    document.getElementById(
        'dashAbiertas'
    ).textContent =
        ideas.filter(
            i => i.estado === 'ABIERTO'
        ).length;

    document.getElementById(
        'dashCerradas'
    ).textContent =
        ideas.filter(
            i => i.estado === 'CERRADO'
        ).length;

    document.getElementById(
        'dashQuick'
    ).textContent =
        ideas.filter(
            i => i.tipo === 'Quick'
        ).length;

    document.getElementById(
        'dashStandard'
    ).textContent =
        ideas.filter(
            i => i.tipo === 'Standard'
        ).length;

    document.getElementById(
        'dashParticipantes'
    ).textContent =
        new Set(
            ideas.map(
                i => i.usuario_ci
            )
        ).size;
}

function renderizarPistaPilotos(ranking) {

    const contenedor =
        document.getElementById(
            'pistaPilotosContainer'
        );

    contenedor.innerHTML = '';

    if (ranking.length === 0) {

        contenedor.innerHTML =
            '<p style="text-align:center;">Aún no hay actividad en la pista.</p>';

        return;
    }

    const maxPuntos =
        Math.max(
            ...ranking.map(
                r => r.puntos
            ),
            5
        );

    ranking.forEach((piloto, index) => {

        let porcentaje =
            (piloto.puntos / maxPuntos) * 85;

        if (porcentaje > 88)
            porcentaje = 88;

        const esMiCarro =
            piloto.legajo === usuarioActual.legajo;

        const card =
            document.createElement('div');

        card.className = 'racer-card';

        card.style.borderColor =
            esMiCarro
                ? 'var(--primary-light)'
                : 'var(--border-card)';

        card.style.background =
            esMiCarro
                ? '#f8fafc'
                : '#ffffff';

        card.innerHTML = `
            <div class="racer-info">
                <span>
                    #${index + 1}
                    ${piloto.nombre}
                    ${esMiCarro ? '(Tú)' : ''}
                </span>

                <span style="color: var(--success); font-weight:700;">
    ${piloto.puntos} pts
</span>

<span style="color: var(--text-muted);">
    • ${piloto.total} ideas
</span>
            </div>

            <div class="racer-track-line">
                <div
                    class="racer-car-icon"
                    style="left:${porcentaje}%;">
                    🏎️
                </div>

                <div class="racer-flag-icon">
                    🏁
                </div>
            </div>
        `;

        contenedor.appendChild(card);

    });

}

document
.getElementById('guardarEdicion')
?.addEventListener(
    'click',
    guardarEdicion
);

document
.getElementById('cancelarEdicion')
?.addEventListener(
    'click',
    cancelarEdicion
);
