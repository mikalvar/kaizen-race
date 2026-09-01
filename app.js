const SUPABASE_URL =
"https://vmminpanvxxdczzmopua.supabase.co";

const SUPABASE_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWlucGFudnh4ZGN6em1vcHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzU1MDQsImV4cCI6MjEwMzg1MTUwNH0.K3eWFErUjf3_VhZ8Jr7ZID3NnHp7vM8kwZZFwNoRaiU";

const supabaseClient =
window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
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

    const apellido =
        document.getElementById("apellidoInput").value.trim();

    const ci =
        document.getElementById("ciRegistroInput").value.trim();

    if (!nombre || !apellido || !ci) {
        alert("Completa nombre, apellido y cédula");
        return;
    }

const { error } = await supabaseClient
    .from("usuarios")
    .insert([
        {
            nombre,
            apellido,
            ci,
            rol: "usuario"
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

    const { data, error } = await supabaseClient
        .from("usuarios")
        .select("*")
        .eq("ci", ci)
        .single();

    if (error || !data) {
        alert("Usuario no encontrado");
        return;
    }

currentUser = data;

sessionStorage.setItem(
    "usuario",
    JSON.stringify(data)
);

console.log("Usuario logueado:", data);

document.getElementById("loginArea")
.classList.add("hidden");

document.getElementById("appArea")
.classList.remove("hidden");

document.getElementById("usuarioActual")
.textContent =
`Bienvenido ${data.nombre} ${data.apellido || ""}`;

cargarIdeas();
}

/*
=================================
LOGOUT
=================================
*/

function logoutUsuario() {

    currentUser = null;

    sessionStorage.removeItem("usuario");

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

    console.log("Entró en guardarIdea");

    const titulo =
        document.getElementById("titulo").value.trim();

    const area =
        document.getElementById("area").value.trim();

    const tipo =
        document.getElementById("tipo").value;

    const descripcion =
        document.getElementById("descripcion").value.trim();

    console.log({
        titulo,
        area,
        tipo,
        descripcion
    });

    const usuario =
        JSON.parse(
            sessionStorage.getItem("usuario")
        );

    console.log(usuario);

    if (!titulo || !area || !descripcion) {
        alert("Completa todos los campos");
        return;
    }

    const { error } =
        await supabaseClient
        .from("ideas")
        .insert([
            {
                titulo,
                descripcion,
                area,
                tipo,
                estado: "ABIERTO",
                usuario_ci: usuario.ci,
                usuario_nombre:
                    `${usuario.nombre} ${usuario.apellido || ""}`.trim(),
                fecha_creacion:
                    new Date().toISOString()
            }
        ]);

    if (error) {

        console.error(error);

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

    const { data, error } = await supabaseClient
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

        const esAdmin =
            currentUser &&
            currentUser.rol === "admin";

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
                ${idea.usuario_nombre || "Sin nombre"}
            </p>

            <p>
                ${idea.descripcion}
            </p>

            ${
                esAdmin
                ? `
                <button onclick="cerrarIdea(${idea.id})">
                    Cerrar Idea
                </button>

                <button onclick="eliminarIdea(${idea.id})">
                    Eliminar Idea
                </button>
                `
                : ""
            }
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
