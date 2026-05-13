#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <WiFi.h>

// ===== CONFIGURACIÓN WiFi =====
const char* ssid = "Familia Tito";
const char* password = "titoquispe24.";

// ===== CONFIGURACIÓN AWS IoT =====
const char* mqtt_server = "a299mqez5wy3z1-ats.iot.us-east-2.amazonaws.com";
const int mqtt_port = 8883;
const char* mqtt_topic = "sensor/lluvia";
const char* client_id = "esp32-sensor-lluvia";

// ===== PINES DEL SENSOR =====
#define LED_ESP32 2
#define PIN_ANALOGICO 34  // AO del sensor
int umbral = 2000;

// ===== CERTIFICADO RAÍZ DE AMAZON =====
const char* ca_cert = \
"-----BEGIN CERTIFICATE-----\n"
"MIIDQTCCAimgAwIBAgITBmyfz5m/jAo54vB4ikPmljZbyjANBgkqhkiG9w0BAQsF\n"
"ADA5MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRkwFwYDVQQDExBBbWF6\n"
"b24gUm9vdCBDQSAxMB4XDTE1MDUyNjAwMDAwMFoXDTM4MDExNzAwMDAwMFowOTEL\n"
"MAkGA1UEBhMCVVMxDzANBgNVBAoTBkFtYXpvbjEZMBcGA1UEAxMQQW1hem9uIFJv\n"
"b3QgQ0EgMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALJ4gHHKeNXj\n"
"ca9HgFB0fW7Y14h29Jlo91ghYPl0hAEvrAIthtOgQ3pOsqTQNroBvo3bSMgHFzZM\n"
"9O6II8c+6zf1tRn4SWiw3te5djgdYZ6k/oI2peVKVuRF4fn9tBb6dNqcmzU5L/qw\n"
"IFAGbHrQgLKm+a/sRxmPUDgH3KKHOVj4utWp+UhnMJbulHheb4mjUcAwhmahRWa6\n"
"VOujw5H5SNz/0egwLX0tdHA114gk957EWW67c4cX8jJGKLhD+rcdqsq08p8kDi1L\n"
"93FcXmn/6pUCyziKrlA4b9v7LWIbxcceVOF34GfID5yHI9Y/QCB/IIDEgEw+OyQm\n"
"jgSubJrIqg0CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMC\n"
"AYYwHQYDVR0OBBYEFIQYzIU07LwMlJQuCFmcx7IQTgoIMA0GCSqGSIb3DQEBCwUA\n"
"A4IBAQCY8jdaQZChGsV2USggNiMOruYou6r4lK5IpDB/G/wkjUu0yKGX9rbxenDI\n"
"U5PMCCjjmCXPI6T53iHTfIUJrU6adTrCC2qJeHZERxhlbI1Bjjt/msv0tadQ1wUs\n"
"N+gDS63pYaACbvXy8MWy7Vu33PqUXHeeE6V/Uq2V8viTO96LXFvKWlJbYK8U90vv\n"
"o/ufQJVtMVT8QtPHRh8jrdkPSHCa2XV4cdFyQzR1bldZwgJcJmApzyMZFo6IQ6XU\n"
"5MsI+yMRQ+hDKXJioaldXgjUkK642M4UwtBV8ob2xJNDd2ZhwLnoQdeXeGADbkpy\n"
"rqXRfboQnoZsG4q5WTP468SQvvG5\n"
"-----END CERTIFICATE-----\n";

// ===== CERTIFICADO DEL DISPOSITIVO =====
const char* device_cert = \
"-----BEGIN CERTIFICATE-----\n"
"MIIDWTCCAkGgAwIBAgIUa6d3JV02L+A6jqH1tuE0LzPuYrkwDQYJKoZIhvcNAQEL\n"
"BQAwTTFLMEkGA1UECwxCQW1hem9uIFdlYiBTZXJ2aWNlcyBPPUFtYXpvbi5jb20g\n"
"SW5jLiBMPVNlYXR0bGUgU1Q9V2FzaGluZ3RvbiBDPVVTMB4XDTI2MDUxMzIwMDQy\n"
"NVoXDTQ5MTIzMTIzNTk1OVowHjEcMBoGA1UEAwwTQVdTIElvVCBDZXJ0aWZpY2F0\n"
"ZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALA7fNsJ2hnWsBy2+tY9\n"
"AsXJmsziDMyy5lsAueC1oev/XK74Bsu6GvuAxuO2GujXqtn8nIUuLVX80eFp2Cdf\n"
"5ztdv7Xvrtgos1aysBTEeYnf7aZqk9Aofhrj41IZxWs7siYNY2iAjO4cpOr7gqn5\n"
"NjdyxArS0/QplLA+KFm1aW1iBiDK+k1t+/cXyg9ZPtJ0yGBMXkXG42NohDRfjkoo\n"
"vbJ3XSnF4XTVB+5466kYB8b6UlhRV4gRV3JcpEQ0H+Fp6h/t/tq1H6hXEHsgjo8t\n"
"BhlymzfH4Tp5Dg8xVgCcH0Pig5VHGerJCBbfpaQVOT0ojjD7etPF2962UroY1QvS\n"
"YocCAwEAAaNgMF4wHwYDVR0jBBgwFoAUnxQmAf6zEExMhw9c3v+WO3uGg+8wHQYD\n"
"VR0OBBYEFMq8tefDDQkGQsun5QMkTtkpyX6QMAwGA1UdEwEB/wQCMAAwDgYDVR0P\n"
"AQH/BAQDAgeAMA0GCSqGSIb3DQEBCwUAA4IBAQCvDBrfvQWEL+RIXv1YfzQHLh7a\n"
"yOi8yJarw5ssCt25DxCFycTCXrNS3evMV4c10JVeQDhHdsqAzzBu/LQ0zRSun6GO\n"
"XgR0UVVfGhhIk/lzYQsGjwpXYmlw2Ksv+MEh9Kie4bTJ4yFYMEUhNQXECvUyS9TB\n"
"VvdoL6if2fcRq4+p0sNyozLgr8h1hQLqHrbtKuMRsrlVK9fIGyyHmmCsJYAEanJm\n"
"OvzOsUybwLd1Lpjc8wXuNscIdxMyH8YffSoAAnAPqOD95U5jrqiHchIww59QdZSC\n"
"wKUjbEoTfoUdbE/ag6gwyYwhKjtVmfrjmEeAwl5TF7Y17wmQuvJMeny75+3i\n"
"-----END CERTIFICATE-----\n";

// ===== LLAVE PRIVADA =====
const char* private_key = \
"-----BEGIN RSA PRIVATE KEY-----\n"
"MIIEpAIBAAKCAQEAsDt82wnaGdawHLb61j0CxcmazOIMzLLmWwC54LWh6/9crvgG\n"
"y7oa+4DG47Ya6Neq2fychS4tVfzR4WnYJ1/nO12/te+u2CizVrKwFMR5id/tpmqT\n"
"0Ch+GuPjUhnFazuyJg1jaICM7hyk6vuCqfk2N3LECtLT9CmUsD4oWbVpbWIGIMr6\n"
"TW379xfKD1k+0nTIYExeRcbjY2iENF+OSii9snddKcXhdNUH7njrqRgHxvpSWFFX\n"
"iBFXclykRDQf4WnqH+3+2rUfqFcQeyCOjy0GGXKbN8fhOnkODzFWAJwfQ+KDlUcZ\n"
"6skIFt+lpBU5PSiOMPt608Xb3rZSuhjVC9JihwIDAQABAoIBAB11ZDKNHAsTqw6x\n"
"u45SVoNPZvP2mWMiSIVPwsKAOhfj8M9CoIgvjNEbvqNTzn27h1C2/Eb66BMmlsLS\n"
"WZKDYni2/BPig9yYORo19l8SVKqqZuRZjmnOSv4dt+MCcdCyAt5/gG14h5ZJ7Xtm\n"
"HXpiMSDlq0WP5mQ7CyLG0SHlxEDHSaWXWMV2TRksMAZMFjo1qgRUg8WGwv80YvXx\n"
"uJXjpjtrhfnTVYGnx8HO5g4aF5SkldanMTeBxGQ+kxE+1R4HgzQ68EJUQvDLQRzJ\n"
"1rB34eTqCySeHhVkSxKFBf2sbJ21vt7HFivk1LnNBQIwQgLnnZU2u0O7sHbgFkLx\n"
"kImg9MkCgYEA6NAU4gCAfUAVsBgMeH7YuBXH1nkBo0jLqAGblVkvVj8GDIMwneVD\n"
"lvjAqyjYS1ZTbz6c0rW14lmk95GZfESobRtO8sSWi5rTQymAhzwwEjD1rJqBb3U9\n"
"ikKSvV46aEELnzrSfds5lBGqK+++5QZuZXDIBsfKD/CsXmpeAHUuga0CgYEAwcjN\n"
"IKu7N3QrCcKr/QZhPYJJFD4YLB/0gsiKYWglryqt7FiAkz8+l0UoHov59zezDP6G\n"
"7iZX6GVF3RMGK/JE6AcSVciqJqoT/J2GzZLpFMrJ0AKAK9EwMZgJ3kdsJ1zkepN5\n"
"qIo4fDU2n/oV39vtNSPWD/MM97t0+mLxUGmlA4MCgYBlfsmL2YIqmHScB2/wXARp\n"
"BH3Rf4F6SPMYNFM6od3kMKeXbt4UB+4WdC2ysKTS+zh2iApgRf2cR06G63/JUDlJ\n"
"D520coXbKM0vO3mf+1pNo/CGpfkFuUvx6aIFUn4OE0VYzpETcy4/4g+ZBfTn7YzV\n"
"Rny9j/4EQv0yUBbZBj0XJQKBgQCIUI1jPwp6TsB7pDJB0fwTPZPUpn1whKYGXbVi\n"
"IdXoa3he+j6v1dxcoqw/GK4kpkzQhjc6TUSnWJ4Vjm1X+ptYMKlIKNjwS9G1cMZD\n"
"0+Ub2C6woSGyMPva1x2R++Hrqp+aTiVVVq23SeN8E3rRty4cpHHPVGS522bFP1aK\n"
"/1WxqwKBgQC8uv5KlMkBIP1mZkC//u6xbhziIpyypYJDIw/4r4OsaEEaas2WaM+w\n"
"z1zub1ITbtQ9+AXkvcbYaOIeFuvQJJedbYKkltToA8xiRCFLe3MQAV/TyR6GD7g5\n"
"zCTMzhNESBrutXLYpTyJGQpvfzOYUoDT4ReZu21l5um7HnDQYbJ+oQ==\n"
"-----END RSA PRIVATE KEY-----\n";

// ===== OBJETOS GLOBALES =====
WiFiClientSecure espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;
const long interval = 10000; // Enviar cada 10 segundos

void conectarWiFi() {
  Serial.print("Conectando a WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void reconectarMQTT() {
  while (!client.connected()) {
    Serial.print("Conectando a AWS IoT...");
    if (client.connect(client_id)) {
      Serial.println("Conectado!");
    } else {
      Serial.print("Error: ");
      Serial.println(client.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_ESP32, OUTPUT);

  conectarWiFi();

  espClient.setCACert(ca_cert);
  espClient.setCertificate(device_cert);
  espClient.setPrivateKey(private_key);

  client.setServer(mqtt_server, mqtt_port);
  client.setBufferSize(512);
}

void loop() {
  if (!client.connected()) {
    reconectarMQTT();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;

    int valorAnalogico = analogRead(PIN_ANALOGICO);
    String estado = (valorAnalogico < umbral) ? "LLUVIA" : "SECO";

    // LED indicador
    digitalWrite(LED_ESP32, (valorAnalogico < umbral) ? HIGH : LOW);

    // Crear JSON
    StaticJsonDocument<200> doc;
    doc["dispositivo"] = "esp32-sensor";
    doc["estado"] = estado;
    doc["valor_analogico"] = valorAnalogico;
    doc["umbral"] = umbral;

    char buffer[256];
    serializeJson(doc, buffer);

    Serial.print("Enviando: ");
    Serial.println(buffer);

    if (client.publish(mqtt_topic, buffer)) {
      Serial.println("Dato enviado a AWS!");
    } else {
      Serial.println("Error al enviar");
    }
  }
}
