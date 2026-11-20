require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Conexión a la base de datos MongoDB
const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
    throw new Error('Falta configurar MONGO_URI en el archivo .env');
}

mongoose.connect(mongoURI) 
.then(async () => {
    console.log('Conexión exitosa a MongoDB');

    const reportesExistentes = await mongoose.connection
        .collection('reportes')
        .distinct('_id', { _id: { $regex: /^R\d+$/ } });
    const ultimaSecuencia = reportesExistentes.reduce((mayor, id) => {
        return Math.max(mayor, Number(id.slice(1)) || 0);
    }, 0);

    await Contador.updateOne(
        { _id: 'reportes' },
        { $max: { secuencia: ultimaSecuencia } },
        { upsert: true }
    );

    app.listen(3000, () => {
        console.log('Servidor corriendo en http://localhost:3000');
    });
})
.catch((error) => { console.error('Error al conectar a MongoDB:', error); });

// Definición del esquema y modelo de datos
const reportSchema = new mongoose.Schema({
    _id: String,
    comunidad: String,
    ubicacion: {
        estado: String,
        municipio: String,
        latitud: Number,
        longitud: Number
    },
    necesidades: [String],
    categoria_incidente: String,
    riesgos_activos: String,
    nivel_severidad: String,
    nombre_informante: String,
    telefono_informante: String,
    prioridad: String,
    estado_urgencia: String,
    descripcion: String,
    descripcion_situacion: String,
    numero_personas: Number,
    fecha_creacion: Date,
    hora_creacion: String,
    fecha_actualizacion: Date
});

const Reporte = mongoose.model('Reporte', reportSchema, 'reportes');




// Esquema para llevar el control del último número asignado
const contadorSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    secuencia: { type: Number, default: 0 }
});
const Contador = mongoose.model('Contador', contadorSchema, 'contadores');

// Ruta para recibir los datos del formulario
app.post('/api/reportes', async (req, res) => {
    try {
        const contador = await Contador.findOneAndUpdate(
            { _id: 'reportes' },
            { $inc: { secuencia: 1 } },
            { new: true, upsert: true }
        );
        const idCorto = `R${String(contador.secuencia).padStart(4, '0')}`;

        const nuevoReporte = new Reporte({
            ...req.body,
            _id: idCorto
        });

        const reporteGuardado = await nuevoReporte.save();
        res.status(201).json(reporteGuardado);

        // res.status(201).json({ message: 'Reporte guardado exitosamente' });
    } catch (error) {
        console.error('Error al guardar el reporte:', error);
        res.status(500).json({ message: 'Error al guardar el reporte' });
    }
});


app.put('/api/reportes/:id', async (req, res) => {
    try {
        const { id } = req.params; // Recibirá algo como "R0010"
        const reporteActualizado = await Reporte.findByIdAndUpdate(id, req.body, { new: true });
        
        if (!reporteActualizado) {
            return res.status(404).json({ message: "Reporte no encontrado" });
        }

        res.json(reporteActualizado);
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar el reporte" });
    }
});

app.get('/api/reportes', async (req, res) => {
    try{
        const reportes = await Reporte.find(); //busca en los documentos de MongoDB
        res.json(reportes);
    } catch (error) {
        res.status(500).json({error: "Error al obtener los reportes"});
    }
});