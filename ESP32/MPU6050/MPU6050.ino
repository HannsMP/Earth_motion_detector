#include <Wire.h>
#include <MPU6050.h>

MPU6050 mpu;

float ax, ay, az;
float vx = 0, vy = 0, vz = 0;
float dx = 0, dy = 0, dz = 0;

float PGA = 0;
float PGV = 0;
float PGD = 0;
float duration = 0;

const float dt = 0.01; // 10 ms intervalo
const float threshold = 0.5; // Umbral de aceleración (m/s²)

unsigned long lastTime;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  mpu.initialize();
  lastTime = millis();
}

void loop() {
  if (millis() - lastTime >= dt * 1000) {
    lastTime = millis();

    ax = mpu.getAccelerationX() / 16384.0 * 9.81;
    ay = mpu.getAccelerationY() / 16384.0 * 9.81;
    az = mpu.getAccelerationZ() / 16384.0 * 9.81;

    float aTotal = sqrt(ax * ax + ay * ay + az * az);
    PGA = max(PGA, aTotal);

    // Integración para velocidad
    vx += ax * dt;
    vy += ay * dt;
    vz += az * dt;
    float vTotal = sqrt(vx * vx + vy * vy + vz * vz);
    PGV = max(PGV, vTotal);

    // Integración para desplazamiento
    dx += vx * dt;
    dy += vy * dt;
    dz += vz * dt;
    float dTotal = sqrt(dx * dx + dy * dy + dz * dz);
    PGD = max(PGD, dTotal);

    // Duración del movimiento fuerte
    if (aTotal > threshold) {
      duration += dt;
    }

    // Mostrar resultados cada segundo
    static int counter = 0;
    counter++;
    if (counter >= 100) {
      Serial.print("PGA: "); Serial.print(PGA); Serial.print(" m/s² | ");
      Serial.print("PGV: "); Serial.print(PGV); Serial.print(" m/s | ");
      Serial.print("PGD: "); Serial.print(PGD); Serial.print(" m | ");
      Serial.print("Duración: "); Serial.print(duration); Serial.println(" s");
      counter = 0;
    }
  }
}