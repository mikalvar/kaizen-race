// ==========================================
// KAIZEN RACE 2.0 - APP.JS
// ==========================================

// CONFIGURACIÓN DE SUPABASE

const SUPABASE_URL = 'https://vmminpanvxxdczzmopua.supabase.co';

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWlucGFudnh4ZGN6em1vcHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzU1MDQsImV4cCI6MjEwMzg1MTUwNH0.K3eWFErUjf3_VhZ8Jr7ZID3NnHp7vM8kwZZFwNoRaiU';

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// VARIABLES GLOBALES

let usuarioActual = null;
let filtroIdeasActual = 'mias';
let filtroEstadoActual = 'TODOS';
let kaizenEditandoId = null;
let ideasParaRankingMensual = [];
let propietarioEdicion = null;

const $ = id => document.getElementById(id);

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function esAdministradorKaizen() {
    return Boolean(usuarioActual && (
        String(usuarioActual.legajo) === '51000364' ||
        usuarioActual.rol === 'admin'
    ));
}

function crearElemento(tag, clase, texto) {
    const elemento = document.createElement(tag);

    if (clase) elemento.className = clase;

    if (texto !== undefined) {
        elemento.textContent = texto;
    }

    return elemento;
}

function crearBoton(texto, clase, accion) {
    const boton = crearElemento('button', clase, texto);

    boton.type = 'button';
    boton.addEventListener('click', accion);

    return boton;
}

function formatoFecha(valor) {
    if (!valor) return '';

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) return '';

    return fecha.toLocaleDateString('es-PY', {
        timeZone: 'America/Asuncion'
    });
}

function fechaISOParaguay(valor) {
    if (!valor) return '';

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) return '';

    const partes = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Asuncion',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(fecha);

    const obtener = tipo =>
        partes.find(p => p.type === tipo).value;

    return `${obtener('year')}-${obtener('month')}-${obtener('day')}`;
}

function obtenerPuntos(idea) {
    return idea.tipo === 'Standard' ? 3 : 1;
}

function obtenerIniciales(nombre) {
    return String(nombre || 'Piloto')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(n => n[0] || '')
        .join('')
        .toUpperCase();
}

function asignarTexto(id, valor) {
    const elemento = $(id);

    if (elemento) {
        elemento.textContent = valor;
    }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

window.addEventListener('DOMContentLoaded', () => {

    const sesionGuardada =
        localStorage.getItem('kaizen_user');

    if (!sesionGuardada) return;

    try {
        usuarioActual = JSON.parse(sesionGuardada);

        if (!usuarioActual || !usuarioActual.legajo) {
            throw new Error('Sesión inválida');
        }

        if (String(usuarioActual.legajo) === '51000364') {
            usuarioActual.rol = 'admin';
        }

        mostrarAppPrincipal();

    } catch (error) {
        console.error(error);
        localStorage.removeItem('kaizen_user');
        usuarioActual = null;
    }
});

// ==========================================
// LOGIN Y REGISTRO
// ==========================================

function cambiarModoAuth(modo) {

    const slider = $('authSliderBg');
    const btnLogin = $('tabLoginBtn');
    const btnRegister = $('tabRegisterBtn');
    const formLogin = $('formLogin');
    const formRegister = $('formRegister');

    const login = modo === 'login';

    slider.className =
        'auth-slider-bg ' + (login ? 'left' : 'right');

    btnLogin.classList.toggle('active', login);
    btnRegister.classList.toggle('active', !login);

    formLogin.classList.toggle('active', login);
    formRegister.classList.toggle('active', !login);
}

$('loginBtn')?.addEventListener('click', async () => {

    const legajo = $('legajoInput').value.trim();

    if (!legajo) {
        alert('Por favor ingresa tu legajo.');
        return;
    }

    const boton = $('loginBtn');
    const textoOriginal = boton.textContent;

    boton.disabled = true;
    boton.textContent = 'Ingresando...';

    try {

        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('legajo', legajo)
            .single();

        if (error || !data) {
            alert('Legajo no encontrado. Regístrate primero.');
            return;
        }

        usuarioActual = data;

        if (String(usuarioActual.legajo) === '51000364') {
            usuarioActual.rol = 'admin';
        }

        localStorage.setItem(
            'kaizen_user',
            JSON.stringify(usuarioActual)
        );

        mostrarAppPrincipal();

    } catch (error) {

        console.error(error);
        alert('Error al conectar con la base de datos.');

    } finally {

        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
});

// REGISTRO DE NUEVO PILOTO

$('registerBtn')?.addEventListener('click', async () => {

    const nombre = $('nombreInput').value.trim();

    const apellido = $('apellidoInput').value.trim();

    const legajo = $('legajoRegistroInput').value.trim();

    if (!nombre || !apellido || !legajo) {

        alert('Completa todos los campos.');
        return;
    }

    const boton = $('registerBtn');
    const textoOriginal = boton.textContent;

    boton.disabled = true;
    boton.textContent = 'Registrando...';

    try {

        const rol =
            legajo === '51000364' ? 'admin' : 'usuario';

        const { data, error } = await supabaseClient
            .from('usuarios')
            .insert([{
                nombre,
                apellido,
                legajo,
                rol
            }])
            .select()
            .single();

        if (error) throw error;

        usuarioActual = data;

        localStorage.setItem(
            'kaizen_user',
            JSON.stringify(usuarioActual)
        );

        alert('¡Registro exitoso!');

        mostrarAppPrincipal();

    } catch (error) {

        console.error(error);

        alert('Error al registrar: ' + error.message);

    } finally {

        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
});

// ==========================================
// CERRAR SESIÓN
// ==========================================

function cerrarSesion() {

    localStorage.removeItem('kaizen_user');

    usuarioActual = null;
    kaizenEditandoId = null;
    propietarioEdicion = null;
    ideasParaRankingMensual = [];

    $('appArea').classList.add('hidden');
    $('loginArea').classList.remove('hidden');

    $('listaIdeas')?.replaceChildren();
    $('pistaPilotosContainer')?.replaceChildren();
    $('rankingMensualContainer')?.replaceChildren();
    $('ganadorMensual')?.replaceChildren();

    $('modalRegistro')?.classList.add('hidden');
    $('editModal')?.classList.add('hidden');

    actualizarBotonExportar();
}

// ==========================================
// MOSTRAR APLICACIÓN PRINCIPAL
// ==========================================

function mostrarAppPrincipal() {

    if (!usuarioActual) return;

    $('loginArea').classList.add('hidden');
    $('appArea').classList.remove('hidden');

    const nombreCompleto =
        `${usuarioActual.nombre || ''} ${usuarioActual.apellido || ''}`.trim();

    asignarTexto(
        'tituloPrincipalRol',
        'PILOTO DE MEJORA'
    );

    asignarTexto(
        'usuarioActual',
        `${nombreCompleto} (${usuarioActual.legajo})`
    );

    const roleBadge = $('roleBadge');

    if (esAdministradorKaizen()) {

        roleBadge.textContent = 'Admin';

        roleBadge.style.background = '#eff6ff';
        roleBadge.style.color = '#1d4ed8';
        roleBadge.style.borderColor = '#bfdbfe';

    } else {

        roleBadge.textContent = 'Usuario';

        roleBadge.style.background = '#f1f5f9';
        roleBadge.style.color = 'var(--text-muted)';
        roleBadge.style.borderColor = 'var(--border-card)';
    }

    actualizarBotonExportar();

    const navegacion =
        document.querySelectorAll('.bottom-nav .nav-item');

    cambiarPestana('tabRegistrar', navegacion[0]);

    cargarDatosTablero();
}

// ==========================================
// NAVEGACIÓN
// ==========================================

function cambiarPestana(idTab, elementoBtn) {

    document.querySelectorAll('.tab-content')
        .forEach(tab => {
            tab.classList.remove('active');
        });

    const pestaña = $(idTab);

    if (!pestaña) return;

    pestaña.classList.add('active');

    document.querySelectorAll('.bottom-nav .nav-item')
        .forEach(btn => {
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

// ==========================================
// REGISTRO DE NUEVO KAIZEN
// ==========================================

function abrirModalRegistro() {

    if (!usuarioActual) return;

    $('modalRegistro').classList.remove('hidden');
}

function cerrarModalRegistro() {

    $('modalRegistro').classList.add('hidden');

    $('titulo').value = '';
    $('area').value = '';
    $('descripcion').value = '';

    seleccionarTipoKaizen('Quick');
}

function seleccionarTipoKaizen(tipo) {

    $('tipo').value = tipo;

    $('cardQuick').classList.toggle(
        'selected',
        tipo === 'Quick'
    );

    $('cardStandard').classList.toggle(
        'selected',
        tipo === 'Standard'
    );
}

$('guardarIdea')?.addEventListener('click', async () => {

    if (!usuarioActual) return;

    const titulo = $('titulo').value.trim();

    const area = $('area').value.trim();

    const descripcion = $('descripcion').value.trim();

    const tipo = $('tipo').value;

    if (!titulo || !area || !descripcion) {

        alert('Debes completar Área, Título y Descripción.');

        return;
    }

    const boton = $('guardarIdea');
    const textoOriginal = boton.textContent;

    boton.disabled = true;
    boton.textContent = 'Guardando...';

    try {

        const { error } = await supabaseClient
            .from('ideas')
            .insert([{

                titulo,
                area,
                descripcion,
                tipo,

                estado: 'ABIERTO',

                usuario_legajo: usuarioActual.legajo,

                usuario_nombre:
                    `${usuarioActual.nombre} ${usuarioActual.apellido || ''}`.trim()

            }]);

        if (error) throw error;

        alert('¡Propuesta registrada con éxito!');

        cerrarModalRegistro();

        cambiarPestana(
            'tabIdeas',
            document.querySelectorAll('.bottom-nav .nav-item')[1]
        );

    } catch (error) {

        console.error(error);

        alert('Error al registrar la propuesta.');

    } finally {

        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
});

// ==========================================
// CONSULTAS A SUPABASE
// ==========================================

async function obtenerIdeas(columnas = '*', soloMias = false) {

    let ideas = [];

    const limite = 500;

    let inicio = 0;

    const legajo = usuarioActual?.legajo;

    while (true) {

        let consulta = supabaseClient
            .from('ideas')
            .select(columnas);

        if (soloMias) {
            consulta = consulta.eq('usuario_legajo', legajo);
        }

        const { data, error } = await consulta
            .order('id', { ascending: true })
            .range(inicio, inicio + limite - 1);

        if (error) throw error;

        ideas.push(...data);

        if (data.length < limite) break;

        inicio += limite;
    }

    return ideas;
}

// ==========================================
// FILTROS DE PROPUESTAS
// ==========================================

function cambiarFiltroIdeas(filtro) {

    filtroIdeasActual = filtro;

    const slider = $('filterSliderBg');

    const btnMias = $('tabMiasBtn');

    const btnTodas = $('tabTodasBtn');

    const mias = filtro === 'mias';

    slider.className =
        'auth-slider-bg filter-slider ' +
        (mias ? 'left' : 'right');

    btnMias.classList.toggle('active', mias);

    btnTodas.classList.toggle('active', !mias);

    cargarDatosTablero();
}

function filtrarPorEstado(estado) {

    filtroEstadoActual = estado;

    document.querySelectorAll('.stat-card-clickable')
        .forEach(card => {

            card.classList.remove('filter-active');

            const accion =
                card.getAttribute('onclick') || '';

            if (accion.includes(`'${estado}'`)) {

                card.classList.add('filter-active');
            }
        });

    cargarDatosTablero();
}

// ==========================================
// CARGAR TABLERO
// ==========================================

let solicitudTablero = 0;

async function cargarDatosTablero() {

    if (!usuarioActual) return;

    const solicitud = ++solicitudTablero;

    const sesion = usuarioActual;

    const filtro = filtroIdeasActual;

    const estado = filtroEstadoActual;

    try {

        const data = await obtenerIdeas(
            '*',
            filtro === 'mias'
        );

        if (
            solicitud !== solicitudTablero ||
            usuarioActual !== sesion
        ) return;

        data.sort((a, b) =>

            new Date(b.fecha_creacion || 0) -
            new Date(a.fecha_creacion || 0)
        );

        const dataset = data;

        const total = dataset.length;

        const abiertas = dataset.filter(
            k => k.estado === 'ABIERTO'
        ).length;

        const cerradas = dataset.filter(
            k => k.estado === 'CERRADO'
        ).length;

        asignarTexto('countTotal', total);

        asignarTexto('countAbiertas', abiertas);

        asignarTexto('countCerradas', cerradas);

        asignarTexto(
            'tituloIndicador',
            filtro === 'mias'
                ? 'MI PROGRESO'
                : 'PROGRESO DE PLANTA'
        );

        asignarTexto(
            'iconoIndicador',
            filtro === 'mias' ? '🏎️' : '🏭'
        );

        let listaFiltrada = dataset;

        if (estado !== 'TODOS') {

            listaFiltrada = dataset.filter(
                k => k.estado === estado
            );
        }

        renderizarListaIdeas(listaFiltrada);

    } catch (error) {

        console.error(error);

        if (
            solicitud === solicitudTablero &&
            usuarioActual === sesion
        ) {

            const contenedor = $('listaIdeas');

            contenedor.replaceChildren(
                crearElemento(
                    'p',
                    'empty-state',
                    'No se pudieron cargar las propuestas.'
                )
            );
        }
    }
}

// ==========================================
// NUEVAS TARJETAS KAIZEN 2.0
// ==========================================

function renderizarListaIdeas(kaizens) {

    const contenedor = $('listaIdeas');

    contenedor.replaceChildren();

    if (!kaizens.length) {

        contenedor.append(

            crearElemento(
                'p',
                'empty-state',
                'No hay propuestas con este filtro.'
            )
        );

        return;
    }

    const admin = esAdministradorKaizen();

    const fragmento = document.createDocumentFragment();

    kaizens.forEach(k => {

        const cerrado = k.estado === 'CERRADO';

        const propio =
            String(k.usuario_legajo) ===
            String(usuarioActual.legajo);

        const standard = k.tipo === 'Standard';

        // TARJETA PRINCIPAL

        const card = crearElemento(

            'article',

            'idea-card race-idea ' +
            (cerrado ? 'is-closed' : 'is-open')
        );

        // CABECERA

        const top = crearElemento(
            'div',
            'idea-header-row'
        );

        const tags = crearElemento(
            'div',
            'badges-group'
        );

        const estadoBadge = crearElemento(

            'span',

            'status-badge ' +
            (cerrado
                ? 'status-cerrado'
                : 'status-abierto'),

            k.estado
        );

        const tipoBadge = crearElemento(

            'span',

            'status-badge ' +
            (standard
                ? 'type-standard'
                : 'type-quick'),

            k.tipo
        );

        tags.append(estadoBadge, tipoBadge);

        top.append(tags);

        // MENÚ ADMINISTRATIVO DE TRES PUNTOS

        if (admin) {

            const menu = crearElemento(
                'details',
                'idea-menu'
            );

            const summary = crearElemento(
                'summary',
                '',
                '⋮'
            );

            summary.setAttribute(
                'aria-label',
                'Acciones de propuesta'
            );

            const panel = crearElemento(
                'div',
                'idea-menu-panel'
            );

            const editar = crearBoton(

                '✎ Editar propuesta',

                'menu-action',

                () => {

                    menu.open = false;

                    abrirEdicion(k.id);
                }
            );

            const eliminar = crearBoton(

                'Eliminar propuesta',

                'menu-action menu-danger',

                () => {

                    menu.open = false;

                    eliminarKaizen(k.id);
                }
            );

            panel.append(editar, eliminar);

            menu.append(summary, panel);

            top.append(menu);
        }

        // TÍTULO

        const titulo = crearElemento(

            'h4',

            'idea-title',

            k.titulo || 'Propuesta Kaizen'
        );

        // ÁREA Y PUNTOS

        const meta = crearElemento(
            'div',
            'idea-meta'
        );

        const area = crearElemento(

            'span',

            '',

            k.area || 'Sin área'
        );

        const puntos = crearElemento(

            'span',

            'idea-points',

            obtenerPuntos(k) +
            (cerrado
                ? ' pts obtenidos'
                : ' pts potenciales')
        );

        meta.append(area, puntos);

        // DESCRIPCIÓN

        const descripcion = crearElemento(

            'p',

            'idea-desc',

            k.descripcion || ''
        );

        // AUTOR Y FECHA

        const nombre = k.usuario_nombre || 'Piloto';

        const footer = crearElemento(
            'div',
            'idea-footer-row'
        );

        const author = crearElemento(
            'div',
            'idea-author'
        );

        const avatar = crearElemento(

            'span',

            'idea-avatar',

            obtenerIniciales(nombre)
        );

        const nombreAutor = crearElemento(
            'span',
            '',
            nombre
        );

        author.append(avatar, nombreAutor);

        const fecha = crearElemento(

            'span',

            'idea-date',

            formatoFecha(k.fecha_creacion) ||
            'Sin fecha'
        );

        footer.append(author, fecha);

        card.append(
            top,
            titulo,
            meta,
            descripcion,
            footer
        );

        // FECHA DE CIERRE

        if (cerrado) {

            const fechaCierre = crearElemento(

                'div',

                'idea-closed-date',

                'Cierre: ' +
                (
                    formatoFecha(k.fecha_cierre) ||
                    'Sin fecha registrada'
                )
            );

            card.append(fechaCierre);
        }

        // BOTONES SEGÚN ROL

        if (admin || propio) {

            const acciones = crearElemento(
                'div',
                'idea-actions'
            );

            if (admin) {

                const cambiarEstado = crearBoton(

                    cerrado
                        ? 'Reabrir propuesta'
                        : '✓ Cerrar propuesta',

                    cerrado
                        ? 'race-secondary'
                        : 'race-primary',

                    () => cambiarEstadoKaizen(

                        k.id,

                        cerrado
                            ? 'ABIERTO'
                            : 'CERRADO'
                    )
                );

                acciones.append(cambiarEstado);

            } else {

                const editar = crearBoton(

                    '✎ Editar propuesta',

                    'race-secondary',

                    () => abrirEdicion(k.id)
                );

                acciones.append(editar);
            }

            card.append(acciones);
        }

        fragmento.append(card);
    });

    contenedor.append(fragmento);
}

// ==========================================
// CERRAR MENÚ AL HACER CLIC AFUERA
// ==========================================

document.addEventListener('click', evento => {

    document.querySelectorAll('.idea-menu[open]')
        .forEach(menu => {

            if (!menu.contains(evento.target)) {

                menu.open = false;
            }
        });
});

// ==========================================
// ABRIR EDICIÓN
// ==========================================

async function abrirEdicion(id) {

    if (!usuarioActual) return;

    const sesion = usuarioActual;

    try {

        const { data, error } = await supabaseClient
            .from('ideas')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (usuarioActual !== sesion) return;

        const propio =
            String(data.usuario_legajo) ===
            String(usuarioActual.legajo);

        if (!esAdministradorKaizen() && !propio) {

            alert('No tienes permiso para editar esta propuesta.');

            return;
        }

        kaizenEditandoId = id;

        propietarioEdicion = data.usuario_legajo;

        $('editTitulo').value =
            data.titulo || '';

        $('editArea').value =
            data.area || '';

        $('editTipo').value =
            data.tipo || 'Quick';

        $('editDescripcion').value =
            data.descripcion || '';

        $('editModal').classList.remove('hidden');

    } catch (error) {

        console.error(error);

        alert('No se pudo abrir la edición.');
    }
}

// ==========================================
// GUARDAR EDICIÓN
// ==========================================

async function guardarEdicion() {

    if (!usuarioActual || kaizenEditandoId === null) {

        return;
    }

    const propio =
        String(propietarioEdicion) ===
        String(usuarioActual.legajo);

    if (!esAdministradorKaizen() && !propio) {

        alert('No tienes permiso para editar.');

        return;
    }

    const titulo = $('editTitulo').value.trim();

    const area = $('editArea').value.trim();

    const tipo = $('editTipo').value;

    const descripcion = $('editDescripcion').value.trim();

    if (!titulo || !area || !descripcion) {

        alert('Completa todos los campos.');

        return;
    }

    const boton = $('guardarEdicion');

    const textoOriginal = boton.textContent;

    boton.disabled = true;

    boton.textContent = 'Guardando...';

    try {

        let consulta = supabaseClient
            .from('ideas')
            .update({

                titulo,
                area,
                tipo,
                descripcion

            })
            .eq('id', kaizenEditandoId);

        if (!esAdministradorKaizen()) {

            consulta = consulta.eq(
                'usuario_legajo',
                usuarioActual.legajo
            );
        }

        const { error } = await consulta;

        if (error) throw error;

        cancelarEdicion();

        cargarDatosTablero();

    } catch (error) {

        console.error(error);

        alert('No se pudo guardar.');

    } finally {

        boton.disabled = false;

        boton.textContent = textoOriginal;
    }
}

function cancelarEdicion() {

    $('editModal').classList.add('hidden');

    kaizenEditandoId = null;

    propietarioEdicion = null;
}

$('guardarEdicion')?.addEventListener(
    'click',
    guardarEdicion
);

$('cancelarEdicion')?.addEventListener(
    'click',
    cancelarEdicion
);

// ==========================================
// CERRAR O REABRIR KAIZEN
// ==========================================

const estadosEnProceso = new Set();

async function cambiarEstadoKaizen(id, nuevoEstado) {

    if (!esAdministradorKaizen()) {

        alert('Solo los administradores pueden cambiar el estado.');

        return;
    }

    if (!['ABIERTO', 'CERRADO'].includes(nuevoEstado)) {

        return;
    }

    if (estadosEnProceso.has(id)) return;

    const mensaje = nuevoEstado === 'CERRADO'

        ? '¿Confirmas que esta mejora fue implementada?'

        : '¿Deseas reabrir esta propuesta? Se quitarán sus puntos y su fecha de cierre.';

    if (!confirm(mensaje)) return;

    estadosEnProceso.add(id);

    try {

        const estadoAnterior =
            nuevoEstado === 'CERRADO'
                ? 'ABIERTO'
                : 'CERRADO';

        const { error } = await supabaseClient
            .from('ideas')
            .update({

                estado: nuevoEstado,

                fecha_cierre:

                    nuevoEstado === 'CERRADO'

                        ? new Date().toISOString()

                        : null
            })
            .eq('id', id)
            .eq('estado', estadoAnterior);

        if (error) throw error;

        cargarDatosTablero();

    } catch (error) {

        console.error(error);

        alert('No se pudo cambiar el estado.');

    } finally {

        estadosEnProceso.delete(id);
    }
}

// ==========================================
// ELIMINAR KAIZEN
// ==========================================

async function eliminarKaizen(id) {

    if (!esAdministradorKaizen()) {

        alert('Solo los administradores pueden eliminar propuestas.');

        return;
    }

    if (!confirm(

        '¿Estás seguro de eliminar esta propuesta? Esta acción no se puede deshacer.'

    )) return;

    try {

        const { error } = await supabaseClient
            .from('ideas')
            .delete()
            .eq('id', id);

        if (error) throw error;

        cargarDatosTablero();

    } catch (error) {

        console.error(error);

        alert('No se pudo eliminar la propuesta.');
    }
}

// ==========================================
// CONSTRUIR RANKING
// ==========================================

function construirRanking(ideas, soloCerradas = false) {

    const rankingMap = new Map();

    ideas.forEach(k => {

        if (!k.usuario_legajo) return;

        if (soloCerradas && k.estado !== 'CERRADO') {

            return;
        }

        const legajo = String(k.usuario_legajo);

        if (!rankingMap.has(legajo)) {

            rankingMap.set(legajo, {

                nombre: k.usuario_nombre || 'Piloto',

                legajo,

                puntos: 0,

                total: 0,

                cerradas: 0
            });
        }

        const piloto = rankingMap.get(legajo);

        piloto.total++;

        if (k.estado === 'CERRADO') {

            piloto.cerradas++;

            piloto.puntos += obtenerPuntos(k);
        }
    });

    return Array.from(rankingMap.values())

        .sort((a, b) =>

            b.puntos - a.puntos ||

            b.cerradas - a.cerradas ||

            a.nombre.localeCompare(b.nombre, 'es')
        );
}

// ==========================================
// CARGAR PISTA DE CARRERAS
// ==========================================

async function cargarPistaCarreras() {

    if (!usuarioActual) return;

    const sesion = usuarioActual;

    try {

        const data = await obtenerIdeas(

            'id,usuario_legajo,usuario_nombre,estado,tipo,area,fecha_creacion,fecha_cierre'
        );

        if (usuarioActual !== sesion) return;

        const ranking = construirRanking(data);

        const misDatos = ranking.find(

            r => r.legajo === String(usuarioActual.legajo)
        );

        const posicion = ranking.findIndex(

            r => r.legajo === String(usuarioActual.legajo)
        );

        asignarTexto(

            'misKaizensCerradosNum',

            misDatos ? misDatos.puntos : 0
        );

        asignarTexto(

            'posicionTexto',

            posicion !== -1

                ? `#${posicion + 1}`

                : '-'
        );

        cargarDashboard(data);

        renderizarPistaPilotos(ranking);

        ideasParaRankingMensual = data;

        actualizarRankingMensual(data);

    } catch (error) {

        console.error(error);

        alert('No se pudieron cargar los informes.');
    }
}

// ==========================================
// DASHBOARD KAIZEN
// ==========================================

function cargarDashboard(ideas) {

    const total = ideas.length;

    const abiertas = ideas.filter(

        i => i.estado === 'ABIERTO'

    ).length;

    const cerradas = ideas.filter(

        i => i.estado === 'CERRADO'

    ).length;

    const quick = ideas.filter(

        i => i.tipo === 'Quick'

    ).length;

    const standard = ideas.filter(

        i => i.tipo === 'Standard'

    ).length;

    const participantes = new Set(

        ideas

            .filter(i => i.usuario_legajo)

            .map(i => String(i.usuario_legajo))

    ).size;

    asignarTexto('dashTotal', total);

    asignarTexto('dashAbiertas', abiertas);

    asignarTexto('dashCerradas', cerradas);

    asignarTexto('dashQuick', quick);

    asignarTexto('dashStandard', standard);

    asignarTexto('dashParticipantes', participantes);

    const tasaCierre = total

        ? Math.round((cerradas / total) * 100)

        : 0;

    asignarTexto(

        'dashTasaCierre',

        tasaCierre + '%'
    );
}

// ==========================================
// DISEÑO DE TARJETAS DE RANKING
// ==========================================

function crearTarjetaPiloto(

    piloto,

    index,

    maxPuntos,

    mensual = false

) {

    const esMiCarro =

        piloto.legajo === String(usuarioActual.legajo);

    const porcentaje = Math.min(

        85,

        (piloto.puntos / maxPuntos) * 85
    );

    const card = crearElemento(

        'div',

        'racer-card'
    );

    if (esMiCarro) {

        card.style.borderColor = 'var(--primary-light)';

        card.style.background = '#f8fafc';
    }

    if (index === 0 && piloto.puntos > 0) {

        card.classList.add('racer-first');
    }

    const info = crearElemento(

        'div',

        'racer-info'
    );

    const nombre = crearElemento(

        'span',

        '',

        `#${index + 1} ${piloto.nombre}` +

        (esMiCarro ? ' (Tú)' : '')
    );

    const datos = crearElemento(

        'span',

        'racer-points',

        `${piloto.puntos} pts · ${piloto.total}` +

        (mensual ? ' cerradas' : ' ideas')
    );

    datos.style.color = 'var(--success)';

    info.append(nombre, datos);

    const pista = crearElemento(

        'div',

        'racer-track-line'
    );

    const carro = crearElemento(

        'div',

        'racer-car-icon',

        '🏎️'
    );

    carro.style.left = porcentaje + '%';

    const bandera = crearElemento(

        'div',

        'racer-flag-icon',

        '🏁'
    );

    pista.append(carro, bandera);

    card.append(info, pista);

    return card;
}

// ==========================================
// RANKING GLOBAL
// ==========================================

function renderizarPistaPilotos(ranking) {

    const contenedor = $('pistaPilotosContainer');

    contenedor.replaceChildren();

    if (!ranking.length) {

        contenedor.append(

            crearElemento(

                'p',

                'empty-state',

                'Aún no hay actividad en la pista.'
            )
        );

        return;
    }

    const maxPuntos = Math.max(

        ranking[0].puntos,

        5
    );

    const fragmento = document.createDocumentFragment();

    ranking.forEach((piloto, index) => {

        fragmento.append(

            crearTarjetaPiloto(

                piloto,

                index,

                maxPuntos,

                false
            )
        );
    });

    contenedor.append(fragmento);
}

// ==========================================
// RANKING MENSUAL
// SEGÚN FECHA REAL DE CIERRE
// ==========================================

function cambiarMesRanking() {

    actualizarRankingMensual(ideasParaRankingMensual);
}

function actualizarRankingMensual(ideas) {

    const selector = $('mesRanking');

    const ganador = $('ganadorMensual');

    const contenedor = $('rankingMensualContainer');

    if (!selector || !ganador || !contenedor) return;

    if (!selector.value) {

        selector.value = fechaISOParaguay(

            new Date()

        ).slice(0, 7);
    }

    const mesSeleccionado = selector.value;

    const ideasDelMes = ideas.filter(idea => {

        if (

            idea.estado !== 'CERRADO' ||

            !idea.fecha_cierre ||

            !idea.usuario_legajo

        ) return false;

        const mesIdea = fechaISOParaguay(

            idea.fecha_cierre

        ).slice(0, 7);

        return mesIdea === mesSeleccionado;
    });

    const ranking = construirRanking(

        ideasDelMes,

        true
    );

    ganador.replaceChildren();

    contenedor.replaceChildren();

    if (!ranking.length) {

        ganador.textContent =

            'Todavía no hay propuestas cerradas en este mes.';

        return;
    }

    const primero = ranking[0];

    const mesActual = fechaISOParaguay(

        new Date()

    ).slice(0, 7);

    const titulo = mesSeleccionado >= mesActual

        ? '🏆 Líder del mes: '

        : '🏆 Ganador del mes: ';

    const tituloGanador = crearElemento(

        'strong',

        '',

        titulo +

        primero.nombre +

        ' — ' +

        primero.puntos +

        ' puntos'
    );

    ganador.append(tituloGanador);

    const maxPuntos = primero.puntos || 1;

    const fragmento = document.createDocumentFragment();

    ranking.forEach((piloto, index) => {

        fragmento.append(

            crearTarjetaPiloto(

                piloto,

                index,

                maxPuntos,

                true
            )
        );
    });

    contenedor.append(fragmento);
}

// ==========================================
// EXPORTAR BASE DE DATOS A EXCEL
// ==========================================

async function exportarIdeasExcel() {

    if (!esAdministradorKaizen()) {

        alert('Solo los administradores pueden exportar.');

        return;
    }

    if (typeof XLSX === 'undefined') {

        alert('No se pudo cargar la librería de Excel.');

        return;
    }

    const boton = $('btnExportarExcel');

    const textoOriginal = boton?.textContent;

    const sesion = usuarioActual;

    if (boton) {

        boton.disabled = true;

        boton.textContent = 'Generando Excel...';
    }

    try {

        const ideas = await obtenerIdeas('*');

        if (

            usuarioActual !== sesion ||

            !esAdministradorKaizen()

        ) return;

        if (!ideas.length) {

            alert('No hay propuestas para exportar.');

            return;
        }

        // COLUMNAS DE LA BASE DE DATOS

        const registros = ideas.map(idea => ({

            'ID':

                idea.id,

            'Colaborador':

                idea.usuario_nombre || '',

            'Legajo':

                String(idea.usuario_legajo || ''),

            'Área':

                idea.area || '',

            'Título de la propuesta':

                idea.titulo || '',

            'Descripción':

                idea.descripcion || '',

            'Tipo de Kaizen':

                idea.tipo || '',

            'Estado':

                idea.estado || '',

            'Fecha de creación':

                formatoFecha(idea.fecha_creacion),

            'Fecha de cierre':

                formatoFecha(idea.fecha_cierre),

            'Puntos':

                idea.estado === 'CERRADO'

                    ? obtenerPuntos(idea)

                    : 0

        }));

        const abiertas = registros.filter(

            idea => idea.Estado === 'ABIERTO'
        );

        const cerradas = registros.filter(

            idea => idea.Estado === 'CERRADO'
        );

        const libro = XLSX.utils.book_new();

        const columnas = Object.keys(registros[0]);

        function crearHoja(datos) {

            const hoja = XLSX.utils.json_to_sheet(

                datos,

                { header: columnas }
            );

            hoja['!cols'] = [

                { wch: 38 },

                { wch: 30 },

                { wch: 15 },

                { wch: 22 },

                { wch: 45 },

                { wch: 70 },

                { wch: 18 },

                { wch: 15 },

                { wch: 20 },

                { wch: 20 },

                { wch: 12 }
            ];

            if (hoja['!ref']) {

                hoja['!autofilter'] = {

                    ref: hoja['!ref']
                };
            }

            return hoja;
        }

        // HOJA GENERAL

        XLSX.utils.book_append_sheet(

            libro,

            crearHoja(registros),

            'Base general'
        );

        // HOJA ABIERTAS

        XLSX.utils.book_append_sheet(

            libro,

            crearHoja(abiertas),

            'Abiertas'
        );

        // HOJA CERRADAS

        XLSX.utils.book_append_sheet(

            libro,

            crearHoja(cerradas),

            'Cerradas'
        );

        const fechaArchivo = fechaISOParaguay(

            new Date()
        );

        XLSX.writeFile(

            libro,

            `Kaizen_Race_${fechaArchivo}.xlsx`
        );

    } catch (error) {

        console.error(error);

        alert(

            'No se pudo exportar la base de datos: ' +

            error.message
        );

    } finally {

        if (boton) {

            boton.disabled = false;

            boton.textContent = textoOriginal;
        }
    }
}

// ==========================================
// BOTÓN EXCEL SOLO PARA ADMINISTRADORES
// ==========================================

function actualizarBotonExportar() {

    const boton = $('btnExportarExcel');

    if (!boton) return;

    boton.style.display =

        esAdministradorKaizen()

            ? 'flex'

            : 'none';
}

// ==========================================
// FIN DE APP.JS - KAIZEN RACE 2.0
// ==========================================
