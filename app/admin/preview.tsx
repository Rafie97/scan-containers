import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DEVICE_PRESETS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
  { name: 'Pixel 7', width: 412, height: 915 },
  { name: 'Samsung Galaxy S23', width: 360, height: 780 },
  { name: 'iPad Mini', width: 768, height: 1024 },
  { name: 'iPad Pro 11"', width: 834, height: 1194 },
  { name: 'iPad Pro 12.9"', width: 1024, height: 1366 },
];

export default function DevicePreview() {
  const [selectedDevice, setSelectedDevice] = useState(DEVICE_PRESETS[1]);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [scale, setScale] = useState(0.6);

  const frameWidth = orientation === 'portrait' ? selectedDevice.width : selectedDevice.height;
  const frameHeight = orientation === 'portrait' ? selectedDevice.height : selectedDevice.width;

  // Domain is injected at build time via EXPO_PUBLIC_DOMAIN
  const domain = process.env.EXPO_PUBLIC_DOMAIN || 'shop.local';
  const appUrl = `http://${domain}`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Device Preview</Text>
      <Text style={styles.subtitle}>Test your app on different screen sizes</Text>

      <View style={styles.controls}>
        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Device:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deviceList}>
            {DEVICE_PRESETS.map(device => (
              <TouchableOpacity
                key={device.name}
                style={[styles.deviceBtn, selectedDevice.name === device.name && styles.deviceBtnActive]}
                onPress={() => setSelectedDevice(device)}
              >
                <Text style={[styles.deviceBtnText, selectedDevice.name === device.name && styles.deviceBtnTextActive]}>
                  {device.name}
                </Text>
                <Text style={styles.deviceSize}>{device.width}x{device.height}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Orientation:</Text>
          <TouchableOpacity
            style={[styles.orientationBtn, orientation === 'portrait' && styles.orientationBtnActive]}
            onPress={() => setOrientation('portrait')}
          >
            <Text style={styles.orientationIcon}>📱</Text>
            <Text style={styles.orientationText}>Portrait</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.orientationBtn, orientation === 'landscape' && styles.orientationBtnActive]}
            onPress={() => setOrientation('landscape')}
          >
            <Text style={styles.orientationIcon}>📱</Text>
            <Text style={styles.orientationText}>Landscape</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Scale: {Math.round(scale * 100)}%</Text>
          <TouchableOpacity style={styles.scaleBtn} onPress={() => setScale(Math.max(0.3, scale - 0.1))}>
            <Text style={styles.scaleBtnText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scaleBtn} onPress={() => setScale(Math.min(1, scale + 0.1))}>
            <Text style={styles.scaleBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.previewArea}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceInfoText}>
            {selectedDevice.name} • {frameWidth}x{frameHeight} • {orientation}
          </Text>
        </View>

        <View style={[styles.deviceFrame, {
          width: frameWidth * scale + 40,
          height: frameHeight * scale + 80,
        }]}>
          <View style={styles.deviceNotch} />
          <View style={[styles.deviceScreen, {
            width: frameWidth * scale,
            height: frameHeight * scale,
          }]}>
            <iframe
              src={appUrl}
              style={{
                width: frameWidth,
                height: frameHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                border: 'none',
              }}
              title="App Preview"
            />
          </View>
          <View style={styles.deviceHomeBar} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  controls: {
    flexDirection: 'row',
    gap: 30,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  controlGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  controlLabel: { fontSize: 14, fontWeight: '500', color: '#666' },
  deviceList: { flexDirection: 'row', maxWidth: 500 },
  deviceBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    alignItems: 'center',
  },
  deviceBtnActive: { backgroundColor: '#0073FE' },
  deviceBtnText: { fontWeight: '500', color: '#333' },
  deviceBtnTextActive: { color: '#fff' },
  deviceSize: { fontSize: 10, color: '#999', marginTop: 2 },
  orientationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  orientationBtnActive: { backgroundColor: '#0073FE' },
  orientationIcon: { fontSize: 16 },
  orientationText: { fontWeight: '500' },
  scaleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scaleBtnText: { fontSize: 20, fontWeight: 'bold' },
  previewArea: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  deviceInfo: { marginBottom: 15 },
  deviceInfoText: { fontSize: 14, color: '#666' },
  deviceFrame: {
    backgroundColor: '#1a1a1a',
    borderRadius: 40,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  deviceNotch: {
    width: 120,
    height: 25,
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    marginBottom: 10,
  },
  deviceScreen: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  deviceHomeBar: {
    width: 100,
    height: 5,
    backgroundColor: '#fff',
    borderRadius: 3,
    marginTop: 15,
  },
});
