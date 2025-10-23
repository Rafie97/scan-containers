import LoginModal from "@/LoginPages/LoginModal";
import { View } from "react-native";
import gs from '../../Styles/globalStyles';
import useAuth from "@/Auth_Components/AuthContext";

export default function MainLogin() {
    const auth = useAuth();

    return (
        <View style={gs.fullBackground}>
            <LoginModal visible={!auth} />
        </View>
    );
}
