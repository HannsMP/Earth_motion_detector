/* Diagnóstico I2C real (ESP32 + MPU6050 + SSD1306)
   SDA=21, SCL=22, INT=5. AD0->GND -> MPU 0x68 (prueba 0x69 si no aparece).
   Muestra errores de Wire.endTransmission(), who_am_i, y lecturas.
*/
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define I2C_SDA 21
#define I2C_SCL 22
#define MPU_ADDR1 0x68
#define MPU_ADDR2 0x69
#define SSD_ADDR1 0x3C
#define SSD_ADDR2 0x3D
#define OLED_WIDTH 128
#define OLED_HEIGHT 64
#define OLED_RESET -1
#define INT_PIN 5

Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, OLED_RESET);

const float ACCEL_SCALE = 16384.0;
const float GYRO_SCALE = 131.0;

uint8_t i2c_scan_and_report() {
  Serial.println("Escaneando bus I2C (0..127)...");
  bool any = false;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    uint8_t err = Wire.endTransmission();
    if (err == 0) {
      Serial.printf("  -> found 0x%02X\n", addr);
      any = true;
    } else if (err == 4) {
      Serial.printf("  -> 0x%02X (err 4)\n", addr);
    }
    delay(5);
  }
  if (!any) Serial.println("  No devices found.");
  return any;
}

uint8_t i2c_write_byte(uint8_t dev, uint8_t reg, uint8_t val, uint8_t retries=3) {
  while (retries--) {
    Wire.beginTransmission(dev);
    Wire.write(reg);
    Wire.write(val);
    uint8_t err = Wire.endTransmission();
    if (err == 0) return 0;
    Serial.printf("write dev 0x%02X reg 0x%02X -> err %u (retries left %u)\n", dev, reg, err, retries);
    delay(10);
  }
  return 255;
}

int readByteWithRetries(uint8_t dev, uint8_t reg, uint8_t &out, uint8_t retries=3) {
  while (retries--) {
    Wire.beginTransmission(dev);
    Wire.write(reg);
    uint8_t err = Wire.endTransmission(false);
    if (err != 0) {
      Serial.printf("endTransmission(false) dev 0x%02X reg 0x%02X -> err %u\n", dev, reg, err);
      delay(10); continue;
    }
    Wire.requestFrom(dev, (uint8_t)1);
    if (Wire.available()) { out = Wire.read(); return 0; }
    delay(10);
  }
  return -1;
}

int16_t read16WithRetries(uint8_t dev, uint8_t regHigh, bool &ok, uint8_t retries=3) {
  while (retries--) {
    Wire.beginTransmission(dev);
    Wire.write(regHigh);
    if (Wire.endTransmission(false) != 0) { delay(5); continue; }
    Wire.requestFrom(dev, (uint8_t)2);
    if (Wire.available() >= 2) {
      uint8_t hi = Wire.read(); uint8_t lo = Wire.read();
      ok = true; return (int16_t)((hi << 8) | lo);
    }
    delay(5);
  }
  ok = false; return 0;
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n=== Diagnóstico I2C real ===");

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(100000); // 100 kHz

  i2c_scan_and_report();

  // Comprobar OLED en 0x3C y 0x3D
  Serial.println("Probaremos OLED en 0x3C y 0x3D...");
  Wire.beginTransmission(SSD_ADDR1); Serial.printf("endTransmission(0x3C) => %u\n", Wire.endTransmission());
  Wire.beginTransmission(SSD_ADDR2); Serial.printf("endTransmission(0x3D) => %u\n", Wire.endTransmission());

  // Inicializa OLED si responde
  if (display.begin(SSD1306_SWITCHCAPVCC, SSD_ADDR1)) {
    Serial.println("OLED detectada en 0x3C");
  } else if (display.begin(SSD1306_SWITCHCAPVCC, SSD_ADDR2)) {
    Serial.println("OLED detectada en 0x3D");
  } else {
    Serial.println("OLED NO detectada (prueba hardware/pullups/direccion).");
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0,0);
  display.println("Diagnostico I2C");
  display.display();

  // Who am I - probar 0x68 y 0x69
  uint8_t who;
  if (readByteWithRetries(MPU_ADDR1, 0x75, who) == 0) {
    Serial.printf("WHO_AM_I @0x68 = 0x%02X\n", who);
  } else {
    Serial.println("No responde WHO_AM_I en 0x68 (probando 0x69)...");
    if (readByteWithRetries(MPU_ADDR2, 0x75, who) == 0) {
      Serial.printf("WHO_AM_I @0x69 = 0x%02X\n", who);
    } else {
      Serial.println("MPU6050 no responde en 0x68 ni 0x69. Revisar AD0/GND, VCC 3.3V, pull-ups, cableado.");
    }
  }

  // Despertar MPU (si responde)
  if (i2c_write_byte(MPU_ADDR1, 0x6B, 0x00) == 0) {
    Serial.println("MPU 0x68: PWR_MGMT_1=0 escrito (despierto).");
  } else if (i2c_write_byte(MPU_ADDR2, 0x6B, 0x00) == 0) {
    Serial.println("MPU 0x69: PWR_MGMT_1=0 escrito (despierto).");
  } else {
    Serial.println("No se pudo escribir PWR_MGMT_1 (I2C err).");
  }

  pinMode(INT_PIN, INPUT_PULLUP);
  delay(200);
}

void loop() {
  bool ok;
  int16_t ax_raw = read16WithRetries(MPU_ADDR1, 0x3B, ok);
  if (!ok) { ax_raw = read16WithRetries(MPU_ADDR2, 0x3B, ok); } // probar la otra direccion
  int16_t ay_raw = read16WithRetries(ok?MPU_ADDR1:MPU_ADDR2, 0x3D, ok);
  int16_t az_raw = read16WithRetries(ok?MPU_ADDR1:MPU_ADDR2, 0x3F, ok);

  int16_t gx_raw = read16WithRetries(ok?MPU_ADDR1:MPU_ADDR2, 0x43, ok);
  int16_t gy_raw = read16WithRetries(ok?MPU_ADDR1:MPU_ADDR2, 0x45, ok);
  int16_t gz_raw = read16WithRetries(ok?MPU_ADDR1:MPU_ADDR2, 0x47, ok);

  float ax = (float)ax_raw / ACCEL_SCALE;
  float ay = (float)ay_raw / ACCEL_SCALE;
  float az = (float)az_raw / ACCEL_SCALE;
  float gx = (float)gx_raw / GYRO_SCALE;
  float gy = (float)gy_raw / GYRO_SCALE;
  float gz = (float)gz_raw / GYRO_SCALE;

  Serial.printf("A(g): %.3f, %.3f, %.3f | G(dps): %.1f, %.1f, %.1f\n", ax, ay, az, gx, gy, gz);

  display.clearDisplay();
  display.setCursor(0,0);
  display.printf("A X%.2f Y%.2f Z%.2f\n", ax, ay, az);
  display.printf("G X%.0f Y%.0f Z%.0f\n", gx, gy, gz);
  display.display();

  delay(300);
}