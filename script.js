
/* ==========================================================================
   AUTENTICACIÓN CON SUPABASE - Google OAuth
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. CONFIGURACIÓN E INICIALIZACIÓN DEL CLIENTE
// --------------------------------------------------------------------------
// IMPORTANTE: Reemplazar estos valores por tus variables de entorno reales.
// En un entorno de producción, NUNCA expongas claves privadas; la
// "anon key" de Supabase está diseñada para usarse en el cliente,
// pero asegúrate de tener configuradas las políticas RLS (Row Level Security).
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY';

// Se crea el cliente usando el objeto global "supabase" que expone el CDN
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --------------------------------------------------------------------------
// 2. INICIO DE SESIÓN CON GOOGLE (OAuth)
// --------------------------------------------------------------------------
/**
 * Inicia el flujo de autenticación OAuth con Google.
 * Supabase redirige automáticamente a la pantalla de consentimiento de Google
 * y luego de vuelta a la URL configurada en "redirectTo".
 */
async function signInWithGoogle() {
    try {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // Cambia esto por la URL real de tu sitio en producción
                redirectTo: window.location.origin
            }
        });

        if (error) {
            throw error;
        }

        // "data" contiene la URL de redirección; Supabase maneja la
        // navegación automáticamente, por lo que normalmente no es
        // necesario hacer nada más aquí.
        console.log('Redirigiendo a Google para autenticación...', data);

    } catch (error) {
        console.error('Error al iniciar sesión con Google:', error.message);
        mostrarMensajeAuth('No pudimos iniciar el proceso de inicio de sesión. Intenta nuevamente.');
    }
}


// --------------------------------------------------------------------------
// 3. VERIFICACIÓN DE SESIÓN ACTIVA
// --------------------------------------------------------------------------
/**
 * Detecta si hay un usuario autenticado y actualiza la interfaz:
 * - Si hay sesión activa: muestra nombre/foto y oculta botón de login.
 * - Si no hay sesión: muestra el botón de login y oculta datos de usuario.
 */
async function checkUser() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        const session = data.session;

        // Referencias a elementos del DOM (deben existir en el HTML)
        const btnLogin = document.getElementById('btn-login');
        const userInfo = document.getElementById('user-info');
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        const btnLogout = document.getElementById('btn-logout');

        if (session && session.user) {
            // --- Usuario autenticado ---
            const usuario = session.user;
            const nombre = usuario.user_metadata?.full_name || usuario.email;
            const foto = usuario.user_metadata?.avatar_url || '';

            if (userName) userName.textContent = nombre;
            if (userAvatar && foto) {
                userAvatar.src = foto;
                userAvatar.alt = `Foto de perfil de ${nombre}`;
                userAvatar.hidden = false;
            }

            if (userInfo) userInfo.hidden = false;
            if (btnLogin) btnLogin.hidden = true;
            if (btnLogout) btnLogout.hidden = false;

        } else {
            // --- Usuario NO autenticado ---
            if (userInfo) userInfo.hidden = true;
            if (btnLogin) btnLogin.hidden = false;
            if (btnLogout) btnLogout.hidden = true;
        }

    } catch (error) {
        console.error('Error al verificar la sesión del usuario:', error.message);
    }
}


// --------------------------------------------------------------------------
// 4. CERRAR SESIÓN
// --------------------------------------------------------------------------
/**
 * Cierra la sesión activa de Supabase de forma segura y
 * actualiza la interfaz inmediatamente.
 */
async function logout() {
    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            throw error;
        }

        console.log('Sesión cerrada correctamente.');

        // Refrescar la interfaz tras cerrar sesión
        await checkUser();

    } catch (error) {
        console.error('Error al cerrar sesión:', error.message);
        mostrarMensajeAuth('No pudimos cerrar tu sesión. Intenta nuevamente.');
    }
}


// --------------------------------------------------------------------------
// 5. UTILIDAD: MENSAJES DE ERROR DE AUTENTICACIÓN
// --------------------------------------------------------------------------
/**
 * Muestra un mensaje amigable al usuario en caso de error de autenticación.
 * Requiere un contenedor con id="auth-mensaje" en el HTML (opcional).
 */
function mostrarMensajeAuth(mensaje) {
    const contenedor = document.getElementById('auth-mensaje');
    if (contenedor) {
        contenedor.textContent = mensaje;
        contenedor.hidden = false;
    } else {
        alert(mensaje);
    }
}


// --------------------------------------------------------------------------
// 6. ESCUCHAR CAMBIOS DE ESTADO DE AUTENTICACIÓN EN TIEMPO REAL
// --------------------------------------------------------------------------
/**
 * Supabase emite eventos cuando el usuario inicia/cierra sesión,
 * incluyendo el retorno desde el flujo OAuth de Google.
 * Esto asegura que la UI se actualice automáticamente sin recargar.
 */
supabaseClient.auth.onAuthStateChange((_event, _session) => {
    checkUser();
});


// --------------------------------------------------------------------------
// 7. INICIALIZACIÓN AL CARGAR LA PÁGINA
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    checkUser();

    // Conectar botones (deben existir en el HTML con estos IDs)
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');

    if (btnLogin) btnLogin.addEventListener('click', signInWithGoogle);
    if (btnLogout) btnLogout.addEventListener('click', logout);
});
/* ==========================================================================
   SCRIPT.JS - Miel Dorada del Sur
   Integración de APIs externas: Dólar (mindicador.cl), Feriados y Clima
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    obtenerValorDolar();
    obtenerProximoFeriado();
    obtenerClimaLocal();
});

/* ==========================================================================
   1. VALOR DEL DÓLAR - mindicador.cl
   ========================================================================== */
async function obtenerValorDolar() {
    const contenedor = document.getElementById('widget-dolar');
    if (!contenedor) return;

    contenedor.textContent = 'Cargando valor del dólar...';

    try {
        const respuesta = await fetch('https://mindicador.cl/api/dolar');

        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        const datos = await respuesta.json();
        const ultimoValor = datos.serie[0];

        const valorFormateado = ultimoValor.valor.toLocaleString('es-CL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        const fecha = new Date(ultimoValor.fecha).toLocaleDateString('es-CL');

        contenedor.innerHTML = `
            <strong>Dólar Observado:</strong> $${valorFormateado} CLP
            <br>
            <small>Actualizado: ${fecha}</small>
        `;
    } catch (error) {
        console.error('Error al obtener el valor del dólar:', error);
        contenedor.textContent = 'No pudimos cargar el valor del dólar en este momento.';
    }
}

/* ==========================================================================
   2. PRÓXIMO FERIADO EN CHILE
   ========================================================================== */
async function obtenerProximoFeriado() {
    const contenedor = document.getElementById('widget-feriado');
    if (!contenedor) return;

    contenedor.textContent = 'Buscando el próximo feriado...';

    try {
        const respuesta = await fetch('https://api.boostr.cl/holidays.json');

        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        const datos = await respuesta.json();
        const listaFeriados = datos.data;

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const proximoFeriado = listaFeriados
            .map(f => ({ ...f, fechaObj: new Date(f.date) }))
            .filter(f => f.fechaObj >= hoy)
            .sort((a, b) => a.fechaObj - b.fechaObj)[0];

        if (proximoFeriado) {
            const fechaFormateada = proximoFeriado.fechaObj.toLocaleDateString('es-CL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            contenedor.innerHTML = `
                <strong>Próximo feriado (no hay envíos):</strong><br>
                ${proximoFeriado.title} - ${fechaFormateada}
            `;
        } else {
            contenedor.textContent = 'No se encontraron próximos feriados registrados.';
        }
    } catch (error) {
        console.error('Error al obtener los feriados:', error);
        contenedor.textContent = 'No pudimos cargar la información de feriados en este momento.';
    }
}

/* ==========================================================================
   3. CLIMA LOCAL - Open-Meteo (sin API key)
   Coordenadas referenciales: Lago Ranco, Región de Los Ríos, Chile
   ========================================================================== */
async function obtenerClimaLocal() {
    const contenedor = document.getElementById('widget-clima');
    if (!contenedor) return;

    contenedor.textContent = 'Consultando el clima para nuestras abejas...';

    const latitud = -40.1;
    const longitud = -72.5;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitud}&longitude=${longitud}&current_weather=true`;

    try {
        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        const datos = await respuesta.json();
        const temperatura = datos.current_weather.temperature;

        let mensajeAbejas;
        if (temperatura >= 18 && temperatura <= 28) {
            mensajeAbejas = '¡Un día perfecto para que nuestras abejas recolecten néctar!';
        } else if (temperatura < 18) {
            mensajeAbejas = 'Hace fresco, nuestras abejas están descansando un poco más hoy.';
        } else {
            mensajeAbejas = 'Día caluroso: las abejas trabajan temprano para evitar el calor.';
        }

        contenedor.innerHTML = `
            <strong>Temperatura actual:</strong> ${temperatura}°C<br>
            <small>${mensajeAbejas}</small>
        `;
    } catch (error) {
        console.error('Error al obtener el clima:', error);
        contenedor.textContent = 'No pudimos cargar el clima en este momento.';
    }
}