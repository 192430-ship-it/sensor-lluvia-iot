# Sensor de Lluvia IoT - ESP32 + AWS

Monitor de sensor de lluvia con control remoto desde dashboard web.

## Tecnologías
- ESP32 + Sensor MH-RD
- AWS IoT Core (MQTT)
- AWS DynamoDB
- AWS EC2
- Node.js + Express

## Arquitectura
ESP32 → AWS IoT Core → DynamoDB → EC2 → Dashboard Web

## Dashboard
http://18.118.25.93:3000

## Funcionalidades
- Lectura del sensor en tiempo real
- Gráfica de valores históricos
- Historial de registros
- Control remoto ENCENDER/APAGAR desde el dashboard
