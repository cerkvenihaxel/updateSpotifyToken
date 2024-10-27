require('dotenv').config();
const axios = require('axios');
const mysql = require('mysql2/promise');
const cron = require('node-cron');
const fs = require('fs');

// Configuración de la conexión a la base de datos
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

// Función para actualizar el token de acceso de Spotify
async function updateSpotifyToken() {
  try {
    // Solicitud para obtener un nuevo token de acceso
    const response = await axios.post('https://accounts.spotify.com/api/token', null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: process.env.REFRESH_TOKEN,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
    });

    const accessToken = response.data.access_token;
    const expirationDate = new Date(Date.now() + response.data.expires_in * 1000);
    const newRefreshToken = response.data.refresh_token; // Asegúrate de que el nuevo refresh_token esté en la respuesta

    // Actualizar el token en la base de datos
    await db.query(
        'INSERT INTO token_codes (access_token, expiration_date) VALUES (?, ?)',
        [accessToken, expirationDate]
      );

    console.log('Token de acceso actualizado:', accessToken);

  } catch (error) {
    console.error('Error al actualizar el token de acceso:', error.message);
  }
}

// Programar la actualización automática cada 50 minutos
cron.schedule('*/50 * * * *', () => {
  console.log('Ejecutando tarea de actualización de token...');
  updateSpotifyToken();
});

// Ejecutar la primera actualización inmediatamente
updateSpotifyToken();