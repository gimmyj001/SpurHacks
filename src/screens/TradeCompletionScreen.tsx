import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface TradeCompletionData {
  tradeId: number;
  fromUsername: string;
  toUsername: string;
  fromPhoto: {
    filename: string;
    original_name: string;
    description: string;
  };
  toPhoto: {
    filename: string;
    original_name: string;
    description: string;
  };
}

interface TradeCompletionScreenProps {
  route: {
    params: {
      tradeData: TradeCompletionData;
      isFromUser: boolean;
    };
  };
}

const TradeCompletionScreen: React.FC<TradeCompletionScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const { tradeData, isFromUser } = route.params;

  const handleContinue = () => {
    navigation.navigate('Trade' as never);
  };

  const handleViewGallery = () => {
    navigation.navigate('Gallery' as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={60} color="white" />
            </View>
            <Text style={styles.title}>Trade Completed!</Text>
            <Text style={styles.subtitle}>
              Your photos have been successfully exchanged
            </Text>
          </View>

          {/* Trade Summary */}
          <View style={styles.tradeSummary}>
            <Text style={styles.summaryTitle}>Trade Summary</Text>
            <View style={styles.tradeInfo}>
              <Text style={styles.tradeInfoText}>
                <Text style={styles.bold}>{tradeData.fromUsername}</Text> traded with{' '}
                <Text style={styles.bold}>{tradeData.toUsername}</Text>
              </Text>
            </View>
          </View>

          {/* Photos Display */}
          <View style={styles.photosContainer}>
            {/* You Gave */}
            <View style={styles.photoSection}>
              <View style={styles.photoSectionHeader}>
                <Ionicons name="arrow-up" size={20} color="#ff4757" />
                <Text style={styles.photoSectionTitle}>You Gave</Text>
              </View>
              <View style={styles.photoCard}>
                <LinearGradient
                  colors={['#ff4757', '#ff3742']}
                  style={styles.photoGradientBorder}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.photoContainer}>
                    <Image
                      source={{ uri: `http://172.20.10.2:3001/uploads/${tradeData.fromPhoto.filename}` }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                  </View>
                </LinearGradient>
                <Text style={styles.photoName}>{tradeData.fromPhoto.original_name}</Text>
                {tradeData.fromPhoto.description && (
                  <Text style={styles.photoDescription}>{tradeData.fromPhoto.description}</Text>
                )}
              </View>
            </View>

            {/* You Received */}
            <View style={styles.photoSection}>
              <View style={styles.photoSectionHeader}>
                <Ionicons name="arrow-down" size={20} color="#2ed573" />
                <Text style={styles.photoSectionTitle}>You Received</Text>
              </View>
              <View style={styles.photoCard}>
                <LinearGradient
                  colors={['#2ed573', '#1e90ff']}
                  style={styles.photoGradientBorder}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.photoContainer}>
                    <Image
                      source={{ uri: `http://172.20.10.2:3001/uploads/${tradeData.toPhoto.filename}` }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                  </View>
                </LinearGradient>
                <Text style={styles.photoName}>{tradeData.toPhoto.original_name}</Text>
                {tradeData.toPhoto.description && (
                  <Text style={styles.photoDescription}>{tradeData.toPhoto.description}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleViewGallery}>
              <Ionicons name="images" size={20} color="white" />
              <Text style={styles.primaryButtonText}>View Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={handleContinue}>
              <Ionicons name="swap-horizontal" size={20} color="#667eea" />
              <Text style={styles.secondaryButtonText}>Continue Trading</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  successIcon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  tradeSummary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  tradeInfo: {
    alignItems: 'center',
  },
  tradeInfoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  bold: {
    fontWeight: 'bold',
  },
  photosContainer: {
    marginBottom: 30,
  },
  photoSection: {
    marginBottom: 25,
  },
  photoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  photoSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
  photoCard: {
    alignItems: 'center',
  },
  photoGradientBorder: {
    borderRadius: 15,
    padding: 3,
    marginBottom: 10,
  },
  photoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  photoImage: {
    width: width * 0.4,
    height: width * 0.4,
  },
  photoName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  photoDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  actionButtons: {
    gap: 15,
  },
  primaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default TradeCompletionScreen; 