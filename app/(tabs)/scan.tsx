import gs from '@/Styles/globalStyles';
import { CameraView } from 'expo-camera';
import { useNavigation } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';


export default function ScanPage() {
    const navigation = useNavigation();

    useEffect(() => {
        navigation.setOptions({ headerShown: false })
    }, [])

    return (
        <View style={gs.fullBackground}>
            <CameraView style={{ alignItems: "center", flex: 1, height: '100%', width: '100%' }} autofocus='on' />
            <View style={styles.scanContainer}>
                <View >
                    <View >
                        <Text >
                            Scan an Item
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}


const styles = StyleSheet.create({
    cameraWindow: {
        alignItems: 'center',
        flex: 1,
        height: '100%',
        width: '100%',
    },


    scannedItemsText: {
        marginTop: 20,
        marginBottom: 20,
        fontSize: 20,
        ...gs.aStretch,
        ...gs.bold,
        ...gs.blue,
        ...gs.taCenter,
    },

    scanContainer: {
        backgroundColor: 'transparent',
        ...gs.flex1,
        ...gs.jCenter,
    },

});
