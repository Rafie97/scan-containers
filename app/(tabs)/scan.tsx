import gs from '@/Styles/globalStyles';
import ItemBubble from '@/components/ItemBubble';
import { Item } from '@/models';
import { itemsApi } from '@/services';
import { useDispatch } from '@/store';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function ScanPage() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedItem, setScannedItem] = useState<Item | null>(null);
  const [currentBarcode, setCurrentBarcode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleBarcodeScan = useCallback(async (result: BarcodeScanningResult) => {
    const { data } = result;

    // Prevent re-scanning the same barcode
    if (data === currentBarcode || isLoading) {
      return;
    }

    setCurrentBarcode(data);
    setIsLoading(true);
    setError(null);

    try {
      const item = await itemsApi.getByBarcode(data);
      setScannedItem(item);
    } catch (err) {
      console.log('Item not found for barcode:', data);
      setError(`No item found for barcode: ${data}`);
      setScannedItem(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentBarcode, isLoading]);

  const handleAddToCart = useCallback(() => {
    if (scannedItem) {
      dispatch({ type: 'ADD_TO_CART', payload: scannedItem });
    }
  }, [scannedItem, dispatch]);

  const resetScan = useCallback(() => {
    setScannedItem(null);
    setCurrentBarcode('');
    setError(null);
  }, []);

  if (!permission) {
    return <View style={gs.fullBackground} />;
  }

  if (!permission.granted) {
    return (
      <View style={[gs.fullBackground, styles.permissionContainer]}>
        <Text style={styles.permissionText}>
          Camera permissions are required to scan barcodes
        </Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  return (
    <View style={gs.fullBackground}>
      <CameraView
        style={styles.cameraWindow}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
        }}
        onBarcodeScanned={handleBarcodeScan}
      />
      <View style={styles.scanContainer}>
        <View style={styles.resultContainer}>
          {isLoading ? (
            <Text style={styles.statusText}>Looking up item...</Text>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <Button title="Scan Again" onPress={resetScan} />
            </View>
          ) : scannedItem ? (
            <View style={styles.itemContainer}>
              <Text style={styles.scannedItemsText}>Scanned Item:</Text>
              <ItemBubble item={scannedItem} />
              <View style={styles.buttonRow}>
                <Button title="Add to Cart" onPress={handleAddToCart} />
                <Button title="Scan Another" onPress={resetScan} />
              </View>
            </View>
          ) : (
            <Text style={styles.scannedItemsText}>Scan an Item</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraWindow: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
  },

  permissionContainer: {
    justifyContent: 'center',
    padding: 20,
  },

  permissionText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },

  scannedItemsText: {
    marginTop: 20,
    marginBottom: 20,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0073FE',
    textAlign: 'center',
    alignSelf: 'stretch',
  },

  scanContainer: {
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'center',
  },

  resultContainer: {
    alignItems: 'center',
    padding: 20,
  },

  itemContainer: {
    alignItems: 'center',
  },

  statusText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },

  errorContainer: {
    alignItems: 'center',
  },

  errorText: {
    fontSize: 16,
    color: '#c00',
    textAlign: 'center',
    marginBottom: 10,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 15,
  },
});
