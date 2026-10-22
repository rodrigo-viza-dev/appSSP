import { useState } from 'react';
import { Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Button, typography } from '@/components/ui';
import { useAuth } from '@/state/auth';
export function GoogleAccess({ enabled }: { enabled: boolean }) {
  const { signInGoogle, busy } = useAuth();
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const available = enabled && !!clientId && Constants.appOwnership !== 'expo';
  async function enter() {
    if (!available || loading) return;
    setLoading(true); setError('');
    try {
      // Expo Go sigue usando SSP sin cargar el módulo nativo de Google.
      const { GoogleSignin, isSuccessResponse } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
      GoogleSignin.configure({ webClientId: clientId, hostedDomain: 'unsa.edu.pe', offlineAccess: false });
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut();
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response) && response.data.idToken) await signInGoogle(response.data.idToken);
    } catch { setError('No se pudo completar el acceso con Google. Revisa tu conexión y la configuración de la app.'); }
    finally { setLoading(false); }
  }
  return <View style={{ gap: 8 }}><Button title={loading ? 'Abriendo Google…' : 'Continuar con Google institucional'} secondary disabled={!available || busy || loading} onPress={() => void enter()} />
    {!available && <Text style={typography.body}>{!enabled || !clientId ? 'Google estará disponible cuando se configure el acceso institucional.' : 'Para usar Google necesitas la compilación de Android de PrácticasCC. En Expo Go puedes ingresar con tu cuenta SSP.'}</Text>}
    {!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}
  </View>;
}
