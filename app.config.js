// Android usa autolinking; el plugin sin Firebase configura el esquema de iOS.
module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, package: 'pe.edu.unsa.practicascc' },
  plugins: [
    ...(config.plugins || []).filter(plugin => (Array.isArray(plugin) ? plugin[0] : plugin) !== '@react-native-google-signin/google-signin'),
    ...(process.env.GOOGLE_IOS_URL_SCHEME ? [['@react-native-google-signin/google-signin', { iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME }]] : []),
  ],
});
