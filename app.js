// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = 'https://vmminpanvxxdczzmopua.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWlucGFudnh4ZGN6em1vcHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzU1MDQsImV4cCI6MjEwMzg1MTUwNH0.K3eWFErUjf3_VhZ8Jr7ZID3NnHp7vM8kwZZFwNoRaiU';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- VARIABLES DE ESTADO GLOBAL ---
let usuarioActual = null;
let filtroIdeasActual = 'mias'; 
let filtroEstadoActual = 'TODOS'; 
let ideaEditandoId = null;

// --- INICIALIZACIÓN AL CARGAR LA VENTANA ---
window.addEventListener('DOMContentLoaded', () => {
    const sesionGuardada = localStorage.getItem('kaizen_user');
    if (sesionGuardada) {
        usuarioActual = JSON.parse(sesionGuardada);
        if (usuarioActual.ci === '3992978') {
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
    const ci = document.getElementById('ciInput').value.trim();
    if (!ci) {
        alert('Por favor ingresa tu Cédula de Identidad');
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('ci', ci)
            .single();

        if (error || !data) {
            alert('Cédula no encontrada. Por favor regístrate primero.');
            return;
        }

        usuarioActual = data;
        if (usuarioActual.ci === '3992978') {
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
    const ci = document.getElementById('ciRegistroInput').value.trim();

    if (!nombre || !apellido || !ci) {
        alert('Completa todos los campos para registrarte.');
        return;
    }

    try {
        const rol = (ci === '3992978') ? 'admin' : 'usuario';
        const { data, error } = await supabaseClient
            .from('usuarios')
            .insert([{ nombre, apellido, ci, rol }])
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

    const tituloRol = document.getElementById('tituloPrincipalRol');
    const spanUsuario = document.getElementById('usuarioActual');
    const roleBadge = document.getElementById('roleBadge');

    tituloRol.textContent = "PILOTO DE MEJORA";
    const nombreCompleto = `${usuarioActual.nombre || ''} ${usuarioActual.apellido || ''}`.trim();
    spanUsuario.textContent = `${nombreCompleto} (${usuarioActual.ci})`;

    if (usuarioActual.ci === '3992978' || usuarioActual.rol === 'admin') {
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

    cargarDatosTablero();
}

// --- NAVEGACIÓN ENTRE PESTAÑAS ---
function cambiarPestana(idTab, elementoBtn) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(idTab).classList.add('active');

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
    ideaEditandoId = null;
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

// Guardar o actualizar propuesta en la tabla 'ideas'
document.getElementById('guardarIdea')?.addEventListener('click', async () => {
    const titulo = document.getElementById('titulo').value.trim();
    const area = document.getElementById('area').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();
    const tipo = document.getElementById('tipo').value;

    if (!titulo || !descripcion) {
        alert('Por favor completa al menos el título y la descripción.');
        return;
    }

    try {
        if (ideaEditandoId) {
            const { error } = await supabase
