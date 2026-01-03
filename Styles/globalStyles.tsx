import { StyleSheet } from 'react-native';

const gs = StyleSheet.create({
  fullBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },

  header: {
    margin: 20,
    marginTop: 40,
    fontWeight: 'bold',
    textAlign: 'left',
    fontSize: 24,
  },

  subHeader: {
    margin: 20,
    fontWeight: 'bold',
    textAlign: 'left',
    fontSize: 20,
  },

  width100: {
    width: '100%',
  },

  height100: {
    height: '100%',
  },

  width50: {
    width: '50%',
  },

  height50: {
    height: '50%',
  },

  aSelfCenter: {
    alignSelf: 'center',
  },

  aCenter: {
    alignItems: 'center',
  },

  aStretch: {
    alignSelf: 'stretch',
  },

  bold: {
    fontWeight: 'bold',
  },

  bgBlue: {
    backgroundColor: '#0073FE',
  },
  bgGreen: {
    backgroundColor: '#36B57C',
  },
  bgPurple: {
    backgroundColor: '#4400fe',
  },
  bgWhite: {
    backgroundColor: '#fdfdfd',
  },

  blue: {
    color: '#0073FE',
  },

  flex1: {
    flex: 1,
  },
  flexColumn: {
    flexDirection: 'column',
  },
  flexRow: {
    flexDirection: 'row',
  },

  jCenter: {
    justifyContent: 'center',
  },

  margin10: {
    margin: 10,
  },

  margin20: {
    margin: 20,
  },

  padding10: {
    padding: 10,
  },

  padding20: {
    padding: 20,
  },

  pAbsolute: {
    position: 'absolute',
  },

  radius10: {
    borderRadius: 10,
  },

  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowRadius: 4,
    elevation: 8,
  },

  taCenter: {
    textAlign: 'center',
  },

  white: {
    color: '#fdfdfd',
  },
});

export default gs;
