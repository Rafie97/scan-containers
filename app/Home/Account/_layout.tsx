/* eslint-disable react-native/no-inline-styles */
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import gs from '@/Styles/globalStyles';
import BottomTabsCard from '@/Components/AccountComponents/BottomTabs/BottomTabsCard';
import PersonalInfoCard from '@/Components/AccountComponents/PersonalInfoCard';
import ContactsModal from '@/Components/AccountComponents/ContactsModal';
import { useDispatch, useStore } from '@/Reducers/store';
import { useIsFocused } from '@react-navigation/native';
import useAuth from '@/Auth_Components/AuthContext';
import { signOut } from 'firebase/auth';
import { addDoc, collection, getFirestore } from 'firebase/firestore'
import { getApp } from 'firebase/app'

export default function AccountPage() {
  const [editProfile, setEditProfile] = React.useState<boolean>(false);
  const [userName, setUserName] = React.useState<string>("Rafa J");
  const [typedName, setTypedName] = React.useState<string>();

  const authState = useAuth();

  const userID = useAuth();

  const db = useMemo(() => {
    const app = getApp()
    return getFirestore(app)
  }, [])

  async function signOutFunc() {
    signOut(authState);
  }

  return (
    <View style={gs.fullBackground}>
      <View style={styles.headerView}>
        <Text style={styles.yourWishlistsText}>Your Account</Text>
        <TouchableOpacity
          style={styles.signOutTouchable}
          onPress={() => signOutFunc()}>
          <Ionicons name="exit-outline" size={24} color="#0073FE" />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'column', width: '100%', ...gs.flex1 }}>
        <PersonalInfoCard
          editProfile={() => {
            if (
              editProfile &&
              typedName //&& typedName !== userName
            ) {
              setUserName(typedName);
              const userRef = collection(db, `users/${userID}`)
              addDoc(userRef, {
                name: typedName,
              });
            }
            setEditProfile(!editProfile);
          }}
          setTypedName={setTypedName}
        />

        <View >
          <TouchableOpacity>
            <Text style={styles.middleButtonText}>
              Payment Options
            </Text>
          </TouchableOpacity>
        </View>

        <BottomTabsCard />
      </View>
    </View>
  );
}

const styles = {
  yourWishlistsText: {
    ...gs.header,
    ...gs.flex1,
    margin: 0,
  },
  headerView: {
    marginLeft: 20,
    ...gs.aStretch,
    ...gs.flexRow,
    ...gs.width100,
  },
  middleButtonText: {
    fontSize: 20,
    height: 60,
    width: '90%' as '90%',
    paddingVertical: 15,
    overflow: 'hidden' as 'hidden',
    ...gs.aSelfCenter,
    ...gs.bgGreen,
    ...gs.bold,
    ...gs.margin10,
    ...gs.radius10,
    ...gs.taCenter,
    ...gs.white,
  },
  signOutText: {
    fontSize: 18,
    textAlign: 'right' as 'right',
    paddingVertical: 5,
    ...gs.aStretch,
    ...gs.flex1,
  },
  signOutTouchable: {
    ...gs.aStretch,
  },
  gridBackground: {
    backgroundColor: '#fafafa' as '#fafafa',
    ...gs.width100,
    ...gs.height100,

  }
};
