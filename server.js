const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { IoTDataPlaneClient, PublishCommand } = require('@aws-sdk/client-iot-data-plane');

const app = express();
const PORT = 3000;
app.use(express.json());

const client = new DynamoDBClient({ region: 'us-east-2' });
const docClient = DynamoDBDocumentClient.from(client);
const iotClient = new IoTDataPlaneClient({ region: 'us-east-2' });

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

app.post('/control', async (req, res) => {
  const { comando } = req.body;
  if (!['ENCENDER', 'APAGAR'].includes(comando)) {
    return res.status(400).json({ error: 'Comando invalido' });
  }
  try {
    await iotClient.send(new PublishCommand({
      topic: 'sensor/control',
      payload: JSON.stringify({ comando }),
      qos: 0
    }));
    res.json({ ok: true, comando });
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
<script src="https://cdn.jsdelivr.net/npm/chart.js"></` + `script>
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
  .control-panel { margin: 20px auto; background: #16213e; border-radius: 12px; padding: 20px; width: 90%; max-width: 500px; }
  .control-panel h2 { color: #00d4ff; margin-bottom: 15px; }
  .btn-encender { background: #00c851; color: white; border: none; padding: 14px 40px; font-size: 18px; border-radius: 8px; cursor: pointer; margin: 8px; }
  .btn-apagar { background: #ff4444; color: white; border: none; padding: 14px 40px; font-size: 18px; border-radius: 8px; cursor: pointer; margin: 8px; }
  .sensor-status { margin-top: 12px; font-size: 15px; padding: 8px 16px; border-radius: 6px; display: inline-block; }
  .status-on { background: rgba(0,200,81,0.2); color: #00c851; border: 1px solid #00c851; }
  .status-off { background: rgba(255,68,68,0.2); color: #ff4444; border: 1px solid #ff4444; }
  .msg { font-size: 13px; color: #aaa; margin-top: 8px; height: 20px; }
</style>
</head>
<body>
<h1>Sensor de Lluvia</h1>
<div id="estado" class="estado">Cargando...</div>
<div id="valor" class="valor"></div>
<div id="ultima" class="ultima"></div>
<div id="contador" class="contador"></div>
<div class="control-panel">
  <h2>Control del Sensor</h2>
  <button class="btn-encender" onclick="controlar('ENCENDER')">ENCENDER</button>
  <button class="btn-apagar" onclick="controlar('APAGAR')">APAGAR</button>
  <br>
  <span id="sensorStatus" class="sensor-status status-on">Sensor: ACTIVO</span>
  <div id="msgControl" class="msg"></div>
</div>
<div class="grafica-container">
  <h2 style="margin-bottom:15px; color:#00d4ff;">Grafica de Valores</h2>
  <canvas id="grafica" height="100"></canvas>
</div>
<h2 style="margin: 20px 0 10px;">Historial</h2>
<table>
  <tr><th>Fecha y Hora</th><th>Estado</th><th>Valor</th></tr>
  <tbody id="historial"></tbody>
</table>
<script>
function formatTime(ts) {
  var d = new Date(Number(ts));
  return d.toLocaleString('es-PE', { timeZone: 'America/Lima' });
}
function formatTimeShort(ts) {
  var d = new Date(Number(ts));
  return d.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function controlar(cmd) {
  var msg = document.getElementById('msgControl');
  var st = document.getElementById('sensorStatus');
  msg.innerHTML = 'Enviando...';
  fetch('/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comando: cmd })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.ok) {
      msg.innerHTML = 'Comando ' + cmd + ' enviado OK';
      if (cmd === 'ENCENDER') {
        st.className = 'sensor-status status-on';
        st.innerHTML = 'Sensor: ACTIVO';
      } else {
        st.className = 'sensor-status status-off';
        st.innerHTML = 'Sensor: APAGADO';
      }
    } else {
      msg.innerHTML = 'Error: ' + d.error;
    }
    setTimeout(function() { msg.innerHTML = ''; }, 4000);
  }).catch(function() {
    msg.innerHTML = 'Error de red';
    setTimeout(function() { msg.innerHTML = ''; }, 4000);
  });
}
var ctx = document.getElementById('grafica').getContext('2d');
var grafica = new Chart(ctx, {
  type: 'line',
  data: { labels: [], datasets: [{ label: 'Valor Analogico', data: [], borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,0.1)', borderWidth: 2, pointBackgroundColor: '#00d4ff', tension: 0.4, fill: true }] },
  options: { responsive: true, scales: { y: { min: 0, max: 4095, ticks: { color: '#aaa' }, grid: { color: '#333' } }, x: { ticks: { color: '#aaa' }, grid: { color: '#333' } } }, plugins: { legend: { labels: { color: 'white' } } } }
});
function cargarDatos() {
  fetch('/datos').then(function(r) { return r.json(); }).then(function(data) {
    if (data.length > 0) {
      var ul = data[0];
      var estado = ul.payload ? ul.payload.estado : ul.estado;
      var valor = ul.payload ? ul.payload.valor_analogico : ul.valor_analogico;
      var ts = ul.timestamp;
      document.getElementById('estado').innerHTML = estado === 'LLUVIA' ? 'LLUVIA' : 'SECO';
      document.getElementById('valor').innerHTML = 'Valor: ' + valor + ' | Umbral: 2000';
      document.getElementById('ultima').innerHTML = 'Actualizado: ' + formatTime(ts);
      var labels = [];
      var valores = [];
      data.slice().reverse().forEach(function(item) {
        var v = item.payload ? item.payload.valor_analogico : item.valor_analogico;
        labels.push(formatTimeShort(item.timestamp));
        valores.push(v);
      });
      grafica.data.labels = labels;
      grafica.data.datasets[0].data = valores;
      grafica.update();
      var tbody = document.getElementById('historial');
      tbody.innerHTML = '';
      data.forEach(function(item) {
        var e = item.payload ? item.payload.estado : item.estado;
        var v = item.payload ? item.payload.valor_analogico : item.valor_analogico;
        var t = formatTime(item.timestamp);
        var cls = e === 'LLUVIA' ? 'lluvia' : 'seco';
        tbody.innerHTML += '<tr><td>' + t + '</td><td class=' + cls + '>' + e + '</td><td>' + v + '</td></tr>';
      });
    }
  });
}
cargarDatos();
setInterval(cargarDatos, 5000);
var seg = 5;
setInterval(function() {
  seg--;
  if (seg <= 0) seg = 5;
  document.getElementById('contador').innerHTML = 'Actualizando en ' + seg + ' segundos...';
}, 1000);
</` + `script>
</body>
</html>`);
});

app.listen(PORT, function() { console.log('Dashboard en http://0.0.0.0:' + PORT); });
