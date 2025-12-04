#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "arduinoFFT.h"

#define I2C_SDA 21
#define I2C_SCL 22
#define MPU_ADDR1 0x68
#define OLED_ADDR 0x3C
#define OLED_WIDTH 128
#define OLED_HEIGHT 64
#define OLED_RESET -1

const float ACCEL_SCALE = 16384.0;
#define N_SAMPLES 128
#define SAMPLE_RATE 50
#define SENS_FFT 3.0
#define THRESHOLD 30

Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, OLED_RESET);

double vReal[N_SAMPLES];
double vImag[N_SAMPLES];
ArduinoFFT<double> FFT(vReal, vImag, N_SAMPLES, SAMPLE_RATE);

// ================= FUNCIONES =====================
void readAccel(float &a) {
  Wire.beginTransmission(MPU_ADDR1);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR1, 6);

  int16_t ax = (Wire.read() << 8 | Wire.read());
  int16_t ay = (Wire.read() << 8 | Wire.read());
  int16_t az = (Wire.read() << 8 | Wire.read());

  a = sqrt(pow(ax / ACCEL_SCALE, 2) + pow(ay / ACCEL_SCALE, 2) + pow(az / ACCEL_SCALE, 2));
}

// =================================================
void setup() {
  Serial.begin(115200);

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000);

  // OLED
  display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.println("FFT SISMICO READY");
  display.display();
  delay(800);

  // MPU6050 wake up
  Wire.beginTransmission(MPU_ADDR1);
  Wire.write(0x6B);
  Wire.write(0x00);
  Wire.endTransmission();
}

// =================================================
void loop() {
  // CAPTURA VENTANA DE MUESTRAS
  for (int i = 0; i < N_SAMPLES; i++) {
    float A;
    readAccel(A);
    vReal[i] = A;
    vImag[i] = 0;
    unsigned long t0 = micros();
    while (micros() - t0 < 20000)
      ;  // 20 ms para 50 Hz
  }

  // FFT
  FFT.windowing(vReal, N_SAMPLES, FFT_WIN_TYP_HAMMING, FFT_FORWARD);
  FFT.compute(vReal, vImag, N_SAMPLES, FFT_FORWARD);
  FFT.complexToMagnitude(vReal, vImag, N_SAMPLES);

  // BUSCAR PICO MÁS GRANDE
  double peak = 0;
  int index = 0;
  for (int i = 1; i < N_SAMPLES / 2; i++) {
    if (vReal[i] * SENS_FFT > peak) {
      peak = vReal[i] * SENS_FFT;
      index = i;
    }
  }

  float freq = (index * SAMPLE_RATE / N_SAMPLES);
  bool movimiento = (peak > THRESHOLD);

  // DISPLAY OLED
  display.clearDisplay();
  display.setCursor(0, 0);

  display.printf("FFT Peak: %.1f\n", peak);
  display.printf("FreqDom: %.2f Hz\n", freq);
  display.print("Estado: ");
  display.println(movimiento ? "AGITACION" : "Calmo");

  display.drawRect(0, 50, (int)map(peak, 0, 200, 0, 120), 10, SSD1306_WHITE);
  display.display();

  Serial.printf("\nPico FFT: %.2f | Freq=%.2fHz | %s\n",
                peak, freq, movimiento ? "AGITACION DETECTADA" : "NORMAL");
}
