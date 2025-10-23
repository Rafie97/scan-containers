import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import SwipeableItem from '../../../Components/SwipeableItem';
import { useIsFocused } from '@react-navigation/native';
import gs from '../../../Styles/globalStyles';
import { useDispatch, useStore } from '../../../Reducers/store';
import useAuth from '../../../Auth_Components/AuthContext';
import BottomCartInfo from '../../../Components/CartComponents/BottomCartInfo';

function CartPage() {
    const [isScrollEnabled, setScrollEnabled] = useState<boolean>(true);
    const [cartSum, setCartSum] = useState<number[]>([0, 0, 0]);

    const store = useStore();
    const authh = useAuth();
    const dispatch = useDispatch();
    const isFocused = useIsFocused();

    const cartItems = store.user ? store.user.cart : [];

    React.useEffect(() => {
        if (store.user === null && isFocused && authh && authh.isAnonymous) {
            dispatch({ type: 'SET_LOGIN_MODAL', payload: true });
        }
    }, [isFocused, store.user, authh, dispatch]);

    React.useEffect(() => {
        let tempSum = 0;
        if (!cartItems?.length) return
        cartItems.forEach(item => {
            const numPrice = +item.price * item.quantity;
            tempSum += numPrice;
        });
        if (tempSum > 0) {
            setCartSum([
                Math.round(100 * tempSum) / 100,
                Math.round(100 * 0.0825 * tempSum) / 100,
                Math.round(100 * 1.0825 * tempSum) / 100,
            ]);
        }
    }, [cartItems]);


    return (
        <View style={gs.fullBackground}>
            <View style={styles.blueHeaderContainer}>
                <View style={styles.blueHeader}>
                    <View style={styles.totalBalanceView}>
                        {cartSum ? (
                            <View style={gs.flexRow}>
                                <Text style={styles.tickerText}>
                                    ${Math.trunc(cartSum[2]).toString() || 0}
                                </Text>
                                <Text style={styles.tickerText}>
                                    {(cartSum[2] - Math.trunc(cartSum[2]))
                                        .toFixed(2)
                                        .toString()
                                        .slice(1, 4) || 0}
                                </Text>
                            </View>
                        ) : (
                            <></>
                        )}
                        <Text style={gs.white}>Total Balance</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => { }}
                        style={styles.checkoutButton}>
                        <View style={styles.topCheckoutView}>
                            <Text style={[gs.blue, gs.bold, gs.taCenter]}>Checkout</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={cartItems}
                keyExtractor={(item) => item.docID}
                contentContainerStyle={styles.listContainer}
                // scrollEnabled={isScrollEnabled}
                style={gs.width100}
                renderItem={({ item }) => (
                    <SwipeableItem
                        item={item}
                        sourcePage="Cart"
                    // setOuterScrollEnabled={setScrollEnabled}
                    />
                )}
            />
            <BottomCartInfo cartSum={cartSum} />
        </View>
    );
}

export default CartPage;

const styles = StyleSheet.create({
    blueHeaderContainer: {
        height: '12%' as '12%',
        borderBottomWidth: 1,
        borderColor: '#E6E6E6' as '#E6E6E6',
        marginTop: 60,
        paddingBottom: 10,
        paddingHorizontal: 20,
        ...gs.width100,
    },

    blueHeader: {
        justifyContent: 'space-between',
        borderRadius: 10,
        ...gs.bgBlue,
        ...gs.flexRow,
    },

    checkoutButton: {
        ...gs.height100,
        ...gs.jCenter
    },

    totalBalanceView: {
        marginLeft: 20,
        justifyContent: 'center',
        ...gs.flexColumn,
    },

    topCheckoutView: {
        alignSelf: "flex-end" as "flex-end",
        width: 115,
        height: 40,
        ...gs.bgWhite,
        ...gs.jCenter,
        ...gs.margin20,
        ...gs.radius10,
    },

    tickerText: {
        fontSize: 30,
        ...gs.bold,
        ...gs.white,
        ...gs.taCenter,
    },

    listContainer: {
        paddingTop: 10,
        marginBottom: 10,
        ...gs.aCenter,
    },
});
