const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const app = express();
const PORT = 3000;

const client = new DynamoDBClient({ region: 'us-east-2' });
const docClient = DynamoDBDocumentClient.from(client);

app.get('/datos', async (req, res) => {
  try {
    const command = new QueryCommand({
      TableName: 'sensor-lluvia-historial',
      KeyConditionExpression: 'dispositivo = :d',
      ExpressionAttributeValues: { ':d': 'esp32-sensor' },
      ScanIndexForward: false,
      Limit: 20
    });
    const response = await docClient.send(command);
    res.json(response.Items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Sensor de Lluvia</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial; background: #1a1a2e; color: white; text-align: center; padding: 20px; }
  h1 { color: #00d4ff; font-size: 28px; margin-bottom: 20px; }
  .estado { font-size: 70px; margin: 10px 0; }
  .valor { font-size: 22px; color: #aaa; }
  .ultima { font-size: 14px; color: #888; margin: 5px 0; }
  .contador { font-size: 13px; color: #555; margin-bottom: 20px; }
  .grafica-container { width: 90%; margin: 20px auto; background: #16213e; border-radius: 10px; padding: 20px; }
  table { margin: 20px auto; border-collapse: collapse; width: 90%; }
  th { background: #00d4ff; color: black; padding: 10px; }
  td { padding: 8px; border-bottom: 1px solid #333; font-size: 14px; }
  .lluvia { color: #00d4ff; font-weight: bold; }
  .seco { color: #ffa500; font-weight: bold; }
</style>
</head>
<body>
<h1>🌧️ Monitor Sensor de Lluvia</h1>
<div id="estado" class="estado">Cargando...</div>
<div id="valor" class="valor"></div>
<div id="ultima" class="ultima"></div>
<div id="contador" class="contador"></div>

<div class="grafica-container">
  <h2 style="margin-bottom:15px; color:#00d4ff;">📈 Gráfica de Valores</h2>
  <canvas id="grafica" height="100"></canvas>
</div>

<h2 style="margin: 20px 0 10px;">📋 Historial</h2>
<table>
  <tr><th>Fecha y Hora</th><th>Estado</th><th>Valor</th></tr>
  <tbody id="historial"></tbody>
</table>

<script>
function formatTime(ts) {
  const d = new Date(Number(ts));
  return d.toLocaleString('es-PE', { timeZone: 'America/Lima' });
}
function formatTimeShort(ts) {
  const d = new Date(Number(ts));
  return d.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const ctx = document.getElementById('grafica').getContext('2d');
const grafica = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Valor Analógico',
      data: [],
      borderColor: '#00d4ff',
      backgroundColor: 'rgba(0,212,255,0.1)',
      borderWidth: 2,
      pointBackgroundColor: '#00d4ff',
      tension: 0.4,
      fill: true
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: {
        min: 0, max: 4095,
        ticks: { color: '#aaa' },
        grid: { color: '#333' }
      },
      x: { ticks: { color: '#aaa' }, grid: { color: '#333' } }
    },
    plugins: {
      legend: { labels: { color: 'white' } },
      annotation: {
        annotations: {
          umbral: {
            type: 'line',
            yMin: 2000, yMax: 2000,
            borderColor: 'red',
            borderWidth: 2,
            label: { content: 'Umbral', enabled: true, color: 'red' }
          }
        }
      }
    }
  }
});

function cargarDatos() {
  fetch('/datos').then(r=>r.json()).then(data=>{
    if(data.length > 0){
      const ultimo = data[0];
      const estado = ultimo.payload ? ultimo.payload.estado : ultimo.estado;
      const valor = ultimo.payload ? ultimo.payload.valor_analogico : ultimo.valor_analogico;
      const ts = ultimo.timestamp;
      document.getElementById('estado').innerHTML = estado === 'LLUVIA' ? '🌧️ LLUVIA' : '☀️ SECO';
      document.getElementById('valor').innerHTML = 'Valor analógico: ' + valor + ' | Umbral: 2000';
      document.getElementById('ultima').innerHTML = 'Última actualización: ' + formatTime(ts);

      const labels = [];
      const valores = [];
      const dataRev = [...data].reverse();
      dataRev.forEach(item => {
        const v = item.payload ? item.payload.valor_analogico : item.valor_analogico;
        labels.push(formatTimeShort(item.timestamp));
        valores.push(v);
      });
      grafica.data.labels = labels;
      grafica.data.datasets[0].data = valores;
      grafica.update();

      const tbody = document.getElementById('historial');
      tbody.innerHTML = '';
      data.forEach(item => {
        const e = item.payload ? item.payload.estado : item.estado;
        const v = item.payload ? item.payload.valor_analogico : item.valor_analogico;
        const t = formatTime(item.timestamp);
        tbody.innerHTML += '<tr><td>'+t+'</td><td class="'+(e==='LLUVIA'?'lluvia':'seco')+'">'+e+'</td><td>'+v+'</td></tr>';
      });
    }
  });
}

cargarDatos();
setInterval(cargarDatos, 5000);

let seg = 5;
setInterval(() => {
  seg--;
  if(seg <= 0) seg = 5;
  document.getElementById('contador').innerHTML = 'Actualizando en ' + seg + ' segundos...';
}, 1000);
</script>
</body>
</html>`);
});

app.listen(PORT, () => console.log('Dashboard en http://0.0.0.0:' + PORT));
