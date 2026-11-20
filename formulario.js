const formulario = document.getElementById("formulario");
const panelFormulario = document.getElementById("panel-formulario");
const indicacionMapa = document.getElementById("map-hint");
const cambiarUbicacion = document.getElementById("cambiar-ubicacion");


// ==========================================
// 1. INICIALIZAR EL MAPA Y CARGAR HISTÓRICOS
// ==========================================
const map = L.map('mapa').setView([20.39, -101.19], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, 
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let marcadorActual = null; 
let marcadoresGuardados = [];
let listaReportesGlobal = [];



// Función de colores según la urgencia
function obtenerColorUrgencia(urgencia) {
    switch(urgencia ? urgencia.toLowerCase() : ''){
        case 'pendiente':
            return '#F59E0B';
        case 'verificada':
            return '#2563EB';
        case 'atendido':
            return '#16A34A';
        default:
            return '#DC2626';
    }
}

document.getElementById("estado_urgencia").addEventListener("change", function () {
    if (marcadorActual) {
        marcadorActual.setStyle({ fillColor: obtenerColorUrgencia(this.value) });
    }
});


// Función para descargar los reportes de MongoDB y pintar las boyas históricas con color
function cargarReportesGuardados() {
    marcadoresGuardados.forEach(marcador => map.removeLayer(marcador));
    marcadoresGuardados = [];

    fetch('http://localhost:3000/api/reportes')
        .then(response => response.json())
        .then(reportes => {
            listaReportesGlobal = reportes; 
            reportes.forEach(reporte => {
                if (reporte.ubicacion && reporte.ubicacion.latitud && reporte.ubicacion.longitud) {
                    const lat = reporte.ubicacion.latitud;
                    const lng = reporte.ubicacion.longitud;

                    // Usamos el color correspondiente basado en la urgencia de la BD
                    const colorPin = obtenerColorUrgencia(reporte.estado_urgencia);

                    const marcadorHistorico = L.circleMarker([lat, lng], {
                        radius: 10,
                        fillColor: colorPin,
                        color: "#fff",
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.9
                    }).addTo(map);

                    //cuadro de informacion emergente
                    marcadorHistorico.bindPopup(
                        `<b>¡Ayuda Registrada!</b><br>` +
                        `<b>Comunidad:</b> ${reporte.comunidad}<br>` +
                        `<b>Urgencia:</b> ${reporte.estado_urgencia}` +


                        //agregamos dos botones
                        `<div style="display: flex; gap: 5px; margin-top: 5px;">` +
                            `<button onclick="verDetalles('${reporte._id}')" class="btn-detalles">Ver más</button>` +
                            `<button onclick="cargarReporteParaEditar('${reporte._id}')" class="btn-editar">Editar</button>` +
                        `</div>`
                    );

                    marcadoresGuardados.push(marcadorHistorico);
                }
            });
        })
        .catch(error => console.error("Error al cargar los marcadores históricos:", error));
}

// Ejecutar la carga de marcadores históricos apenas arranca la app
cargarReportesGuardados();



// ==========================================
// 2. EVENTOS DEL MAPA
// ==========================================
cambiarUbicacion.addEventListener("click", function () {
    panelFormulario.hidden = true;
    indicacionMapa.hidden = false;
});

map.on('click', function(e){
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    const urgenciaSeleccionada = document.getElementById("estado_urgencia").value;
    const colorPin = obtenerColorUrgencia(urgenciaSeleccionada);

    // Marcador actual (boya interactiva)
    if (marcadorActual) {
        marcadorActual.setLatLng([lat, lng]);
        marcadorActual.setStyle({ fillColor: colorPin }); // Actualiza el color si cambió la urgencia
    } else {
        marcadorActual = L.circleMarker([lat, lng], {
            radius: 10,
            fillColor: colorPin,
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
        }).addTo(map);
    }

    // Rellenar automáticamente los campos del formulario
    document.getElementById("latitud").value = lat.toFixed(6);
    document.getElementById("longitud").value = lng.toFixed(6);
    panelFormulario.hidden = false;
    indicacionMapa.hidden = true;
});




// ==========================================
// 3. ENVÍO DEL FORMULARIO (SUBMIT)
// ==========================================
formulario.addEventListener("submit", function (evento) {
    evento.preventDefault(); 

    const comunidad = document.getElementById("comunidad").value.trim();
    const municipio = document.getElementById("municipio").value.trim();
    const estado = document.getElementById("estado").value.trim();
    const longitud = document.getElementById("longitud").value.trim();
    const latitud = document.getElementById("latitud").value.trim();
    
    const necesidad_agua = document.getElementById("n_1").checked;
    const necesidad_alimentos = document.getElementById("n_2").checked;
    const necesidad_medicos = document.getElementById("n_3").checked;
    const necesidad_ropa = document.getElementById("n_4").checked;
    const descripcion = document.getElementById("descripcion").value.trim();
    const categoriaIncidente = document.getElementById("categoria_incidente").value;
    const riesgosActivos = document.getElementById("riesgos_activos").value.trim();
    const nivelSeveridad = document.getElementById("nivel_severidad").value;
    const nombreInformante = document.getElementById("nombre_informante").value.trim();
    const telefonoInformante = document.getElementById("telefono_informante").value.trim();
    const estado_urgencia = document.getElementById("estado_urgencia").value.trim();
    const estado_descripcion = document.getElementById("descripcion_situacion").value.trim();   
    const numero_personas = document.getElementById("numero_personas").value.trim();
    const fechaCreacionInput = document.getElementById("fecha_creacion").value;
    const horaCreacionInput = document.getElementById("hora_creacion").value;
    const fechaActualizacionInput = document.getElementById("fecha_actualizacion").value;
    const necesidadesSeleccionadas = [];

    if (necesidad_agua) necesidadesSeleccionadas.push("Agua");
    if (necesidad_alimentos) necesidadesSeleccionadas.push("Alimentación");
    if (necesidad_medicos) necesidadesSeleccionadas.push("Medicamentos");
    if (necesidad_ropa) necesidadesSeleccionadas.push("Ropa");
    if (descripcion) necesidadesSeleccionadas.push(descripcion);

    let esValido = true;
    document.querySelectorAll('.error').forEach(span => span.textContent = '');

    if (comunidad === '') {
        document.getElementById('error-comunidad').textContent = 'Por favor, seleccione el nombre de la comunidad.';
        esValido = false;
    }
    if (longitud === '') { 
        document.getElementById('error-longitud').textContent = 'Por favor, escriba las coordenadas de longitud.';
        esValido = false;
    }
    if (latitud === '') { 
        document.getElementById('error-latitud').textContent = 'Por favor, escriba las coordenadas de latitud.';
        esValido = false;
    }
    if (municipio === '') {
        document.getElementById('error-municipio').textContent = 'Por favor, seleccione el municipio.';
        esValido = false;
    }
    if (estado === '') {
        document.getElementById('error-estado').textContent = 'Por favor, seleccione el estado.';
        esValido = false;
    }
    if (categoriaIncidente === '') {
        document.getElementById('error-categoria_incidente').textContent = 'Por favor, seleccione la categoría del incidente.';
        esValido = false;
    }
    if (necesidadesSeleccionadas.length === 0) {
        document.getElementById('error-necesidades').textContent = 'Por favor, seleccione al menos una necesidad.';
        esValido = false;
    }
    if (nivelSeveridad === '') {
        document.getElementById('error-nivel_severidad').textContent = 'Por favor, seleccione el nivel de severidad.';
        esValido = false;
    }
    if (estado_urgencia === '') {
        document.getElementById('error-estado_urgencia').textContent = 'Por favor, seleccione el estado de urgencia.';
        esValido = false;
    }
    if (esValido) {
        // Generamos fecha y hora exacta actual de manera automática para MongoDB
        const fechaActual = new Date();
        const fechaCreacion = fechaCreacionInput
            || `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}-${String(fechaActual.getDate()).padStart(2, '0')}`;
        const horaCreacion = horaCreacionInput
            || `${String(fechaActual.getHours()).padStart(2, '0')}:${String(fechaActual.getMinutes()).padStart(2, '0')}`;

        const datosReporte = {
            comunidad: comunidad,
            ubicacion: {
                estado: estado,
                municipio: municipio,
                latitud: Number(latitud),
                longitud: Number(longitud)
            },
            necesidades: necesidadesSeleccionadas,
            categoria_incidente: categoriaIncidente,
            riesgos_activos: riesgosActivos,
            nivel_severidad: nivelSeveridad,
            nombre_informante: nombreInformante,
            telefono_informante: telefonoInformante,
            estado_urgencia: estado_urgencia,
            descripcion: descripcion,
            descripcion_situacion: estado_descripcion,
            numero_personas: Number(numero_personas),
            fecha_creacion: new Date(`${fechaCreacion}T${horaCreacion}:00`),
            hora_creacion: horaCreacion,
            fecha_actualizacion: fechaActualizacionInput
                ? new Date(`${fechaActualizacionInput}T${horaCreacion}:00`)
                : (idReporteEnEdicion ? fechaActual : null)
        };


        const url = idReporteEnEdicion
            ? `http://localhost:3000/api/reportes/${encodeURIComponent(idReporteEnEdicion)}`
            : 'http://localhost:3000/api/reportes'


            const metodo = idReporteEnEdicion ? 'PUT' : 'POST';


            if (!idReporteEnEdicion) {
                datosReporte.fecha_creacion = fechaActual;
            }

            fetch(url, {
                method: metodo,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosReporte)
            })
            .then(async response => {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(`${data.message || 'Error'} (HTTP ${response.status})`);
                }
                return data;
            })
        .then(data => {
            console.log('Éxito:', data);

            alert(idReporteEnEdicion ? 'Reporte actualizado con exito' : 'Reporte enviado exitosamente');
            

            //  Reseteamos variables y formulario
            idReporteEnEdicion = null;
            formulario.reset();
            if (marcadorActual) {
                map.removeLayer(marcadorActual);
            }
            marcadorActual = null;
            panelFormulario.hidden = true;
            indicacionMapa.hidden = false;

            // Volvemos a cargar los reportes desde la BD de forma automática y sin recargar la página
            cargarReportesGuardados();
        })
        .catch(error => {
            console.error('Error:', error);
            alert(`No se pudo enviar el reporte: ${error.message}`);
        });
    }
});


// ==========================================
// 4. AUTOCOMPLETADO
// ==========================================
const municipiosGuanajuato = ["Abasolo", "Guanajuato", "Huanímaro", "Irapuato", "León", "Valle de Santiago"];
const estadosMexico = ["Guanajuato", "Aguascalientes", "Baja California", "Baja California Sur"];

function normalizar(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function configurarAutocompletado(inputId, sugerenciasId, opciones) {
    const input = document.getElementById(inputId);
    const contenedor = document.getElementById(sugerenciasId);

    input.addEventListener("input", function () {
        const consulta = normalizar(input.value);
        contenedor.replaceChildren();

        if (!consulta) return;

        const coincidencias = opciones.filter(opcion => normalizar(opcion).includes(consulta));

        coincidencias.forEach(opcion => {
            const elemento = document.createElement("div");
            elemento.className = "sugerencia-item";
            elemento.textContent = opcion;
            elemento.addEventListener("click", function () {
                input.value = opcion;
                contenedor.replaceChildren();
            });
            contenedor.appendChild(elemento);
        });
    });

    document.addEventListener("click", function (evento) {
        if (!input.parentElement.contains(evento.target)) {
            contenedor.replaceChildren();
        }
    });
}

configurarAutocompletado("municipio", "sugerencias-municipio", municipiosGuanajuato);
configurarAutocompletado("estado", "sugerencias-estado", estadosMexico);



// ==========================================
// 5. FUNCIONES GLOBALES PARA POPUPS (EDITAR / VER MÁS)
// ==========================================

// Variable global para saber si estamos editando un reporte existente y cuál es su ID
let idReporteEnEdicion = null;

function formatearFecha(valor) {
    if (!valor) return "";
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return "";
    return [
        fecha.getUTCFullYear(),
        String(fecha.getUTCMonth() + 1).padStart(2, "0"),
        String(fecha.getUTCDate()).padStart(2, "0")
    ].join("-");
}

// 1. Función cuando hacen clic en "Editar"
function cargarReporteParaEditar(id) {
    // Buscamos el reporte en nuestra lista global usando el _id de MongoDB
    const reporte  = listaReportesGlobal.find( r => r._id === id );
    if (!reporte) return;

    // Activamos el modo edición guardando el ID
    idReporteEnEdicion = id;

    // Rellenamos cada input del formulario con los datos actuales de la BD
    document.getElementById("comunidad").value = reporte.comunidad || "";
    document.getElementById("municipio").value = reporte.ubicacion?.municipio || "";
    document.getElementById("estado").value = reporte.ubicacion?.estado || "";
    document.getElementById("latitud").value = reporte.ubicacion?.latitud || "";
    document.getElementById("longitud").value = reporte.ubicacion?.longitud || "";
    document.getElementById("estado_urgencia").value = reporte.estado_urgencia || "";
    document.getElementById("categoria_incidente").value = reporte.categoria_incidente || "";
    document.getElementById("riesgos_activos").value = reporte.riesgos_activos || "";
    document.getElementById("nivel_severidad").value = reporte.nivel_severidad || "";
    document.getElementById("nombre_informante").value = reporte.nombre_informante || "";
    document.getElementById("telefono_informante").value = reporte.telefono_informante || "";
    document.getElementById("descripcion").value = reporte.descripcion || "";
    document.getElementById("descripcion_situacion").value = reporte.descripcion_situacion || "";
    document.getElementById("numero_personas").value = reporte.numero_personas || "";
    document.getElementById("n_1").checked = reporte.necesidades?.includes("Agua") || false;
    document.getElementById("n_2").checked = reporte.necesidades?.includes("Alimentación") || false;
    document.getElementById("n_3").checked = reporte.necesidades?.includes("Medicamentos") || false;
    document.getElementById("n_4").checked = reporte.necesidades?.includes("Ropa") || false;
    document.getElementById("fecha_creacion").value = formatearFecha(reporte.fecha_creacion);
    document.getElementById("hora_creacion").value = reporte.hora_creacion || "";
    document.getElementById("fecha_actualizacion").value = formatearFecha(reporte.fecha_actualizacion);

    if (reporte.ubicacion?.latitud != null && reporte.ubicacion?.longitud != null) {
        const posicion = [reporte.ubicacion.latitud, reporte.ubicacion.longitud];
        const colorPin = obtenerColorUrgencia(reporte.estado_urgencia);

        if (marcadorActual) {
            marcadorActual.setLatLng(posicion);
            marcadorActual.setStyle({ fillColor: colorPin });
        } else {
            marcadorActual = L.circleMarker(posicion, {
                radius: 10,
                fillColor: colorPin,
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(map);
        }
    }

    // Mostramos el panel del formulario y ocultamos la indicación del mapa
    document.getElementById("panel-formulario").hidden = false;
    document.getElementById("map-hint").hidden = true;

}

function verDetalles(id) {
    const reporte = listaReportesGlobal.find(item => item._id === id);
    if (!reporte) return;

    const texto = (valor) => {
        if (valor === null || valor === undefined || String(valor).trim() === "") {
            return "No especificado";
        }
        return String(valor);
    };

    const necesidades = Array.isArray(reporte.necesidades) && reporte.necesidades.length > 0
        ? reporte.necesidades.join(", ")
        : "No especificado";

    alert(
        `ID: ${reporte._id}\n` +
        `\nDATOS DE UBICACIÓN\n` +
        `Comunidad/Localidad/Colonia/Rancho: ${texto(reporte.comunidad)}\n` +
        `Municipio: ${texto(reporte.ubicacion?.municipio)}\n` +
        `Estado: ${texto(reporte.ubicacion?.estado)}\n` +
        `Latitud: ${texto(reporte.ubicacion?.latitud)}\n` +
        `Longitud: ${texto(reporte.ubicacion?.longitud)}\n` +
        `\nTIPO Y NATURALEZA / NECESIDADES\n` +
        `Categoría o tipo de incidente: ${texto(reporte.categoria_incidente)}\n` +
        `Necesidades: ${necesidades}\n` +
        `Otros productos o necesidades: ${texto(reporte.descripcion)}\n` +
        `Descripción de la situación: ${texto(reporte.descripcion_situacion)}\n` +
        `Riesgos activos: ${texto(reporte.riesgos_activos)}\n` +
        `\nURGENCIA Y SEVERIDAD\n` +
        `Nivel de severidad: ${texto(reporte.nivel_severidad)}\n` +
        `Estado de la urgencia: ${texto(reporte.estado_urgencia)}\n` +
        `Número de personas afectadas: ${texto(reporte.numero_personas)}\n` +
        `\nINFORMACIÓN DE CONTACTO Y SEGUIMIENTO\n` +
        `Nombre del informante: ${texto(reporte.nombre_informante)}\n` +
        `Teléfono de contacto: ${texto(reporte.telefono_informante)}\n` +
        `Fecha de creación: ${texto(formatearFecha(reporte.fecha_creacion) || reporte.fecha_creacion)}\n` +
        `Hora de creación: ${texto(reporte.hora_creacion)}\n` +
        `Última fecha de modificación: ${texto(formatearFecha(reporte.fecha_actualizacion) || reporte.fecha_actualizacion)}`
    );
}
   
// 2. Función para cancelar o cerrar el formulario desde el popup
function cerrarFormularioPopup() {
    idReporteEnEdicion = null; //
    document.getElementById("formulario").reset();
    document.getElementById("panel-formulario").hidden = true;
    document.getElementById("map-hint").hidden = false;
}




