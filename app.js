const SUPABASE_URL =
"https://vmminpanvxxdczzmopua.supabase.co";

const SUPABASE_KEY =
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWlucGFudnh4ZGN6em1vcHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzU1MDQsImV4cCI6MjEwMzg1MTUwNH0.K3eWFErUjf3_VhZ8Jr7ZID3NnHp7vM8kwZZFwNoRaiU;

const supabase =
window.supabase.createClient(
    "https://vmminpanvxxdczzmopua.supabase.co";
    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWlucGFudnh4ZGN6em1vcHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzU1MDQsImV4cCI6MjEwMzg1MTUwNH0.K3eWFErUjf3_VhZ8Jr7ZID3NnHp7vM8kwZZFwNoRaiU;
);

let currentUser = null;

/*
=================================
REGISTRO
=================================
*/

async function registrarUsuario() {

    const nombre =
        document.getElementById("nombreInput").value.trim();

    const ci =
        document.getElementById("ciRegistroInput").value.trim();

    if (!nombre || !ci) {
        alert("Completa nombre y cédula");
        return;
    }

    const { error } = await supabase
        .from("usuarios")
        .insert([
            {
                nombre,
                ci
            }
        ]);

    if (error) {
        alert(error.message);
        return;
    }

    alert("Usuario registrado correctamente");
}

/*
=================================
LOGIN
=================================
*/

async function loginUsuario() {

    const ci =
        document.getElementById("ciInput").value.trim();

    if (!ci) {
        alert("Ingresa tu cédula");
        return;
    }

    const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("ci", ci)
        .single();

    if (error || !data) {
        alert("Usuario no encontrado");
        return;
    }

    currentUser = data;

    document.getElementById("loginArea")
        .classList.add("hidden");

    document.getElementById("appArea")
        .classList.remove("hidden");

    document.getElementById("usuarioActual")
        .textContent =
        `Bienvenido ${data.nombre}`;

    cargarIdeas();
}

/*
=================================
LOGOUT
=================================
*/

function logoutUsuario() {

    currentUser = null;

    document.getElementById("loginArea")
        .classList.remove("hidden");

    document.getElementById("appArea")
        .classList.add("hidden");
}

/*
=================================
CREAR IDEA
=================================
*/

async function guardarIdea() {

    const titulo =
        document.getElementById("titulo").value.trim();

    const area =
        document.getElementById("area").value.trim();

    const tipo =
        document.getElementById("tipo").value;

    const descripcion =
        document.getElementById("descripcion").value.trim();

    if (!titulo || !area || !descripcion) {
        alert("Completa todos los campos");
        return;
    }

    const { error } = await supabase
        .from("ideas")
        .insert([
            {
                titulo,
                area,
                tipo,
                descripcion,
                estado: "ABIERTO",
                usuario_ci: currentUser.ci,
                usuario_nombre: currentUser.nombre
            }
        ]);

    if (error) {
        alert(error.message);
        return;
    }

    alert("Idea registrada");

    document.getElementById("titulo").value = "";
    document.getElementById("area").value = "";
    document.getElementById("descripcion").value = "";

    cargarIdeas();
}

/*
=================================
LISTAR IDEAS
=================================
*/

async function cargarIdeas() {

    const { data, error } = await supabase
        .from("ideas")
        .select("*")
        .order("fecha_creacion", {
            ascending: false
        });

    if (error) {
        console.error(error);
        return;
    }

    const lista =
        document.getElementById("listaIdeas");

    lista.innerHTML = "";

    data.forEach(idea => {

        const card =
            document.createElement("div");

        card.className = "card";

        card.innerHTML = `
            <h3>${idea.titulo}</h3>

            <p>
            <b>Área:</b>
            ${idea.area}
            </p>

            <p>
            <b>Tipo:</b>
            ${idea.tipo}
            </p>

            <p>
            <b>Estado:</b>
            ${idea.estado}
            </p>

            <p>
            <b>Autor:</b>
            ${idea.usuario_nombre}
            </p>

            <p>
            ${idea.descripcion}
            </p>
        `;

        lista.appendChild(card);
    });

}

/*
=================================
EVENTOS
=================================
*/

document
.getElementById("registerBtn")
.addEventListener(
    "click",
    registrarUsuario
);

document
.getElementById("loginBtn")
.addEventListener(
    "click",
    loginUsuario
);

document
.getElementById("logoutBtn")
.addEventListener(
    "click",
    logoutUsuario
);

document
.getElementById("guardarIdea")
.addEventListener(
    "click",
    guardarIdea
);
