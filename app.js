// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = 'https://vmminpanvxxdczzmopua.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWlucGFudnh4ZGN6em1vcHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzU1MDQsImV4cCI6MjEwMzg1MTUwNH0.K3eWFErUjf3_VhZ8Jr7ZID3NnHp7vM8kwZZFwNoRaiU';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables de Estado Global
let usuarioActual = null;
let filtroIdeasActual = 'mias'; // 'mias' o 'todas'
let filtroEstadoActual = 'TODOS'; // 'TODOS', 'ABIERTO', 'CERRADO'

// Inicialización al cargar la ventana
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
